'use client';

import Amount from '@/components/common/Amount';
import { monthEnd } from '@/utils/ts/formatDate';
import type { DailyTotalDto } from '@/service/stats/type';
import styles from './MonthGrid.module.scss';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface MonthGridProps {
  /** 'YYYY-MM' */
  yearMonth: string;
  /** 날짜 → 그날 요약. 없는 날은 빈 칸으로 그린다. */
  totals: Map<string, DailyTotalDto>;
  /** 'YYYY-MM-DD' — 오늘 표시용. */
  today: string;
  /** 고른 날짜. 대시보드처럼 고르지 않는 자리에서는 넘기지 않는다. */
  selected?: string;
  onSelect: (date: string) => void;
  /**
   * `full` 은 달력 화면, `compact` 는 대시보드처럼 곁들여 놓는 자리.
   * compact 는 칸이 낮고 금액을 한 줄만 적는다.
   */
  variant?: 'full' | 'compact';
}

/**
 * 한 달을 주 단위로 자른 칸 목록.
 *
 * 앞뒤로 빈 칸을 채워 항상 일요일에 시작하고 토요일에 끝나게 한다. 빈 칸이 없으면
 * 1일이 수요일인 달에서 요일 줄과 날짜가 어긋난다.
 */
function buildCells(yearMonth: string): (string | null)[] {
  const first = new Date(`${yearMonth}-01T00:00:00.000Z`);
  const lead = first.getUTCDay();
  const lastDay = Number(monthEnd(yearMonth).slice(8));

  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= lastDay; day += 1) {
    cells.push(`${yearMonth}-${String(day).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

/** 달력 격자. 달력 화면과 대시보드가 같은 그림을 쓴다. */
export function MonthGrid({ yearMonth, totals, today, selected, onSelect, variant = 'full' }: MonthGridProps) {
  const cells = buildCells(yearMonth);

  return (
    <div
      className={styles.monthgrid}
      data-variant={variant}
      role="grid"
    >
      {WEEKDAYS.map((label) => (
        <span
          key={label}
          className={styles.monthgrid__weekday}
          role="columnheader"
        >
          {label}
        </span>
      ))}

      {cells.map((date, index) => {
        if (!date) {
          return (
            <span
              key={`blank-${index}`}
              className={styles.monthgrid__blank}
              aria-hidden="true"
            />
          );
        }

        const row = totals.get(date);

        return (
          <button
            key={date}
            type="button"
            className={styles.monthgrid__day}
            data-today={date === today ? 'true' : undefined}
            data-selected={date === selected ? 'true' : undefined}
            data-future={date > today ? 'true' : undefined}
            aria-pressed={selected ? date === selected : undefined}
            onClick={() => onSelect(date)}
          >
            <span className={styles.monthgrid__daynum}>{Number(date.slice(8))}</span>
            {row && row.income > 0 && (
              <Amount
                value={row.income}
                tone="income"
                size="small"
                withUnit={false}
                isCompact
                className={`${styles.monthgrid__daymoney} ${styles.monthgrid__dayincome}`}
              />
            )}
            {row && row.expense > 0 && (
              <Amount
                value={row.expense}
                tone="expense"
                size="small"
                withUnit={false}
                isCompact
                signMode="tone"
                className={`${styles.monthgrid__daymoney} ${styles.monthgrid__dayexpense}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default MonthGrid;
