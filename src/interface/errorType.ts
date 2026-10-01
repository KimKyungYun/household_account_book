/** Route Handler 가 실패 시 내려주는 본문 형태. withHandler 와 짝을 맞춘다. */
export type ApiErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'STALE_WRITE'
  | 'INTERNAL';

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  /** 필드 단위 검증 실패 — react-hook-form 의 setError 에 그대로 꽂는다. */
  fieldErrors?: Record<string, string>;
}

/**
 * fetch 는 404·500 에도 resolve 하므로 래퍼가 직접 던진다.
 * (axios 를 쓰지 않기로 한 대가로 반드시 지켜야 하는 한 가지)
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fieldErrors?: Record<string, string>;

  constructor(status: number, body: Partial<ApiErrorBody>) {
    super(body.message ?? '문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code ?? 'INTERNAL';
    this.fieldErrors = body.fieldErrors;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
