import { cn } from '@/utils/ts/cn';
import styles from './Card.module.scss';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: ReactNode;
  /**
   * 제목 아래 한 줄. **무엇을 하는 카드인지 여기서 말한다.**
   * 앱을 처음 여는 사람이 제목만으로 못 알아보는 자리에는 반드시 채운다.
   */
  description?: ReactNode;
  /** 헤더 오른쪽 자리 — 기간 선택, 더보기 링크 등. */
  action?: ReactNode;
  /**
   * 카드의 무게.
   *  - `plain`   기본
   *  - `feature` 화면의 주인공. 라운드가 크고 위에 두 사람의 색이 만나는 선이 지난다.
   */
  tone?: 'plain' | 'feature';
  /** 내부 여백을 없앤다. 표를 카드 경계까지 붙일 때 쓴다. */
  isFlush?: boolean;
  className?: string;
}

export function Card({
  children,
  title,
  description,
  action,
  tone = 'plain',
  isFlush = false,
  className,
}: CardProps) {
  return (
    <section
      className={cn(
        styles.card,
        styles[`card--${tone}`],
        { [styles['card--flush']]: isFlush },
        className,
      )}
    >
      {(title || action) && (
        <header className={styles.card__header}>
          <div className={styles.card__heading}>
            {title && <h2 className={styles.card__title}>{title}</h2>}
            {description && <p className={styles.card__description}>{description}</p>}
          </div>
          {action && <div className={styles.card__action}>{action}</div>}
        </header>
      )}
      <div className={styles.card__body}>{children}</div>
    </section>
  );
}

export default Card;
