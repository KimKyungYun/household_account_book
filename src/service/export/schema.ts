import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 해요.');

const EXCEL_SHEETS = ['summary', 'detail', 'pivot'] as const;

export const excelQuerySchema = z
  .object({
    from: dateSchema,
    to: dateSchema,
    /** 세 시트를 모두 낸다. 고르고 싶으면 콤마로 적는다. */
    sheets: z
      .string()
      .optional()
      .transform((value) => (value ? value.split(',').filter(Boolean) : ['summary', 'detail', 'pivot']))
      .refine((list) => list.every((item) => (EXCEL_SHEETS as readonly string[]).includes(item)), '알 수 없는 시트예요.')
      .refine((list) => list.length > 0, '시트를 하나 이상 골라 주세요.')
      .transform((list) => list as ('summary' | 'detail' | 'pivot')[]),
  })
  .refine((value) => value.from <= value.to, { message: '시작일이 종료일보다 늦어요.', path: ['from'] })
  // 기간이 너무 길면 응답이 커진다. 5년이면 2인 가구에 충분하다.
  .refine((value) => Number(value.to.slice(0, 4)) - Number(value.from.slice(0, 4)) <= 5, {
    message: '한 번에 5년까지 내보낼 수 있어요.',
    path: ['to'],
  });
export type ExcelQuery = z.infer<typeof excelQuerySchema>;
