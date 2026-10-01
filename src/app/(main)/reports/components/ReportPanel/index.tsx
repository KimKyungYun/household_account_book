'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Amount from '@/components/common/Amount';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Reveal from '@/components/common/Reveal';
import CustomEcharts from '@/components/common/CustomEcharts';
import { fadingBar, quietCategoryAxis, quietValueAxis, useBaseOption } from '@/components/common/CustomEcharts/useBaseOption';
import EmptyState from '@/components/common/EmptyState';
import Icon from '@/components/common/Icon';
import Input from '@/components/common/Input';
import SegmentedControl from '@/components/common/SegmentedControl';
import { SkeletonChart, SkeletonRows } from '@/components/common/Skeleton';
import Table from '@/components/common/Table';
import { useExcelDownload } from '@/hooks/useExcelDownload';
import { useHouseholdRule } from '@/hooks/useHouseholdRule';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getCategoryShares, getMemberStats, getMonthlyTrend } from '@/service/stats';
import { currentYearMonth, formatYearMonthLabel, monthRange, shiftYearMonth } from '@/utils/ts/formatDate';
import type { Column } from '@/components/common/Table';
import type { CategoryShareDto, MemberStatDto } from '@/service/stats/type';
import styles from './ReportPanel.module.scss';
import type { EChartsOption } from 'echarts';

const RANGE_OPTIONS = [
  { value: '6', label: '6개월' },
  { value: '12', label: '1년' },
  { value: '24', label: '2년' },
] as const;

const LEVEL_OPTIONS = [
  { value: '1', label: '큰 분류' },
  { value: '2', label: '세부 분류' },
] as const;

/** 해당 월의 마지막 날. 엑셀 기간 파라미터가 반개구간이 아니라 닫힌 구간이라 필요하다. */
function lastDayOf(yearMonth: string): string {
  const { toExclusive } = monthRange(yearMonth);

  return new Date(new Date(`${toExclusive}T00:00:00.000Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
}

export default function ReportPanel() {
  const [months, setMonths] = useState(6);
  const [level, setLevel] = useState(1);
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const excel = useExcelDownload();
  const { hasOthers } = useHouseholdRule();

  const to = currentYearMonth();
  const from = shiftYearMonth(to, -(months - 1));
  const { colors, base } = useBaseOption();

  const trend = useQuery({
    queryKey: QUERY_KEY.STATS.MONTHLY({ from, to }),
    queryFn: () => getMonthlyTrend({ from, to }),
    // 기간을 바꾸는 동안 앞 결과를 남겨 둔다 — 차트가 빈 상자로 깜빡이지 않는다.
    placeholderData: keepPreviousData,
  });

  const categoryParams = { yearMonth, level, limit: 30 };
  const categories = useQuery({
    queryKey: QUERY_KEY.STATS.CATEGORIES(categoryParams),
    queryFn: () => getCategoryShares(categoryParams),
    placeholderData: keepPreviousData,
  });

  const memberStats = useQuery({
    queryKey: QUERY_KEY.STATS.MEMBERS(yearMonth),
    queryFn: () => getMemberStats(yearMonth),
    placeholderData: keepPreviousData,
  });

  const points = trend.data ?? [];

  const trendOption: EChartsOption = {
    ...base,
    xAxis: quietCategoryAxis(colors, points.map((point) => point.yearMonth.replace('-', '.')), months > 12 ? 45 : 0),
    yAxis: quietValueAxis(colors),
    series: [
      {
        name: '수입',
        type: 'bar',
        data: points.map((point) => point.income),
        itemStyle: { color: fadingBar(colors.income, true), borderRadius: [6, 6, 1, 1] },
        barMaxWidth: 16,
        barGap: '18%',
      },
      {
        name: '지출',
        type: 'bar',
        data: points.map((point) => point.expense),
        itemStyle: { color: fadingBar(colors.expense, true), borderRadius: [6, 6, 1, 1] },
        barMaxWidth: 16,
      },
      {
        name: '차이',
        type: 'line',
        data: points.map((point) => point.net),
        smooth: 0.35,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: colors.textTertiary, width: 1.5 },
        itemStyle: { color: colors.surface, borderColor: colors.textTertiary, borderWidth: 1.5 },
        // 거래가 없는 달이 구멍으로 끊기지 않게 잇는다.
        connectNulls: true,
      },
    ],
  };

  const categoryColumns: Column<CategoryShareDto>[] = [
    { key: 'name', header: level === 1 ? '큰 분류' : '세부 분류', render: (row) => row.name },
    {
      key: 'amount',
      header: '지출',
      align: 'right',
      render: (row) => (
        <Amount
          value={row.amount}
          size="small"
          tone="expense"
        />
      ),
    },
    { key: 'share', header: '구성비', align: 'right', render: (row) => `${(row.share * 100).toFixed(1)}%` },
    {
      key: 'prev',
      header: '전월',
      align: 'right',
      hideOnTablet: true,
      render: (row) => (
        <Amount
          value={row.prevAmount}
          size="small"
        />
      ),
    },
    {
      key: 'delta',
      header: '증감',
      align: 'right',
      render: (row) => (
        <Amount
          value={row.amount - row.prevAmount}
          size="small"
          tone={row.amount - row.prevAmount > 0 ? 'expense' : 'income'}
          signMode="value"
        />
      ),
    },
  ];

  const memberColumns: Column<MemberStatDto>[] = [
    {
      key: 'member',
      header: '사람',
      render: (row) => (
        <span className={styles.reportpanel__member}>
          <span
            className={styles.reportpanel__dot}
            style={{ backgroundColor: row.colorHex }}
            aria-hidden="true"
          />
          {row.displayName}
        </span>
      ),
    },
    {
      key: 'income',
      header: '수입',
      align: 'right',
      render: (row) => (
        <Amount
          value={row.paidIncome}
          size="small"
          tone="income"
        />
      ),
    },
    {
      key: 'shared',
      header: '같이 쓴 돈',
      align: 'right',
      render: (row) => (
        <Amount
          value={row.sharedPaid}
          size="small"
          tone="expense"
        />
      ),
    },
    {
      key: 'personal',
      header: '각자 쓴 돈',
      align: 'right',
      render: (row) => (
        <Amount
          value={row.personalPaid}
          size="small"
        />
      ),
    },
  ];

  return (
    <>
      <Card
        title="기간별 수입·지출"
        description="막대는 수입(초록)과 지출(빨강), 선은 남은 돈이에요. 선이 0 아래로 내려간 달은 번 것보다 더 쓴 달이에요."
      >
        <div className={styles.reportpanel__controls}>
          <SegmentedControl
            name="report-range"
            options={RANGE_OPTIONS}
            value={String(months)}
            onChange={(value) => setMonths(Number(value))}
            ariaLabel="기간"
          />
        </div>

        {trend.isPending ? (
          <SkeletonChart height={280} />
        ) : points.some((point) => point.income !== 0 || point.expense !== 0) ? (
          <CustomEcharts
            option={trendOption}
            height={280}
            ariaLabel={`${from} 부터 ${to} 까지 수입·지출·순액 추이`}
          />
        ) : (
          <EmptyState
            title="이 기간엔 기록이 없어요"
            description="거래를 적으면 차트로 보여 드릴게요."
          />
        )}
      </Card>

      <Card
        title="분류별 지출"
        description="고른 달에 어디에 썼는지, 지난달보다 얼마나 달라졌는지 보여 드려요"
        action={
          <div className={styles.reportpanel__inline}>
            <Input
              type="month"
              value={yearMonth}
              aria-label="기준 월"
              onChange={(event) => event.target.value && setYearMonth(event.target.value)}
            />
            <SegmentedControl
              name="report-level"
              options={LEVEL_OPTIONS}
              value={String(level)}
              onChange={(value) => setLevel(Number(value))}
              ariaLabel="분류 단위"
              isFullWidth={false}
            />
          </div>
        }
      >
        {categories.isPending ? (
          <SkeletonRows
            count={5}
            isPadded={false}
          />
        ) : (
          <Reveal>
            <Table
              caption={`${formatYearMonthLabel(yearMonth)} 카테고리별 지출`}
              columns={categoryColumns}
              rows={categories.data ?? []}
              getRowKey={(row) => row.categoryId}
              emptyContent="이 달은 쓴 돈이 없어요."
            />
          </Reveal>
        )}
      </Card>

      {/* 혼자 쓰는 장부면 사람별로 가를 것이 없다. */}
      {hasOthers && (
        <Card
          title="사람별 수입·지출"
          description="각자 쓴 돈은 나누지 않아요."
        >
          {memberStats.isPending ? (
            <SkeletonRows
              count={2}
              isPadded={false}
            />
          ) : (
            <Reveal>
              <Table
                caption={`${formatYearMonthLabel(yearMonth)} 구성원별 수입·지출`}
                columns={memberColumns}
                rows={memberStats.data ?? []}
                getRowKey={(row) => row.memberId}
              />
            </Reveal>
          )}
        </Card>
      )}

      <Card
        title="엑셀로 내보내기"
        description="요약, 전체 내역, 분류별 표 세 개의 시트로 저장해 드려요"
      >
        <div className={styles.reportpanel__export}>
          <p className={styles.reportpanel__note}>
            요약·상세·분류별 표 세 시트가 기본이에요. 상세 시트에는 필터가 걸려 있어서, 거르면 합계도 따라 바뀌어요.
          </p>

          <Button
            iconLeft={<Icon
              name="download"
              size={16}
            />}
            isLoading={excel.isPending}
            onClick={() =>
              excel.mutate({
                from: monthRange(from).from,
                to: lastDayOf(to),
                sheets: ['summary', 'detail', 'pivot'],
              })}
          >
            {`${formatYearMonthLabel(from)} ~ ${formatYearMonthLabel(to)} 내려받기`}
          </Button>
        </div>
      </Card>
    </>
  );
}
