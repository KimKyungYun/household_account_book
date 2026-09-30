import { http } from '@/service/httpClient';
import type { CategoryShareDto, DailyTotalDto, MemberStatDto, MonthlyPointDto, OverviewDto } from '@/service/stats/type';

export function getOverview(yearMonth: string) {
  return http.get<OverviewDto>('/stats/overview', { yearMonth });
}

export function getMonthlyTrend(params: { from: string; to: string }) {
  return http.get<MonthlyPointDto[]>('/stats/monthly', params);
}

export function getCategoryShares(params: { yearMonth: string; level?: number; limit?: number }) {
  return http.get<CategoryShareDto[]>('/stats/categories', params);
}

export function getMemberStats(yearMonth: string) {
  return http.get<MemberStatDto[]>('/stats/members', yearMonth ? { yearMonth } : undefined);
}

export function getDailyTotals(yearMonth: string) {
  return http.get<DailyTotalDto[]>('/stats/daily', { yearMonth });
}
