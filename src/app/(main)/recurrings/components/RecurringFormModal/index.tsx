'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import MoneyInput from '@/components/common/MoneyInput';
import SegmentedControl from '@/components/common/SegmentedControl';
import Select from '@/components/common/Select';
import CategoryPicker from '@/components/transaction/CategoryPicker';
import MemberPicker from '@/components/household/MemberPicker';
import { useHouseholdRule } from '@/hooks/useHouseholdRule';
import { useMe } from '@/hooks/useMe';
import { useRecentCategories } from '@/hooks/useRecentCategories';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getCategoryTree } from '@/service/category';
import { getAssets } from '@/service/asset';
import { getPaymentMethods } from '@/service/paymentMethod';
import { createRecurringRule, updateRecurringRule } from '@/service/recurring';
import { todayInSeoul } from '@/utils/ts/formatDate';
import type { CategoryKind, TransactionType } from '@/generated/prisma/enums';
import type { RecurringRuleDto, RecurringSaveResult } from '@/service/recurring/type';
import styles from './RecurringFormModal.module.scss';

interface RecurringFormModalProps {
  rule: RecurringRuleDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const TYPE_OPTIONS = [
  { value: 'EXPENSE', label: '쓴 돈' },
  { value: 'INCOME', label: '번 돈' },
  { value: 'TRANSFER', label: '옮긴 돈' },
] as const;

const FREQ_OPTIONS = [
  { value: 'MONTHLY', label: '매월' },
  { value: 'WEEKLY', label: '매주' },
  { value: 'YEARLY', label: '매년' },
] as const;

const SPLIT_OPTIONS = [
  { value: 'SHARED', label: '같이 쓴 돈' },
  { value: 'PERSONAL', label: '각자 쓴 돈' },
] as const;

const WEEKDAY_OPTIONS = ['일', '월', '화', '수', '목', '금', '토'].map((label, index) => ({
  value: String(index),
  label: `${label}요일`,
}));

const DAY_OPTIONS = [
  ...Array.from({ length: 30 }, (_, index) => ({ value: String(index + 1), label: `${index + 1}일` })),
  // 31 은 그 달 일수로 클램프되므로 곧 말일이다.
  { value: '31', label: '말일' },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: `${index + 1}월`,
}));

interface FormState {
  name: string;
  type: TransactionType;
  amount: number | null;
  memberId: string;
  categoryId: string | null;
  paymentMethodId: string;
  splitMode: 'SHARED' | 'PERSONAL';
  assetId: string;
  freq: 'MONTHLY' | 'WEEKLY' | 'YEARLY';
  interval: number;
  dayOfMonth: number;
  weekday: number;
  monthOfYear: number;
  startDate: string;
  endDate: string;
  memo: string;
}

export default function RecurringFormModal({ rule, isOpen, onClose, onSaved }: RecurringFormModalProps) {
  const me = useMe();
  const { hasOthers, isShared } = useHouseholdRule();
  const { recentIds } = useRecentCategories();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormState>(() => ({
    name: rule?.name ?? '',
    type: rule?.type ?? 'EXPENSE',
    amount: rule?.amount ?? null,
    memberId: rule?.member.id ?? '',
    categoryId: rule?.category?.id ?? null,
    paymentMethodId: rule?.paymentMethod?.id ?? '',
    splitMode: rule?.splitMode === 'PERSONAL' ? 'PERSONAL' : 'SHARED',
    assetId: rule?.asset?.id ?? '',
    freq: rule?.freq ?? 'MONTHLY',
    interval: rule?.interval ?? 1,
    dayOfMonth: rule?.dayOfMonth ?? 25,
    weekday: rule?.weekday ?? 5,
    monthOfYear: rule?.monthOfYear ?? 1,
    startDate: rule?.startDate ?? todayInSeoul(),
    endDate: rule?.endDate ?? '',
    memo: rule?.memo ?? '',
  }));

  const kind: CategoryKind = form.type;
  const categories = useQuery({
    queryKey: QUERY_KEY.CATEGORY.TREE({ kind }),
    queryFn: () => getCategoryTree({ kind }),
    enabled: isOpen && form.type !== 'TRANSFER',
  });
  const assetList = useQuery({
    queryKey: QUERY_KEY.ASSET.LIST(),
    queryFn: getAssets,
  });
  const assets = (assetList.data?.assets ?? []).filter((asset) => asset.isActive);

  const paymentMethods = useQuery({
    queryKey: QUERY_KEY.PAYMENT_METHOD.LIST(),
    queryFn: getPaymentMethods,
    enabled: isOpen,
  });

  const members = me.data?.members ?? [];
  const memberId = form.memberId || me.data?.member?.id || members[0]?.id || '';
  const patch = (next: Partial<FormState>) => setForm((previous) => ({ ...previous, ...next }));

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        type: form.type,
        memberId,
        categoryId: form.type === 'TRANSFER' ? null : form.categoryId,
        paymentMethodId: form.paymentMethodId || null,
        amount: form.amount ?? 0,
        splitMode: form.splitMode,
        assetId: form.type === 'TRANSFER' ? form.assetId || null : null,
        memo: form.memo || undefined,
        freq: form.freq,
        interval: form.interval,
        dayOfMonth: form.freq === 'WEEKLY' ? null : form.dayOfMonth,
        weekday: form.freq === 'WEEKLY' ? form.weekday : null,
        monthOfYear: form.freq === 'YEARLY' ? form.monthOfYear : null,
        startDate: form.startDate,
        endDate: form.endDate || null,
      };

      return rule
        ? updateRecurringRule(rule.id, { ...payload, isActive: rule.isActive })
        : createRecurringRule(payload);
    },
  });

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    if (!form.amount) {
      setErrors({ amount: '금액을 입력해 주세요.' });

      return;
    }

    let saved: RecurringSaveResult;
    try {
      saved = await mutateAsync();
    } catch (error) {
      if (isApiError(error)) {
        setErrors(error.fieldErrors ?? {});
        if (!error.fieldErrors) toast.error(error.message);

        return;
      }
      toast.error('저장하지 못했어요.');

      return;
    }

    // 서버가 이번 달 회차를 거래로 만든다. 몇 건이 들어갔는지 말해 주지 않으면
    // 사용자는 합계가 왜 늘었는지 모른다.
    const { created, upcoming } = saved.backfill;
    const filled = created + upcoming;
    const detail = upcoming > 0 ? ` (다가올 ${upcoming}건 포함)` : '';
    toast.success(
      filled === 0
        ? rule ? '수정했어요.' : '추가했어요.'
        : `${rule ? '수정했어요' : '추가했어요'}. 이번 달 거래 ${filled}건을 넣어 뒀어요.${detail}`,
    );
    onSaved();
  };

  return (
    <Modal
      urlKey="recurring-form"
      isOpen={isOpen}
      onClose={onClose}
      title={rule ? '반복되는 돈 수정' : '매달 반복되는 돈'}
      description="월급, 월세처럼 매달 같은 날 오가는 돈이에요. 날짜가 되면 거래를 자동으로 적어 드려요."
      footer={
        <div className={styles.recurringformmodal__actions}>
          <Button
            variant="secondary"
            onClick={onClose}
          >
            닫기
          </Button>
          <Button
            type="submit"
            form="recurring-form"
            isLoading={isPending}
          >
            저장
          </Button>
        </div>
      }
    >
      <form
        method="post"
        className={styles.recurringformmodal}
        id="recurring-form"
        onSubmit={onSubmit}
        noValidate
      >
        <FormField
          label="이름"
          error={errors.name}
          isRequired
        >
          {({ id }) => (
            <Input
              id={id}
              placeholder="예: 월세"
              value={form.name}
              isInvalid={Boolean(errors.name)}
              onChange={(event) => patch({ name: event.target.value })}
            />
          )}
        </FormField>

        <SegmentedControl
          name="recurring-type"
          options={TYPE_OPTIONS}
          value={form.type}
          onChange={(value) => patch({ type: value as TransactionType, categoryId: null })}
          ariaLabel="거래 종류"
        />

        <FormField
          label="금액"
          error={errors.amount}
          isRequired
        >
          {({ id }) => (
            <MoneyInput
              id={id}
              value={form.amount}
              onChange={(value) => patch({ amount: value })}
              isInvalid={Boolean(errors.amount)}
            />
          )}
        </FormField>

        {form.type !== 'TRANSFER' && (
          <FormField
            label="분류"
            error={errors.categoryId}
            isRequired
          >
            {({ id }) => (
              <CategoryPicker
                id={id}
                tree={categories.data ?? []}
                kind={kind}
                value={form.categoryId}
                onChange={(categoryId) => patch({ categoryId })}
                recentIds={recentIds}
                isInvalid={Boolean(errors.categoryId)}
              />
            )}
          </FormField>
        )}

        <FormField label="주기">
          {() => (
            <div className={styles.recurringformmodal__freq}>
              <SegmentedControl
                name="recurring-freq"
                options={FREQ_OPTIONS}
                value={form.freq}
                onChange={(value) => patch({ freq: value as FormState['freq'] })}
                ariaLabel="반복 주기"
              />

              <div className={styles.recurringformmodal__freqdetail}>
                {form.freq === 'WEEKLY' ? (
                  <Select
                    options={WEEKDAY_OPTIONS}
                    value={String(form.weekday)}
                    aria-label="요일"
                    onChange={(event) => patch({ weekday: Number(event.target.value) })}
                  />
                ) : (
                  <>
                    {form.freq === 'YEARLY' && (
                      <Select
                        options={MONTH_OPTIONS}
                        value={String(form.monthOfYear)}
                        aria-label="월"
                        onChange={(event) => patch({ monthOfYear: Number(event.target.value) })}
                      />
                    )}
                    <Select
                      options={DAY_OPTIONS}
                      value={String(form.dayOfMonth)}
                      aria-label="일"
                      onChange={(event) => patch({ dayOfMonth: Number(event.target.value) })}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </FormField>

        {hasOthers && (
          <FormField
            label={form.type === 'INCOME' ? '받는 사람' : '내는 사람'}
          >
            {({ id }) => (
              <MemberPicker
                id={id}
                name="recurring-member"
                label={form.type === 'INCOME' ? '받는 사람' : '내는 사람'}
                members={members}
                value={memberId}
                onChange={(value) => patch({ memberId: value })}
              />
            )}
          </FormField>
        )}

        {form.type === 'EXPENSE' && isShared && (
          <FormField label="나누기">
            {() => (
              <SegmentedControl
                name="recurring-split"
                options={SPLIT_OPTIONS}
                value={form.splitMode}
                onChange={(value) => patch({ splitMode: value as 'SHARED' | 'PERSONAL' })}
                ariaLabel="분담 방식"
              />
            )}
          </FormField>
        )}

        <div className={styles.recurringformmodal__period}>
          <FormField
            label="시작일"
            error={errors.startDate}
          >
            {({ id }) => (
              <Input
                id={id}
                type="date"
                value={form.startDate}
                onChange={(event) => patch({ startDate: event.target.value })}
              />
            )}
          </FormField>

          <FormField
            label="종료일"
            hint="비우면 계속"
            error={errors.endDate}
          >
            {({ id }) => (
              <Input
                id={id}
                type="date"
                value={form.endDate}
                onChange={(event) => patch({ endDate: event.target.value })}
              />
            )}
          </FormField>
        </div>

        {form.type === 'TRANSFER' && assets.length > 0 && (
          <FormField
            label="어디에 모으나"
            hint="고르면 매달 적히는 금액이 이 자산에 쌓여요."
          >
            {({ id }) => (
              <Select
                id={id}
                value={form.assetId}
                onChange={(event) => patch({ assetId: event.target.value })}
                options={[
                  { value: '', label: '고르지 않음' },
                  ...assets.map((asset) => ({ value: asset.id, label: asset.name })),
                ]}
              />
            )}
          </FormField>
        )}

        <FormField label={form.type === 'INCOME' ? '입금 계좌' : '결제수단'}>
          {({ id }) => (
            <Select
              id={id}
              options={(paymentMethods.data ?? []).map((method) => ({ value: method.id, label: method.name }))}
              placeholder="선택 안 함"
              value={form.paymentMethodId}
              onChange={(event) => patch({ paymentMethodId: event.target.value })}
            />
          )}
        </FormField>

        <FormField label="메모">
          {({ id }) => (
            <Input
              id={id}
              value={form.memo}
              onChange={(event) => patch({ memo: event.target.value })}
            />
          )}
        </FormField>
      </form>
    </Modal>
  );
}
