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

export const assetTrendQuerySchema = z
  .object({
    from: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '연월은 YYYY-MM 형식이어야 합니다.'),
    to: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '연월은 YYYY-MM 형식이어야 합니다.'),
  })
  .refine((value) => value.from <= value.to, { message: '시작 월이 종료 월보다 늦습니다.', path: ['from'] });
export type AssetTrendQuery = z.infer<typeof assetTrendQuerySchema>;
