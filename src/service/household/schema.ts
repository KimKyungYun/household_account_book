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
