import { z } from 'zod';

/** 'YYYY-MM'. 클라이언트 폼과 Route Handler 가 같은 스키마를 쓴다. */
export const yearMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, '연월은 YYYY-MM 형식이어야 합니다.');

export const settlementQuerySchema = z.object({
  yearMonth: yearMonthSchema,
});

export type SettlementQuery = z.infer<typeof settlementQuerySchema>;
