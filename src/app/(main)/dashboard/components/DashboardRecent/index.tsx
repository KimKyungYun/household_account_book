'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import { SkeletonRows } from '@/components/common/Skeleton';
import TransactionRow from '@/components/transaction/TransactionRow';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { PATH } from '@/routes/paths';
import { getTransactions } from '@/service/transaction';
import styles from './DashboardRecent.module.scss';

const PARAMS = { page: 1, pageSize: 5, sort: 'date.desc' };

export default function DashboardRecent() {
  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.TRANSACTION.LIST(PARAMS),
    queryFn: () => getTransactions(PARAMS),
  });

  return (
    <Card
      isFlush
      title="최근 거래"
      description="줄 왼쪽의 색은 결제한 사람을 나타냅니다."
      action={
        <Link href={PATH.TRANSACTIONS}>
          <Button
            size="sm"
            variant="ghost"
          >
            전체 보기
          </Button>
        </Link>
      }
    >
      {isPending ? (
        <SkeletonRows count={5} />
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="아직 기록이 없습니다"
          description="등록한 거래가 여기에 표시됩니다."
          action={
            <Link href={PATH.TRANSACTION_NEW}>
              <Button size="sm">거래 등록</Button>
            </Link>
          }
        />
      ) : (
        <ul className={styles.dashboardrecent}>
          {data?.items.map((item) => (
            <li key={item.id}>
              <TransactionRow
                transaction={item}
                onClick={() => undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
