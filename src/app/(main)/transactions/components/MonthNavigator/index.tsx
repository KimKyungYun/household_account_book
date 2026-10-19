import Button from '@/components/common/Button';
import Icon from '@/components/common/Icon';
import { formatYearMonthLabel } from '@/utils/ts/formatDate';
import styles from './MonthNavigator.module.scss';

interface MonthNavigatorProps {
  yearMonth: string;
  /** 몇 달 옮길지. 지난 달은 -1, 다음 달은 1. */
  onShift: (months: number) => void;
}

/** 지난 달 · 2026년 10월 · 다음 달. 거래 내역과 반복 거래 탭이 같은 달을 함께 옮긴다. */
export default function MonthNavigator({ yearMonth, onShift }: MonthNavigatorProps) {
  return (
    <div className={styles.monthnavigator}>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onShift(-1)}
        aria-label="지난 달"
        iconLeft={<Icon
          name="chevronLeft"
          size={16}
        />}
      >
        지난 달
      </Button>
      <span className={styles.monthnavigator__label}>{formatYearMonthLabel(yearMonth)}</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onShift(1)}
        aria-label="다음 달"
        iconRight={<Icon
          name="chevronRight"
          size={16}
        />}
      >
        다음 달
      </Button>
    </div>
  );
}
