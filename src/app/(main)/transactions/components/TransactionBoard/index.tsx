'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Amount from '@/components/common/Amount';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import Icon from '@/components/common/Icon';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import Pagination from '@/components/common/Pagination';
import Select from '@/components/common/Select';
import Skeleton from '@/components/common/Skeleton';
import TransactionForm from '@/components/transaction/TransactionForm';
import TransactionRow from '@/components/transaction/TransactionRow';
import { useDebounce } from '@/hooks/useDebounce';
import { useExcelDownload } from '@/hooks/useExcelDownload';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { deleteTransaction, getTransactions } from '@/service/transaction';
import { currentYearMonth, formatYearMonthLabel, monthRange, shiftYearMonth } from '@/utils/ts/formatDate';
import { useMe } from '@/hooks/useMe';
import type { TransactionListItemDto } from '@/service/transaction/type';
import styles from './TransactionBoard.module.scss';

const TYPE_FILTERS = [
  { value: '', label: '쓴 돈·번 돈' },
  { value: 'EXPENSE', label: '쓴 돈만' },
  { value: 'INCOME', label: '번 돈만' },
  // 이체는 기본 목록에서 빠져 있다 — 계좌 이동·카드대금 납부는 쓴 돈이 아니다.
  { value: 'TRANSFER', label: '옮긴 돈만' },
];

const PAGE_SIZE = 30;

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
  const excel = useExcelDownload();

  const params = {
    yearMonth,
    page,
    pageSize: PAGE_SIZE,
    ...(typeFilter ? { type: [typeFilter] } : {}),
    ...(memberFilter ? { memberId: [memberFilter] } : {}),
    ...(debouncedKeyword ? { q: debouncedKeyword } : {}),
  };

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.TRANSACTION.LIST(params),
    queryFn: () => getTransactions(params),
  });

  const removal = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      toast.success('삭제했습니다.');
      setDeleteTarget(null);
      setEditing(null);
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '삭제하지 못했습니다.'),
  });

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
        description="현재 페이지가 아니라 아래 조건에 맞는 거래 전체를 더한 금액입니다."
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

            <FormField label="결제한 사람">
              {({ id }) => (
                <Select
                  id={id}
                  options={[
                    { value: '', label: '두 사람 모두' },
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
        <dl className={styles.transactionboard__summary}>
          <div className={styles.transactionboard__stat}>
            <dt>수입</dt>
            <dd>
              <Amount
                value={data?.summary.incomeTotal ?? 0}
                tone="income"
                size="large"
              />
            </dd>
          </div>
          <div className={styles.transactionboard__stat}>
            <dt>지출</dt>
            <dd>
              <Amount
                value={data?.summary.expenseTotal ?? 0}
                tone="expense"
                size="large"
              />
            </dd>
          </div>
          <div className={styles.transactionboard__stat}>
            <dt>남은 돈</dt>
            <dd>
              <Amount
                value={data?.summary.net ?? 0}
                size="large"
              />
            </dd>
          </div>
          <div className={styles.transactionboard__stat}>
            <dt>건수</dt>
            <dd className={styles.transactionboard__count}>{data?.summary.count ?? 0}건</dd>
          </div>
        </dl>
      </Card>

      <Card
        isFlush
        title="거래 내역"
        description="줄을 누르면 수정하거나 삭제할 수 있습니다. 줄 왼쪽의 색은 결제한 사람을 나타냅니다."
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
          <div className={styles.transactionboard__loading}>
            <Skeleton height={56} />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </div>
        ) : (data?.items.length ?? 0) === 0 ? (
          <EmptyState
            title="이번 달 거래가 없습니다"
            description="등록한 거래는 대시보드와 나누기 결과에 바로 반영됩니다."
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
          <ul className={styles.transactionboard__list}>
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
              form="transaction-create-form"
            >
              등록
            </Button>
          </div>
        }
      >
        <TransactionForm
          mode="create"
          formId="transaction-create-form"
          onSuccess={refresh}
        />
      </Modal>

      <Modal
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
              form="transaction-edit-form"
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
            formId="transaction-edit-form"
            onSuccess={() => {
              refresh();
              setEditing(null);
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removal.mutate(deleteTarget.id)}
        title="거래 삭제"
        description="되돌릴 수 없습니다. 이번 달 합계와 나누기 결과가 바뀝니다."
        confirmLabel="삭제"
        isDestructive
        isLoading={removal.isPending}
      />
    </>
  );
}
