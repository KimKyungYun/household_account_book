'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import Amount from '@/components/common/Amount';
import Card from '@/components/common/Card';
import CustomEcharts from '@/components/common/CustomEcharts';
import { paletteColor } from '@/components/common/CustomEcharts/chartColors';
import EmptyState from '@/components/common/EmptyState';
import Skeleton from '@/components/common/Skeleton';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getCategoryShares } from '@/service/stats';
import { currentYearMonth } from '@/utils/ts/formatDate';
import styles from './DashboardCategories.module.scss';
import type { EChartsOption } from 'echarts';

const PARAMS = { yearMonth: '', level: 1, limit: 8 };

export default function DashboardCategories() {
  const yearMonth = currentYearMonth();
  const params = useMemo(() => ({ ...PARAMS, yearMonth }), [yearMonth]);

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.STATS.CATEGORIES(params),
    queryFn: () => getCategoryShares(params),
  });

  const rows = useMemo(() => data ?? [], [data]);

  // 옵션을 렌더마다 새로 만들면 차트가 매번 처음부터 다시 그려진다.
  const option = useMemo<EChartsOption>(() => ({
    // 툴팁을 두지 않는다. 오른쪽 범례가 이름·비중·금액을 이미 다 보여주므로
    // 같은 값을 한 번 더 띄우면 고리와 가운데 총액만 덮는다.
    tooltip: { show: false },
    textStyle: { fontFamily: 'Pretendard, system-ui, sans-serif' },
    animation: false,
    series: [
      {
        type: 'pie',
        // 얇은 고리로 두고 가운데를 비운다 — 그 자리에 총액을 넣는다.
        radius: ['82%', '96%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        // 조각이 하나뿐일 때 간격을 주면 고리가 끊겨 보인다. 둘 이상일 때만 벌린다.
        padAngle: rows.length > 1 ? 1.5 : 0,
        itemStyle: { borderRadius: rows.length > 1 ? 4 : 0 },
        data: rows.map((row, index) => ({
          name: row.name,
          value: row.amount,
          itemStyle: { color: row.colorHex ?? paletteColor(index) },
        })),
      },
    ],
  }), [rows]);

  if (isPending) return <Skeleton height={300} />;

  if (rows.length === 0) {
    return (
      <Card
        title="분류별 지출"
        description="이번 달 지출을 큰 분류별로 보여줍니다."
      >
        <EmptyState
          title="이번 달 지출이 없습니다"
          description="지출을 등록하면 표시됩니다."
        />
      </Card>
    );
  }

  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const colorOf = (index: number) => rows[index]?.colorHex ?? paletteColor(index);

  return (
    <Card
      title="분류별 지출"
      description="이번 달 지출을 큰 분류별로 보여줍니다."
    >
      <div className={styles.dashboardcategories}>
        <div className={styles.dashboardcategories__chart}>
          <CustomEcharts
            option={option}
            height={156}
            ariaLabel="카테고리별 지출 비중 도넛 차트"
          />
          {/* 고리 가운데 — 비중을 보다가 총액이 궁금해지는 자리다. */}
          <div className={styles.dashboardcategories__center}>
            <span className={styles.dashboardcategories__centerlabel}>총 지출</span>
            <Amount
              value={total}
              size="large"
              tone="expense"
              withUnit={false}
            />
          </div>
        </div>

        <ul className={styles.dashboardcategories__legend}>
          {rows.map((row, index) => (
            <li
              key={row.categoryId}
              className={styles.dashboardcategories__item}
            >
              <span
                className={styles.dashboardcategories__dot}
                style={{ backgroundColor: colorOf(index) }}
                aria-hidden="true"
              />
              <span className={styles.dashboardcategories__name}>{row.name}</span>
              <span className={styles.dashboardcategories__bar}>
                <span
                  className={styles.dashboardcategories__barfill}
                  style={{ width: `${row.share * 100}%`, backgroundColor: colorOf(index) }}
                />
              </span>
              <span className={styles.dashboardcategories__share}>{(row.share * 100).toFixed(0)}%</span>
              <Amount
                value={row.amount}
                size="small"
                withUnit={false}
                className={styles.dashboardcategories__amount}
              />
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
