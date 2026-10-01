'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Amount from '@/components/common/Amount';
import Card from '@/components/common/Card';
import Reveal from '@/components/common/Reveal';
import CountUpAmount from '@/components/common/CountUpAmount';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import Skeleton from '@/components/common/Skeleton';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getAssets } from '@/service/asset';
import { getLoans } from '@/service/loan';
import AssetBoard from '../AssetBoard';
import LoanBoard from '../LoanBoard';
import styles from './AssetsTabs.module.scss';

const TABS = [
  { value: 'assets', label: '모은 돈' },
  { value: 'loans', label: '갚을 돈' },
] as const;

/**
 * 자산과 대출을 한 화면에서 가른다.
 *
 * 둘을 따로 두지 않는 이유는 **순자산이 둘의 차이**이기 때문이다. 화면이 갈리면
 * "모은 건 3천인데 빚이 2억" 이라는 사실을 두 번 눌러야 알게 된다.
 *
 * 탭 상태를 `?tab=` 에 두어 새로고침·뒤로가기에서도 보던 자리가 남는다.
 * 요약에 쓰는 두 쿼리는 여기서만 부르고, 아래 보드들은 같은 queryKey 로 캐시를 나눠 쓴다.
 */
export default function AssetsTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') === 'loans' ? 'loans' : 'assets';

  const assets = useQuery({ queryKey: QUERY_KEY.ASSET.LIST(), queryFn: getAssets });
  const loans = useQuery({ queryKey: QUERY_KEY.LOAN.LIST(), queryFn: getLoans });

  const saved = assets.data?.totalBalance ?? 0;
  /** 순자산에 넣기로 한 대출만. 뺀 것은 아래 '갚을 돈' 줄에서 따로 말한다. */
  const owed = loans.data?.totalOutstanding ?? 0;
  const excludedCount = loans.data?.excludedCount ?? 0;
  const net = saved - owed;

  const isPending = assets.isPending || loans.isPending;

  return (
    <>
      {isPending ? (
        <Card
          tone="feature"
          title="순자산"
          icon="⚖️"
          description="모은 돈에서 갚을 돈을 뺀 금액이에요."
        >
          <div
            className={styles.assetstabs__summary}
            role="status"
            aria-label="불러오는 중"
          >
            <Skeleton
              width={220}
              height={44}
            />
            <Skeleton
              width={260}
              height={16}
            />
          </div>
        </Card>
      ) : (
        <Card
          tone="feature"
          title="순자산"
          icon="⚖️"
          description={
            excludedCount > 0
              ? `모은 돈에서 갚을 돈을 뺀 금액이에요. 대출 ${excludedCount}건은 계산에서 뺐어요.`
              : '모은 돈에서 갚을 돈을 뺀 금액이에요.'
          }
        >
          <Reveal className={styles.assetstabs__summary}>
            <CountUpAmount
              value={net}
              tone={net < 0 ? 'expense' : 'income'}
              size="hero"
            />
            <dl className={styles.assetstabs__breakdown}>
              <div className={styles.assetstabs__item}>
                <dt>모은 돈</dt>
                <dd>
                  <Amount
                    value={saved}
                    tone="income"
                    size="small"
                  />
                </dd>
              </div>
              <div className={styles.assetstabs__item}>
                <dt>갚을 돈</dt>
                <dd>
                  <Amount
                    value={owed}
                    tone={owed > 0 ? 'expense' : 'neutral'}
                    size="small"
                  />
                </dd>
              </div>
              {(loans.data?.monthlyPayment ?? 0) > 0 && (
                <div className={styles.assetstabs__item}>
                  <dt>이번 달 상환</dt>
                  <dd>
                    <Amount
                      value={loans.data?.monthlyPayment ?? 0}
                      tone="neutral"
                      size="small"
                    />
                  </dd>
                </div>
              )}
            </dl>
          </Reveal>
        </Card>
      )}

      <SegmentedControl
        name="assets-tab"
        options={TABS}
        value={tab}
        ariaLabel="자산과 대출 전환"
        onChange={(next) => router.replace(next === 'assets' ? '/assets' : `/assets?tab=${next}`)}
      />

      {tab === 'assets' ? <AssetBoard /> : <LoanBoard />}
    </>
  );
}
