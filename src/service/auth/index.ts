import { http } from '@/service/httpClient';
import type {
  ChangePasswordInput,
  CreateHouseholdInput,
  EmailCodeRequestInput,
  EmailCodeVerifyInput,
  JoinHouseholdInput,
  SignupInput,
} from '@/service/auth/schema';
import type { InviteDto, MeDto } from '@/service/auth/type';

export function getMe() {
  return http.get<MeDto>('/me');
}

export function signup(input: SignupInput) {
  return http.post<{ id: string; email: string; name: string | null }>('/auth/signup', input);
}

/** 가입 전 이메일로 인증 코드를 보낸다. */
export function requestEmailCode(input: EmailCodeRequestInput) {
  return http.post<{ expiresAt: string; resendAfterSeconds: number }>('/auth/email-code', input);
}

export function verifyEmailCode(input: EmailCodeVerifyInput) {
  return http.post<{ verified: true }>('/auth/email-code/verify', input);
}

export function changePassword(input: ChangePasswordInput) {
  return http.patch<undefined>('/me/password', input);
}

export function getInvite(code: string) {
  return http.get<InviteDto>(`/household/invite/${encodeURIComponent(code)}`);
}

export function createHousehold(input: CreateHouseholdInput) {
  return http.post<{ householdId: string; memberId: string; inviteCode: string }>('/household', input);
}

export function joinHousehold(input: JoinHouseholdInput) {
  return http.post<{ householdId: string; memberId: string }>('/household/join', input);
}

/**
 * Auth.js 세션 엔드포인트를 한 번 불러 세션 쿠키를 새로 쓰게 한다.
 *
 * 가구 ID 는 찾은 뒤에만 토큰에 캐시되는데(lib/auth.ts), API 핸들러 안의 `auth()` 는
 * 쿠키를 다시 쓰지 못한다. 이 엔드포인트는 쓴다 — 예전 토큰이나 온보딩 직후 토큰이
 * 여기서 한 번 갱신되면 그 뒤 모든 요청에서 가구 조회가 빠진다.
 */
export function refreshSessionToken() {
  return http.get<unknown>('/auth/session');
}
