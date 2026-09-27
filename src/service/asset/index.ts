import { http } from '@/service/httpClient';
import type { CreateAssetInput, UpdateAssetInput } from '@/service/asset/schema';
import type { AssetSummaryDto, AssetTrendPointDto } from '@/service/asset/type';

export function getAssets() {
  return http.get<AssetSummaryDto>('/assets');
}

export function getAssetTrend(params: { from: string; to: string }) {
  return http.get<AssetTrendPointDto[]>('/assets/trend', params);
}

export function createAsset(input: CreateAssetInput) {
  return http.post<{ id: string }>('/assets', input);
}

export function updateAsset(id: string, input: UpdateAssetInput) {
  return http.patch<{ id: string }>(`/assets/${id}`, input);
}

/** 자산만 지운다. 이미 넣은 돈의 기록은 남는다. */
export function deleteAsset(id: string) {
  return http.del<{ keptTransactionCount: number }>(`/assets/${id}`);
}
