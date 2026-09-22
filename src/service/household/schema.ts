import { z } from 'zod';

export const updateHouseholdSchema = z.object({
  name: z.string().trim().min(1, '가구 이름을 입력해 주세요.').max(30).optional(),
  members: z
    .array(
      z.object({
        id: z.string().min(1),
        displayName: z.string().trim().min(1, '이름을 입력해 주세요.').max(20),
        colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, '색은 #RRGGBB 형식이어야 합니다.'),
        /** basis point. 구성원 합이 10000 이어야 한다. */
        defaultShareBp: z.number().int().min(0).max(10_000),
      }),
    )
    .min(1)
    .optional(),
});
export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>;
