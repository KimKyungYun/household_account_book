import { cn } from '@/utils/ts/cn';
import styles from './ProgressBar.module.scss';

interface ProgressBarProps {
  /** 0~1 이상. 1 을 넘으면 초과 색으로 바뀐다. */
  ratio: number;
  ariaLabel: string;
  className?: string;
}

const WARNING_THRESHOLD = 0.8;

/** 예산 소진율. 80% 경고, 100% 초과 임계값을 여기 한곳에 둔다. */
export function ProgressBar({ ratio, ariaLabel, className }: ProgressBarProps) {
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const tone = ratio > 1 ? 'over' : ratio >= WARNING_THRESHOLD ? 'warning' : 'normal';

  return (
    <div
      className={cn(styles.progressbar, className)}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span
        className={cn(styles.progressbar__fill, styles[`progressbar__fill--${tone}`])}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}

export default ProgressBar;
