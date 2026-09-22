'use client';

import { cn } from '@/utils/ts/cn';
import styles from './SegmentedControl.module.scss';

interface SegmentedControlOption {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  /** 같은 화면에 두 개 이상 둘 때 라디오 그룹을 가르는 이름. */
  name: string;
  options: readonly SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  isFullWidth?: boolean;
  className?: string;
}

/**
 * 두세 갈래 전환. 라디오로 만들어 키보드 좌우 이동과 스크린리더 읽기를 공짜로 얻는다.
 * 지출/수입 전환이 이 앱에서 가장 자주 눌리는 곳이다.
 */
export function SegmentedControl({
  name,
  options,
  value,
  onChange,
  ariaLabel,
  isFullWidth = true,
  className,
}: SegmentedControlProps) {
  return (
    <div
      className={cn(styles.segmented, { [styles['segmented--full']]: isFullWidth }, className)}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <label
            key={option.value}
            className={cn(styles.segmented__item, { [styles['segmented__item--selected']]: isSelected })}
          >
            <input
              className={styles.segmented__input}
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
            />
            <span className={styles.segmented__label}>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
