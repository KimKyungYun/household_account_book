import { z } from 'zod';
import { HOUSEHOLD_KINDS, MEMBER_RELATIONS } from '@/service/household/kind';

export const updateHouseholdSchema = z.object({
  name: z.string().trim().min(1, '가구 이름을 입력해 주세요.').max(30).optional(),
  /** 바꾸면 정원과 고를 수 있는 관계가 달라진다. 인원이 넘치면 서버가 거절한다. */
  kind: z.enum(HOUSEHOLD_KINDS).optional(),
  members: z
    .array(
      z.object({
        id: z.string().min(1),
        displayName: z.string().trim().min(1, '이름을 입력해 주세요.').max(20),
        relation: z.enum(MEMBER_RELATIONS),
      }),
    )
    .min(1)
    .optional(),
});
export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>;

/** 초기화 확인 문구. 화면에서 이 글자를 그대로 입력해야 실행 버튼이 켜지고, 서버도 같은 값을 다시 확인한다. */
export const RESET_CONFIRM_TEXT = '초기화';

export const resetHouseholdSchema = z.object({
  confirm: z.literal(RESET_CONFIRM_TEXT, { error: `'${RESET_CONFIRM_TEXT}'를 입력해 주세요.` }),
});
export type ResetHouseholdInput = z.infer<typeof resetHouseholdSchema>;
