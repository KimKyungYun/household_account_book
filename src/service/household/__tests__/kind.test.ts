import { describe, expect, it } from 'vitest';
import { HOUSEHOLD_KIND_RULES, isRelationAllowed, MEMBER_COLORS, memberColorOf, relationForKind } from '@/service/household/kind';

describe('가구 유형 규칙', () => {
  it('정원은 부부 2 · 가족 6 · 개인 1', () => {
    expect(HOUSEHOLD_KIND_RULES.COUPLE.capacity).toBe(2);
    expect(HOUSEHOLD_KIND_RULES.FAMILY.capacity).toBe(6);
    expect(HOUSEHOLD_KIND_RULES.SOLO.capacity).toBe(1);
  });

  it('가족 정원만큼 색이 겹치지 않는다', () => {
    const colors = Array.from({ length: HOUSEHOLD_KIND_RULES.FAMILY.capacity }, (_, slot) => memberColorOf(slot));
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('기존 부부 가구의 색(0 파랑, 1 호박)이 그대로다', () => {
    expect(memberColorOf(0)).toBe('#1f6feb');
    expect(memberColorOf(1)).toBe('#d97706');
    expect(MEMBER_COLORS).toHaveLength(6);
  });

  it('유형에 없는 관계는 고를 수 없다', () => {
    expect(isRelationAllowed('COUPLE', 'HUSBAND')).toBe(true);
    expect(isRelationAllowed('COUPLE', 'CHILD')).toBe(false);
    expect(isRelationAllowed('SOLO', 'SELF')).toBe(true);
    expect(isRelationAllowed('FAMILY', 'SELF')).toBe(false);
  });
});

describe('유형을 바꿀 때 관계 옮기기', () => {
  it('맞는 관계는 그대로 둔다', () => {
    expect(relationForKind('FAMILY', 'CHILD')).toBe('CHILD');
  });

  it('부부 → 가족: 남편은 아빠, 아내는 엄마', () => {
    expect(relationForKind('FAMILY', 'HUSBAND')).toBe('FATHER');
    expect(relationForKind('FAMILY', 'WIFE')).toBe('MOTHER');
  });

  it('가족 → 부부: 아빠는 남편, 엄마는 아내, 나머지는 첫 값', () => {
    expect(relationForKind('COUPLE', 'FATHER')).toBe('HUSBAND');
    expect(relationForKind('COUPLE', 'MOTHER')).toBe('WIFE');
    expect(relationForKind('COUPLE', 'CHILD')).toBe('HUSBAND');
  });

  it('개인으로 바꾸면 본인', () => {
    expect(relationForKind('SOLO', 'WIFE')).toBe('SELF');
  });

  it('개인 → 가족: 본인은 가족의 첫 값(아빠)', () => {
    expect(relationForKind('FAMILY', 'SELF')).toBe('FATHER');
  });
});
