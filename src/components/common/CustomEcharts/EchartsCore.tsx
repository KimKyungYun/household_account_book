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
import { useEffect, useMemo, useState } from 'react';
import { prefersMotion } from '@/utils/ts/prefersMotion';
import styles from './CustomEcharts.module.scss';
import type { EChartsOption } from 'echarts';

// 이 앱은 line / bar / pie 셋뿐이다. 전체 import 는 1MB 가 넘어 모바일 초기 로딩에 바로 드러난다.
echarts.use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, SVGRenderer]);

/** 처음 그릴 때 막대가 자라고 고리가 채워지는 시간. */
const INTRO_MS = 600;

interface EchartsCoreProps {
  option: EChartsOption;
  height: number | '100%';
  ariaLabel: string;
}

export default function EchartsCore({ option, height, ariaLabel }: EchartsCoreProps) {
  // **처음 한 번만** 움직인다. 이 차트는 notMerge 로 옵션을 통째로 갈아 끼우므로,
  // 움직임을 켜 둔 채 데이터가 바뀌면 막대가 0 에서 다시 자란다. 등장이 끝나면 끈다.
  // 끄는 순간 옵션이 한 번 더 들어가지만, 이미 다 자란 뒤라 화면은 그대로다.
  const [isIntro, setIsIntro] = useState(prefersMotion);

  useEffect(() => {
    if (!isIntro) return undefined;

    const timer = window.setTimeout(() => setIsIntro(false), INTRO_MS + 100);

    return () => window.clearTimeout(timer);
  }, [isIntro]);

  const shown = useMemo<EChartsOption>(
    () => ({ ...option, animation: isIntro, animationDuration: INTRO_MS, animationEasing: 'cubicOut' }),
    [option, isIntro],
  );

  return (
    <div
      className={styles.customecharts}
      style={{ height }}
      role="img"
      aria-label={ariaLabel}
    >
      <ReactEChartsCore
        echarts={echarts}
        option={shown}
        notMerge
        lazyUpdate
        opts={{ renderer: 'svg' }}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
}
