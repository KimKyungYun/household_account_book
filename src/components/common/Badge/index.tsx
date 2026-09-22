import { cn } from '@/utils/ts/cn';
import styles from './Badge.module.scss';
import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'error';

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  /** 카테고리·구성원 색을 그대로 쓸 때. DB 의 colorHex 를 넘긴다. */
  color?: string;
  className?: string;
}

export function Badge({ children, tone = 'neutral', color, className }: BadgeProps) {
  return (
    <span
      className={cn(styles.badge, styles[`badge--${tone}`], { [styles['badge--custom']]: Boolean(color) }, className)}
      style={color ? { color, borderColor: color } : undefined}
    >
      {children}
    </span>
  );
}

export default Badge;
