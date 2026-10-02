import CountUpAmount from '@/components/common/CountUpAmount';
import { SkeletonRows } from '@/components/common/Skeleton';
import type { CategoryShareDto } from '@/service/stats/type';
import CategoryAmountList from '../CategoryAmountList';
import styles from './MoneyBox.module.scss';
import type { ReactNode } from 'react';

/** 상자 안에 늘어놓을 분류 수. 그 밖은 '분류별 지출' 카드와 리포트에서 본다. */
const TOP_COUNT = 3;

interface MoneyBoxProps {
  kind: 'income' | 'expense';
  label: string;
  total: number;
  /** undefined 면 아직 불러오는 중이다. */
  rows: readonly CategoryShareDto[] | undefined;
  emptyText: string;
  /** 상자 맨 아래 한 줄(전월 대비 등). */
  footnote?: ReactNode;
}

/** 번 돈 / 쓴 돈 상자 — 합계와 많이 차지한 분류 몇 개. */
export default function MoneyBox({ kind, label, total, rows, emptyText, footnote }: MoneyBoxProps) {
  return (
    <section
      className={styles.moneybox}
      data-kind={kind}
      aria-label={label}
    >
      <header className={styles.moneybox__head}>
        <span className={styles.moneybox__label}>{label}</span>
        <CountUpAmount
          value={total}
          tone={kind}
          size="large"
          isFit
        />
      </header>

      <div className={styles.moneybox__list}>
        {rows === undefined ? (
          <SkeletonRows
            count={TOP_COUNT}
            isPadded={false}
          />
        ) : rows.length === 0 ? (
          <p className={styles.moneybox__empty}>{emptyText}</p>
        ) : (
          <CategoryAmountList
            rows={rows.slice(0, TOP_COUNT)}
            size="compact"
          />
        )}
      </div>

      {footnote && <p className={styles.moneybox__footnote}>{footnote}</p>}
    </section>
  );
}
