import { categoryEmoji } from '@/utils/ts/categoryEmoji';
import type { CategoryEmojiParent } from '@/utils/ts/categoryEmoji';
import { cn } from '@/utils/ts/cn';
import styles from './CategoryIcon.module.scss';
import type { CSSProperties } from 'react';

interface CategoryIconProps {
  /** 분류 이름 — 아이콘을 직접 정하지 않았으면 이 이름으로 고른다. */
  name: string;
  /** 분류에 직접 정해 둔 아이콘(이모지). */
  icon?: string | null;
  /** 소분류라면 그 상위 분류. 소분류는 자기 이름과 상관없이 상위 분류의 아이콘을 쓴다. */
  parent?: CategoryEmojiParent | null;
  /** 바탕에 옅게 깔 분류 색. 없으면 중립 바탕이다. */
  color?: string | null;
  /** `sm` 목록 한 줄·칩 안, `md` 분류별 금액 목록. */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * 분류 아이콘 칩 — 분류 색을 옅게 깐 둥근 칸에 이모지 하나.
 *
 * 이름이 바로 옆에 적히므로 장식으로 둔다. 화면 판독기가 이모지 이름까지 읽으면 시끄럽다.
 */
export function CategoryIcon({ name, icon, parent, color, size = 'md', className }: CategoryIconProps) {
  return (
    <span
      className={cn(styles.categoryicon, styles[`categoryicon--${size}`], className)}
      style={color ? ({ '--chip': color } as CSSProperties) : undefined}
      aria-hidden="true"
    >
      {categoryEmoji(name, icon, parent)}
    </span>
  );
}

export default CategoryIcon;
