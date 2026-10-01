import type { HouseholdKind, MemberRelation } from '@/generated/prisma/enums';

/**
 * 가구 유형의 규칙 — 정원, 고를 수 있는 관계, 나누기 여부.
 *
 * 서버(정원 검사·관계 검증)와 화면(선택지·문구)이 이 표 하나를 같이 본다.
 * 따로 적으면 화면에서는 고를 수 있는데 서버가 거절하는 관계가 생긴다.
 */
interface KindRule {
  label: string;
  description: string;
  /** 이 가구에 들어올 수 있는 최대 인원. */
  capacity: number;
  /** 고를 수 있는 관계. 첫 값이 기본값이다. */
  relations: readonly MemberRelation[];
  /** '같이 쓴 돈 / 각자 쓴 돈' 구분이 의미가 있는지. 혼자면 나눌 상대가 없다. */
  isShared: boolean;
}

export const HOUSEHOLD_KIND_RULES: Record<HouseholdKind, KindRule> = {
  COUPLE: {
    label: '부부',
    description: '두 사람이 함께 쓰는 장부',
    capacity: 2,
    relations: ['HUSBAND', 'WIFE'],
    isShared: true,
  },
  FAMILY: {
    label: '가족',
    description: '부모님·자녀까지 최대 6명',
    capacity: 6,
    relations: ['FATHER', 'MOTHER', 'CHILD', 'GRANDPARENT', 'OTHER'],
    isShared: true,
  },
  SOLO: {
    label: '개인',
    description: '혼자 쓰는 장부',
    capacity: 1,
    relations: ['SELF'],
    isShared: false,
  },
};

export const HOUSEHOLD_KINDS = ['COUPLE', 'FAMILY', 'SOLO'] as const satisfies readonly HouseholdKind[];

export const MEMBER_RELATIONS = [
  'HUSBAND',
  'WIFE',
  'FATHER',
  'MOTHER',
  'CHILD',
  'GRANDPARENT',
  'OTHER',
  'SELF',
] as const satisfies readonly MemberRelation[];

export const RELATION_LABEL: Record<MemberRelation, string> = {
  HUSBAND: '남편',
  WIFE: '아내',
  FATHER: '아빠',
  MOTHER: '엄마',
  CHILD: '자녀',
  GRANDPARENT: '조부모',
  OTHER: '기타',
  SELF: '본인',
};

/**
 * 구성원 색. 들어온 순서(slot)대로 하나씩 쓴다.
 * 앞의 둘은 부부 시절의 파랑·호박과 같아 기존 가구의 색이 바뀌지 않는다.
 */
export const MEMBER_COLORS = ['#1f6feb', '#d97706', '#16a34a', '#db2777', '#7c3aed', '#0891b2'] as const;

export function memberColorOf(slot: number): string {
  return MEMBER_COLORS[slot % MEMBER_COLORS.length] ?? MEMBER_COLORS[0];
}

export function isRelationAllowed(kind: HouseholdKind, relation: MemberRelation): boolean {
  return HOUSEHOLD_KIND_RULES[kind].relations.includes(relation);
}

/**
 * 유형을 바꿀 때 지금 관계를 새 유형에 맞춘다.
 * 남편↔아빠, 아내↔엄마처럼 뜻이 이어지는 것은 옮기고, 나머지는 새 유형의 기본값으로 둔다.
 * 맞지 않으면 설정 화면에서 각자 고치면 된다.
 */
const RELATION_CARRY: Partial<Record<MemberRelation, MemberRelation>> = {
  HUSBAND: 'FATHER',
  WIFE: 'MOTHER',
  FATHER: 'HUSBAND',
  MOTHER: 'WIFE',
};

export function relationForKind(kind: HouseholdKind, current: MemberRelation): MemberRelation {
  if (isRelationAllowed(kind, current)) return current;

  const carried = RELATION_CARRY[current];
  if (carried && isRelationAllowed(kind, carried)) return carried;

  return HOUSEHOLD_KIND_RULES[kind].relations[0] ?? 'OTHER';
}
