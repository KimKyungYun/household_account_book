'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import Card from '@/components/common/Card';
import Skeleton from '@/components/common/Skeleton';
import MonthGrid from '@/components/transaction/MonthGrid';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { PATH } from '@/routes/paths';
import { getDailyTotals } from '@/service/stats';
import { currentYearMonth, formatYearMonthLabel, todayInSeoul } from '@/utils/ts/formatDate';

/**
 * 이번 달 달력.
 *
 * 여기서는 훑어보기만 한다 — 날짜를 누르면 달력 화면으로 넘어간다. 그날 거래까지
 * 대시보드에 펼치면 화면이 길어져 정작 위의 요약이 밀린다.
 */
export default function DashboardCalendar() {
  const router = useRouter();
  const today = todayInSeoul();
  const yearMonth = currentYearMonth();

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.STATS.DAILY(yearMonth),
    queryFn: () => getDailyTotals(yearMonth),
  });

  const totals = useMemo(() => new Map((data ?? []).map((row) => [row.date, row])), [data]);

  if (isPending) return <Skeleton height={300} />;

  return (
    <Card
      title={`${formatYearMonthLabel(yearMonth)} 달력`}
      description="날짜를 누르면 그날 내역을 볼 수 있습니다."
    >
      <MonthGrid
        yearMonth={yearMonth}
        totals={totals}
        today={today}
        variant="compact"
        onSelect={(date) => router.push(`${PATH.CALENDAR}?date=${date}`)}
      />
    </Card>
  );
}
