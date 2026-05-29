import { Output, generateText, type LanguageModel } from "ai";
import { ZodType, z } from "zod";
import {
  AnyShapeService,
  CreateAnyShapeServiceOptions,
  FormatResponse,
  SuccessState,
  type TransformToFormatOptions,
} from "./types.js";

const verdictSchema = z.object({
  hallucinatedFields: z.array(z.string()),
  missingRequiredFields: z.array(z.string()),
  reasoning: z.string(),
});

class AnyShapeServiceImpl implements AnyShapeService {
  private modelPromise: Promise<LanguageModel>;
  private readonly factCheckEnabled: boolean;

  constructor(opts: CreateAnyShapeServiceOptions = {}) {
    this.modelPromise = opts.model
      ? Promise.resolve(opts.model)
      : resolveDefaultModel();
    this.factCheckEnabled = opts.factCheck ?? true;
  }

  public async transformToFormat<T>(
    input: unknown,
    schema: ZodType<T>,
    options: TransformToFormatOptions = {},
  ): Promise<FormatResponse<T>> {
    let model: LanguageModel;
    try {
      model = await this.modelPromise;
    } catch (e: unknown) {
      return {
        successState: SuccessState.FAILURE,
        errorMessage: toErrorMessage(e, "Failed to resolve model"),
      };
    }

    let rewrite: T;
    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema }),
        prompt:
          "Reshape the following payload so it matches the target schema. " +
          "Do not invent fields or values that are not derivable from the input. " +
          "If a required field cannot be filled from the input, fail rather than fabricate.\n\n" +
          "Input payload:\n" +
          JSON.stringify(input),
      });
      rewrite = output;
    } catch (e: unknown) {
      return {
        successState: SuccessState.FAILURE,
        errorMessage: toErrorMessage(e, "Transformation failed"),
      };
    }

    if (options.skipVerification || !this.factCheckEnabled) {
      return { successState: SuccessState.SUCCESS, data: rewrite };
    }
    return this.factCheck(model, input, rewrite);
  }

  private async factCheck<T>(
    model: LanguageModel,
    input: unknown,
    rewrite: T,
  ): Promise<FormatResponse<T>> {
    try {
      const { output: verdict } = await generateText({
        model,
        output: Output.object({ schema: verdictSchema }),
        prompt:
          "You are auditing a payload reshape for hallucinations.\n" +
          "Compare the rewrite against the original input and return:\n" +
          "- hallucinatedFields: dotted paths in the rewrite whose values cannot be derived from the input " +
          '(direct match, simple normalization, or obvious mapping like "fullName" -> "name").\n' +
          "- missingRequiredFields: dotted paths the rewrite filled with values the input did not actually contain.\n" +
          '- reasoning: one short sentence per offending field, or "ok" if both arrays are empty.\n\n' +
          "Original input:\n" +
          JSON.stringify(input) +
          "\n\nRewrite:\n" +
          JSON.stringify(rewrite),
      });

      if (verdict.hallucinatedFields.length > 0) {
        return {
          successState: SuccessState.FAILURE,
          errorMessage: `Rewrite invented fields: ${verdict.hallucinatedFields.join(", ")}. ${verdict.reasoning}`,
        };
      }
      if (verdict.missingRequiredFields.length > 0) {
        return {
          successState: SuccessState.INSUFFICIENT_DATA,
          errorMessage: `Input did not contain values for: ${verdict.missingRequiredFields.join(", ")}. ${verdict.reasoning}`,
        };
      }
      return { successState: SuccessState.SUCCESS, data: rewrite };
    } catch (e: unknown) {
      return {
        successState: SuccessState.FAILURE,
        errorMessage: `Fact-check failed: ${toErrorMessage(e, "unknown error")}`,
      };
    }
  }
}

export function createAnyFormatService(
  opts: CreateAnyShapeServiceOptions = {},
): AnyShapeService {
  return new AnyShapeServiceImpl(opts);
}

let _default: AnyShapeService | undefined;
export function getDefaultService(): AnyShapeService {
  return (_default ??= createAnyFormatService());
}

async function resolveDefaultModel(): Promise<LanguageModel> {
  const provider = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
  const modelId = process.env.AI_MODEL;

  switch (provider) {
    case "openai": {
      const module: any = await loadProvider("@ai-sdk/openai");
      return module.openai(modelId ?? "gpt-4o-mini");
    }
    case "anthropic": {
      const module: any = await loadProvider("@ai-sdk/anthropic");
      return module.anthropic(modelId ?? "claude-sonnet-4-5");
    }
    case "google": {
      const module: any = await loadProvider("@ai-sdk/google");
      return module.google(modelId ?? "gemini-2.5-flash");
    }
    default:
      throw new Error(
        `Unknown AI_PROVIDER: "${provider}". Set AI_PROVIDER to one of: openai, anthropic, google. Or pass a model explicitly via createAnyFormatService({ model }).`,
      );
  }
}

async function loadProvider(pkg: string): Promise<unknown> {
  try {
    return await import(pkg);
  } catch {
    throw new Error(
      `${pkg} is not installed. Run: npm install ${pkg}\n` +
        `Alternatively, pass a model explicitly: createAnyFormatService({ model: ... })`,
    );
  }
}

function toErrorMessage(e: unknown, fallback = "unknown error"): string {
  if (e instanceof Error) return e.message;
  try {
    return String(e);
  } catch {
    return fallback;
  }
}
