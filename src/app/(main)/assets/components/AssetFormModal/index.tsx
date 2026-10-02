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
      toast.error('저장하지 못했어요.');

      return;
    }

    toast.success(asset ? '고쳤어요.' : '자산을 만들었어요.');
    onSaved();
  };

  return (
    <Modal
      urlKey="asset-form"
      isOpen={isOpen}
      onClose={onClose}
      title={asset ? '자산 고치기' : '자산 만들기'}
      description="적금·주식처럼 돈을 모으는 통이에요. '옮긴 돈'으로 적은 거래가 여기에 쌓여요."
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

        {/* 혼자 쓰는 장부에는 '누구의 돈'을 가를 상대가 없다. */}
        {members.length > 1 && (
          <FormField
            label="누구의 돈인가요"
            hint="함께 모으는 돈이면 '공동'으로 두세요."
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
        )}

        <FormField
          label="시작 잔액"
          hint="앱을 쓰기 전에 이미 모아 둔 금액이에요. 여기서부터 더해 나가요."
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
          hint="정해 두면 목록에서 달성률을 볼 수 있어요. 비워 둬도 괜찮아요."
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
            이 자산에는 자동으로 넣는 설정이 두 개 넘게 있어서 여기서는 고칠 수 없어요.
            반복 거래 화면에서 관리해 주세요.
          </p>
        ) : (
          <>
            <FormField
              label="매달 자동으로 넣기"
              hint="켜 두면 정한 날마다 이 자산에 자동으로 돈이 쌓여요. 분류는 이체 › 예적금으로 들어가요."
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
                  hint="31일로 정하면 매달 말일에 넣어요."
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
            hint="끄면 목록에서 숨겨요. 이미 넣은 기록은 그대로 남아요."
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
