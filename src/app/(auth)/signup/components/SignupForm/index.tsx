'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import { isApiError } from '@/interface/errorType';
import { PATH } from '@/routes/paths';
import { signup } from '@/service/auth';
import { signupSchema } from '@/service/auth/schema';
import type { SignupFormValues, SignupInput } from '@/service/auth/schema';
import styles from './SignupForm.module.scss';

export default function SignupForm() {
  const router = useRouter();
  const { register, handleSubmit, setError, formState } = useForm<SignupFormValues, unknown, SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', passwordConfirm: '', phone: '', privacyAgreed: false },
  });
  const { mutateAsync, isPending } = useMutation({ mutationFn: signup });

  const onSubmit = handleSubmit(async (values) => {
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
          <Input
            id={id}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-describedby={describedBy}
            isInvalid={Boolean(formState.errors.email)}
            {...register('email')}
          />
        )}
      </FormField>

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
          이름·이메일·휴대폰 번호(입력한 경우)를 회원 확인과 가계부 이용을 위해 받으며, 탈퇴할 때까지 보관합니다.
        </p>
        {formState.errors.privacyAgreed?.message && (
          <p
            className={styles.signupform__error}
            role="alert"
          >
            {formState.errors.privacyAgreed.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        isFullWidth
        isLoading={isPending || formState.isSubmitting}
      >
        가입하고 시작하기
      </Button>
    </form>
  );
}
