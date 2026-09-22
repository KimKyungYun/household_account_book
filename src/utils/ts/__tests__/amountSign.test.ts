import { describe, expect, it } from 'vitest';
import amountSign from '@/utils/ts/amountSign';

describe('amountSign', () => {
  it('0원은 방향이 없어 부호를 붙이지 않는다', () => {
    expect(amountSign(0, 'expense', 'tone')).toBe('');
    expect(amountSign(0, 'income', 'value')).toBe('');
  });

  it('none 은 음수만 표시한다', () => {
    expect(amountSign(1000, 'neutral', 'none')).toBe('');
    expect(amountSign(-1000, 'neutral', 'none')).toBe('−');
  });

  it('value 는 증감을 그대로 보여준다 — 지출이 늘면 +', () => {
    expect(amountSign(162_500, 'expense', 'value')).toBe('+');
    expect(amountSign(-162_500, 'income', 'value')).toBe('−');
  });

  it('tone 은 지출을 나간 돈으로 보여준다', () => {
    expect(amountSign(34_500, 'expense', 'tone')).toBe('−');
    expect(amountSign(3_250_000, 'income', 'tone')).toBe('+');
  });

  it('tone 에서 환불(음수 지출)은 들어온 돈으로 보인다', () => {
    expect(amountSign(-30_000, 'expense', 'tone')).toBe('+');
  });

  it('이체는 방향을 말하지 않는다', () => {
    expect(amountSign(500_000, 'transfer', 'tone')).toBe('');
  });
});
