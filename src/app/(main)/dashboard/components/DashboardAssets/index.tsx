'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Amount from '@/components/common/Amount';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Reveal from '@/components/common/Reveal';
import CountUpAmount from '@/components/common/CountUpAmount';
import EmptyState from '@/components/common/EmptyState';
import Skeleton, { SkeletonRows } from '@/components/common/Skeleton';
import { useHouseholdRule } from '@/hooks/useHouseholdRule';
import { useMe } from '@/hooks/useMe';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { PATH } from '@/routes/paths';
import { getAssets } from '@/service/asset';
import { householdSubject } from '@/service/household/kind';
import styles from './DashboardAssets.module.scss';

/** 대시보드에 늘어놓을 자산 수. 그 밖은 자산 화면에서 본다. */
const SHOW_LIMIT = 4;

export default function DashboardAssets() {
  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.ASSET.LIST(),
    queryFn: getAssets,
  });
  const me = useMe();
  const { kind } = useHouseholdRule();
  const description = `${householdSubject(kind, me.data?.member?.displayName)} 모은 자산이에요`;

  if (isPending) {
    return (
      <Card
        title="모은 돈"
        icon="🐷"
        description={description}
      >
        <div className={styles.dashboardassets}>
          <div className={styles.dashboardassets__total}>
            <Skeleton
              width={36}
              height={14}
            />
            <Skeleton
              width={180}
              height={36}
            />
          </div>
          <SkeletonRows
            count={3}
            isPadded={false}
          />
        </div>
      </Card>
    );
  }

  const assets = (data?.assets ?? []).filter((asset) => asset.isActive);

  return (
    <Card
      title="모은 돈"
      icon="🐷"
      description={description}
      action={
        <Link href={PATH.ASSETS}>
          <Button
            size="sm"
            variant="ghost"
          >
            전체 보기
          </Button>
        </Link>
      }
    >
      {assets.length === 0 ? (
        <EmptyState
          title="등록한 자산이 없어요"
          description="적금이나 주식처럼 돈을 모으는 통을 만들면 여기서 모인 금액을 볼 수 있어요."
        />
      ) : (
        <Reveal className={styles.dashboardassets}>
          <p className={styles.dashboardassets__total}>
            <span className={styles.dashboardassets__totallabel}>전체</span>
            <CountUpAmount
              value={data?.totalBalance ?? 0}
              tone="income"
              size="display"
              isFit
            />
          </p>

          <ul
            className={styles.dashboardassets__list}
            role="list"
          >
            {assets.slice(0, SHOW_LIMIT).map((asset) => (
              <li
                key={asset.id}
                className={styles.dashboardassets__item}
              >
                <span
                  className={styles.dashboardassets__dot}
                  style={{ backgroundColor: asset.colorHex ?? 'var(--member-a)' }}
                  aria-hidden="true"
                />
                <span className={styles.dashboardassets__name}>{asset.name}</span>
                <Amount
                  value={asset.balance}
                  tone="income"
                  size="small"
                  withUnit={false}
                  isCompact
                  className={styles.dashboardassets__amount}
                />
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </Card>
  );
}
