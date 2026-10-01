import { z } from 'zod';

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '연월은 YYYY-MM 형식이어야 해요.');

export const overviewQuerySchema = z.object({ yearMonth });

export const dailyQuerySchema = z.object({ yearMonth });

export const monthlyQuerySchema = z
  .object({ from: yearMonth, to: yearMonth })
  .refine((value) => value.from <= value.to, { message: '시작 월이 종료 월보다 늦어요.', path: ['from'] });

export const categoryStatsQuerySchema = z.object({
  yearMonth,
  /** 어느 쪽 돈을 나눌지. 대시보드 요약은 번 돈도 분류별로 보여 준다. */
  type: z.enum(['EXPENSE', 'INCOME']).default('EXPENSE'),
  /** 1 = 대분류 비중, 2 = 소분류 비중 */
  level: z.coerce.number().int().min(1).max(2).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(8),
});

export const memberStatsQuerySchema = z.object({ yearMonth });
