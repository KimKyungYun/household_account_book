import { http } from '@/service/httpClient';
import type { UpdateHouseholdInput } from '@/service/household/schema';

export function updateHousehold(input: UpdateHouseholdInput) {
  return http.patch<{ id: string }>('/household', input);
}

export function rotateInviteCode() {
  return http.post<{ inviteCode: string }>('/household/invite/rotate');
}
