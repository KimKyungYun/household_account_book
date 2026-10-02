import { http } from '@/service/httpClient';
import type { CategoryKind } from '@/generated/prisma/enums';
import type {
  CreateCategoryInput,
  MergeCategoryInput,
  ReorderCategoriesInput,
  UpdateCategoryInput,
} from '@/service/category/schema';
import type { CategoryTreeDto } from '@/service/category/type';

export function getCategoryTree(params?: { kind?: CategoryKind; includeInactive?: boolean }) {
  return http.get<CategoryTreeDto[]>('/categories', {
    kind: params?.kind,
    includeInactive: params?.includeInactive ? 'true' : undefined,
  });
}

export function createCategory(input: CreateCategoryInput) {
  return http.post<{ id: string }>('/categories', input);
}

export function updateCategory(id: string, input: UpdateCategoryInput) {
  return http.patch<{ id: string }>(`/categories/${id}`, input);
}

export function deleteCategory(id: string) {
  return http.del<void>(`/categories/${id}`);
}

/** 쓰이는 곳을 `intoCategoryId` 로 옮기고 지운다. */
export function mergeCategory(id: string, input: MergeCategoryInput) {
  return http.post<void>(`/categories/${id}/merge`, input);
}

export function reorderCategories(input: ReorderCategoriesInput) {
  return http.post<void>('/categories/reorder', input);
}
