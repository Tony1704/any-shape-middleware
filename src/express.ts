import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";
import { alignToFormat } from "./core.js";
import { createAnyFormatService, getDefaultService } from "./service.js";
import type { CreateAnyShapeServiceOptions } from "./types.js";

export interface AnyShapeOptions extends CreateAnyShapeServiceOptions {
  skipVerification?: boolean;
}

export function anyShape<T>(
  schema: ZodType<T>,
  opts: AnyShapeOptions = {},
): RequestHandler {
  const service =
    opts.model !== undefined || opts.factCheck !== undefined
      ? createAnyFormatService({ model: opts.model, factCheck: opts.factCheck })
      : getDefaultService();

  return async (req: Request, res: Response, next: NextFunction) => {
    const skipVerification = opts.skipVerification ?? false;
    const result = await alignToFormat(req.body, schema, service, {
      skipVerification,
    });

    switch (result.kind) {
      case "pass-through":
      case "transformed":
        req.body = result.body;
        return next();
      case "insufficient":
        return res
          .status(422)
          .json({ error: "insufficient_data", reasoning: result.reasoning });
      case "failure":
        return res
          .status(400)
          .json({ error: "reshape_failed", reasoning: result.reasoning });
    }
  };
}
