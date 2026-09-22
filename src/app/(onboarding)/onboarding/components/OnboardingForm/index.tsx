'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import SegmentedControl from '@/components/common/SegmentedControl';
import { createHousehold, joinHousehold } from '@/service/auth';
import { createHouseholdSchema, joinHouseholdSchema } from '@/service/auth/schema';
import { isApiError } from '@/interface/errorType';
import { PATH } from '@/routes/paths';
import type { CreateHouseholdInput, JoinHouseholdInput } from '@/service/auth/schema';
import styles from './OnboardingForm.module.scss';

type Mode = 'create' | 'join';

const MODE_OPTIONS = [
  { value: 'create', label: '새로 만들기' },
  { value: 'join', label: '초대 코드로 합류' },
] as const;

const SLOT_OPTIONS = [
  { value: '0', label: '남편' },
  { value: '1', label: '와이프' },
] as const;

export default function OnboardingForm() {
  const [mode, setMode] = useState<Mode>('create');

  return (
    <div className={styles.onboardingform}>
      <SegmentedControl
        name="onboarding-mode"
        options={MODE_OPTIONS}
        value={mode}
        onChange={(value) => setMode(value as Mode)}
        ariaLabel="가구 설정 방식"
      />

      {mode === 'create' ? <CreateForm /> : <JoinForm />}
    </div>
  );
}

function CreateForm() {
  const router = useRouter();
  const { register, handleSubmit, setValue, control, setError, formState } = useForm<CreateHouseholdInput>({
    resolver: zodResolver(createHouseholdSchema),
    defaultValues: { householdName: '우리집', displayName: '', slot: 0 },
  });
  const { mutateAsync, isPending } = useMutation({ mutationFn: createHousehold });
  const slot = useWatch({ control, name: 'slot' });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutateAsync(values);
    } catch (error) {
      if (isApiError(error) && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof CreateHouseholdInput, { message });
        }

        return;
      }
      throw error;
    }

    // 세션은 매 요청 가구를 다시 읽으므로 새로고침 없이 대시보드로 넘어가도 된다.
    router.replace(PATH.DASHBOARD);
  });

  return (
    <form
      method="post"
      className={styles.onboardingform__form}
      onSubmit={onSubmit}
      noValidate
    >
      <FormField
        label="집 이름"
        error={formState.errors.householdName?.message}
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            placeholder="우리집"
            aria-describedby={describedBy}
            isInvalid={Boolean(formState.errors.householdName)}
            {...register('householdName')}
          />
        )}
      </FormField>

      <FormField
        label="내 이름"
        hint="거래 목록과 나누기 결과에 표시됩니다."
        error={formState.errors.displayName?.message}
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            placeholder="남편"
            aria-describedby={describedBy}
            isInvalid={Boolean(formState.errors.displayName)}
            {...register('displayName')}
          />
        )}
      </FormField>

      <FormField
        label="내 자리"
        hint="차트 색과 표시 순서가 정해집니다."
        error={formState.errors.slot?.message}
      >
        {() => (
          <SegmentedControl
            name="slot"
            options={SLOT_OPTIONS}
            value={String(slot)}
            onChange={(value) => setValue('slot', Number(value))}
            ariaLabel="내 자리"
          />
        )}
      </FormField>

      <Button
        type="submit"
        size="lg"
        isFullWidth
        isLoading={isPending || formState.isSubmitting}
      >
        시작하기
      </Button>
    </form>
  );
}

function JoinForm() {
  const router = useRouter();
  const { register, handleSubmit, setError, formState } = useForm<JoinHouseholdInput>({
    resolver: zodResolver(joinHouseholdSchema),
    defaultValues: { inviteCode: '', displayName: '' },
  });
  const { mutateAsync, isPending } = useMutation({ mutationFn: joinHousehold });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutateAsync(values);
    } catch (error) {
      if (isApiError(error)) {
        setError('inviteCode', { message: error.message });

        return;
      }
      throw error;
    }

    router.replace(PATH.DASHBOARD);
  });

  return (
    <form
      method="post"
      className={styles.onboardingform__form}
      onSubmit={onSubmit}
      noValidate
    >
      <FormField
        label="초대 코드"
        hint="배우자의 설정 화면에 있습니다."
        error={formState.errors.inviteCode?.message}
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            placeholder="초대 코드 붙여넣기"
            aria-describedby={describedBy}
            isInvalid={Boolean(formState.errors.inviteCode)}
            {...register('inviteCode')}
          />
        )}
      </FormField>

      <FormField
        label="내 이름"
        error={formState.errors.displayName?.message}
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            placeholder="와이프"
            aria-describedby={describedBy}
            isInvalid={Boolean(formState.errors.displayName)}
            {...register('displayName')}
          />
        )}
      </FormField>

      <Button
        type="submit"
        size="lg"
        isFullWidth
        isLoading={isPending || formState.isSubmitting}
      >
        합류하기
      </Button>
    </form>
  );
}
