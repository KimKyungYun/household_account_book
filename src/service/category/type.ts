import type { CategoryKind, SplitMode } from '@/generated/prisma/enums';

export interface CategoryNodeDto {
  id: string;
  name: string;
  kind: CategoryKind;
  level: number;
  icon: string | null;
  colorHex: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  defaultSplitMode: SplitMode | null;
  /** 이 카테고리에 달린 거래 건수. 삭제 가능 여부를 화면에서 바로 판단한다. */
  transactionCount: number;
  children: CategoryNodeDto[];
}

export interface CategoryTreeDto {
  kind: CategoryKind;
  categories: CategoryNodeDto[];
}
