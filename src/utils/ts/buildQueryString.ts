/**
 * null·undefined·빈 문자열·빈 배열을 뺀 쿼리 문자열을 만든다.
 * 배열은 콤마로 이어 붙인다 (서버의 csv 파라미터 규약과 맞춘다).
 */
export default function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';

  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;

    if (Array.isArray(value)) {
      const items = value.filter((item) => item !== null && item !== undefined && item !== '');
      if (items.length === 0) continue;
      search.set(key, items.join(','));
      continue;
    }

    search.set(key, String(value));
  }

  const query = search.toString();

  return query ? `?${query}` : '';
}
