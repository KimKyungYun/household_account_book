'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import SplitScale from '@/components/layout/SplitScale';
import Skeleton from '@/components/common/Skeleton';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { PATH } from '@/routes/paths';
import { getSettlement } from '@/service/settlement';
import { currentYearMonth } from '@/utils/ts/formatDate';
import styles from './SplitScaleSection.module.scss';

interface SplitScaleSectionProps {
  layout?: 'stack' | 'strip';
}

/** 분담 저울의 데이터 담당자. 셸 두 자리(사이드바·모바일 스트립)에서 같은 쿼리를 나눠 쓴다. */
export default function SplitScaleSection({ layout = 'stack' }: SplitScaleSectionProps) {
  const yearMonth = currentYearMonth();
  const { data, isPending, isError } = useQuery({
    queryKey: QUERY_KEY.SETTLEMENT.MONTH(yearMonth),
    queryFn: () => getSettlement(yearMonth),
  });

  if (isPending) {
    return (
      <Skeleton
        height={layout === 'strip' ? 20 : 96}
        className={styles.splitscalesection__skeleton}
      />
    );
  }

  // 정산은 보조 정보다. 못 읽었으면 조용히 빈다 — 셸에서 토스트를 띄우지 않는다.
  if (isError || !data) return null;

  return (
    <Link
      className={styles.splitscalesection}
      href={PATH.SETTLEMENT}
    >
      <SplitScale
        settlement={data}
        layout={layout}
      />
    </Link>
  );
}
