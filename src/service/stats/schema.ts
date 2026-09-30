import { z } from 'zod';

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '연월은 YYYY-MM 형식이어야 합니다.');

export const overviewQuerySchema = z.object({ yearMonth });

export const dailyQuerySchema = z.object({ yearMonth });

export const monthlyQuerySchema = z
  .object({ from: yearMonth, to: yearMonth })
  .refine((value) => value.from <= value.to, { message: '시작 월이 종료 월보다 늦습니다.', path: ['from'] });

export const categoryStatsQuerySchema = z.object({
  yearMonth,
  /** 1 = 대분류 비중, 2 = 소분류 비중 */
  level: z.coerce.number().int().min(1).max(2).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(8),
});

export const memberStatsQuerySchema = z.object({ yearMonth });
