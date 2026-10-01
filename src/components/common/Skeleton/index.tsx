import { cn } from '@/utils/ts/cn';
import styles from './Skeleton.module.scss';

interface SkeletonProps {
  /** px 또는 CSS 길이. 로딩 중에도 자리 높이를 유지해 레이아웃이 튀지 않게 한다. */
  height?: number | string;
  width?: number | string;
  isCircle?: boolean;
  className?: string;
}

export function Skeleton({ height = 16, width = '100%', isCircle = false, className }: SkeletonProps) {
  return (
    <span
      className={cn(styles.skeleton, { [styles['skeleton--circle']]: isCircle }, className)}
      style={{ height, width }}
      aria-hidden="true"
    />
  );
}

/*
 * 아래는 실제 화면 모양을 흉내 내는 묶음이다.
 *
 * 회색 상자 하나만 띄우면 무엇이 오는지 알 수 없고, 데이터가 들어오는 순간 자리가 크게 바뀐다.
 * 줄·달력·막대처럼 **올 내용의 윤곽**을 먼저 그려 두면 기다리는 동안에도 화면이 읽힌다.
 * 화면 판독기에는 장식 대신 "불러오는 중" 한 마디만 들린다.
 */

// 줄마다 길이를 조금씩 달리해 같은 막대가 반복되는 느낌을 줄인다.
const TITLE_WIDTHS = ['46%', '62%', '38%', '54%', '42%', '58%'];
const AMOUNT_WIDTHS = [72, 88, 64, 80, 96, 68];
const BAR_HEIGHTS = ['48%', '72%', '36%', '84%', '60%', '44%'];

interface SkeletonRowsProps {
  count?: number;
  /** 카드 안쪽 여백이 없는(isFlush) 목록이면 줄마다 여백을 준다. */
  isPadded?: boolean;
}

/** 거래 한 줄(점 · 제목 · 보조 줄 · 금액)의 윤곽. */
export function SkeletonRows({ count = 4, isPadded = true }: SkeletonRowsProps) {
  return (
    <div
      className={cn(styles['skeleton-rows'], { [styles['skeleton-rows--padded']]: isPadded })}
      role="status"
      aria-label="불러오는 중"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={styles['skeleton-rows__item']}
        >
          <Skeleton
            width={8}
            height={8}
            isCircle
          />
          <div className={styles['skeleton-rows__text']}>
            <Skeleton
              width={TITLE_WIDTHS[index % TITLE_WIDTHS.length]}
              height={14}
            />
            <Skeleton
              width="28%"
              height={11}
            />
          </div>
          <Skeleton
            width={AMOUNT_WIDTHS[index % AMOUNT_WIDTHS.length]}
            height={16}
          />
        </div>
      ))}
    </div>
  );
}

/** 한 달 달력(요일 머리 + 6주 칸)의 윤곽. */
export function SkeletonCalendar({ isCompact = false }: { isCompact?: boolean }) {
  return (
    <div
      className={cn(styles['skeleton-calendar'], { [styles['skeleton-calendar--compact']]: isCompact })}
      role="status"
      aria-label="불러오는 중"
    >
      {Array.from({ length: 7 }, (_, index) => (
        <Skeleton
          key={`head-${index}`}
          height={12}
          width="40%"
          className={styles['skeleton-calendar__head']}
        />
      ))}
      {Array.from({ length: 42 }, (_, index) => (
        <Skeleton
          key={index}
          height="auto"
          className={styles['skeleton-calendar__cell']}
        />
      ))}
    </div>
  );
}

/** 막대 차트의 윤곽. 높이는 실제 차트와 맞춰 받는다. */
export function SkeletonChart({ height = 220, bars = 6 }: { height?: number; bars?: number }) {
  return (
    <div
      className={styles['skeleton-chart']}
      style={{ height }}
      role="status"
      aria-label="불러오는 중"
    >
      {Array.from({ length: bars }, (_, index) => (
        <Skeleton
          key={index}
          height={BAR_HEIGHTS[index % BAR_HEIGHTS.length]}
          className={styles['skeleton-chart__bar']}
        />
      ))}
    </div>
  );
}

export default Skeleton;
