import { ApiError } from '@/interface/errorType';
import buildQueryString from '@/utils/ts/buildQueryString';
import type { ApiErrorBody } from '@/interface/errorType';

/**
 * 같은 프로젝트의 Route Handler 를 부르는 얇은 fetch 래퍼.
 *
 * axios 를 쓰지 않는 이유: 인터셉터가 해 주던 일(토큰 주입·refresh 재시도)이
 * Auth.js httpOnly 쿠키로 사라졌다. 남은 것은 아래 두 가지뿐이고, 이건 반드시 지켜야 한다.
 *
 *  1. fetch 는 404·500 에도 resolve 한다 → 직접 throw. 안 하면 react-query 가 성공으로 오인한다.
 *  2. 빈 값·빈 배열을 쿼리에서 빼야 한다 → buildQueryString. 안 하면 `categoryId=` 가 날아가 zod 가 터진다.
 */
const BASE = '/api';

async function toApiError(response: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> = {};
  try {
    body = (await response.json()) as Partial<ApiErrorBody>;
  } catch {
    body = {};
  }

  return new ApiError(response.status, body);
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

export const http = {
  get: <T>(path: string, params?: Record<string, unknown>) =>
    request<T>(`${path}${buildQueryString(params)}`, { method: 'GET' }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),

  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  /** 엑셀 등 파일 응답. 실패 시 본문이 JSON 일 수 있어 분기한다. */
  getBlob: async (path: string, params?: Record<string, unknown>): Promise<{ blob: Blob; filename?: string }> => {
    const response = await fetch(`${BASE}${path}${buildQueryString(params)}`, {
      method: 'GET',
      credentials: 'same-origin',
    });

    if (!response.ok) throw await toApiError(response);

    return {
      blob: await response.blob(),
      filename: parseFilename(response.headers.get('Content-Disposition')),
    };
  },
};

/** Content-Disposition 의 filename*=UTF-8''... 를 우선 읽는다 (한글 파일명). */
function parseFilename(header: string | null): string | undefined {
  if (!header) return undefined;

  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) return decodeURIComponent(utf8[1]);

  const plain = /filename="([^"]+)"/i.exec(header);

  return plain?.[1];
}
