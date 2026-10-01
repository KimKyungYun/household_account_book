'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import { isApiError } from '@/interface/errorType';
import { PATH } from '@/routes/paths';
import { createHousehold } from '@/service/auth';
import { createHouseholdSchema } from '@/service/auth/schema';
import { HOUSEHOLD_KIND_RULES, RELATION_LABEL } from '@/service/household/kind';
import type { CreateHouseholdInput } from '@/service/auth/schema';
import type { HouseholdKind } from '@/generated/prisma/enums';
import KindPicker from '../KindPicker';
import styles from './CreateHouseholdForm.module.scss';

/** 새 가구 만들기 — 유형을 고르면 그 유형에 맞는 관계만 고를 수 있다. */
export default function CreateHouseholdForm() {
  const router = useRouter();
  const { register, handleSubmit, setValue, control, setError, formState } = useForm<CreateHouseholdInput>({
    resolver: zodResolver(createHouseholdSchema),
    defaultValues: { kind: 'COUPLE', householdName: '우리집', displayName: '', relation: 'HUSBAND' },
  });
  const { mutateAsync, isPending } = useMutation({ mutationFn: createHousehold });
  const kind = useWatch({ control, name: 'kind' });
  const rule = HOUSEHOLD_KIND_RULES[kind];

  // 유형을 바꾸면 관계도 그 유형의 첫 값으로 맞춘다. 남겨 두면 '개인'인데 '남편'이 남는다.
  const changeKind = (next: HouseholdKind) => {
    setValue('kind', next);
    setValue('relation', HOUSEHOLD_KIND_RULES[next].relations[0] ?? 'OTHER');
  };

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
      // 그 밖의 오류는 전역 MutationCache 가 토스트로 알린다. 다시 던지면 처리되지 않은 Promise 오류만 남는다.
      return;
    }

    router.replace(PATH.DASHBOARD);
  });

  return (
    <form
      method="post"
      className={styles.createhouseholdform}
      onSubmit={onSubmit}
      noValidate
    >
      <FormField
        label="어떻게 쓰나요?"
        hint="나중에 설정에서 바꿀 수 있어요."
      >
        {() => (
          <KindPicker
            value={kind}
            onChange={changeKind}
          />
        )}
      </FormField>

      <FormField
        label="장부 이름"
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

      <div className={styles.createhouseholdform__row}>
        <FormField
          label="내 이름"
          hint="거래 목록과 차트에 이 이름으로 보여요."
          error={formState.errors.displayName?.message}
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              placeholder="홍길동"
              aria-describedby={describedBy}
              isInvalid={Boolean(formState.errors.displayName)}
              {...register('displayName')}
            />
          )}
        </FormField>

        {/* 혼자 쓰면 관계는 '본인' 하나뿐이라 묻지 않는다. */}
        {rule.relations.length > 1 && (
          <FormField
            label="나는"
            error={formState.errors.relation?.message}
          >
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                options={rule.relations.map((relation) => ({ value: relation, label: RELATION_LABEL[relation] }))}
                {...register('relation')}
              />
            )}
          </FormField>
        )}
      </div>

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
