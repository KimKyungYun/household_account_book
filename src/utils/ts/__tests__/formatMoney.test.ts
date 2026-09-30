import { describe, expect, it } from 'vitest';
import formatMoney, { formatMoneyCompact } from '@/utils/ts/formatMoney';

describe('formatMoney', () => {
  it('원 단위 콤마로 적고 부호는 붙이지 않는다', () => {
    expect(formatMoney(6_130_000)).toBe('6,130,000');
    expect(formatMoney(-6_130_000)).toBe('6,130,000');
    expect(formatMoney(0)).toBe('0');
  });
});

describe('formatMoneyCompact', () => {
  it('만 미만은 그대로 적는다', () => {
    expect(formatMoneyCompact(0)).toBe('0');
    expect(formatMoneyCompact(9_999)).toBe('9,999');
  });

  it('만 단위로 줄인다', () => {
    expect(formatMoneyCompact(10_000)).toBe('1만');
    expect(formatMoneyCompact(6_130_000)).toBe('613만');
  });

  it('억 위에는 만을 함께 적는다', () => {
    expect(formatMoneyCompact(100_000_000)).toBe('1억');
    expect(formatMoneyCompact(123_456_789)).toBe('1억 2,346만');
    expect(formatMoneyCompact(1_234_567_890)).toBe('12억 3,457만');
  });

  // 반올림이 경계를 넘으면 '10,000만' 이나 '1억 10,000만' 이 되기 쉽다.
  it('반올림이 단위를 채우면 윗 단위로 올린다', () => {
    expect(formatMoneyCompact(99_999_999)).toBe('1억');
    expect(formatMoneyCompact(199_995_000)).toBe('2억');
  });

  it('부호는 붙이지 않는다 — Amount 가 붙인다', () => {
    expect(formatMoneyCompact(-6_130_000)).toBe('613만');
  });
});
