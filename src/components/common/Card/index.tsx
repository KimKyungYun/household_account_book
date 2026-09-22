import { cn } from '@/utils/ts/cn';
import styles from './Card.module.scss';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  /** 제목이 있으면 헤더를 만든다. */
  title?: ReactNode;
  /** 헤더 오른쪽 자리 — 기간 선택, 더보기 링크 등. */
  action?: ReactNode;
  /** 내부 여백을 없앤다. 표를 카드 경계까지 붙일 때 쓴다. */
  isFlush?: boolean;
  className?: string;
}

export function Card({ children, title, action, isFlush = false, className }: CardProps) {
  return (
    <section className={cn(styles.card, { [styles['card--flush']]: isFlush }, className)}>
      {(title || action) && (
        <header className={styles.card__header}>
          {title && <h2 className={styles.card__title}>{title}</h2>}
          {action && <div className={styles.card__action}>{action}</div>}
        </header>
      )}
      <div className={styles.card__body}>{children}</div>
    </section>
  );
}

export default Card;
