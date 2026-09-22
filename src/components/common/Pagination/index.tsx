'use client';

import Icon from '@/components/common/Icon';
import { cn } from '@/utils/ts/cn';
import styles from './Pagination.module.scss';

interface PaginationProps {
  /** 1부터 시작한다. */
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  className?: string;
}

const WINDOW = 7;

/** 페이지가 많아지면 가운데만 보여주고 양끝을 생략한다. */
function buildPages(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= WINDOW) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const pages: (number | 'gap')[] = [1];
  const start = Math.max(2, page - 2);
  const end = Math.min(pageCount - 1, page + 2);

  if (start > 2) pages.push('gap');
  for (let current = start; current <= end; current += 1) pages.push(current);
  if (end < pageCount - 1) pages.push('gap');
  pages.push(pageCount);

  return pages;
}

export function Pagination({ page, pageCount, onChange, className }: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav
      className={cn(styles.pagination, className)}
      aria-label="페이지"
    >
      <button
        type="button"
        className={styles.pagination__arrow}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="이전 페이지"
      >
        <Icon
          name="chevronLeft"
          size={18}
        />
      </button>

      <ul className={styles.pagination__list}>
        {buildPages(page, pageCount).map((item, index) =>
          item === 'gap' ? (
            <li
              key={`gap-${index}`}
              className={styles.pagination__gap}
              aria-hidden="true"
            >
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className={cn(styles.pagination__page, { [styles['pagination__page--current']]: item === page })}
                onClick={() => onChange(item)}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </button>
            </li>
          ))}
      </ul>

      <button

        type="button"
        className={styles.pagination__arrow}
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="다음 페이지"
      >
        <Icon
          name="chevronRight"
          size={18}
        />
      </button>
    </nav>
  );
}

export default Pagination;
