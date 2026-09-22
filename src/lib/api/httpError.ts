import type { ApiErrorCode } from '@/interface/errorType';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  STALE_WRITE: 409,
  INTERNAL: 500,
};

/**
 * Route Handler 가 던지는 에러. withHandler 가 잡아서 HTTP 로 바꾼다.
 * 프론트의 ApiError 와 같은 본문 형태를 쓰므로 화면에서 분기 없이 처리된다.
 */
export class HttpError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(code: ApiErrorCode, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'HttpError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.fieldErrors = fieldErrors;
  }
}

export const badRequest = (message: string, fieldErrors?: Record<string, string>) =>
  new HttpError('VALIDATION', message, fieldErrors);
export const unauthorized = (message = '로그인이 필요합니다.') => new HttpError('UNAUTHORIZED', message);
export const forbidden = (message = '권한이 없습니다.') => new HttpError('FORBIDDEN', message);
export const notFound = (message = '대상을 찾을 수 없습니다.') => new HttpError('NOT_FOUND', message);
export const conflict = (message: string, fieldErrors?: Record<string, string>) =>
  new HttpError('CONFLICT', message, fieldErrors);
export const staleWrite = (message = '다른 곳에서 먼저 수정했습니다. 새로 불러온 뒤 다시 저장해 주세요.') =>
  new HttpError('STALE_WRITE', message);
