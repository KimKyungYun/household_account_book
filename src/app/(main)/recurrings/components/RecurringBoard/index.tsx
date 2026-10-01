'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Amount from '@/components/common/Amount';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import Icon from '@/components/common/Icon';
import { SkeletonRows } from '@/components/common/Skeleton';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { deleteRecurringRule, getRecurringRules, runRecurring, setRecurringRuleActive } from '@/service/recurring';
import { formatDateLabel } from '@/utils/ts/formatDate';
import type { RecurringRuleDto } from '@/service/recurring/type';
import LoanNotice from '../LoanNotice';
import RecurringFormModal from '../RecurringFormModal';
import styles from './RecurringBoard.module.scss';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function describeRule(rule: RecurringRuleDto): string {
  const every = rule.interval > 1 ? `${rule.interval}` : '';

  if (rule.freq === 'WEEKLY') {
    return `${every ? `${every}주마다` : '매주'} ${WEEKDAY_LABELS[rule.weekday ?? 0]}요일`;
  }
  if (rule.freq === 'YEARLY') {
    return `${every ? `${every}년마다` : '매년'} ${rule.monthOfYear}월 ${rule.dayOfMonth}일`;
  }
  // 31일은 말일을 겸한다 — 그대로 보여주면 2월에 왜 28일인지 알 수 없다.
  const day = rule.dayOfMonth === 31 ? '말일' : `${rule.dayOfMonth}일`;

  return `${every ? `${every}개월마다` : '매월'} ${day}`;
}

export default function RecurringBoard() {
  const [editing, setEditing] = useState<RecurringRuleDto | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RecurringRuleDto | null>(null);
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.RECURRING.LIST(),
    queryFn: getRecurringRules,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.RECURRING.ALL });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.TRANSACTION.ALL });
  };

  // 중지는 되돌릴 수 있어 확인을 받지 않는다. 삭제만 확인 창을 띄운다.
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setRecurringRuleActive(id, isActive),
    onSuccess: ({ backfill }, variables) => {
      const filled = backfill ? backfill.created + backfill.upcoming : 0;
      toast.success(
        variables.isActive
          ? filled === 0
            ? '다시 시작했어요.'
            : `다시 시작했어요. 이번 달 거래 ${filled}건을 넣어 뒀어요.`
          : '멈췄어요. 언제든 다시 켤 수 있어요.',
      );
      refresh();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '바꾸지 못했어요.'),
  });

  const removal = useMutation({
    mutationFn: (id: string) => deleteRecurringRule(id),
    onSuccess: ({ keptTransactionCount }) => {
      toast.success(
        keptTransactionCount > 0
          ? `지웠어요. 이미 적힌 거래 ${keptTransactionCount}건은 그대로 남아 있어요.`
          : '삭제했어요.',
      );
      setDeleteTarget(null);
      refresh();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '삭제하지 못했어요.'),
  });

  const run = useMutation({
    mutationFn: runRecurring,
    onSuccess: ({ created, upcoming, skipped }) => {
      const filled = created + upcoming;
      const notes = [upcoming > 0 ? `다가올 ${upcoming}건 포함` : ''].filter(Boolean);
      toast.success(
        filled === 0
          ? '새로 만들 거래가 없어요.'
          : `이번 달 거래 ${filled}건을 넣어 뒀어요.${notes.length > 0 ? ` (${notes.join(', ')})` : ''}${skipped > 0 ? ` 이미 처리한 ${skipped}건은 건너뛰었어요.` : ''}`,
      );
      refresh();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '만들지 못했어요.'),
  });

  return (
    <>
      <LoanNotice />

      <Card
        isFlush
        title="매달 반복되는 돈"
        description="월급처럼 매달 들어오는 돈, 월세·통신비처럼 매달 나가는 돈을 등록해 두세요. 날짜가 되면 거래를 자동으로 적어 드려요."
        action={
          <>
            <Button
              size="sm"
              variant="secondary"
              isLoading={run.isPending}
              onClick={() => run.mutate()}
              title="아직 안 적힌 지난 거래를 지금 적어요"
            >
              빠진 회차 만들기
            </Button>
            <Button
              size="sm"
              iconLeft={<Icon
                name="plus"
                size={15}
              />}
              onClick={() => setIsCreating(true)}
            >
              추가
            </Button>
          </>
        }
      >
        {isPending ? (
          <SkeletonRows count={3} />
        ) : (data?.length ?? 0) === 0 ? (
          <EmptyState
            title="등록한 항목이 없어요"
            description="월급, 월세, 통신비처럼 매달 같은 날 오가는 돈을 등록해 보세요."
            action={
              <Button
                size="sm"
                onClick={() => setIsCreating(true)}
              >
                반복 거래 추가
              </Button>
            }
          />
        ) : (
          <ul className={styles.recurringboard__list}>
            {data?.map((rule) => (
              <li
                key={rule.id}
                className={styles.recurringboard__item}
              >
                <button
                  type="button"
                  className={styles.recurringboard__main}
                  onClick={() => setEditing(rule)}
                >
                  <span className={styles.recurringboard__name}>
                    {rule.name}
                    {!rule.isActive && <Badge tone="neutral">중지</Badge>}
                    {rule.splitMode === 'PERSONAL' && rule.type !== 'TRANSFER' && <Badge tone="neutral">개인</Badge>}
                  </span>
                  <span className={styles.recurringboard__meta}>
                    {describeRule(rule)}
                    {rule.category && ` · ${rule.category.parentName ?? ''} ${rule.category.name}`}
                    {` · ${rule.member.displayName}`}
                    {rule.nextOccurrenceDate ? ` · 다음 ${formatDateLabel(rule.nextOccurrenceDate)}` : ''}
                  </span>
                </button>

                <div className={styles.recurringboard__side}>
                  <Amount
                    value={rule.amount}
                    tone={rule.type === 'INCOME' ? 'income' : rule.type === 'EXPENSE' ? 'expense' : 'transfer'}
                  />

                  <div className={styles.recurringboard__actions}>
                    <Button
                      size="sm"
                      variant="ghost"
                      isLoading={toggle.isPending}
                      onClick={() => toggle.mutate({ id: rule.id, isActive: !rule.isActive })}
                      title={rule.isActive ? '자동으로 적는 걸 잠시 멈춰요' : '자동으로 적는 걸 다시 시작해요'}
                    >
                      {rule.isActive ? '중지' : '다시 시작'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTarget(rule)}
                      title="반복 거래를 완전히 지워요"
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <RecurringFormModal
        key={isCreating ? 'create' : `edit:${editing?.id ?? 'none'}`}
        rule={editing}
        isOpen={isCreating || Boolean(editing)}
        onClose={() => {
          setIsCreating(false);
          setEditing(null);
        }}
        onSaved={() => {
          setIsCreating(false);
          setEditing(null);
          refresh();
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removal.mutate(deleteTarget.id)}
        title={`'${deleteTarget?.name ?? ''}' 삭제`}
        description="되돌릴 수 없어요. 이미 적힌 거래는 남아요. 잠시 멈추고 싶다면 '중지'를 눌러 주세요."
        confirmLabel="삭제"
        isDestructive
        isLoading={removal.isPending}
      />
    </>
  );
}
