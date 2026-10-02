'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import CountUpAmount from '@/components/common/CountUpAmount';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import Icon from '@/components/common/Icon';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import Pagination from '@/components/common/Pagination';
import Select from '@/components/common/Select';
import Skeleton, { SkeletonRows } from '@/components/common/Skeleton';
import TransactionForm, { useIsTransactionFormSaving } from '@/components/transaction/TransactionForm';
import TransactionRow from '@/components/transaction/TransactionRow';
import { useDebounce } from '@/hooks/useDebounce';
import { useExcelDownload } from '@/hooks/useExcelDownload';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { deleteTransaction, getTransactions } from '@/service/transaction';
import { cn } from '@/utils/ts/cn';
import { currentYearMonth, formatYearMonthLabel, monthRange, shiftYearMonth } from '@/utils/ts/formatDate';
import { useHouseholdRule } from '@/hooks/useHouseholdRule';
import { useMe } from '@/hooks/useMe';
import type { TransactionListDto, TransactionListItemDto } from '@/service/transaction/type';
import styles from './TransactionBoard.module.scss';

const TYPE_FILTERS = [
  { value: '', label: '쓴 돈·번 돈' },
  { value: 'EXPENSE', label: '쓴 돈만' },
  { value: 'INCOME', label: '번 돈만' },
  // 이체는 기본 목록에서 빠져 있다 — 계좌 이동·카드대금 납부는 쓴 돈이 아니다.
  { value: 'TRANSFER', label: '옮긴 돈만' },
];

const PAGE_SIZE = 30;

const CREATE_FORM_ID = 'transaction-create-form';
const EDIT_FORM_ID = 'transaction-edit-form';

/** 목록 캐시에서 한 건을 빼고 합계를 맞춘다. 서버 응답을 기다리지 않고 지운 것처럼 보이게 한다. */
function withoutTransaction(list: TransactionListDto, id: string): TransactionListDto {
  const target = list.items.find((item) => item.id === id);
  if (!target) return list;

  const incomeTotal = list.summary.incomeTotal - (target.type === 'INCOME' ? target.amount : 0);
  const expenseTotal = list.summary.expenseTotal - (target.type === 'EXPENSE' ? target.amount : 0);

  return {
    ...list,
    items: list.items.filter((item) => item.id !== id),
    summary: {
      ...list.summary,
      incomeTotal,
      expenseTotal,
      transferTotal: list.summary.transferTotal - (target.type === 'TRANSFER' ? target.amount : 0),
      net: incomeTotal - expenseTotal,
      count: list.summary.count - 1,
    },
  };
}

export default function TransactionBoard() {
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [typeFilter, setTypeFilter] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<TransactionListItemDto | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TransactionListItemDto | null>(null);

  const debouncedKeyword = useDebounce(keyword, 300);
  const queryClient = useQueryClient();
  const me = useMe();
  const { hasOthers } = useHouseholdRule();
  const excel = useExcelDownload();

  const params = {
    yearMonth,
    page,
    pageSize: PAGE_SIZE,
    ...(typeFilter ? { type: [typeFilter] } : {}),
    ...(memberFilter ? { memberId: [memberFilter] } : {}),
    ...(debouncedKeyword ? { q: debouncedKeyword } : {}),
  };

  // 달·필터를 바꾸는 동안 앞의 목록을 흐리게 남겨 둔다. 빈 상자로 깜빡이지 않는다.
  const { data, isPending, isPlaceholderData } = useQuery({
    queryKey: QUERY_KEY.TRANSACTION.LIST(params),
    queryFn: () => getTransactions(params),
    placeholderData: keepPreviousData,
  });

  // 앞뒤 달과 다음 페이지를 미리 받아 둔다. 누르는 순간 바로 그려진다.
  const paramsKey = JSON.stringify(params);
  const pageCount = data?.page.pageCount ?? 1;
  useEffect(() => {
    const base = JSON.parse(paramsKey) as typeof params;
    const neighbors = [
      { ...base, yearMonth: shiftYearMonth(base.yearMonth, -1), page: 1 },
      { ...base, yearMonth: shiftYearMonth(base.yearMonth, 1), page: 1 },
      ...(base.page < pageCount ? [{ ...base, page: base.page + 1 }] : []),
    ];
    for (const next of neighbors) {
      void queryClient.prefetchQuery({
        queryKey: QUERY_KEY.TRANSACTION.LIST(next),
        queryFn: () => getTransactions(next),
      });
    }
  }, [paramsKey, pageCount, queryClient]);

  // 지우는 즉시 목록에서 뺀다. 실패하면 되돌리고 알린다.
  const removal = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onMutate: async (id) => {
      setDeleteTarget(null);
      setEditing(null);

      const listKey = [...QUERY_KEY.TRANSACTION.ALL, 'list'];
      await queryClient.cancelQueries({ queryKey: listKey });
      const snapshots = queryClient.getQueriesData<TransactionListDto>({ queryKey: listKey });
      queryClient.setQueriesData<TransactionListDto>(
        { queryKey: listKey },
        (list) => (list ? withoutTransaction(list, id) : list),
      );

      return { snapshots };
    },
    onSuccess: () => toast.success('삭제했어요.'),
    onError: (error, _id, context) => {
      for (const [key, snapshot] of context?.snapshots ?? []) queryClient.setQueryData(key, snapshot);
      toast.error(isApiError(error) ? error.message : '삭제하지 못했어요.');
    },
  });
  const isCreateSaving = useIsTransactionFormSaving(CREATE_FORM_ID);
  const isEditSaving = useIsTransactionFormSaving(EDIT_FORM_ID);

  const changeMonth = (months: number) => {
    setYearMonth((current) => shiftYearMonth(current, months));
    setPage(1);
  };

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.TRANSACTION.ALL });
  };

  return (
    <>
      <Card
        tone="feature"
        title="이번 달 합계"
        icon="🧮"
        description="아래 조건에 맞는 거래를 모두 더한 금액이에요"
      >
        <div className={styles.transactionboard__filters}>
          <div className={styles.transactionboard__month}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => changeMonth(-1)}
              aria-label="지난 달"
              iconLeft={<Icon
                name="chevronLeft"
                size={16}
              />}
            >
              지난 달
            </Button>
            <span className={styles.transactionboard__monthlabel}>{formatYearMonthLabel(yearMonth)}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => changeMonth(1)}
              aria-label="다음 달"
              iconRight={<Icon
                name="chevronRight"
                size={16}
              />}
            >
              다음 달
            </Button>
          </div>

          <div className={styles.transactionboard__controls}>
            <FormField label="종류">
              {({ id }) => (
                <Select
                  id={id}
                  options={TYPE_FILTERS}
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value);
                    setPage(1);
                  }}
                />
              )}
            </FormField>

            {/* 혼자 쓰는 장부면 걸러 볼 사람이 없다. */}
            {hasOthers && (
              <FormField label="결제한 사람">
                {({ id }) => (
                  <Select
                    id={id}
                    options={[
                      { value: '', label: '모두' },
                      ...(me.data?.members ?? []).map((member) => ({ value: member.id, label: member.displayName })),
                    ]}
                    value={memberFilter}
                    onChange={(event) => {
                      setMemberFilter(event.target.value);
                      setPage(1);
                    }}
                  />
                )}
              </FormField>
            )}

            <FormField label="검색">
              {({ id }) => (
                <Input
                  id={id}
                  placeholder="이마트, 스타벅스…"
                  leading={<Icon
                    name="search"
                    size={16}
                  />}
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value);
                    setPage(1);
                  }}
                />
              )}
            </FormField>
          </div>
        </div>

        {/* 합계는 페이지 합계가 아니라 지금 필터 전체 기준이다. */}
        <dl
          className={cn(styles.transactionboard__summary, { [styles['transactionboard__summary--stale']]: isPlaceholderData })}
          aria-busy={isPending || isPlaceholderData}
        >
          <div className={styles.transactionboard__stat}>
            <dt>수입</dt>
            <dd>
              {isPending ? <SummarySkeleton /> : (
                <CountUpAmount
                  value={data?.summary.incomeTotal ?? 0}
                  tone="income"
                  size="large"
                  isFit
                />
              )}
            </dd>
          </div>
          <div className={styles.transactionboard__stat}>
            <dt>지출</dt>
            <dd>
              {isPending ? <SummarySkeleton /> : (
                <CountUpAmount
                  value={data?.summary.expenseTotal ?? 0}
                  tone="expense"
                  size="large"
                  isFit
                />
              )}
            </dd>
          </div>
          <div className={styles.transactionboard__stat}>
            <dt>남은 돈</dt>
            <dd>
              {isPending ? <SummarySkeleton /> : (
                <CountUpAmount
                  value={data?.summary.net ?? 0}
                  size="large"
                  isFit
                />
              )}
            </dd>
          </div>
          <div className={styles.transactionboard__stat}>
            <dt>건수</dt>
            <dd className={styles.transactionboard__count}>{isPending ? <SummarySkeleton /> : `${data?.summary.count ?? 0}건`}</dd>
          </div>
        </dl>
      </Card>

      <Card
        isFlush
        title="거래 내역"
        icon="📒"
        description="눌러서 고치거나 지울 수 있어요. 왼쪽 색은 누가 썼는지 알려 줘요"
        action={
          <>
            <Button
              size="sm"
              variant="secondary"
              iconLeft={<Icon
                name="download"
                size={15}
              />}
              isLoading={excel.isPending}
              onClick={() => {
                // 내려받는 기간은 지금 보고 있는 달이다.
                const { from, toExclusive } = monthRange(yearMonth);
                const to = new Date(new Date(`${toExclusive}T00:00:00.000Z`).getTime() - 86_400_000)
                  .toISOString()
                  .slice(0, 10);
                excel.mutate({ from, to, sheets: ['summary', 'detail', 'pivot'] });
              }}
            >
              엑셀
            </Button>
            <Button
              size="sm"
              iconLeft={<Icon
                name="plus"
                size={15}
              />}
              onClick={() => setIsCreating(true)}
            >
              등록
            </Button>
          </>
        }
      >
        {isPending ? (
          <SkeletonRows count={6} />
        ) : (data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title="이번 달 거래가 없어요"
            description="거래를 적으면 대시보드에도 바로 반영돼요."
            action={
              <Button
                size="sm"
                onClick={() => setIsCreating(true)}
              >
                거래 등록
              </Button>
            }
          />
        ) : (
          <ul
            className={cn(styles.transactionboard__list, { [styles['transactionboard__list--stale']]: isPlaceholderData })}
            aria-busy={isPlaceholderData}
          >
            {data?.items.map((item) => (
              <li key={item.id}>
                <TransactionRow
                  transaction={item}
                  onClick={setEditing}
                />
              </li>
            ))}
          </ul>
        )}

        {data && data.page.pageCount > 1 && (
          <div className={styles.transactionboard__pagination}>
            <Pagination
              page={data.page.page}
              pageCount={data.page.pageCount}
              onChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* 600px 이하에서는 Modal 이 스스로 바텀시트가 된다. */}
      <Modal
        urlKey="transaction-create"
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title="거래 등록"
        footer={
          <div className={styles.transactionboard__actions}>
            <Button
              variant="secondary"
              onClick={() => setIsCreating(false)}
            >
              닫기
            </Button>
            <Button
              type="submit"
              form={CREATE_FORM_ID}
              isLoading={isCreateSaving}
            >
              등록
            </Button>
          </div>
        }
      >
        <TransactionForm
          mode="create"
          formId={CREATE_FORM_ID}
          onSuccess={refresh}
        />
      </Modal>

      <Modal
        urlKey="transaction-edit"
        key={editing?.id ?? 'none'}
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="거래 수정"
        footer={
          <div className={styles.transactionboard__actions}>
            <Button
              variant="danger"
              onClick={() => editing && setDeleteTarget(editing)}
            >
              삭제
            </Button>
            <span className={styles.transactionboard__spacer} />
            <Button
              variant="secondary"
              onClick={() => setEditing(null)}
            >
              닫기
            </Button>
            <Button
              type="submit"
              form={EDIT_FORM_ID}
              isLoading={isEditSaving}
            >
              저장
            </Button>
          </div>
        }
      >
        {editing && (
          <TransactionForm
            mode="edit"
            transaction={editing}
            formId={EDIT_FORM_ID}
            onSuccess={() => {
              refresh();
              setEditing(null);
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        urlKey="transaction-delete"
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removal.mutate(deleteTarget.id)}
        title="거래 삭제"
        description="되돌릴 수 없어요. 이번 달 합계도 함께 바뀌어요."
        confirmLabel="삭제"
        isDestructive
        isLoading={removal.isPending}
      />
    </>
  );
}

/** 합계 숫자 자리. 불러오는 동안 0원을 띄우면 진짜 0원처럼 읽힌다. */
function SummarySkeleton() {
  return (
    <Skeleton
      width={96}
      height={26}
    />
  );
}
