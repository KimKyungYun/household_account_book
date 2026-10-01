'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import { isApiError } from '@/interface/errorType';
import { PATH } from '@/routes/paths';
import { getInvite, joinHousehold } from '@/service/auth';
import { joinHouseholdSchema } from '@/service/auth/schema';
import { HOUSEHOLD_KIND_RULES, RELATION_LABEL } from '@/service/household/kind';
import type { JoinHouseholdInput } from '@/service/auth/schema';
import type { InviteDto } from '@/service/auth/type';
import styles from './JoinHouseholdForm.module.scss';

/**
 * 초대 코드로 합류 — 코드를 먼저 확인해 어느 가구인지 보여 주고, 그 가구 유형에 맞는 관계를 고른다.
 * 확인 없이 바로 합류시키면 엉뚱한 코드를 붙여넣었을 때 남의 장부에 들어가고 나서야 안다.
 */
export default function JoinHouseholdForm() {
  const router = useRouter();
  const [invite, setInvite] = useState<InviteDto | null>(null);

  const { register, handleSubmit, setValue, getValues, setError, clearErrors, formState } = useForm<JoinHouseholdInput>({
    resolver: zodResolver(joinHouseholdSchema),
    defaultValues: { inviteCode: '', displayName: '', relation: 'OTHER' },
  });

  const lookup = useMutation({
    mutationFn: () => getInvite(getValues('inviteCode').trim()),
    onSuccess: (found) => {
      if (found.isFull) {
        setError('inviteCode', { message: `이 장부는 정원(${found.capacity}명)이 다 찼습니다.` });

        return;
      }
      clearErrors('inviteCode');
      setInvite(found);
      setValue('relation', HOUSEHOLD_KIND_RULES[found.kind].relations[0] ?? 'OTHER');
    },
    onError: (error) => setError('inviteCode', { message: isApiError(error) ? error.message : '확인하지 못했습니다.' }),
  });

  const join = useMutation({ mutationFn: joinHousehold });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await join.mutateAsync(values);
    } catch (error) {
      if (isApiError(error)) {
        const field = error.fieldErrors?.relation ? 'relation' : 'inviteCode';
        setError(field, { message: error.fieldErrors?.relation ?? error.message });

        return;
      }
      // 그 밖의 오류는 전역 MutationCache 가 토스트로 알린다. 다시 던지면 처리되지 않은 Promise 오류만 남는다.
      return;
    }

    router.replace(PATH.DASHBOARD);
  });

  const rule = invite ? HOUSEHOLD_KIND_RULES[invite.kind] : null;

  return (
    <form
      method="post"
      className={styles.joinhouseholdform}
      onSubmit={onSubmit}
      noValidate
    >
      <div className={styles.joinhouseholdform__code}>
        <FormField
          label="초대 코드"
          hint="함께 쓸 사람의 설정 화면에 있습니다."
          error={formState.errors.inviteCode?.message}
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              placeholder="초대 코드 붙여넣기"
              aria-describedby={describedBy}
              isInvalid={Boolean(formState.errors.inviteCode)}
              readOnly={Boolean(invite)}
              {...register('inviteCode')}
            />
          )}
        </FormField>
        <Button
          variant="secondary"
          className={styles.joinhouseholdform__check}
          isLoading={lookup.isPending}
          onClick={() => (invite ? setInvite(null) : lookup.mutate())}
        >
          {invite ? '다른 코드' : '확인'}
        </Button>
      </div>

      {invite && rule && (
        <>
          <p
            className={styles.joinhouseholdform__found}
            role="status"
          >
            <strong>{invite.name}</strong> · {rule.label} 장부 · {invite.memberCount}/{invite.capacity}명
          </p>

          <div className={styles.joinhouseholdform__row}>
            <FormField
              label="내 이름"
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
            isLoading={join.isPending || formState.isSubmitting}
          >
            합류하기
          </Button>
        </>
      )}
    </form>
  );
}
