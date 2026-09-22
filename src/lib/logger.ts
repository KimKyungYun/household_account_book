/**
 * 서버 로깅 창구. `no-console` 규칙을 여기 한 곳에서만 예외 처리한다.
 * 화면 코드에서는 쓰지 않는다 — 브라우저 콘솔에 남길 것은 토스트로 보여줄 것이다.
 */
/* eslint-disable no-console */
export const logger = {
  warn: (message: string, meta?: unknown) => {
    console.warn(`[hab] ${message}`, meta ?? '');
  },
  error: (message: string, meta?: unknown) => {
    console.error(`[hab] ${message}`, meta ?? '');
  },
};
