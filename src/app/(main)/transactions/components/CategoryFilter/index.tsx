'use client';

import { useQueries } from '@tanstack/react-query';
import FormField from '@/components/common/FormField';
import Select from '@/components/common/Select';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getCategoryTree } from '@/service/category';
import type { CategoryKind } from '@/generated/prisma/enums';

const KIND_LABEL: Record<CategoryKind, string> = {
  EXPENSE: '쓴 돈',
  INCOME: '번 돈',
  TRANSFER: '옮긴 돈',
};

export interface CategoryFilterValue {
  id: string;
  kind: CategoryKind | null;
}

interface CategoryFilterProps {
  /** 지금 종류 필터가 보여 주는 분류 종류. 쓴 돈·번 돈을 함께 보면 둘 다 고를 수 있다. */
  kinds: readonly CategoryKind[];
  value: CategoryFilterValue | null;
  onChange: (value: CategoryFilterValue | null) => void;
}

/**
 * 분류로 거래를 거른다. 대분류를 고르면 서버가 그 아래 소분류까지 함께 센다.
 * 분류 목록은 거래 입력 폼과 같은 캐시(종류별 트리)를 나눠 쓴다.
 */
export default function CategoryFilter({ kinds, value, onChange }: CategoryFilterProps) {
  const trees = useQueries({
    queries: kinds.map((kind) => ({
      queryKey: QUERY_KEY.CATEGORY.TREE({ kind }),
      queryFn: () => getCategoryTree({ kind }),
    })),
  });

  const showsKind = kinds.length > 1;
  const kindOf = new Map<string, CategoryKind>();
  const groups = trees.flatMap((tree) =>
    (tree.data ?? []).flatMap(({ kind, categories }) =>
      categories.map((parent) => {
        kindOf.set(parent.id, kind);
        for (const child of parent.children) kindOf.set(child.id, kind);

        return {
          label: showsKind ? `${KIND_LABEL[kind]} · ${parent.name}` : parent.name,
          options: [
            { value: parent.id, label: `${parent.name} 전체` },
            ...parent.children.map((child) => ({ value: child.id, label: child.name })),
          ],
        };
      })));

  return (
    <FormField label="분류">
      {({ id }) => (
        <Select
          id={id}
          options={[]}
          groups={groups}
          placeholder="모든 분류"
          value={value?.id ?? ''}
          onChange={(event) => {
            const nextId = event.target.value;
            onChange(nextId ? { id: nextId, kind: kindOf.get(nextId) ?? null } : null);
          }}
        />
      )}
    </FormField>
  );
}
