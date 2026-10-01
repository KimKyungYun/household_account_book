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

/**
 * 대분류 아이콘(이모지 하나). null 이면 이름으로 골라 준다. 소분류는 대분류를 따르므로 저장하지 않는다.
 * 이모지 하나가 여러 코드 포인트(피부색·결합 문자)로 이루어질 수 있어 길이를 넉넉히 둔다.
 */
const iconSchema = z.string().trim().min(1).max(16, '아이콘은 이모지 하나만 고를 수 있어요.').nullable().optional();

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
  icon: iconSchema,
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
  icon: iconSchema,
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const mergeCategorySchema = z.object({
  intoCategoryId: z.string().min(1, '옮길 카테고리를 골라 주세요.'),
});
export type MergeCategoryInput = z.infer<typeof mergeCategorySchema>;

export const categoryIdParamsSchema = z.object({ id: z.string().min(1) });
