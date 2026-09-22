/**
 * 사용자가 친 금액 문자열을 정수(원)로 만든다.
 * "1,500,000" · "1500000원" · " 12000 " 을 모두 받고, 소수점은 반올림한다.
 * 비어 있거나 숫자가 없으면 null — 폼에서 '미입력'과 '0원'을 구분해야 한다.
 */
export default function parseMoneyInput(input: string): number | null {
  const cleaned = input.replace(/[^\d.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;

  return Math.round(parsed);
}
