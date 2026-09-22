'use client';

import { useQuery } from '@tanstack/react-query';
import Amount from '@/components/common/Amount';
import Card from '@/components/common/Card';
import CustomEcharts from '@/components/common/CustomEcharts';
import { paletteColor } from '@/components/common/CustomEcharts/chartColors';
import { useChartColors } from '@/components/common/CustomEcharts/useChartColors';
import EmptyState from '@/components/common/EmptyState';
import Skeleton from '@/components/common/Skeleton';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getCategoryShares } from '@/service/stats';
import { currentYearMonth } from '@/utils/ts/formatDate';
import formatMoney from '@/utils/ts/formatMoney';
import styles from './DashboardCategories.module.scss';
import type { EChartsOption } from 'echarts';

export default function DashboardCategories() {
  const yearMonth = currentYearMonth();
  const colors = useChartColors();
  const params = { yearMonth, level: 1, limit: 8 };

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.STATS.CATEGORIES(params),
    queryFn: () => getCategoryShares(params),
  });

  if (isPending) return <Skeleton height={280} />;

  const rows = data ?? [];
  if (rows.length === 0) {
    return (
      <Card title="어디에 썼나">
        <EmptyState
          title="이 달 지출이 없습니다"
          description="지출을 등록하면 카테고리 비중이 나옵니다."
        />
      </Card>
    );
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.border,
      textStyle: { color: colors.textPrimary, fontSize: 12 },
      valueFormatter: (value) => `${formatMoney(Number(value))}원`,
    },
    textStyle: { fontFamily: 'Pretendard, system-ui, sans-serif' },
    series: [
      {
        type: 'pie',
        // 도넛으로 두어 가운데를 비우고, 비중은 옆 목록이 숫자로 말한다.
        radius: ['58%', '84%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: { borderColor: colors.surface, borderWidth: 2 },
        data: rows.map((row, index) => ({
          name: row.name,
          value: row.amount,
          // 카테고리에 색이 지정돼 있으면 그 값이 이긴다 — 표·배지와 같은 색을 쓴다.
          itemStyle: { color: row.colorHex ?? paletteColor(index) },
        })),
      },
    ],
  };

  return (
    <Card title="어디에 썼나">
      <div className={styles.dashboardcategories}>
        <CustomEcharts
          option={option}
          height={200}
          ariaLabel="카테고리별 지출 비중 도넛 차트"
        />

        <ul className={styles.dashboardcategories__legend}>
          {rows.map((row, index) => (
            <li
              key={row.categoryId}
              className={styles.dashboardcategories__item}
            >
              <span
                className={styles.dashboardcategories__dot}
                style={{ backgroundColor: row.colorHex ?? paletteColor(index) }}
                aria-hidden="true"
              />
              <span className={styles.dashboardcategories__name}>{row.name}</span>
              <span className={styles.dashboardcategories__share}>{(row.share * 100).toFixed(0)}%</span>
              <Amount
                value={row.amount}
                size="small"
                withUnit={false}
              />
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
