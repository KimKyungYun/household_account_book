'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import { loginSchema } from '@/service/auth/schema';
import { PATH } from '@/routes/paths';
import type { LoginInput } from '@/service/auth/schema';
import styles from './LoginForm.module.scss';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    const result = await signIn('credentials', { ...values, redirect: false });
    if (result?.error) {
      setFormError('이메일 또는 비밀번호가 맞지 않습니다.');

      return;
    }

    router.replace(searchParams.get('callbackUrl') ?? PATH.DASHBOARD);
  });

  return (
    <form
      method="post"
      className={styles.loginform}
      onSubmit={onSubmit}
      noValidate
    >
      <FormField
        label="이메일"
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
        error={formState.errors.password?.message}
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="password"
            autoComplete="current-password"
            aria-describedby={describedBy}
            isInvalid={Boolean(formState.errors.password)}
            {...register('password')}
          />
        )}
      </FormField>

      {formError && (
        <p
          className={styles.loginform__error}
          role="alert"
        >
          {formError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        isFullWidth
        isLoading={formState.isSubmitting}
      >
        로그인
      </Button>
    </form>
  );
}
