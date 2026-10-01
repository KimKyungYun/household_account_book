import { describe, expect, it } from 'vitest';
import { changePasswordSchema, signupSchema } from '@/service/auth/schema';

const base = {
  name: '홍길동',
  email: 'Test@Example.com ',
  password: 'testpass1234',
  passwordConfirm: 'testpass1234',
  phone: '',
  privacyAgreed: true,
};

describe('가입 스키마', () => {
  // 폼이 한 번 변환한 값을 서버가 같은 스키마로 다시 검사한다. 두 번 통과해야 한다.
  it('한 번 변환한 값이 다시 통과한다', () => {
    const once = signupSchema.parse(base);
    expect(signupSchema.safeParse(once).success).toBe(true);
  });

  it('번호를 비우면 null, 하이픈은 지운다', () => {
    expect(signupSchema.parse(base).phone).toBeNull();
    expect(signupSchema.parse({ ...base, phone: '010-1234-5678' }).phone).toBe('01012345678');
  });

  it('이메일은 소문자·공백 제거', () => {
    expect(signupSchema.parse(base).email).toBe('test@example.com');
  });

  it('휴대폰이 아닌 번호는 거절', () => {
    expect(signupSchema.safeParse({ ...base, phone: '02-123-4567' }).success).toBe(false);
  });

  it('비밀번호 확인이 다르면 그 칸에 에러', () => {
    const result = signupSchema.safeParse({ ...base, passwordConfirm: 'other' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['passwordConfirm']);
  });

  it('동의하지 않으면 거절', () => {
    expect(signupSchema.safeParse({ ...base, privacyAgreed: false }).success).toBe(false);
  });
});

describe('비밀번호 변경 스키마', () => {
  const valid = { currentPassword: 'oldpass1234', newPassword: 'newpass1234', newPasswordConfirm: 'newpass1234' };

  it('정상 입력은 통과', () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it('확인이 다르면 확인 칸에 에러', () => {
    const result = changePasswordSchema.safeParse({ ...valid, newPasswordConfirm: 'other' });
    expect(result.error?.issues[0]?.path).toEqual(['newPasswordConfirm']);
  });

  it('지금 비밀번호와 같으면 새 비밀번호 칸에 에러', () => {
    const result = changePasswordSchema.safeParse({ ...valid, newPassword: 'oldpass1234', newPasswordConfirm: 'oldpass1234' });
    expect(result.error?.issues[0]?.path).toEqual(['newPassword']);
  });

  it('8자 미만은 거절', () => {
    expect(changePasswordSchema.safeParse({ ...valid, newPassword: 'short', newPasswordConfirm: 'short' }).success).toBe(false);
  });
});
