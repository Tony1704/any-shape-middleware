import type { LanguageModel } from "ai";
import type { ZodType } from "zod";

export enum SuccessState {
  SUCCESS = "SUCCESS",
  INSUFFICIENT_DATA = "INSUFFICIENT_DATA",
  FAILURE = "FAILURE",
}

export interface FormatSuccessResponse<T> {
  successState: SuccessState.SUCCESS;
  data: T;
}

export interface FormatInsufficientDataResponse {
  successState: SuccessState.INSUFFICIENT_DATA;
  errorMessage: string;
}

export interface FormatFailureResponse {
  successState: SuccessState.FAILURE;
  errorMessage: string;
}

export type FormatResponse<T> =
  | FormatSuccessResponse<T>
  | FormatInsufficientDataResponse
  | FormatFailureResponse;

export interface TransformToFormatOptions {
  skipVerification?: boolean;
}

export interface AnyShapeService {
  transformToFormat<T>(
    input: unknown,
    schema: ZodType<T>,
    options?: TransformToFormatOptions,
  ): Promise<FormatResponse<T>>;
}

export interface CreateAnyShapeServiceOptions {
  model?: LanguageModel;
  factCheck?: boolean;
}
