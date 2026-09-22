/**
 * 금액을 원 단위 콤마 표기로 만든다. 부호는 붙이지 않는다 — Amount 컴포넌트가 붙인다.
 * 값은 항상 정수(원)다.
 */
export default function formatMoney(amount: number): string {
  return Math.abs(Math.trunc(amount)).toLocaleString('ko-KR');
}
