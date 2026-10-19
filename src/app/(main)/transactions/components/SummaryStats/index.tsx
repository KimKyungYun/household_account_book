import CountUpAmount from '@/components/common/CountUpAmount';
import Skeleton from '@/components/common/Skeleton';
import { cn } from '@/utils/ts/cn';
import type { AmountTone } from '@/components/common/Amount';
import styles from './SummaryStats.module.scss';

export interface SummaryStat {
  label: string;
  value: number;
  tone?: AmountTone;
}

interface SummaryStatsProps {
  stats: readonly SummaryStat[];
  count: number;
  isPending: boolean;
  /** 달·필터를 바꾸는 동안 앞의 숫자를 흐리게 남겨 둔다. */
  isStale: boolean;
}

/** 금액 몇 칸과 건수. 거래 내역 탭은 수입·지출·남은 돈을, 반복 거래 탭은 들어온·나간·옮긴 돈을 쓴다. */
export default function SummaryStats({ stats, count, isPending, isStale }: SummaryStatsProps) {
  return (
    <dl
      className={cn(styles.summarystats, { [styles['summarystats--stale']]: isStale })}
      aria-busy={isPending || isStale}
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={styles.summarystats__stat}
        >
          <dt>{stat.label}</dt>
          <dd>
            {isPending ? <StatSkeleton /> : (
              <CountUpAmount
                value={stat.value}
                tone={stat.tone}
                size="large"
                isFit
              />
            )}
          </dd>
        </div>
      ))}
      <div className={styles.summarystats__stat}>
        <dt>건수</dt>
        <dd className={styles.summarystats__count}>{isPending ? <StatSkeleton /> : `${count}건`}</dd>
      </div>
    </dl>
  );
}

/** 숫자 자리. 불러오는 동안 0원을 띄우면 진짜 0원처럼 읽힌다. */
function StatSkeleton() {
  return (
    <Skeleton
      width={96}
      height={26}
    />
  );
}
