import { cn } from '@/utils/ts/cn';
import styles from './Skeleton.module.scss';

interface SkeletonProps {
  /** px 또는 CSS 길이. 로딩 중에도 자리 높이를 유지해 레이아웃이 튀지 않게 한다. */
  height?: number | string;
  width?: number | string;
  isCircle?: boolean;
  className?: string;
}

export function Skeleton({ height = 16, width = '100%', isCircle = false, className }: SkeletonProps) {
  return (
    <span
      className={cn(styles.skeleton, { [styles['skeleton--circle']]: isCircle }, className)}
      style={{ height, width }}
      aria-hidden="true"
    />
  );
}

export default Skeleton;
