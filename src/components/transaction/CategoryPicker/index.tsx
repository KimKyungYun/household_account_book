'use client';

import { useMemo, useState } from 'react';
import CategoryIcon from '@/components/common/CategoryIcon';
import Icon from '@/components/common/Icon';
import { categoryEmoji } from '@/utils/ts/categoryEmoji';
import { cn } from '@/utils/ts/cn';
import type { CategoryKind } from '@/generated/prisma/enums';
import type { CategoryTreeDto } from '@/service/category/type';
import CategorySelectModal from '../CategorySelectModal';
import styles from './CategoryPicker.module.scss';

interface CategoryPickerProps {
  tree: readonly CategoryTreeDto[];
  /** 지금 적는 거래의 종류. 고르기 창에서 새로 만드는 분류도 이 종류가 된다. */
  kind: CategoryKind;
  value: string | null;
  onChange: (categoryId: string | null) => void;
  /** 최근 고른 소분류 id. 실제 입력의 대부분이 여기서 끝난다. */
  recentIds: readonly string[];
  id?: string;
  isInvalid?: boolean;
  ariaDescribedBy?: string;
}

interface FlatCategory {
  id: string;
  name: string;
  icon: string | null;
  parentName: string;
  parentIcon: string | null;
  colorHex: string | null;
}

function flatten(tree: readonly CategoryTreeDto[]): FlatCategory[] {
  const result: FlatCategory[] = [];

  for (const group of tree) {
    for (const parent of group.categories) {
      for (const child of parent.children) {
        result.push({
          id: child.id,
          name: child.name,
          icon: child.icon,
          parentName: parent.name,
          parentIcon: parent.icon,
          colorHex: parent.colorHex,
        });
      }
    }
  }

  return result;
}

const RECENT_LIMIT = 6;

/**
 * 2단 카테고리 선택.
 *
 * 최근 쓴 것 여섯 개를 칩으로 먼저 보여준다 — 마트 앞에서 한 손으로 넣을 때
 * 대분류를 고르고 다시 소분류를 고르는 두 단계를 거치면 입력이 끊긴다.
 * 거기 없으면 [분류 고르기]로 창을 열어 찾고, 없는 분류는 그 창에서 바로 만든다.
 */
export function CategoryPicker({
  tree,
  kind,
  value,
  onChange,
  recentIds,
  id,
  isInvalid = false,
  ariaDescribedBy,
}: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const flat = useMemo(() => flatten(tree), [tree]);
  const byId = useMemo(() => new Map(flat.map((item) => [item.id, item])), [flat]);

  const recents = useMemo(
    () => recentIds
      .map((recentId) => byId.get(recentId))
      .filter((item): item is FlatCategory => Boolean(item))
      .slice(0, RECENT_LIMIT),
    [byId, recentIds],
  );

  const selected = value ? byId.get(value) : undefined;

  return (
    <div className={styles.categorypicker}>
      {recents.length > 0 && (
        <ul className={styles.categorypicker__recents}>
          {recents.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={cn(styles.categorypicker__chip, {
                  [styles['categorypicker__chip--selected']]: item.id === value,
                })}
                onClick={() => onChange(item.id)}
                aria-pressed={item.id === value}
              >
                <span
                  className={styles.categorypicker__chipicon}
                  aria-hidden="true"
                >
                  {categoryEmoji(item.name, item.icon, { name: item.parentName, icon: item.parentIcon })}
                </span>
                {item.name}
                <span className={styles.categorypicker__chipparent}>{item.parentName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 고른 분류를 그대로 보여 주는 단추. 누르면 고르기 창이 열린다. */}
      <button
        type="button"
        id={id}
        className={cn(styles.categorypicker__trigger, {
          [styles['categorypicker__trigger--invalid']]: isInvalid,
        })}
        aria-haspopup="dialog"
        aria-invalid={isInvalid || undefined}
        aria-describedby={ariaDescribedBy}
        onClick={() => setIsOpen(true)}
      >
        {selected ? (
          <>
            <CategoryIcon
              name={selected.name}
              icon={selected.icon}
              parent={{ name: selected.parentName, icon: selected.parentIcon }}
              color={selected.colorHex}
              size="sm"
            />
            <span className={styles.categorypicker__value}>
              <span className={styles.categorypicker__valueparent}>{selected.parentName}</span>
              <span aria-hidden="true">›</span>
              {selected.name}
            </span>
          </>
        ) : (
          <span className={styles.categorypicker__placeholder}>분류 고르기</span>
        )}
        <span
          className={styles.categorypicker__chevron}
          aria-hidden="true"
        >
          <Icon
            name="chevronRight"
            size={16}
          />
        </span>
      </button>

      <CategorySelectModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        tree={tree}
        kind={kind}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

export default CategoryPicker;
