import { isApiError } from '@/interface/errorType';

/** 화면에 보여줄 에러 문구를 고른다. 서버 문구가 있으면 그대로 쓴다. */
export default function checkApiError(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;

  return '오류가 발생했습니다.';
}
