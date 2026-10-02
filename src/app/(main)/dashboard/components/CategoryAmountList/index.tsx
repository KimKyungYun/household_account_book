import Link from 'next/link';
import Amount from '@/components/common/Amount';
import CategoryIcon from '@/components/common/CategoryIcon';
import { paletteColor } from '@/components/common/CustomEcharts/chartColors';
import { cn } from '@/utils/ts/cn';
import type { CategoryShareDto } from '@/service/stats/type';
import styles from './CategoryAmountList.module.scss';
import type { CSSProperties } from 'react';

interface CategoryAmountListProps {
  rows: readonly CategoryShareDto[];
  /** `compact` 요약 상자 안(아이콘·이름·금액만), `regular` 분류별 지출 카드(비중 막대까지). */
  size?: 'compact' | 'regular';
  /** 주면 줄 전체가 링크가 된다 — 누르면 그 분류의 거래만 본다. */
  hrefOf?: (row: CategoryShareDto) => string;
}

/**
 * 분류별 금액 목록 — 아이콘 · 이름 · (비중) · 금액.
 *
 * 아이콘 바탕은 분류 색을 옅게 깐다. 분류 색을 정하지 않았으면 팔레트에서 순서대로 고른다.
 * 색은 CSS 변수(--chip)로 넘겨 바탕·막대가 같은 색을 쓰게 한다.
 */
export default function CategoryAmountList({ rows, size = 'regular', hrefOf }: CategoryAmountListProps) {
  return (
    <ul
      className={cn(styles.categoryamountlist, styles[`categoryamountlist--${size}`])}
      role="list"
    >
      {rows.map((row, index) => (
        <li key={row.categoryId}>
          <CategoryAmountRow
            row={row}
            size={size}
            chip={row.colorHex ?? paletteColor(index)}
            href={hrefOf?.(row)}
          />
        </li>
      ))}
    </ul>
  );
}

interface CategoryAmountRowProps {
  row: CategoryShareDto;
  size: 'compact' | 'regular';
  chip: string;
  href?: string;
}

/** 한 줄. 링크면 줄 전체를 누를 수 있고, 아니면 그냥 보여 준다. */
function CategoryAmountRow({ row, size, chip, href }: CategoryAmountRowProps) {
  const content = (
    <>
      <CategoryIcon
        name={row.name}
        icon={row.icon}
        parent={row.parentName ? { name: row.parentName, icon: row.parentIcon } : null}
        size={size === 'compact' ? 'sm' : 'md'}
        className={styles.categoryamountlist__icon}
      />

      <span className={styles.categoryamountlist__body}>
        <span className={styles.categoryamountlist__name}>{row.name}</span>
        {size === 'regular' && (
          <span className={styles.categoryamountlist__share}>
            <span className={styles.categoryamountlist__bar}>
              <span
                className={styles.categoryamountlist__barfill}
                style={{ width: `${Math.max(row.share * 100, 2)}%` }}
              />
            </span>
            {(row.share * 100).toFixed(0)}%
          </span>
        )}
      </span>

      <Amount
        value={row.amount}
        size="small"
        className={styles.categoryamountlist__amount}
      />
    </>
  );
  const style = { '--chip': chip } as CSSProperties;

  if (!href) {
    return (
      <div
        className={styles.categoryamountlist__item}
        style={style}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(styles.categoryamountlist__item, styles['categoryamountlist__item--link'])}
      style={style}
      aria-label={`${row.name} 거래 보기`}
    >
      {content}
    </Link>
  );
}
