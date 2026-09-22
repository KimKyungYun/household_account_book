'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Skeleton from '@/components/common/Skeleton';
import SplitScale from '@/components/layout/SplitScale';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { PATH } from '@/routes/paths';
import { getSettlement } from '@/service/settlement';
import { currentYearMonth } from '@/utils/ts/formatDate';

export default function DashboardSettlement() {
  const yearMonth = currentYearMonth();
  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.SETTLEMENT.MONTH(yearMonth),
    queryFn: () => getSettlement(yearMonth),
  });

  if (isPending) return <Skeleton height={200} />;
  if (!data) return null;

  return (
    <Card
      tone="feature"
      title="같이 쓴 돈 나누기"
      description="색의 길이는 각자 실제로 낸 비율이고, 점선은 설정한 비율입니다."
      action={
        <Link href={PATH.SETTLEMENT}>
          <Button
            size="sm"
            variant="ghost"
          >
            자세히
          </Button>
        </Link>
      }
    >
      <SplitScale settlement={data} />
    </Card>
  );
}
