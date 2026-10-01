import { z } from 'zod';
import { HOUSEHOLD_KINDS, MEMBER_RELATIONS } from '@/service/household/kind';

const newPasswordSchema = z.string().min(8, '비밀번호는 8자 이상이어야 해요.').max(72, '비밀번호가 너무 길어요.');

const emailSchema = z.string().trim().toLowerCase().email('이메일 형식이 올바르지 않아요.');

/**
 * 휴대폰 번호. 하이픈·공백을 지우고 숫자만 남긴다. 비우면 null.
 * 문자 인증은 하지 않으므로 형식만 본다.
 *
 * null 도 입력으로 받는다 — 폼이 이 스키마로 한 번 변환한 값(null)을 보내면 서버가 같은 스키마로
 * 다시 검사한다. 문자열만 받으면 번호를 비워 둔 가입이 서버에서 거절된다.
 */
const phoneSchema = z
  .string()
  .nullable()
  .transform((value) => (value ?? '').trim().replace(/[\s-]/g, ''))
  .refine((value) => value === '' || /^01[016789]\d{7,8}$/.test(value), '휴대폰 번호 형식이 올바르지 않아요.')
  .transform((value) => value || null);

export const signupSchema = z
  .object({
    name: z.string().trim().min(1, '이름을 입력해 주세요.').max(20, '이름이 너무 길어요.'),
    email: emailSchema,
    password: newPasswordSchema,
    passwordConfirm: z.string().min(1, '비밀번호를 한 번 더 입력해 주세요.'),
    phone: phoneSchema,
    privacyAgreed: z.boolean().refine((value) => value, '개인정보 수집·이용에 동의해 주세요.'),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    path: ['passwordConfirm'],
    message: '비밀번호가 서로 달라요.',
  });
export type SignupFormValues = z.input<typeof signupSchema>;
export type SignupInput = z.output<typeof signupSchema>;

/** 가입 전 이메일 인증 코드 받기. */
export const emailCodeRequestSchema = z.object({ email: emailSchema });
export type EmailCodeRequestInput = z.infer<typeof emailCodeRequestSchema>;

/** 받은 코드 확인. 숫자 여섯 자리. */
export const emailCodeVerifySchema = z.object({
  email: emailSchema,
  code: z.string().trim().regex(/^\d{6}$/, '숫자 여섯 자리를 입력해 주세요.'),
});
export type EmailCodeVerifyInput = z.infer<typeof emailCodeVerifySchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** 비밀번호 변경. 지금 비밀번호를 알아야 바꿀 수 있다 — 켜 둔 화면을 남이 만져도 못 바꾼다. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '지금 비밀번호를 입력해 주세요.'),
    newPassword: newPasswordSchema,
    newPasswordConfirm: z.string().min(1, '새 비밀번호를 한 번 더 입력해 주세요.'),
  })
  .refine((value) => value.newPassword === value.newPasswordConfirm, {
    path: ['newPasswordConfirm'],
    message: '새 비밀번호가 서로 달라요.',
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ['newPassword'],
    message: '지금 비밀번호와 다른 비밀번호를 정해 주세요.',
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

const displayNameSchema = z.string().trim().min(1, '표시할 이름을 입력해 주세요.').max(20, '이름이 너무 길어요.');

export const createHouseholdSchema = z.object({
  kind: z.enum(HOUSEHOLD_KINDS),
  householdName: z.string().trim().min(1, '가구 이름을 입력해 주세요.').max(30, '이름이 너무 길어요.'),
  displayName: displayNameSchema,
  /** 유형에 맞는 관계인지는 서버가 HOUSEHOLD_KIND_RULES 로 한 번 더 본다. */
  relation: z.enum(MEMBER_RELATIONS),
});
export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;

export const joinHouseholdSchema = z.object({
  inviteCode: z.string().trim().min(1, '초대 코드를 입력해 주세요.'),
  displayName: displayNameSchema,
  relation: z.enum(MEMBER_RELATIONS),
});
export type JoinHouseholdInput = z.infer<typeof joinHouseholdSchema>;

export const inviteCodeParamsSchema = z.object({ code: z.string().trim().min(1) });
