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
import Skeleton from '@/components/common/Skeleton';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { deactivateRecurringRule, getRecurringRules, runRecurring } from '@/service/recurring';
import { formatDateLabel } from '@/utils/ts/formatDate';
import type { RecurringRuleDto } from '@/service/recurring/type';
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
  const [stopTarget, setStopTarget] = useState<RecurringRuleDto | null>(null);
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.RECURRING.LIST(),
    queryFn: getRecurringRules,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.RECURRING.ALL });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.TRANSACTION.ALL });
  };

  const stop = useMutation({
    mutationFn: (id: string) => deactivateRecurringRule(id),
    onSuccess: () => {
      toast.success('중지했습니다. 이미 만들어진 거래는 그대로 남습니다.');
      setStopTarget(null);
      refresh();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '중지하지 못했습니다.'),
  });

  const run = useMutation({
    mutationFn: runRecurring,
    onSuccess: ({ created, pending, skipped }) => {
      toast.success(
        created + pending === 0
          ? '새로 만들 회차가 없습니다.'
          : `${created + pending}건을 만들었습니다.${pending > 0 ? ` (확인 필요 ${pending}건)` : ''}${skipped > 0 ? ` 이미 처리한 ${skipped}건은 건너뜀.` : ''}`,
      );
      refresh();
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '만들지 못했습니다.'),
  });

  return (
    <>
      <Card
        isFlush
        title="반복 거래"
        action={
          <>
            <Button
              size="sm"
              variant="secondary"
              isLoading={run.isPending}
              onClick={() => run.mutate()}
            >
              지금 생성
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
          <div className={styles.recurringboard__loading}>
            <Skeleton height={64} />
            <Skeleton height={64} />
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <EmptyState
            title="반복 거래가 없습니다"
            description="월세·통신비처럼 매달 같은 날 나가는 돈을 등록하면 앱에 들어올 때 자동으로 만들어집니다."
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
                    {!rule.amountIsFixed && <Badge tone="warning">금액 확인</Badge>}
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
                  {rule.isActive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setStopTarget(rule)}
                    >
                      중지
                    </Button>
                  )}
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
        isOpen={Boolean(stopTarget)}
        onClose={() => setStopTarget(null)}
        onConfirm={() => stopTarget && stop.mutate(stopTarget.id)}
        title={`'${stopTarget?.name ?? ''}' 중지`}
        description="앞으로 자동 생성되지 않습니다. 이미 만들어진 거래는 그대로 남습니다."
        confirmLabel="중지"
        isLoading={stop.isPending}
      />
    </>
  );
}
