import { describe, expect, it } from 'vitest';
import { categoryEmoji, FALLBACK_CATEGORY_EMOJI } from '@/utils/ts/categoryEmoji';

describe('분류 아이콘', () => {
  it('정해 둔 아이콘이 이긴다', () => {
    expect(categoryEmoji('식비', '🍜')).toBe('🍜');
  });

  it('기본 분류는 이름으로 찾는다', () => {
    expect(categoryEmoji('식비')).toBe('🍚');
    expect(categoryEmoji('근로소득')).toBe('💼');
  });

  it('사용자가 만든 분류는 이름의 낱말로 짐작한다', () => {
    expect(categoryEmoji('강아지 병원비')).toBe('💊');
    expect(categoryEmoji('넷플릭스 구독')).toBe('🎬');
  });

  it('소분류는 자기 이름과 상관없이 상위 분류의 아이콘을 따른다', () => {
    expect(categoryEmoji('점심', null, { name: '식비' })).toBe('🍚');
    // 소분류 이름이 다른 분류의 낱말을 품고 있어도 상위 분류를 따른다.
    expect(categoryEmoji('택시', null, { name: '식비' })).toBe('🍚');
    // 소분류에 아이콘을 정해 두었어도 상위 분류를 따른다.
    expect(categoryEmoji('카페', '☕', { name: '식비' })).toBe('🍚');
    // 상위 분류에 정해 둔 아이콘이 있으면 그것을 쓴다.
    expect(categoryEmoji('점심', null, { name: '식비', icon: '🍜' })).toBe('🍜');
  });

  it('못 고르면 기본 아이콘', () => {
    expect(categoryEmoji('알 수 없음')).toBe(FALLBACK_CATEGORY_EMOJI);
  });
});
