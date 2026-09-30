'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import MoneyInput from '@/components/common/MoneyInput';
import Select from '@/components/common/Select';
import { useMe } from '@/hooks/useMe';
import { isApiError } from '@/interface/errorType';
import { createAsset, updateAsset } from '@/service/asset';
import type { AssetDto } from '@/service/asset/type';
import type { AssetKind } from '@/generated/prisma/enums';
import styles from './AssetFormModal.module.scss';

const KIND_OPTIONS: { value: AssetKind; label: string }[] = [
  { value: 'SAVINGS', label: '적금·예금' },
  { value: 'INVESTMENT', label: '투자' },
  { value: 'CASH', label: '현금' },
  { value: 'PENSION', label: '연금' },
  { value: 'OTHER', label: '기타' },
];

interface AssetFormModalProps {
  isOpen: boolean;
  asset: AssetDto | null;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (asset: AssetDto) => void;
}

export default function AssetFormModal({ isOpen, asset, onClose, onSaved, onDelete }: AssetFormModalProps) {
  const me = useMe();
  const members = me.data?.members ?? [];
  const [name, setName] = useState(asset?.name ?? '');
  const [kind, setKind] = useState<AssetKind>(asset?.kind ?? 'SAVINGS');
  const [ownerMemberId, setOwnerMemberId] = useState(asset?.owner?.id ?? '');
  const [openingBalance, setOpeningBalance] = useState<number | null>(asset?.openingBalance ?? 0);
  const [targetAmount, setTargetAmount] = useState<number | null>(asset?.targetAmount ?? null);
  const [memo, setMemo] = useState(asset?.memo ?? '');
  const [isActive, setIsActive] = useState(asset?.isActive ?? true);
  const [isAuto, setIsAuto] = useState(Boolean(asset?.autoDeposit));
  const [autoAmount, setAutoAmount] = useState<number | null>(asset?.autoDeposit?.amount ?? null);
  const [autoDay, setAutoDay] = useState(String(asset?.autoDeposit?.dayOfMonth ?? 25));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        kind,
        ownerMemberId: ownerMemberId || null,
        openingBalance: openingBalance ?? 0,
        targetAmount: targetAmount || null,
        memo: memo || null,
        // 규칙이 둘 이상이면 폼이 손대지 않는다 — 어느 것을 고칠지 정할 수 없다.
        ...(asset?.autoDeposit?.hasMany
          ? {}
          : { autoDeposit: isAuto ? { amount: autoAmount ?? 0, dayOfMonth: Number(autoDay) } : null }),
      };

      return asset ? updateAsset(asset.id, { ...payload, isActive }) : createAsset(payload);
    },
  });

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    if (!name.trim()) {
      setErrors({ name: '이름을 입력해 주세요.' });

      return;
    }

    if (isAuto && !asset?.autoDeposit?.hasMany && (!autoAmount || autoAmount <= 0)) {
      setErrors({ autoAmount: '매달 넣을 금액을 입력해 주세요.' });

      return;
    }

    try {
      await mutateAsync();
    } catch (error) {
      if (isApiError(error)) {
        setErrors(error.fieldErrors ?? {});
        if (!error.fieldErrors) toast.error(error.message);

        return;
      }
      toast.error('저장하지 못했습니다.');

      return;
    }

    toast.success(asset ? '고쳤습니다.' : '자산을 만들었습니다.');
    onSaved();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={asset ? '자산 고치기' : '자산 만들기'}
      description="적금·주식처럼 돈을 모으는 통입니다. 거래를 '옮긴 돈'으로 넣을 때 여기서 고른 자산에 쌓입니다."
      footer={
        <div className={styles.assetformmodal__actions}>
          {asset && (
            <Button
              variant="ghost"
              onClick={() => onDelete(asset)}
            >
              지우기
            </Button>
          )}
          <Button
            type="submit"
            form="asset-form"
            isLoading={isPending}
          >
            저장
          </Button>
        </div>
      }
    >
      <form
        method="post"
        id="asset-form"
        className={styles.assetformmodal}
        onSubmit={onSubmit}
      >
        <FormField
          label="이름"
          hint="예: 청년미래적금, 주식"
          error={errors.name}
        >
          {({ id }) => (
            <Input
              id={id}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          )}
        </FormField>

        <FormField
          label="종류"
          error={errors.kind}
        >
          {({ id }) => (
            <Select
              id={id}
              value={kind}
              onChange={(event) => setKind(event.target.value as AssetKind)}
              options={KIND_OPTIONS}
            />
          )}
        </FormField>

        <FormField
          label="누구의 돈인가요"
          hint="둘이 함께 모으면 '공동'으로 둡니다."
        >
          {({ id }) => (
            <Select
              id={id}
              value={ownerMemberId}
              onChange={(event) => setOwnerMemberId(event.target.value)}
              options={[
                { value: '', label: '공동' },
                ...members.map((member) => ({ value: member.id, label: member.displayName })),
              ]}
            />
          )}
        </FormField>

        <FormField
          label="시작 잔액"
          hint="이 앱에 적기 전에 이미 모여 있던 금액입니다. 여기서부터 거래를 더합니다."
          error={errors.openingBalance}
        >
          {({ id }) => (
            <MoneyInput
              id={id}
              value={openingBalance}
              onChange={setOpeningBalance}
            />
          )}
        </FormField>

        <FormField
          label="목표액"
          hint="정하면 목록에 달성률이 보입니다. 비워 두어도 됩니다."
          error={errors.targetAmount}
        >
          {({ id }) => (
            <MoneyInput
              id={id}
              value={targetAmount}
              onChange={setTargetAmount}
            />
          )}
        </FormField>

        {asset?.autoDeposit?.hasMany ? (
          <p className={styles.assetformmodal__notice}>
            이 자산에는 자동으로 넣는 설정이 두 개 넘게 있습니다. 어느 것을 고칠지 여기서
            정할 수 없어 그대로 둡니다 — 반복 거래 화면에서 관리해 주세요.
          </p>
        ) : (
          <>
            <FormField
              label="매달 자동으로 넣기"
              hint="켜면 정한 날짜마다 '옮긴 돈' 거래가 만들어져 이 자산에 쌓입니다. 분류는 이체 › 예적금으로 들어갑니다."
            >
              {({ id }) => (
                <Select
                  id={id}
                  value={isAuto ? 'yes' : 'no'}
                  onChange={(event) => setIsAuto(event.target.value === 'yes')}
                  options={[
                    { value: 'no', label: '직접 넣기' },
                    { value: 'yes', label: '매달 자동으로 넣기' },
                  ]}
                />
              )}
            </FormField>

            {isAuto && (
              <div className={styles.assetformmodal__pair}>
                <FormField
                  label="매달 넣을 금액"
                  error={errors.autoAmount}
                >
                  {({ id }) => (
                    <MoneyInput
                      id={id}
                      value={autoAmount}
                      onChange={setAutoAmount}
                    />
                  )}
                </FormField>

                <FormField
                  label="넣는 날"
                  hint="31 은 말일을 겸합니다."
                  error={errors.autoDay}
                >
                  {({ id }) => (
                    <Input
                      id={id}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="31"
                      value={autoDay}
                      onChange={(event) => setAutoDay(event.target.value)}
                    />
                  )}
                </FormField>
              </div>
            )}
          </>
        )}

        <FormField label="메모">
          {({ id }) => (
            <Input
              id={id}
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
          )}
        </FormField>

        {asset && (
          <FormField
            label="목록에 보이기"
            hint="끄면 목록에서 숨깁니다. 이미 넣은 기록은 그대로 남습니다."
          >
            {({ id }) => (
              <Select
                id={id}
                value={isActive ? 'yes' : 'no'}
                onChange={(event) => setIsActive(event.target.value === 'yes')}
                options={[
                  { value: 'yes', label: '보이기' },
                  { value: 'no', label: '숨기기' },
                ]}
              />
            )}
          </FormField>
        )}
      </form>
    </Modal>
  );
}
