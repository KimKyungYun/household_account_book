import { z } from 'zod';

export const assetKindSchema = z.enum(['SAVINGS', 'INVESTMENT', 'CASH', 'PENSION', 'OTHER']);

export const createAssetSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요.').max(30),
  kind: assetKindSchema,
  ownerMemberId: z.string().min(1).nullable().optional(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, '색은 #RRGGBB 형식이어야 합니다.').nullable().optional(),
  openingBalance: z.number().int().min(0, '시작 잔액은 0원 이상이어야 합니다.').default(0),
  targetAmount: z.number().int().positive('목표액은 0원보다 커야 합니다.').nullable().optional(),
  memo: z.string().trim().max(200).nullable().optional(),
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
    from: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '연월은 YYYY-MM 형식이어야 합니다.'),
    to: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '연월은 YYYY-MM 형식이어야 합니다.'),
  })
  .refine((value) => value.from <= value.to, { message: '시작 월이 종료 월보다 늦습니다.', path: ['from'] })
  .refine((value) => monthsBetween(value.from, value.to) <= TREND_MAX_MONTHS, {
    message: '한 번에 5년까지 볼 수 있습니다.',
    path: ['to'],
  });
export type AssetTrendQuery = z.infer<typeof assetTrendQuerySchema>;
