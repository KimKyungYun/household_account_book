import { z } from 'zod';

export const assetKindSchema = z.enum(['SAVINGS', 'INVESTMENT', 'CASH', 'PENSION', 'OTHER']);

/**
 * 매달 자동으로 넣기.
 *
 * 분류·결제자 같은 나머지 항목은 서버가 기본값으로 채운다 — 자산을 만들면서
 * 고를 것이 늘면 정작 자산 등록이 무거워진다. 세밀한 조정은 반복 거래 화면에서 한다.
 */
export const autoDepositSchema = z.object({
  amount: z.number().int().positive('넣을 금액을 입력해 주세요.'),
  /** 31 은 말일을 겸한다 — 그 달 일수로 클램프된다. */
  dayOfMonth: z.number().int().min(1, '1~31 사이로 정해 주세요.').max(31, '1~31 사이로 정해 주세요.'),
});
export type AutoDepositInput = z.infer<typeof autoDepositSchema>;

export const createAssetSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요.').max(30),
  kind: assetKindSchema,
  ownerMemberId: z.string().min(1).nullable().optional(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, '색은 #RRGGBB 형식이어야 해요.').nullable().optional(),
  openingBalance: z.number().int().min(0, '시작 잔액은 0원 이상이어야 해요.').default(0),
  targetAmount: z.number().int().positive('목표액은 0원보다 커야 해요.').nullable().optional(),
  memo: z.string().trim().max(200).nullable().optional(),
  /** null 이면 자동 적립을 끈다(규칙이 있으면 중지). 생략하면 건드리지 않는다. */
  autoDeposit: autoDepositSchema.nullable().optional(),
});
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const updateAssetSchema = createAssetSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

export const assetIdParamsSchema = z.object({ id: z.string().min(1) });

/**
 * 한 번에 볼 수 있는 기간 상한(개월).
 *
 * 상한이 없으면 `1900-01 ~ 2999-12` 같은 요청 하나로 달마다 행을 만드는 루프가
 * 1만 번 넘게 돈다. 화면이 쓰는 것은 12개월이고, 5년이면 넉넉하다.
 */
const TREND_MAX_MONTHS = 60;

function monthsBetween(from: string, to: string): number {
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);

  return (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1;
}

export const assetTrendQuerySchema = z
  .object({
    from: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '연월은 YYYY-MM 형식이어야 해요.'),
    to: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '연월은 YYYY-MM 형식이어야 해요.'),
  })
  .refine((value) => value.from <= value.to, { message: '시작 월이 종료 월보다 늦어요.', path: ['from'] })
  .refine((value) => monthsBetween(value.from, value.to) <= TREND_MAX_MONTHS, {
    message: '한 번에 5년까지 볼 수 있어요.',
    path: ['to'],
  });
export type AssetTrendQuery = z.infer<typeof assetTrendQuerySchema>;
