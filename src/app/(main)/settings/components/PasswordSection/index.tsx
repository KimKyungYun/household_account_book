'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import { isApiError } from '@/interface/errorType';
import { changePassword } from '@/service/auth';
import { changePasswordSchema } from '@/service/auth/schema';
import type { ChangePasswordInput } from '@/service/auth/schema';
import styles from './PasswordSection.module.scss';

const EMPTY: ChangePasswordInput = { currentPassword: '', newPassword: '', newPasswordConfirm: '' };

/** 비밀번호 바꾸기. 바꾼 뒤에도 로그인은 그대로 유지되고, 다음 로그인부터 새 비밀번호를 쓴다. */
export default function PasswordSection() {
  const { register, handleSubmit, setError, reset, formState } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });
  const { mutateAsync, isPending } = useMutation({ mutationFn: changePassword });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutateAsync(values);
    } catch (error) {
      if (isApiError(error) && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof ChangePasswordInput, { message });
        }
      }
      // 그 밖의 오류는 전역 MutationCache 가 토스트로 알린다.
      return;
    }

    toast.success('비밀번호를 바꿨습니다.');
    reset(EMPTY);
  });

  return (
    <Card
      title="비밀번호 변경"
      description="다음 로그인부터 새 비밀번호를 씁니다."
    >
      <form
        method="post"
        className={styles.passwordsection}
        onSubmit={onSubmit}
        noValidate
      >
        <FormField
          label="지금 비밀번호"
          error={formState.errors.currentPassword?.message}
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              type="password"
              autoComplete="current-password"
              aria-describedby={describedBy}
              isInvalid={Boolean(formState.errors.currentPassword)}
              {...register('currentPassword')}
            />
          )}
        </FormField>

        <div className={styles.passwordsection__new}>
          <FormField
            label="새 비밀번호"
            hint="8자 이상"
            error={formState.errors.newPassword?.message}
          >
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                aria-describedby={describedBy}
                isInvalid={Boolean(formState.errors.newPassword)}
                {...register('newPassword')}
              />
            )}
          </FormField>

          <FormField
            label="새 비밀번호 확인"
            error={formState.errors.newPasswordConfirm?.message}
          >
            {({ id, describedBy }) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                aria-describedby={describedBy}
                isInvalid={Boolean(formState.errors.newPasswordConfirm)}
                {...register('newPasswordConfirm')}
              />
            )}
          </FormField>
        </div>

        <Button
          type="submit"
          className={styles.passwordsection__submit}
          isLoading={isPending || formState.isSubmitting}
        >
          비밀번호 바꾸기
        </Button>
      </form>
    </Card>
  );
}
