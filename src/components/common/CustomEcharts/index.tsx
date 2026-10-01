'use client';

import dynamic from 'next/dynamic';
import { SkeletonChart } from '@/components/common/Skeleton';
import styles from './CustomEcharts.module.scss';
import type { EChartsOption } from 'echarts';

/**
 * echarts 는 import 시점에 document 를 만져 서버 번들에서 완전히 빼야 한다.
 * dynamic() 호출은 렌더마다 다시 만들면 안 되므로 모듈 스코프에 둔다.
 * loading 은 높이를 받을 수 없어 바깥 상자가 높이를 잡고 막대 윤곽이 그 안을 채운다.
 * 청크가 늦게 와도 레이아웃이 튀지 않는다.
 */
const EchartsCore = dynamic(() => import('./EchartsCore'), {
  ssr: false,
  loading: () => <SkeletonChart height="100%" />,
});

interface CustomEchartsProps {
  option: EChartsOption;
  height?: number;
  ariaLabel: string;
}

export function CustomEcharts({ option, height = 220, ariaLabel }: CustomEchartsProps) {
  return (
    <div
      className={styles.customecharts__frame}
      style={{ height }}
    >
      <EchartsCore
        option={option}
        height={height}
        ariaLabel={ariaLabel}
      />
    </div>
  );
}

export default CustomEcharts;
