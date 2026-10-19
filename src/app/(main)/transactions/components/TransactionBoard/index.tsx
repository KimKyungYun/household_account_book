'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import Icon from '@/components/common/Icon';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import Pagination from '@/components/common/Pagination';
import Select from '@/components/common/Select';
import { SkeletonRows } from '@/components/common/Skeleton';
import TransactionForm, { useIsTransactionFormSaving } from '@/components/transaction/TransactionForm';
import TransactionRow from '@/components/transaction/TransactionRow';
import { useDebounce } from '@/hooks/useDebounce';
import { useExcelDownload } from '@/hooks/useExcelDownload';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getTransactions } from '@/service/transaction';
import { cn } from '@/utils/ts/cn';
import { monthRange, shiftYearMonth } from '@/utils/ts/formatDate';
import { useHouseholdRule } from '@/hooks/useHouseholdRule';
import { useMe } from '@/hooks/useMe';
import { PATH, TRANSACTIONS_QUERY } from '@/routes/paths';
import type { CategoryKind } from '@/generated/prisma/enums';
import type { TransactionListItemDto } from '@/service/transaction/type';
import CategoryFilter from '../CategoryFilter';
import MonthNavigator from '../MonthNavigator';
import SummaryStats from '../SummaryStats';
import TransactionEditModal from '../TransactionEditModal';
import styles from './TransactionBoard.module.scss';
import type { CategoryFilterValue } from '../CategoryFilter';

const TYPE_FILTERS = [
  { value: '', label: '쓴 돈·번 돈' },
  { value: 'EXPENSE', label: '쓴 돈만' },
  { value: 'INCOME', label: '번 돈만' },
  // 이체는 기본 목록에서 빠져 있다 — 계좌 이동·카드대금 납부는 쓴 돈이 아니다.
  { value: 'TRANSFER', label: '옮긴 돈만' },
];

/**
 * 목록 순서. 합계는 순서와 무관하다.
 * 등록일자는 앱에 적은 시각, 소비일자는 거래 날짜다. 둘 다 최근 것부터, 금액은 큰 것부터 둔다.
 * 기본은 등록일자순 — 방금 적은 거래가 맨 위에 보인다.
 */
const SORT_OPTIONS = [
  { value: 'createdAt.desc', label: '등록일자순' },
  { value: 'date.desc', label: '소비일자순' },
  { value: 'amount.desc', label: '금액순' },
  { value: 'category.asc', label: '분류순' },
];

/** 종류 필터마다 고를 수 있는 분류 종류. '쓴 돈·번 돈'이면 둘 다 보여 준다. */
const CATEGORY_KINDS_OF: Record<string, readonly CategoryKind[]> = {
  '': ['EXPENSE', 'INCOME'],
  EXPENSE: ['EXPENSE'],
  INCOME: ['INCOME'],
  TRANSFER: ['TRANSFER'],
};

const PAGE_SIZE = 30;

const CREATE_FORM_ID = 'transaction-create-form';

/** 주소에 실려 온 필터(대시보드의 '전체 보기'·분류 줄). 이상한 값은 버린다. */
function initialFilterOf(search: URLSearchParams) {
  const type = search.get(TRANSACTIONS_QUERY.TYPE) ?? '';
  const categoryId = search.get(TRANSACTIONS_QUERY.CATEGORY);
  const validType = TYPE_FILTERS.some((option) => option.value === type) ? type : '';

  return {
    type: validType,
    // 대시보드는 종류를 함께 실어 보낸다. 분류의 종류는 그걸로 짐작한다.
    category: categoryId ? { id: categoryId, kind: (validType || null) as CategoryKind | null } : null,
  };
}

interface TransactionBoardProps {
  /** 반복 거래 탭과 함께 쓰는 달. 탭을 오가도 보던 달이 남는다. */
  yearMonth: string;
  onMonthChange: (yearMonth: string) => void;
}

export default function TransactionBoard({ yearMonth, onMonthChange }: TransactionBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 처음 열릴 때 한 번만 주소를 읽는다. 그 뒤로는 화면의 필터가 주인이다.
  const [initial] = useState(() => initialFilterOf(searchParams));
  const [typeFilter, setTypeFilter] = useState(initial.type);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterValue | null>(initial.category);
  const [memberFilter, setMemberFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState('createdAt.desc');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<TransactionListItemDto | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const debouncedKeyword = useDebounce(keyword, 300);
  const queryClient = useQueryClient();
  const me = useMe();
  const { hasOthers } = useHouseholdRule();
  const excel = useExcelDownload();

  const params = {
    yearMonth,
    page,
    pageSize: PAGE_SIZE,
    sort,
    ...(typeFilter ? { type: [typeFilter] } : {}),
    ...(memberFilter ? { memberId: [memberFilter] } : {}),
    // 대분류를 고르면 서버가 그 아래 소분류까지 함께 센다.
    ...(categoryFilter ? { categoryId: [categoryFilter.id] } : {}),
    ...(debouncedKeyword ? { q: debouncedKeyword } : {}),
  };

  // 주소로 걸려 온 분류를 바꾸면 주소의 필터도 지운다 — 새로고침했을 때 옛 분류가 다시 걸리지 않게.
  const changeCategory = (next: CategoryFilterValue | null) => {
    setCategoryFilter(next);
    setPage(1);
    if (searchParams.size > 0) router.replace(PATH.TRANSACTIONS, { scroll: false });
  };

  // 종류를 바꿨는데 고른 분류가 그 종류에 없으면 분류를 푼다. 걸러진 채 0건만 보이는 일을 막는다.
  const changeType = (nextType: string) => {
    setTypeFilter(nextType);
    setPage(1);
    const kinds = CATEGORY_KINDS_OF[nextType] ?? [];
    if (categoryFilter && !(categoryFilter.kind && kinds.includes(categoryFilter.kind))) setCategoryFilter(null);
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

  const isCreateSaving = useIsTransactionFormSaving(CREATE_FORM_ID);

  const changeMonth = (months: number) => {
    onMonthChange(shiftYearMonth(yearMonth, months));
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
          <MonthNavigator
            yearMonth={yearMonth}
            onShift={changeMonth}
          />

          <div className={styles.transactionboard__controls}>
            <FormField label="종류">
              {({ id }) => (
                <Select
                  id={id}
                  options={TYPE_FILTERS}
                  value={typeFilter}
                  onChange={(event) => changeType(event.target.value)}
                />
              )}
            </FormField>

            <CategoryFilter
              kinds={CATEGORY_KINDS_OF[typeFilter] ?? []}
              value={categoryFilter}
              onChange={changeCategory}
            />

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

            <FormField label="정렬">
              {({ id }) => (
                <Select
                  id={id}
                  options={SORT_OPTIONS}
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value);
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
        <SummaryStats
          stats={[
            { label: '수입', value: data?.summary.incomeTotal ?? 0, tone: 'income' },
            { label: '지출', value: data?.summary.expenseTotal ?? 0, tone: 'expense' },
            { label: '남은 돈', value: data?.summary.net ?? 0 },
          ]}
          count={data?.summary.count ?? 0}
          isPending={isPending}
          isStale={isPlaceholderData}
        />
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

      <TransactionEditModal
        transaction={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
