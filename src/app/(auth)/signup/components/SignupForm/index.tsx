'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import { signup } from '@/service/auth';
import { signupSchema } from '@/service/auth/schema';
import { isApiError } from '@/interface/errorType';
import { PATH } from '@/routes/paths';
import type { SignupInput } from '@/service/auth/schema';
import styles from './SignupForm.module.scss';

export default function SignupForm() {
  const router = useRouter();
  const { register, handleSubmit, setError, formState } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', name: '' },
  });

  const { mutateAsync, isPending } = useMutation({ mutationFn: signup });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutateAsync(values);
    } catch (error) {
      // 서버가 준 fieldErrors 를 그대로 폼에 꽂는다 — 프론트/서버 문구가 갈리지 않는다.
      if (isApiError(error) && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof SignupInput, { message });
        }

        return;
      }
      throw error;
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
        hint="가계부에 표시될 이름입니다."
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
