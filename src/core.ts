import type { ZodType } from "zod";
import { type AnyShapeService, SuccessState } from "./types.js";

export type CoreResult<T> =
  | { kind: "pass-through"; body: T }
  | { kind: "transformed"; body: T }
  | { kind: "insufficient"; reasoning: string }
  | { kind: "failure"; reasoning: string };

export async function alignToFormat<T>(
  body: unknown,
  schema: ZodType<T>,
  service: AnyShapeService,
  opts: { skipVerification?: boolean } = {},
): Promise<CoreResult<T>> {
  const direct = schema.safeParse(body);
  if (direct.success) {
    return { kind: "pass-through", body: direct.data };
  }

  const result = await service.transformToFormat(body, schema, opts);
  switch (result.successState) {
    case SuccessState.SUCCESS:
      return { kind: "transformed", body: result.data };
    case SuccessState.INSUFFICIENT_DATA:
      return { kind: "insufficient", reasoning: result.errorMessage };
    case SuccessState.FAILURE:
      return { kind: "failure", reasoning: result.errorMessage };
  }
}
