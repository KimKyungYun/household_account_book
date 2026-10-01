'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
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
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getCategoryTree } from '@/service/category';
import { createLoan, updateLoan } from '@/service/loan';
import { todayInSeoul } from '@/utils/ts/formatDate';
import { buildSchedule, monthlyPayment, totalInterest } from '@/utils/ts/loanSchedule';
import type { LoanKind, RepaymentType } from '@/generated/prisma/enums';
import type { CategoryNodeDto } from '@/service/category/type';
import type { LoanDto } from '@/service/loan/type';
import styles from './LoanFormModal.module.scss';

const KIND_OPTIONS: { value: LoanKind; label: string }[] = [
  { value: 'MORTGAGE', label: '주택담보대출' },
  { value: 'JEONSE', label: '전세자금대출' },
  { value: 'CREDIT', label: '신용대출' },
  { value: 'CAR', label: '자동차 할부' },
  { value: 'STUDENT', label: '학자금' },
  { value: 'OTHER', label: '기타' },
];

const REPAYMENT_OPTIONS: { value: RepaymentType; label: string }[] = [
  { value: 'EQUAL_PAYMENT', label: '원리금균등 — 매달 같은 금액' },
  { value: 'EQUAL_PRINCIPAL', label: '원금균등 — 갈수록 줄어듦' },
  { value: 'INTEREST_ONLY', label: '만기일시 — 이자만 내다 만기에 원금' },
];

/** 소분류까지 평평하게 편다. 대출 이자·원금은 늘 소분류에 붙는다. */
function flatten(nodes: CategoryNodeDto[]): { value: string; label: string }[] {
  return nodes.flatMap((node) =>
    node.children.length > 0
      ? node.children
        .filter((child) => child.isActive)
        .map((child) => ({ value: child.id, label: `${node.name} › ${child.name}` }))
      : [{ value: node.id, label: node.name }],
  );
}

interface LoanFormModalProps {
  isOpen: boolean;
  loan: LoanDto | null;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (loan: LoanDto) => void;
}

export default function LoanFormModal({ isOpen, loan, onClose, onSaved, onDelete }: LoanFormModalProps) {
  const me = useMe();
  const members = me.data?.members ?? [];

  const expenseTree = useQuery({
    queryKey: QUERY_KEY.CATEGORY.TREE({ kind: 'EXPENSE' }),
    queryFn: () => getCategoryTree({ kind: 'EXPENSE' }),
  });
  const transferTree = useQuery({
    queryKey: QUERY_KEY.CATEGORY.TREE({ kind: 'TRANSFER' }),
    queryFn: () => getCategoryTree({ kind: 'TRANSFER' }),
  });

  const [name, setName] = useState(loan?.name ?? '');
  const [kind, setKind] = useState<LoanKind>(loan?.kind ?? 'MORTGAGE');
  const [principal, setPrincipal] = useState<number | null>(loan?.principal ?? null);
  /** 화면에서는 % 로 받는다. 저장할 때 100 배 해서 basis point 로 보낸다. */
  const [ratePercent, setRatePercent] = useState(loan ? String(loan.annualRateBp / 100) : '');
  const [repaymentType, setRepaymentType] = useState<RepaymentType>(loan?.repaymentType ?? 'EQUAL_PAYMENT');
  const [termMonths, setTermMonths] = useState(loan ? String(loan.termMonths) : '');
  const [gracePeriodMonths, setGracePeriodMonths] = useState(loan ? String(loan.gracePeriodMonths) : '0');
  const [firstPaymentDate, setFirstPaymentDate] = useState(loan?.firstPaymentDate ?? todayInSeoul());
  const [pickedMemberId, setMemberId] = useState(loan?.member.id ?? '');
  // 혼자 쓰는 장부면 고를 것이 없다. 그 한 사람이 갚는 사람이다.
  const memberId = pickedMemberId || (members.length === 1 ? members[0]?.id ?? '' : '');
  const [interestCategoryId, setInterestCategoryId] = useState(loan?.interestCategory.id ?? '');
  const [principalCategoryId, setPrincipalCategoryId] = useState(loan?.principalCategory.id ?? '');
  const [memo, setMemo] = useState(loan?.memo ?? '');
  const [isActive, setIsActive] = useState(loan?.isActive ?? true);
  const [includeInNetWorth, setIncludeInNetWorth] = useState(loan?.includeInNetWorth ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const expenseOptions = flatten(expenseTree.data?.find((tree) => tree.kind === 'EXPENSE')?.categories ?? []);
  const transferOptions = flatten(transferTree.data?.find((tree) => tree.kind === 'TRANSFER')?.categories ?? []);

  const annualRateBp = Math.round(Number(ratePercent || 0) * 100);
  const months = Number(termMonths || 0);
  const grace = Number(gracePeriodMonths || 0);

  /**
   * 조건이 다 차면 그 자리에서 월 납입액을 보여 준다.
   *
   * 저장할 스케줄을 만드는 것과 **같은 함수**(`@/utils/ts/loanSchedule`)를 부른다.
   * 화면용 계산을 따로 두면 미리보기 숫자와 실제 저장분이 어긋난다.
   */
  const canPreview = (principal ?? 0) > 0 && months > 0 && grace <= months;
  const preview = canPreview
    ? (() => {
      const schedule = buildSchedule({
        principal: principal ?? 0,
        annualRateBp,
        termMonths: months,
        gracePeriodMonths: grace,
        repaymentType,
        firstPaymentDate,
      });
      const first = schedule[0];
      const last = schedule[schedule.length - 1];

      return {
        monthly:
            repaymentType === 'EQUAL_PAYMENT' && months > grace
              ? monthlyPayment(principal ?? 0, annualRateBp, months - grace)
              : (first?.principalAmount ?? 0) + (first?.interestAmount ?? 0),
        firstInterest: first?.interestAmount ?? 0,
        interest: totalInterest(schedule),
        lastDueDate: last?.dueDate ?? '',
      };
    })()
    : null;

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        kind,
        principal: principal ?? 0,
        annualRateBp,
        repaymentType,
        termMonths: months,
        gracePeriodMonths: grace,
        firstPaymentDate,
        memberId,
        interestCategoryId,
        principalCategoryId,
        memo: memo || null,
        includeInNetWorth,
      };

      return loan ? updateLoan(loan.id, { ...payload, isActive }) : createLoan(payload);
    },
  });

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const local: Record<string, string> = {};
    if (!name.trim()) local.name = '대출 이름을 입력해 주세요.';
    if (!principal || principal <= 0) local.principal = '원금을 입력해 주세요.';
    if (months <= 0) local.termMonths = '상환 기간을 입력해 주세요.';
    if (grace > months) local.gracePeriodMonths = '거치 기간은 전체 기간보다 길 수 없어요.';
    if (!memberId) local.memberId = '상환하는 사람을 골라 주세요.';
    if (!interestCategoryId) local.interestCategoryId = '이자를 기록할 분류를 골라 주세요.';
    if (!principalCategoryId) local.principalCategoryId = '원금을 기록할 분류를 골라 주세요.';
    if (Object.keys(local).length > 0) {
      setErrors(local);

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

    toast.success(loan ? '고쳤어요.' : '대출을 등록했어요. 갚는 날마다 자동으로 적어 드릴게요.');
    onSaved();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={loan ? '대출 고치기' : '대출 등록'}
      description="조건을 넣어 두면 만기까지 상환 계획을 세우고, 매달 갚는 날에 이자와 원금을 자동으로 적어 드려요."
      footer={
        <div className={styles.loanformmodal__actions}>
          {loan && (
            <Button
              variant="ghost"
              onClick={() => onDelete(loan)}
            >
              지우기
            </Button>
          )}
          <Button
            type="submit"
            form="loan-form"
            isLoading={isPending}
          >
            저장
          </Button>
        </div>
      }
    >
      <form
        method="post"
        id="loan-form"
        className={styles.loanformmodal}
        onSubmit={onSubmit}
      >
        <FormField
          label="이름"
          hint="예: 우리집 주담대, 전세대출"
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
              onChange={(event) => setKind(event.target.value as LoanKind)}
              options={KIND_OPTIONS}
            />
          )}
        </FormField>

        <FormField
          label="원금"
          hint="처음에 빌린 금액이에요."
          error={errors.principal}
        >
          {({ id }) => (
            <MoneyInput
              id={id}
              value={principal}
              onChange={setPrincipal}
            />
          )}
        </FormField>

        <div className={styles.loanformmodal__pair}>
          <FormField
            label="연 금리 (%)"
            hint="예: 4.25"
            error={errors.annualRateBp}
          >
            {({ id }) => (
              <Input
                id={id}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max="100"
                value={ratePercent}
                onChange={(event) => setRatePercent(event.target.value)}
              />
            )}
          </FormField>

          <FormField
            label="상환 기간 (개월)"
            hint="30년이면 360"
            error={errors.termMonths}
          >
            {({ id }) => (
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min="1"
                max="480"
                value={termMonths}
                onChange={(event) => setTermMonths(event.target.value)}
              />
            )}
          </FormField>
        </div>

        <FormField
          label="상환 방식"
          error={errors.repaymentType}
        >
          {({ id }) => (
            <Select
              id={id}
              value={repaymentType}
              onChange={(event) => setRepaymentType(event.target.value as RepaymentType)}
              options={REPAYMENT_OPTIONS}
            />
          )}
        </FormField>

        <div className={styles.loanformmodal__pair}>
          <FormField
            label="거치 기간 (개월)"
            hint="이자만 내는 기간이에요. 없으면 0으로 두세요."
            error={errors.gracePeriodMonths}
          >
            {({ id }) => (
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min="0"
                value={gracePeriodMonths}
                onChange={(event) => setGracePeriodMonths(event.target.value)}
              />
            )}
          </FormField>

          <FormField
            label="첫 상환일"
            hint="매달 이 날짜와 같은 날에 갚아요."
            error={errors.firstPaymentDate}
          >
            {({ id }) => (
              <Input
                id={id}
                type="date"
                value={firstPaymentDate}
                onChange={(event) => setFirstPaymentDate(event.target.value)}
              />
            )}
          </FormField>
        </div>

        {preview && (
          <dl className={styles.loanformmodal__preview}>
            <div className={styles.loanformmodal__previewitem}>
              <dt>매달 내는 돈</dt>
              <dd>{preview.monthly.toLocaleString('ko-KR')}원</dd>
            </div>
            <div className={styles.loanformmodal__previewitem}>
              <dt>첫 달 이자</dt>
              <dd>{preview.firstInterest.toLocaleString('ko-KR')}원</dd>
            </div>
            <div className={styles.loanformmodal__previewitem}>
              <dt>만기까지 이자</dt>
              <dd>{preview.interest.toLocaleString('ko-KR')}원</dd>
            </div>
            <div className={styles.loanformmodal__previewitem}>
              <dt>마지막 상환일</dt>
              <dd>{preview.lastDueDate}</dd>
            </div>
          </dl>
        )}

        {members.length > 1 && (
          <FormField
            label="상환하는 사람"
            hint="자동으로 적히는 거래의 결제자가 돼요."
            error={errors.memberId}
          >
            {({ id }) => (
              <Select
                id={id}
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
                options={[
                  { value: '', label: '고르기' },
                  ...members.map((member) => ({ value: member.id, label: member.displayName })),
                ]}
              />
            )}
          </FormField>
        )}

        <FormField
          label="이자를 적을 분류"
          hint="이자는 실제로 나가는 돈이라 지출로 잡혀요."
          error={errors.interestCategoryId}
        >
          {({ id }) => (
            <Select
              id={id}
              value={interestCategoryId}
              onChange={(event) => setInterestCategoryId(event.target.value)}
              options={[{ value: '', label: '고르기' }, ...expenseOptions]}
            />
          )}
        </FormField>

        <FormField
          label="원금을 적을 분류"
          hint="갚은 원금은 쓴 돈이 아니라 빚이 줄어든 거라서, 이체로 잡고 지출 합계에서는 빼요."
          error={errors.principalCategoryId}
        >
          {({ id }) => (
            <Select
              id={id}
              value={principalCategoryId}
              onChange={(event) => setPrincipalCategoryId(event.target.value)}
              options={[{ value: '', label: '고르기' }, ...transferOptions]}
            />
          )}
        </FormField>

        <FormField label="메모">
          {({ id }) => (
            <Input
              id={id}
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
          )}
        </FormField>

        <FormField
          label="순자산에 넣기"
          hint="전세대출처럼 짝이 되는 자산(보증금)을 앱에 넣지 않았다면 빼 두세요. 빼도 매달 갚는 금액은 그대로 적혀요."
        >
          {({ id }) => (
            <Select
              id={id}
              value={includeInNetWorth ? 'yes' : 'no'}
              onChange={(event) => setIncludeInNetWorth(event.target.value === 'yes')}
              options={[
                { value: 'yes', label: '넣기 — 순자산에서 빼요' },
                { value: 'no', label: '빼기 — 순자산에 세지 않아요' },
              ]}
            />
          )}
        </FormField>

        {loan && (
          <FormField
            label="목록에 보이기"
            hint="끄면 목록에서 숨겨요. 이미 갚은 기록은 그대로 남아요."
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
