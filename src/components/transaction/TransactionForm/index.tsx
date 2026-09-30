'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import MoneyInput from '@/components/common/MoneyInput';
import SegmentedControl from '@/components/common/SegmentedControl';
import Select from '@/components/common/Select';
import Skeleton from '@/components/common/Skeleton';
import CategoryPicker from '@/components/transaction/CategoryPicker';
import { useMe } from '@/hooks/useMe';
import { useRecentCategories } from '@/hooks/useRecentCategories';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getCategoryTree } from '@/service/category';
import { getAssets } from '@/service/asset';
import { getPaymentMethods } from '@/service/paymentMethod';
import { createTransaction, updateTransaction } from '@/service/transaction';
import { cn } from '@/utils/ts/cn';
import { todayInSeoul } from '@/utils/ts/formatDate';
import type { CategoryKind, TransactionType } from '@/generated/prisma/enums';
import type { TransactionListItemDto } from '@/service/transaction/type';
import styles from './TransactionForm.module.scss';

interface TransactionFormProps {
  mode: 'create' | 'edit';
  transaction?: TransactionListItemDto;
  /** 등록 폼을 열 때 미리 채울 날짜. 달력에서 날짜를 눌러 들어올 때 쓴다. */
  defaultDate?: string;
  onSuccess: () => void;
  /** 모달·시트에서 쓸 때 제출 버튼을 바깥(푸터)에 두기 위한 폼 id. */
  formId?: string;
  /** 폼 안에 제출 버튼을 둘지. 전용 페이지에서는 true. */
  withSubmitButton?: boolean;
}

const TYPE_OPTIONS = [
  { value: 'EXPENSE', label: '쓴 돈' },
  { value: 'INCOME', label: '번 돈' },
  { value: 'TRANSFER', label: '옮긴 돈' },
] as const;

const SPLIT_OPTIONS = [
  { value: 'SHARED', label: '같이 쓴 돈' },
  { value: 'PERSONAL', label: '각자 쓴 돈' },
] as const;

/**
 * 종류에 따라 달라지는 말.
 *
 * 번 돈인데 '누가 냈나'를 묻거나 '같이 쓴 돈'을 고르라고 하면 앞뒤가 맞지 않는다.
 * 나누기(분담)는 **쓴 돈에만** 쓰이므로 다른 종류에서는 아예 보여주지 않는다.
 */
const WORDING = {
  EXPENSE: { member: '결제한 사람', place: '사용한 곳', placeHint: '예: 이마트', method: '결제수단' },
  INCOME: { member: '받은 사람', place: '받은 곳', placeHint: '예: 회사 이름', method: '입금 계좌' },
  TRANSFER: { member: '옮긴 사람', place: '옮긴 곳', placeHint: '예: 신한 적금', method: '이동 수단' },
} as const;

const DATE_QUICK = [
  { label: '오늘', offset: 0 },
  { label: '어제', offset: -1 },
  { label: '그제', offset: -2 },
] as const;

function shiftDay(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);

  return base.toISOString().slice(0, 10);
}

interface FormState {
  type: TransactionType;
  amount: number | null;
  date: string;
  categoryId: string | null;
  memberId: string;
  paymentMethodId: string;
  splitMode: 'SHARED' | 'PERSONAL';
  assetId: string;
  merchant: string;
  memo: string;
}

/**
 * 거래 입력의 정본. 모달(데스크톱)·바텀시트(모바일)·전용 페이지가 이 하나를 나눠 쓴다.
 *
 * 저장 후에는 유형·카테고리·날짜를 남기고 금액만 비운다 —
 * 장보고 와서 세 건을 잇달아 넣는 흐름이 끊기지 않게 한다.
 */
export function TransactionForm({
  mode,
  transaction,
  defaultDate,
  onSuccess,
  formId = 'transaction-form',
  withSubmitButton = false,
}: TransactionFormProps) {
  const me = useMe();
  const { recentIds, remember } = useRecentCategories();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormState>(() => ({
    type: transaction?.type ?? 'EXPENSE',
    amount: transaction ? Math.abs(transaction.amount) : null,
    date: transaction?.date ?? defaultDate ?? todayInSeoul(),
    categoryId: transaction?.category?.id ?? null,
    memberId: transaction?.member.id ?? '',
    paymentMethodId: transaction?.paymentMethod?.id ?? '',
    splitMode: transaction?.splitMode === 'PERSONAL' ? 'PERSONAL' : 'SHARED',
    assetId: transaction?.asset?.id ?? '',
    merchant: transaction?.merchant ?? '',
    memo: transaction?.memo ?? '',
  }));

  const kind: CategoryKind = form.type;
  const categories = useQuery({
    queryKey: QUERY_KEY.CATEGORY.TREE({ kind }),
    queryFn: () => getCategoryTree({ kind }),
  });
  const paymentMethods = useQuery({
    queryKey: QUERY_KEY.PAYMENT_METHOD.LIST(),
    queryFn: getPaymentMethods,
  });

  // '옮긴 돈'에서 어디에 모으는지 고르기 위한 목록. 보관한 자산은 고를 수 없다.
  const assetList = useQuery({
    queryKey: QUERY_KEY.ASSET.LIST(),
    queryFn: getAssets,
  });
  const assets = (assetList.data?.assets ?? []).filter((asset) => asset.isActive);

  const members = me.data?.members ?? [];
  const memberId = form.memberId || me.data?.member?.id || members[0]?.id || '';

  const patch = (next: Partial<FormState>) => setForm((previous) => ({ ...previous, ...next }));

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      if (mode === 'edit' && transaction) {
        return updateTransaction(transaction.id, {
          date: form.date,
          amount: form.amount ?? 0,
          memberId,
          categoryId: form.type === 'TRANSFER' ? null : form.categoryId,
          paymentMethodId: form.paymentMethodId || null,
          splitMode: form.type === 'TRANSFER' ? 'PERSONAL' : form.splitMode,
          assetId: form.type === 'TRANSFER' ? form.assetId || null : null,
          merchant: form.merchant || null,
          memo: form.memo || null,
          version: transaction.version,
        });
      }

      return createTransaction({
        date: form.date,
        type: form.type,
        amount: form.amount ?? 0,
        memberId,
        categoryId: form.type === 'TRANSFER' ? null : form.categoryId,
        paymentMethodId: form.paymentMethodId || null,
        splitMode: form.type === 'TRANSFER' ? 'PERSONAL' : form.splitMode,
        assetId: form.type === 'TRANSFER' ? form.assetId || null : null,
        merchant: form.merchant || undefined,
        memo: form.memo || undefined,
        // 같은 화면에서 두 번 눌려도 한 건만 남는다.
        clientRequestId: crypto.randomUUID(),
      });
    },
  });

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});

    if (form.amount === null || form.amount === 0) {
      setFieldErrors({ amount: '금액을 입력해 주세요.' });

      return;
    }

    // 종류와 상관없이 '누가 했는지'는 반드시 있어야 한다. 구성원을 못 불러온 상태에서
    // 그대로 보내면 서버가 400 으로 되돌려줄 뿐 사용자는 이유를 알 수 없다.
    if (!memberId) {
      setFieldErrors({ memberId: `${WORDING[form.type].member}을(를) 고를 수 없습니다. 새로고침해 주세요.` });

      return;
    }

    try {
      await mutateAsync();
    } catch (error) {
      if (isApiError(error)) {
        setFieldErrors(error.fieldErrors ?? {});
        if (!error.fieldErrors) toast.error(error.message);

        return;
      }
      toast.error('저장하지 못했습니다.');

      return;
    }

    if (form.categoryId) remember(form.categoryId);
    toast.success(mode === 'edit' ? '수정했습니다.' : '등록했습니다.');

    // 연속 입력: 금액만 비우고 나머지는 그대로 둔다.
    if (mode === 'create') patch({ amount: null, merchant: '', memo: '' });
    onSuccess();
  };

  if (me.isPending) return <Skeleton height={320} />;

  // 구성원 목록이 없으면 '누가 썼는지'를 고를 수 없어 어떤 거래도 저장되지 않는다.
  // 빈 선택지를 주고 저장을 누르게 두면 400 만 돌아온다.
  if (members.length === 0) {
    return (
      <p className={styles.transactionform__blocked}>
        구성원 정보를 불러오지 못했습니다. 새로고침해 주세요.
      </p>
    );
  }

  return (
    <form
      method="post"
      className={styles.transactionform}
      id={formId}
      onSubmit={onSubmit}
      noValidate
    >
      <div className={styles.transactionform__type}>
        <SegmentedControl
          name="transaction-type"
          options={TYPE_OPTIONS}
          value={form.type}
          onChange={(value) => patch({ type: value as TransactionType, categoryId: null })}
          ariaLabel="거래 종류"
        />
        {form.type === 'TRANSFER' && (
          <p className={styles.transactionform__typehint}>
            계좌끼리 옮긴 금액, 카드값, 적금 납입액입니다. 쓴 것도 번 것도 아니므로 합계에서 제외됩니다.
          </p>
        )}
      </div>

      <FormField
        label="금액"
        error={fieldErrors.amount}
        isRequired
      >
        {({ id, describedBy }) => (
          <MoneyInput
            id={id}
            value={form.amount}
            onChange={(value) => patch({ amount: value })}
            isInvalid={Boolean(fieldErrors.amount)}
            ariaDescribedBy={describedBy}
            autoFocus
          />
        )}
      </FormField>

      {form.type !== 'TRANSFER' && (
        <FormField
          label="분류"
          error={fieldErrors.categoryId}
          isRequired
        >
          {({ id, describedBy }) =>
            categories.isPending ? (
              <Skeleton height={44} />
            ) : (
              <CategoryPicker
                id={id}
                tree={categories.data ?? []}
                value={form.categoryId}
                onChange={(categoryId) => patch({ categoryId })}
                recentIds={recentIds}
                isInvalid={Boolean(fieldErrors.categoryId)}
                ariaDescribedBy={describedBy}
              />
            )}
        </FormField>
      )}

      <FormField
        label="날짜"
        error={fieldErrors.date}
        isRequired
      >
        {({ id, describedBy }) => (
          <div className={styles.transactionform__date}>
            <Input
              id={id}
              type="date"
              value={form.date}
              aria-describedby={describedBy}
              onChange={(event) => patch({ date: event.target.value })}
            />
            <ul className={styles.transactionform__quick}>
              {DATE_QUICK.map((quick) => {
                const target = shiftDay(todayInSeoul(), quick.offset);

                return (
                  <li key={quick.label}>
                    <button
                      type="button"
                      className={cn(styles.transactionform__chip, {
                        [styles['transactionform__chip--selected']]: form.date === target,
                      })}
                      onClick={() => patch({ date: target })}
                      aria-pressed={form.date === target}
                    >
                      {quick.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </FormField>

      <FormField
        label={WORDING[form.type].member}
        error={fieldErrors.memberId}
      >
        {() => (
          <SegmentedControl
            name="transaction-member"
            options={members.map((member) => ({ value: member.id, label: member.displayName }))}
            value={memberId}
            onChange={(value) => patch({ memberId: value })}
            ariaLabel={WORDING[form.type].member}
          />
        )}
      </FormField>

      {form.type === 'EXPENSE' && (
        <FormField
          label="나누기"
          hint={
            form.splitMode === 'SHARED'
              ? '둘의 살림에 들어간 돈으로 표시합니다.'
              : '용돈처럼 한 사람에게만 속한 돈으로 표시합니다.'
          }
        >
          {() => (
            <SegmentedControl
              name="transaction-split"
              options={SPLIT_OPTIONS}
              value={form.splitMode}
              onChange={(value) => patch({ splitMode: value as 'SHARED' | 'PERSONAL' })}
              ariaLabel="분담 방식"
            />
          )}
        </FormField>
      )}

      {form.type === 'TRANSFER' && assets.length > 0 && (
        <FormField
          label="어디에 모으나"
          hint="적금·투자처럼 모으는 돈이면 고릅니다. 고른 자산의 잔액이 이 금액만큼 늘어납니다."
          error={fieldErrors.assetId}
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

      <FormField label={WORDING[form.type].method}>
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

      <FormField
        label={WORDING[form.type].place}
        hint="거래 목록에 이 이름이 먼저 표시됩니다."
      >
        {({ id }) => (
          <Input
            id={id}
            placeholder={WORDING[form.type].placeHint}
            value={form.merchant}
            onChange={(event) => patch({ merchant: event.target.value })}
          />
        )}
      </FormField>

      <FormField label="메모">
        {({ id }) => (
          <Input
            id={id}
            placeholder="선택"
            value={form.memo}
            onChange={(event) => patch({ memo: event.target.value })}
          />
        )}
      </FormField>

      {withSubmitButton && (
        <div className={styles.transactionform__submit}>
          <Button
            type="submit"
            size="lg"
            isFullWidth
            isLoading={isPending}
          >
            {mode === 'edit' ? '수정' : '등록'}
          </Button>
        </div>
      )}
    </form>
  );
}

export default TransactionForm;
