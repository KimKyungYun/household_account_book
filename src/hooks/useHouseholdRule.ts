'use client';

import { useMe } from '@/hooks/useMe';
import { HOUSEHOLD_KIND_RULES } from '@/service/household/kind';

/**
 * 지금 가구의 유형 규칙과 구성원. 화면마다 '누가 냈나'·'같이/각자'를 보여 줄지 정할 때 쓴다.
 *
 *  - `hasOthers`  함께 쓰는 사람이 있는지. 없으면 '누가 냈나'를 묻지 않는다(답이 하나뿐이다).
 *  - `isShared`   '같이 쓴 돈 / 각자 쓴 돈' 구분이 의미 있는 유형인지. 개인 장부는 나눌 상대가 없다.
 *
 * 부부 장부에 아직 혼자인 경우 `hasOthers` 는 false 지만 `isShared` 는 true 다 —
 * 상대가 합류하기 전에 적은 생활비도 '같이 쓴 돈'으로 남아야 한다.
 */
export function useHouseholdRule() {
  const me = useMe();
  const kind = me.data?.household?.kind ?? 'COUPLE';
  const members = me.data?.members ?? [];
  const rule = HOUSEHOLD_KIND_RULES[kind];

  return {
    kind,
    rule,
    members,
    hasOthers: members.length > 1,
    isShared: rule.isShared,
  };
}
