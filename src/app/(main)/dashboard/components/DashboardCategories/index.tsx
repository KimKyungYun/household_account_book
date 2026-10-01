'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import Amount from '@/components/common/Amount';
import Card from '@/components/common/Card';
import Reveal from '@/components/common/Reveal';
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

// 범례 줄 길이를 달리해 실제 목록처럼 보이게 한다.
const LEGEND_WIDTHS = ['92%', '78%', '86%', '64%', '72%'];

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
    series: [
      {
        type: 'pie',
        // 보기만 하는 고리다. 마우스·터치에 반응하지 않는다 — 조각이 튀어나오거나 커서가
        // 바뀌면 누를 수 있는 것처럼 읽히는데, 눌러도 할 일이 없다. 수치는 옆 범례가 말한다.
        silent: true,
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

  if (isPending) {
    return (
      <Card
        title="분류별 지출"
        description="이번 달 지출을 큰 분류별로 보여줍니다."
      >
        <div
          className={styles.dashboardcategories}
          role="status"
          aria-label="불러오는 중"
        >
          <div className={styles.dashboardcategories__chart}>
            <Skeleton
              width={156}
              height={156}
              isCircle
              className={styles.dashboardcategories__skeletonring}
            />
          </div>
          <div className={styles.dashboardcategories__skeleton}>
            {LEGEND_WIDTHS.map((width) => (
              <Skeleton
                key={width}
                width={width}
                height={14}
              />
            ))}
          </div>
        </div>
      </Card>
    );
  }

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
      <Reveal className={styles.dashboardcategories}>
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

        <ul
          className={styles.dashboardcategories__legend}
          role="list"
        >
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
              {/* 이름·비중과 한 줄을 나눠 쓰는 좁은 칸이다. 줄여 적고 정확한 금액은 마우스를 올리면 뜬다. */}
              <Amount
                value={row.amount}
                size="small"
                withUnit={false}
                isCompact
                className={styles.dashboardcategories__amount}
              />
            </li>
          ))}
        </ul>
      </Reveal>
    </Card>
  );
}
