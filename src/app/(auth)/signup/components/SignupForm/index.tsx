'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import { isApiError } from '@/interface/errorType';
import { PATH } from '@/routes/paths';
import { signup } from '@/service/auth';
import { signupSchema } from '@/service/auth/schema';
import type { SignupFormValues, SignupInput } from '@/service/auth/schema';
import { useEmailVerification } from '../../hooks/useEmailVerification';
import EmailCodeField from '../EmailCodeField';
import styles from './SignupForm.module.scss';

export default function SignupForm() {
  const router = useRouter();
  const { register, handleSubmit, setError, clearErrors, trigger, getValues, control, formState } = useForm<
    SignupFormValues,
    unknown,
    SignupInput
  >({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', passwordConfirm: '', phone: '', privacyAgreed: false },
  });
  const { mutateAsync, isPending } = useMutation({ mutationFn: signup });
  const verification = useEmailVerification();
  const email = useWatch({ control, name: 'email' });

  // 코드를 보낸 뒤에는 이메일을 잠근다. 다른 주소로 바꾸려면 [변경]으로 처음부터 한다.
  const isEmailLocked = verification.sentTo !== null;
  const isVerified = verification.verifiedEmail !== null && verification.verifiedEmail === email.trim().toLowerCase();

  const sendCode = async () => {
    // 형식이 틀린 주소로 메일을 보내지 않는다. 틀렸으면 칸 아래 문구로 알린다.
    if (!(await trigger('email'))) return;

    const target = getValues('email').trim().toLowerCase();
    const result = await verification.send(target);
    if (result.ok) clearErrors('email');
    else setError('email', { message: result.emailError });
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!isVerified) {
      setError('email', { message: '이메일 인증을 마쳐 주세요.' });

      return;
    }

    try {
      await mutateAsync(values);
    } catch (error) {
      // 서버가 준 fieldErrors 를 그대로 폼에 꽂는다 — 프론트/서버 문구가 갈리지 않는다.
      if (isApiError(error) && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof SignupFormValues, { message });
        }

        return;
      }
      // 그 밖의 오류는 전역 MutationCache 가 토스트로 알린다. 다시 던지면 처리되지 않은 Promise 오류만 남는다.
      return;
    }

    await signIn('credentials', { email: values.email, password: values.password, redirect: false });
    router.replace(PATH.ONBOARDING);
  });

  return (
    <form
      method="post"
      className={styles.signupform}
      onSubmit={onSubmit}
      noValidate
    >
      <FormField
        label="이름"
        isRequired
        error={formState.errors.name?.message}
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            autoComplete="name"
            placeholder="홍길동"
            aria-describedby={describedBy}
            isInvalid={Boolean(formState.errors.name)}
            {...register('name')}
          />
        )}
      </FormField>

      <FormField
        label="이메일"
        isRequired
        error={formState.errors.email?.message}
      >
        {({ id, describedBy }) => (
          <div className={styles.signupform__emailrow}>
            <Input
              id={id}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-describedby={describedBy}
              isInvalid={Boolean(formState.errors.email)}
              readOnly={isEmailLocked}
              {...register('email')}
            />
            {isEmailLocked ? (
              <Button
                variant="secondary"
                onClick={verification.reset}
              >
                변경
              </Button>
            ) : (
              <Button
                variant="secondary"
                isLoading={verification.isSending}
                onClick={sendCode}
              >
                인증 코드 받기
              </Button>
            )}
          </div>
        )}
      </FormField>

      {isVerified ? (
        <p
          className={styles.signupform__verified}
          role="status"
        >
          ✓ 이메일 인증을 마쳤어요.
        </p>
      ) : (
        verification.sentTo && verification.expiresAt && verification.resendAt && (
          <EmailCodeField
            key={verification.expiresAt}
            email={verification.sentTo}
            expiresAt={verification.expiresAt}
            resendAt={verification.resendAt}
            error={verification.codeError}
            isVerifying={verification.isVerifying}
            isSending={verification.isSending}
            onVerify={(code) => void verification.verify(code)}
            onResend={() => void verification.send(verification.sentTo ?? '')}
          />
        )
      )}

      <FormField
        label="비밀번호"
        isRequired
        hint="8자 이상"
        error={formState.errors.password?.message}
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="password"
            autoComplete="new-password"
            aria-describedby={describedBy}
            isInvalid={Boolean(formState.errors.password)}
            {...register('password')}
          />
        )}
      </FormField>

      <FormField
        label="비밀번호 확인"
        isRequired
        error={formState.errors.passwordConfirm?.message}
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="password"
            autoComplete="new-password"
            aria-describedby={describedBy}
            isInvalid={Boolean(formState.errors.passwordConfirm)}
            {...register('passwordConfirm')}
          />
        )}
      </FormField>

      <FormField
        label="휴대폰 번호 (선택)"
        error={formState.errors.phone?.message}
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="010-1234-5678"
            aria-describedby={describedBy}
            isInvalid={Boolean(formState.errors.phone)}
            {...register('phone')}
          />
        )}
      </FormField>

      <div className={styles.signupform__consent}>
        <label className={styles.signupform__check}>
          <input
            type="checkbox"
            aria-invalid={Boolean(formState.errors.privacyAgreed) || undefined}
            aria-describedby="privacy-detail"
            {...register('privacyAgreed')}
          />
          <span>
            <strong>[필수]</strong> 개인정보 수집·이용에 동의합니다.
          </span>
        </label>
        <p
          id="privacy-detail"
          className={styles.signupform__consentdetail}
        >
          이름·이메일·휴대폰 번호(입력한 경우)를 회원 확인과 가계부 이용을 위해 받고, 탈퇴할 때까지 보관해요.
        </p>
        {/* 오류 자리는 늘 비워 둔다 — 문구가 뜰 때 아래 단추가 밀리지 않게. */}
        <p
          className={styles.signupform__error}
          aria-live="polite"
        >
          {formState.errors.privacyAgreed?.message}
        </p>
      </div>

      <Button
        type="submit"
        size="lg"
        isFullWidth
        disabled={!isVerified}
        isLoading={isPending || formState.isSubmitting}
      >
        가입하고 시작하기
      </Button>
      <p
        className={styles.signupform__submithint}
        aria-live="polite"
      >
        {isVerified ? '' : '이메일 인증을 마치면 가입할 수 있어요.'}
      </p>
    </form>
  );
}
