import { z } from 'zod';

export const categoryKindSchema = z.enum(['EXPENSE', 'INCOME', 'TRANSFER']);
export const splitModeSchema = z.enum(['SHARED', 'PERSONAL']);

export const categoryTreeQuerySchema = z.object({
  kind: categoryKindSchema.optional(),
  /** 'true' 면 보관된 카테고리도 함께 준다. 기본은 쓰는 것만. */
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});
export type CategoryTreeQuery = z.infer<typeof categoryTreeQuerySchema>;

const nameSchema = z
  .string()
  .trim()
  .min(1, '이름을 입력해 주세요.')
  .max(20, '이름은 20자까지 쓸 수 있어요.');

export const createCategorySchema = z.object({
  name: nameSchema,
  kind: categoryKindSchema,
  /** 없으면 대분류, 있으면 그 아래 소분류. */
  parentId: z.string().min(1).nullable().optional(),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, '색은 #RRGGBB 형식이어야 해요.')
    .nullable()
    .optional(),
  defaultSplitMode: splitModeSchema.nullable().optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: nameSchema.optional(),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, '색은 #RRGGBB 형식이어야 해요.')
    .nullable()
    .optional(),
  defaultSplitMode: splitModeSchema.nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const mergeCategorySchema = z.object({
  intoCategoryId: z.string().min(1, '옮길 카테고리를 골라 주세요.'),
});
export type MergeCategoryInput = z.infer<typeof mergeCategorySchema>;

export const categoryIdParamsSchema = z.object({ id: z.string().min(1) });
