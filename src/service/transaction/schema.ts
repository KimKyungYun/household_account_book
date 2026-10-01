import { z } from 'zod';

export const transactionTypeSchema = z.enum(['INCOME', 'EXPENSE', 'TRANSFER']);
export const splitModeSchema = z.enum(['SHARED', 'PERSONAL']);

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 해요.');

/** csv 로 온 파라미터를 배열로 바꾼다. 빈 값은 undefined 로 떨군다. */
const csvIds = z
  .string()
  .optional()
  .transform((value) => (value ? value.split(',').filter(Boolean) : undefined));

/** csv 파라미터를 enum 배열로. 허용하지 않는 값이 섞이면 400 이 난다. */
function csvEnum<T extends string>(values: readonly T[]) {
  return z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',').filter(Boolean) : undefined))
    .refine((list) => !list || list.every((item) => (values as readonly string[]).includes(item)), '값이 올바르지 않아요.')
    .transform((list) => list as T[] | undefined);
}

const TRANSACTION_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'] as const;
const SPLIT_MODES = ['SHARED', 'PERSONAL'] as const;

export const transactionListQuerySchema = z
  .object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
    memberId: csvIds,
    categoryId: csvIds,
    type: csvEnum(TRANSACTION_TYPES),
    paymentMethodId: csvIds,
    splitMode: csvEnum(SPLIT_MODES),
    minAmount: z.coerce.number().int().nonnegative().optional(),
    maxAmount: z.coerce.number().int().nonnegative().optional(),
    q: z.string().trim().max(100).optional(),
    sort: z.enum(['date.desc', 'date.asc', 'amount.desc', 'amount.asc', 'createdAt.desc']).default('date.desc'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(50),
  })
  .refine((value) => !(value.from && value.to) || value.from <= value.to, {
    message: '시작일이 종료일보다 늦어요.',
    path: ['from'],
  });
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;

export const createTransactionSchema = z
  .object({
    date: dateSchema,
    type: transactionTypeSchema,
    /** 원 단위 정수. 0 은 허용하지 않는다(DB 제약과 같은 규칙). */
    amount: z.number().int().refine((value) => value !== 0, '금액을 입력해 주세요.'),
    memberId: z.string().min(1, '누가 한 거래인지 골라 주세요.'),
    categoryId: z.string().min(1).nullable().optional(),
    paymentMethodId: z.string().min(1).nullable().optional(),
    splitMode: splitModeSchema.optional(),
    /** 이 돈이 쌓이는 자산. '옮긴 돈'에만 붙는다. */
    assetId: z.string().min(1).nullable().optional(),
    merchant: z.string().trim().max(60).optional(),
    memo: z.string().trim().max(200).optional(),
    /** 더블 서브밋 멱등키. 모바일 재시도에서 실제로 두 번 들어온다. */
    clientRequestId: z.string().min(1).max(64).optional(),
  })
  .refine((value) => value.type === 'TRANSFER' || Boolean(value.categoryId), {
    message: '카테고리를 골라 주세요.',
    path: ['categoryId'],
  })
  .refine((value) => value.type !== 'TRANSFER' || value.amount > 0, {
    message: '이체 금액은 0보다 커야 해요.',
    path: ['amount'],
  })
  .refine((value) => !value.assetId || value.type === 'TRANSFER', {
    message: '자산은 옮긴 돈에만 붙일 수 있어요.',
    path: ['assetId'],
  });
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = z.object({
  date: dateSchema.optional(),
  amount: z.number().int().refine((value) => value !== 0, '금액을 입력해 주세요.').optional(),
  memberId: z.string().min(1).optional(),
  categoryId: z.string().min(1).nullable().optional(),
  paymentMethodId: z.string().min(1).nullable().optional(),
  splitMode: splitModeSchema.optional(),
  assetId: z.string().min(1).nullable().optional(),
  merchant: z.string().trim().max(60).nullable().optional(),
  memo: z.string().trim().max(200).nullable().optional(),
  /** 낙관적 락 — 상대가 먼저 고쳤으면 409 로 막는다. */
  version: z.number().int().min(0),
});
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const transactionIdParamsSchema = z.object({ id: z.string().min(1) });
