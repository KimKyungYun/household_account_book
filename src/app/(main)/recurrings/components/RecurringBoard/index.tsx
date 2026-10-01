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
            ? '다시 시작했습니다.'
            : `다시 시작했습니다. 이번 달 ${filled}건을 거래로 넣었습니다.`
          : '중지했습니다. 규칙은 남아 있어 언제든 다시 켤 수 있습니다.',
      );
      refresh();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '바꾸지 못했습니다.'),
  });

  const removal = useMutation({
    mutationFn: (id: string) => deleteRecurringRule(id),
    onSuccess: ({ keptTransactionCount }) => {
      toast.success(
        keptTransactionCount > 0
          ? `삭제했습니다. 이미 만들어진 거래 ${keptTransactionCount}건은 그대로 남아 있습니다.`
          : '삭제했습니다.',
      );
      setDeleteTarget(null);
      refresh();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '삭제하지 못했습니다.'),
  });

  const run = useMutation({
    mutationFn: runRecurring,
    onSuccess: ({ created, upcoming, skipped }) => {
      const filled = created + upcoming;
      const notes = [upcoming > 0 ? `아직 날짜가 오지 않은 ${upcoming}건 포함` : ''].filter(Boolean);
      toast.success(
        filled === 0
          ? '새로 만들 거래가 없습니다.'
          : `이번 달 ${filled}건을 거래로 넣었습니다.${notes.length > 0 ? ` (${notes.join(', ')})` : ''}${skipped > 0 ? ` 이미 처리한 ${skipped}건은 건너뛰었습니다.` : ''}`,
      );
      refresh();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '만들지 못했습니다.'),
  });

  return (
    <>
      <LoanNotice />

      <Card
        isFlush
        title="매달 반복되는 돈"
        description="월급처럼 매달 들어오는 금액과 월세, 통신비처럼 매달 나가는 금액을 등록합니다. 앱을 열면 지난 날짜의 거래가 자동으로 만들어집니다."
        action={
          <>
            <Button
              size="sm"
              variant="secondary"
              isLoading={run.isPending}
              onClick={() => run.mutate()}
              title="아직 안 만들어진 지난 날짜 거래를 만듭니다"
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
            title="등록된 항목이 없습니다"
            description="두 사람의 월급, 월세, 통신비처럼 매달 같은 날 들어오거나 나가는 금액을 등록해 보세요."
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
                      title={rule.isActive ? '자동 생성을 멈춥니다. 규칙은 남습니다' : '자동 생성을 다시 켭니다'}
                    >
                      {rule.isActive ? '중지' : '다시 시작'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTarget(rule)}
                      title="반복 거래를 완전히 지웁니다"
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
        description="되돌릴 수 없습니다. 이미 만들어진 거래는 남습니다. 잠시 멈추려면 '중지'를 쓰세요."
        confirmLabel="삭제"
        isDestructive
        isLoading={removal.isPending}
      />
    </>
  );
}
