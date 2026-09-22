import { http } from '@/service/httpClient';
import type { CreateHouseholdInput, JoinHouseholdInput, SignupInput } from '@/service/auth/schema';
import type { MeDto } from '@/service/auth/type';

export function getMe() {
  return http.get<MeDto>('/me');
}

export function signup(input: SignupInput) {
  return http.post<{ id: string; email: string; name: string | null }>('/auth/signup', input);
}

export function createHousehold(input: CreateHouseholdInput) {
  return http.post<{ householdId: string; memberId: string; inviteCode: string }>('/household', input);
}

export function joinHousehold(input: JoinHouseholdInput) {
  return http.post<{ householdId: string; memberId: string }>('/household/join', input);
}
