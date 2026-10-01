'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Amount from '@/components/common/Amount';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import Skeleton, { SkeletonRows } from '@/components/common/Skeleton';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { PATH } from '@/routes/paths';
import { getAssets } from '@/service/asset';
import styles from './DashboardAssets.module.scss';

/** 대시보드에 늘어놓을 자산 수. 그 밖은 자산 화면에서 본다. */
const SHOW_LIMIT = 4;

export default function DashboardAssets() {
  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.ASSET.LIST(),
    queryFn: getAssets,
  });

  if (isPending) {
    return (
      <Card
        title="모은 돈"
        description="적금·투자처럼 모으고 있는 돈입니다."
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
      description="적금·투자처럼 모으고 있는 돈입니다."
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
          title="등록한 자산이 없습니다"
          description="적금이나 주식처럼 모으는 통을 만들면 여기에 쌓인 금액이 보입니다."
        />
      ) : (
        <div className={styles.dashboardassets}>
          <p className={styles.dashboardassets__total}>
            <span className={styles.dashboardassets__totallabel}>전체</span>
            <Amount
              value={data?.totalBalance ?? 0}
              tone="income"
              size="display"
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
        </div>
      )}
    </Card>
  );
}
