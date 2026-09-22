'use client';

import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import styles from './CustomEcharts.module.scss';
import type { EChartsOption } from 'echarts';

// 이 앱은 line / bar / pie 셋뿐이다. 전체 import 는 1MB 가 넘어 모바일 초기 로딩에 바로 드러난다.
echarts.use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, SVGRenderer]);

interface EchartsCoreProps {
  option: EChartsOption;
  height: number;
  ariaLabel: string;
}

export default function EchartsCore({ option, height, ariaLabel }: EchartsCoreProps) {
  return (
    <div
      className={styles.customecharts}
      style={{ height }}
      role="img"
      aria-label={ariaLabel}
    >
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        notMerge
        lazyUpdate
        opts={{ renderer: 'svg' }}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
}
