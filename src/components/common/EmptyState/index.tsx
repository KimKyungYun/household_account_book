import { cn } from '@/utils/ts/cn';
import styles from './EmptyState.module.scss';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** 무엇이 없는지. */
  title: string;
  /** 다음에 무엇을 하면 되는지. 빈 화면은 기분이 아니라 안내의 자리다. */
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(styles.emptystate, className)}>
      <p className={styles.emptystate__title}>{title}</p>
      {description && <p className={styles.emptystate__description}>{description}</p>}
      {action && <div className={styles.emptystate__action}>{action}</div>}
    </div>
  );
}

export default EmptyState;
