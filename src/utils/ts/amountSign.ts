export type AmountTone = 'income' | 'expense' | 'transfer' | 'neutral';

/**
 * 부호를 어떻게 붙일지.
 *
 *  - `none`  부호 없음. 음수만 − 를 붙인다. (합계·잔액)
 *  - `value` 값의 부호를 그대로. 양수 +, 음수 −. (증감·차액)
 *  - `tone`  거래 성격을 따른다. 지출 −, 수입 +. 저장 금액이 양수여도 지출은 − 로 보인다.
 */
export type AmountSignMode = 'none' | 'value' | 'tone';

/**
 * 금액 앞에 붙일 부호를 고른다.
 *
 * `tone` 과 `value` 를 구분하지 않으면 "지출이 16만원 늘었다"가 `−162,500` 으로 나온다.
 * 화면 전체의 숫자가 걸려 있어 규칙을 순수 함수로 떼고 테스트로 못 박았다.
 */
export default function amountSign(value: number, tone: AmountTone, signMode: AmountSignMode): string {
  // 0원은 늘어난 것도 줄어든 것도 아니다.
  if (value === 0) return '';
  if (signMode === 'none') return value < 0 ? '−' : '';
  if (signMode === 'value') return value < 0 ? '−' : '+';

  // tone — 환불(음수 지출)은 들어온 돈으로 보여야 한다.
  if (tone === 'expense') return value < 0 ? '+' : '−';
  if (tone === 'income') return value < 0 ? '−' : '+';

  // 이체는 수입도 지출도 아니라 방향을 말하지 않는다.
  return value < 0 ? '−' : '';
}
