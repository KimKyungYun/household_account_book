import { z } from 'zod';

export const loanKindSchema = z.enum(['MORTGAGE', 'JEONSE', 'CREDIT', 'CAR', 'STUDENT', 'OTHER']);
export const repaymentTypeSchema = z.enum(['EQUAL_PAYMENT', 'EQUAL_PRINCIPAL', 'INTEREST_ONLY']);

/**
 * 상한 40 년. 국내 정책 주담대가 최장 40 년(480 개월)이고, 상한이 없으면 오타 하나로
 * 스케줄 행이 수만 개 만들어진다.
 */
const MAX_TERM_MONTHS = 480;

const loanFields = {
  name: z.string().trim().min(1, '대출 이름을 입력해 주세요.').max(30),
  kind: loanKindSchema,
  principal: z
    .number()
    .int()
    .positive('원금은 0원보다 커야 해요.')
    .max(2_000_000_000, '원금이 너무 커요.'),
  /** 4.25% → 425. 화면에서 % 를 받아 100 배로 바꿔 보낸다. */
  annualRateBp: z
    .number()
    .int('금리는 소수 둘째 자리까지 넣을 수 있어요.')
    .min(0, '금리는 0% 이상이어야 해요.')
    .max(10_000, '금리는 100% 를 넘을 수 없어요.'),
  repaymentType: repaymentTypeSchema,
  termMonths: z
    .number()
    .int()
    .positive('상환 기간을 입력해 주세요.')
    .max(MAX_TERM_MONTHS, '상환 기간은 40년(480개월)까지 넣을 수 있어요.'),
  gracePeriodMonths: z.number().int().min(0, '거치 기간은 0개월 이상이어야 해요.').default(0),
  firstPaymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '첫 상환일은 YYYY-MM-DD 형식이어야 해요.'),
  memberId: z.string().min(1, '상환하는 사람을 골라 주세요.'),
  paymentMethodId: z.string().min(1).nullable().optional(),
  interestCategoryId: z.string().min(1, '이자를 기록할 분류를 골라 주세요.'),
  principalCategoryId: z.string().min(1, '원금을 기록할 분류를 골라 주세요.'),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, '색은 #RRGGBB 형식이어야 해요.')
    .nullable()
    .optional(),
  memo: z.string().trim().max(200).nullable().optional(),
  includeInNetWorth: z.boolean().default(true),
};

/** 거치가 전체 기간을 넘으면 갚을 구간이 없어진다. DB CHECK 와 같은 규칙을 폼에서도 막는다. */
const graceWithinTerm = (value: { termMonths: number; gracePeriodMonths?: number }) =>
  (value.gracePeriodMonths ?? 0) <= value.termMonths;

export const createLoanSchema = z.object(loanFields).refine(graceWithinTerm, {
  message: '거치 기간은 전체 상환 기간보다 길 수 없어요.',
  path: ['gracePeriodMonths'],
});
export type CreateLoanInput = z.infer<typeof createLoanSchema>;

/**
 * 조건을 고치면 스케줄을 다시 만든다. 이미 거래가 생긴 회차는 그대로 두므로
 * 지난 기록이 사라지지 않는다(자세한 규칙은 repository 의 `updateLoan`).
 */
export const updateLoanSchema = z
  .object(loanFields)
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((value) => value.termMonths === undefined || graceWithinTerm(value as never), {
    message: '거치 기간은 전체 상환 기간보다 길 수 없어요.',
    path: ['gracePeriodMonths'],
  });
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>;

export const loanIdParamsSchema = z.object({ id: z.string().min(1) });
