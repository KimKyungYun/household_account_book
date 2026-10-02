'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import { isApiError } from '@/interface/errorType';
import { changePassword } from '@/service/auth';
import { changePasswordSchema } from '@/service/auth/schema';
import type { ChangePasswordInput } from '@/service/auth/schema';
import styles from './PasswordModal.module.scss';

const EMPTY: ChangePasswordInput = { currentPassword: '', newPassword: '', newPasswordConfirm: '' };
const FORM_ID = 'password-form';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 비밀번호 바꾸기. 설정 화면에 늘 펼쳐 두지 않고 「내 정보」에서 열어야 보인다.
 * 바꾼 뒤에도 로그인은 그대로 유지되고, 다음 로그인부터 새 비밀번호를 쓴다.
 */
export default function PasswordModal({ isOpen, onClose }: PasswordModalProps) {
  const { register, handleSubmit, setError, reset, formState } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });
  const { mutateAsync, isPending } = useMutation({ mutationFn: changePassword });

  // 닫을 때 비운다 — 적다 만 비밀번호가 다음에 열었을 때 남아 있으면 안 된다.
  const close = () => {
    reset(EMPTY);
    onClose();
  };

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

    toast.success('비밀번호를 바꿨어요.');
    close();
  });

  return (
    <Modal
      urlKey="password-change"
      isOpen={isOpen}
      onClose={close}
      title="비밀번호 변경"
      description="다음 로그인부터 새 비밀번호를 써 주세요"
      footer={
        <div className={styles.passwordmodal__actions}>
          <Button
            variant="secondary"
            onClick={close}
          >
            닫기
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            isLoading={isPending || formState.isSubmitting}
          >
            비밀번호 바꾸기
          </Button>
        </div>
      }
    >
      <form
        method="post"
        id={FORM_ID}
        className={styles.passwordmodal}
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
      </form>
    </Modal>
  );
}
