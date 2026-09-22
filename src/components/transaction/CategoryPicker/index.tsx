'use client';

import { useMemo } from 'react';
import Select from '@/components/common/Select';
import { cn } from '@/utils/ts/cn';
import type { CategoryNodeDto, CategoryTreeDto } from '@/service/category/type';
import styles from './CategoryPicker.module.scss';

interface CategoryPickerProps {
  tree: readonly CategoryTreeDto[];
  value: string | null;
  onChange: (categoryId: string) => void;
  /** 최근 고른 소분류 id. 실제 입력의 대부분이 여기서 끝난다. */
  recentIds: readonly string[];
  id?: string;
  isInvalid?: boolean;
  ariaDescribedBy?: string;
}

interface FlatCategory {
  id: string;
  name: string;
  parentName: string;
}

function flatten(tree: readonly CategoryTreeDto[]): FlatCategory[] {
  const result: FlatCategory[] = [];

  for (const group of tree) {
    for (const parent of group.categories) {
      for (const child of parent.children) {
        result.push({ id: child.id, name: child.name, parentName: parent.name });
      }
    }
  }

  return result;
}

function toGroups(tree: readonly CategoryTreeDto[]) {
  return tree
    .flatMap((group) => group.categories)
    .map((parent: CategoryNodeDto) => ({
      label: parent.name,
      options: parent.children.map((child) => ({
        value: child.id,
        // '기타'는 분류마다 있다. 고르고 나면 무엇의 기타인지 알 수 없어 부모를 붙인다.
        label: child.name === '기타' ? `${parent.name} 기타` : child.name,
      })),
    }))
    .filter((group) => group.options.length > 0);
}

const RECENT_LIMIT = 6;

/**
 * 2단 카테고리 선택.
 *
 * 최근 쓴 것 여섯 개를 칩으로 먼저 보여준다 — 마트 앞에서 한 손으로 넣을 때
 * 대분류를 고르고 다시 소분류를 고르는 두 단계를 거치면 입력이 끊긴다.
 */
export function CategoryPicker({
  tree,
  value,
  onChange,
  recentIds,
  id,
  isInvalid = false,
  ariaDescribedBy,
}: CategoryPickerProps) {
  const flat = useMemo(() => flatten(tree), [tree]);
  const groups = useMemo(() => toGroups(tree), [tree]);

  const recents = useMemo(() => {
    const byId = new Map(flat.map((item) => [item.id, item]));

    return recentIds
      .map((recentId) => byId.get(recentId))
      .filter((item): item is FlatCategory => Boolean(item))
      .slice(0, RECENT_LIMIT);
  }, [flat, recentIds]);

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
                {item.name}
                <span className={styles.categorypicker__chipparent}>{item.parentName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Select
        id={id}
        options={[]}
        groups={groups}
        placeholder="분류 고르기"
        value={value ?? ''}
        isInvalid={isInvalid}
        aria-describedby={ariaDescribedBy}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export default CategoryPicker;
