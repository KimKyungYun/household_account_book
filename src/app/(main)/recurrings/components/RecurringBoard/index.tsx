'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import Icon from '@/components/common/Icon';
import { SkeletonRows } from '@/components/common/Skeleton';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { PATH } from '@/routes/paths';
import { deleteRecurringRule, getRecurringRules, runRecurring, setRecurringRuleActive } from '@/service/recurring';
import type { RecurringRuleDto } from '@/service/recurring/type';
import LoanNotice from '../LoanNotice';
import RecurringFormModal from '../RecurringFormModal';
import RecurringRuleRow from '../RecurringRuleRow';
import styles from './RecurringBoard.module.scss';

export default function RecurringBoard() {
  const [editing, setEditing] = useState<RecurringRuleDto | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RecurringRuleDto | null>(null);
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.RECURRING.LIST(),
    queryFn: getRecurringRules,
  });

  // 자산에 쌓이는 규칙은 자산 화면의 '자동으로 넣기' 표시와 잔액에도 걸린다.
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.RECURRING.ALL });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.TRANSACTION.ALL });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.ASSET.ALL });
  };

  // 자산에 쌓이는 규칙은 따로 모아 보여 준다. 매달 나가고 들어오는 돈과 성격이 다르다.
  const rules = data ?? [];
  const plainRules = rules.filter((rule) => !rule.asset);
  const assetRules = rules.filter((rule) => rule.asset);

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

  const toggleRule = (rule: RecurringRuleDto) => toggle.mutate({ id: rule.id, isActive: !rule.isActive });
  // 누른 줄의 단추만 돈다. 다른 줄까지 돌면 무엇을 바꿨는지 헷갈린다.
  const isToggling = (rule: RecurringRuleDto) => toggle.isPending && toggle.variables?.id === rule.id;

  return (
    <>
      <LoanNotice />

      <Card
        isFlush
        title="매달 반복되는 돈"
        icon="🔁"
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
        ) : plainRules.length === 0 ? (
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
            {plainRules.map((rule) => (
              <RecurringRuleRow
                key={rule.id}
                rule={rule}
                isToggling={isToggling(rule)}
                onEdit={setEditing}
                onToggle={toggleRule}
                onDelete={setDeleteTarget}
              />
            ))}
          </ul>
        )}
      </Card>

      {assetRules.length > 0 && (
        <Card
          isFlush
          title="자산에 모으는 돈"
          icon="🐷"
          description="정한 날마다 자산에 자동으로 쌓이는 돈이에요. 자산 화면에서 '매달 자동으로 넣기'를 켜면 여기에 모여요."
          action={
            <Link
              className={styles.recurringboard__link}
              href={PATH.ASSETS}
            >
              자산 보러 가기
            </Link>
          }
        >
          <ul className={styles.recurringboard__list}>
            {assetRules.map((rule) => (
              <RecurringRuleRow
                key={rule.id}
                rule={rule}
                isToggling={isToggling(rule)}
                onEdit={setEditing}
                onToggle={toggleRule}
                onDelete={setDeleteTarget}
              />
            ))}
          </ul>
        </Card>
      )}

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
        urlKey="recurring-delete"
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
