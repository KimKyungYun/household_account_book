'use client';

import dynamic from 'next/dynamic';
import Skeleton from '@/components/common/Skeleton';
import type { EChartsOption } from 'echarts';

/**
 * echarts 는 import 시점에 document 를 만져 서버 번들에서 완전히 빼야 한다.
 * dynamic() 호출은 렌더마다 다시 만들면 안 되므로 모듈 스코프에 둔다.
 * loading 에 같은 높이의 Skeleton 을 주어 청크가 늦게 와도 레이아웃이 튀지 않게 한다.
 */
const EchartsCore = dynamic(() => import('./EchartsCore'), {
  ssr: false,
  loading: () => <Skeleton height={220} />,
});

interface CustomEchartsProps {
  option: EChartsOption;
  height?: number;
  ariaLabel: string;
}

export function CustomEcharts({ option, height = 220, ariaLabel }: CustomEchartsProps) {
  return (
    <EchartsCore
      option={option}
      height={height}
      ariaLabel={ariaLabel}
    />
  );
}

export default CustomEcharts;
