import { z } from 'zod';

export const budgetQuerySchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '연월은 YYYY-MM 형식이어야 합니다.'),
});

export const putBudgetsSchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  items: z
    .array(
      z.object({
        categoryId: z.string().min(1),
        /** null 이면 행을 지운다 — '미설정'으로 되돌리는 유일한 방법이다. */
        amount: z.number().int().min(0).nullable(),
      }),
    )
    .min(1),
});
export type PutBudgetsInput = z.infer<typeof putBudgetsSchema>;

export const copyBudgetSchema = z.object({
  fromYearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  toYearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  overwrite: z.boolean().default(false),
});
export type CopyBudgetInput = z.infer<typeof copyBudgetSchema>;
