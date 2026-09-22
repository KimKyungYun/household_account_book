import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.');

export const recurrenceFreqSchema = z.enum(['WEEKLY', 'MONTHLY', 'YEARLY']);

const baseFields = {
  name: z.string().trim().min(1, '이름을 입력해 주세요.').max(30),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  memberId: z.string().min(1, '결제할 사람을 골라 주세요.'),
  categoryId: z.string().min(1).nullable().optional(),
  paymentMethodId: z.string().min(1).nullable().optional(),
  amount: z.number().int().positive('금액을 입력해 주세요.'),
  /** false 면 확인 대기(PENDING) 로 만든다 — 전기요금처럼 매달 금액이 바뀌는 항목. */
  amountIsFixed: z.boolean().default(true),
  splitMode: z.enum(['SHARED', 'PERSONAL']).default('SHARED'),
  memo: z.string().trim().max(200).optional(),
  freq: recurrenceFreqSchema,
  interval: z.number().int().min(1).max(12).default(1),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
  weekday: z.number().int().min(0).max(6).nullable().optional(),
  monthOfYear: z.number().int().min(1).max(12).nullable().optional(),
  startDate: dateSchema,
  endDate: dateSchema.nullable().optional(),
};

/** 주기마다 필요한 필드가 채워졌는지 — DB CHECK 와 같은 규칙을 폼에서도 막는다. */
interface RecurrenceShape {
  freq: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  dayOfMonth?: number | null;
  weekday?: number | null;
  monthOfYear?: number | null;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  categoryId?: string | null;
  startDate: string;
  endDate?: string | null;
}

function checkShape(value: RecurrenceShape, ctx: z.RefinementCtx) {
  if (value.freq === 'MONTHLY' && typeof value.dayOfMonth !== 'number') {
    ctx.addIssue({ code: 'custom', path: ['dayOfMonth'], message: '며칠에 반복할지 골라 주세요.' });
  }
  if (value.freq === 'WEEKLY' && typeof value.weekday !== 'number') {
    ctx.addIssue({ code: 'custom', path: ['weekday'], message: '무슨 요일에 반복할지 골라 주세요.' });
  }
  if (value.freq === 'YEARLY' && (typeof value.dayOfMonth !== 'number' || typeof value.monthOfYear !== 'number')) {
    ctx.addIssue({ code: 'custom', path: ['monthOfYear'], message: '몇 월 며칠에 반복할지 골라 주세요.' });
  }
  if (value.type !== 'TRANSFER' && !value.categoryId) {
    ctx.addIssue({ code: 'custom', path: ['categoryId'], message: '카테고리를 골라 주세요.' });
  }
  if (value.endDate && value.endDate < value.startDate) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: '종료일이 시작일보다 이릅니다.' });
  }
}

export const createRecurringSchema = z.object(baseFields).superRefine(checkShape);
export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;

export const updateRecurringSchema = z
  .object({ ...baseFields, isActive: z.boolean().default(true) })
  .superRefine(checkShape);
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;

export const recurringIdParamsSchema = z.object({ id: z.string().min(1) });

export const runRecurringSchema = z.object({
  until: dateSchema.optional(),
});
