'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Amount, { toneOfTransactionType } from '@/components/common/Amount';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import { SkeletonRows } from '@/components/common/Skeleton';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { PATH } from '@/routes/paths';
import { getRecurringRules } from '@/service/recurring';
import { todayInSeoul } from '@/utils/ts/formatDate';
import styles from './DashboardUpcoming.module.scss';

const WINDOW_DAYS = 30;
const SHOW_LIMIT = 4;

/** 며칠 뒤인지 사람 말로. '9월 25일'보다 '3일 뒤'가 먼저 읽힌다. */
function daysUntil(date: string, today: string): string {
  const diff = Math.round(
    (new Date(`${date}T00:00:00.000Z`).getTime() - new Date(`${today}T00:00:00.000Z`).getTime()) / 86_400_000,
  );

  if (diff <= 0) return '오늘';
  if (diff === 1) return '내일';

  return `${diff}일 뒤`;
}

/**
 * 앞으로 30일 안에 오갈 돈.
 *
 * 나갈 것만 보여주면 월급이 어디 있는지 알 수 없다. 들어올 돈과 나갈 돈을 나눠 적고
 * 헤더에는 둘의 차이를 둔다 — "이번 달 더 들어오나 더 나가나"가 한눈에 보인다.
 */
export default function DashboardUpcoming() {
  const today = todayInSeoul();
  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.RECURRING.LIST(),
    queryFn: getRecurringRules,
  });

  if (isPending) {
    return (
      <Card
        title="예정된 수입·지출"
        description={`앞으로 ${WINDOW_DAYS}일 안에 들어오고 나갈 예정입니다.`}
      >
        <SkeletonRows
          count={3}
          isPadded={false}
        />
      </Card>
    );
  }

  const limit = new Date(new Date(`${today}T00:00:00.000Z`).getTime() + WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const upcoming = (data ?? [])
    .filter((rule) => rule.isActive && rule.nextOccurrenceDate && rule.nextOccurrenceDate <= limit)
    .sort((a, b) => (a.nextOccurrenceDate ?? '').localeCompare(b.nextOccurrenceDate ?? ''))
    .slice(0, SHOW_LIMIT);

  const incoming = upcoming.filter((rule) => rule.type === 'INCOME').reduce((sum, rule) => sum + rule.amount, 0);
  const outgoing = upcoming.filter((rule) => rule.type === 'EXPENSE').reduce((sum, rule) => sum + rule.amount, 0);

  if (upcoming.length === 0) {
    return (
      <Card
        title="예정된 수입·지출"
        description="월급·월세처럼 정해진 날에 들어오거나 나가는 금액을 미리 보여줍니다."
      >
        <EmptyState
          title="한 달 안에 예정된 항목이 없습니다"
          description="월급과 매달 나가는 금액을 등록하면 여기에 표시됩니다."
          action={
            <Link href={PATH.RECURRINGS}>
              <Button size="sm">등록하러 가기</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <Card
      title="예정된 수입·지출"
      description={`앞으로 ${WINDOW_DAYS}일 안에 들어오고 나갈 예정입니다.`}
      action={
        <Amount
          value={incoming - outgoing}
          size="medium"
          tone={incoming - outgoing < 0 ? 'expense' : 'income'}
          signMode="value"
        />
      }
    >
      <ul
        className={styles.dashboardupcoming}
        role="list"
      >
        {upcoming.map((rule) => (
          <li
            key={rule.id}
            className={styles.dashboardupcoming__item}
          >
            <span className={styles.dashboardupcoming__when}>
              {rule.nextOccurrenceDate ? daysUntil(rule.nextOccurrenceDate, today) : ''}
            </span>
            <span className={styles.dashboardupcoming__name}>{rule.name}</span>
            <Amount
              value={rule.amount}
              tone={toneOfTransactionType(rule.type)}
              size="small"
              signMode="tone"
              withUnit={false}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
