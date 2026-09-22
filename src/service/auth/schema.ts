import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email('이메일 형식이 올바르지 않습니다.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').max(72, '비밀번호가 너무 깁니다.'),
  name: z.string().trim().min(1, '이름을 입력해 주세요.').max(20, '이름이 너무 깁니다.'),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('이메일 형식이 올바르지 않습니다.'),
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createHouseholdSchema = z.object({
  householdName: z.string().trim().min(1, '가구 이름을 입력해 주세요.').max(30, '이름이 너무 깁니다.'),
  displayName: z.string().trim().min(1, '표시할 이름을 입력해 주세요.').max(20, '이름이 너무 깁니다.'),
  /** 0 = 남편, 1 = 와이프. 차트 색과 정산 방향이 흔들리지 않게 자리를 고정한다. */
  slot: z.number().int().min(0).max(1),
});
export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;

export const joinHouseholdSchema = z.object({
  inviteCode: z.string().trim().min(1, '초대 코드를 입력해 주세요.'),
  displayName: z.string().trim().min(1, '표시할 이름을 입력해 주세요.').max(20, '이름이 너무 깁니다.'),
});
export type JoinHouseholdInput = z.infer<typeof joinHouseholdSchema>;
