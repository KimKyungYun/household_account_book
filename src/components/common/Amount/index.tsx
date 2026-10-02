import { cn } from '@/utils/ts/cn';
import amountSign from '@/utils/ts/amountSign';
import formatMoney, { formatMoneyCompact } from '@/utils/ts/formatMoney';
import type { AmountSignMode, AmountTone } from '@/utils/ts/amountSign';
import type { TransactionType } from '@/generated/prisma/enums';
import styles from './Amount.module.scss';
import type { CSSProperties } from 'react';

export type { AmountTone };

export type AmountSize = 'hero' | 'display' | 'large' | 'medium' | 'small';

interface AmountProps {
  /** 원 단위 정수. 음수는 환불·정정이다. */
  value: number;
  tone?: AmountTone;
  size?: AmountSize;
  /**
   * 부호를 어떻게 붙일지.
   *
   *  - `none`  부호 없음. 음수만 − 를 붙인다. (합계·잔액 표시)
   *  - `value` 값의 부호를 그대로. 양수 +, 음수 −. (증감·차액)
   *  - `tone`  거래 성격을 따른다. 지출 −, 수입 +. 저장된 금액이 양수여도 지출은 − 로 보인다.
   *
   * `tone` 과 `value` 를 구분하지 않으면 "지출이 16만원 늘었다"가 `−162,500` 으로 나온다.
   */
  signMode?: AmountSignMode;
  /** '원' 단위 표기. 숫자만 나열하는 표에서는 끈다. */
  withUnit?: boolean;
  /**
   * 좁은 칸에서 만·억으로 줄여 적는다 — `1,234,567,890` → `12억 3,457만`.
   *
   * **값이 깎이므로** 합계처럼 정확해야 하는 자리에는 쓰지 않는다. 대신 마우스를 올리면
   * 정확한 금액이 뜬다. 넓은 자리는 이것 없이도 아래 자릿수 축소가 받아 준다.
   */
  isCompact?: boolean;
  /**
   * 담긴 칸의 폭에 맞춰 글자를 줄인다 — 좁은 상자에서 큰 금액이 밖으로 넘치지 않게.
   * 금액을 블록 하나로 감싸 그 폭을 기준으로 삼으므로, 세로로 쌓이는 자리(라벨 아래 금액)에 켠다.
   * 가로 줄에서 옆 글과 나란히 놓인 금액에 켜면 칸 폭이 0 으로 잡힌다.
   */
  isFit?: boolean;
  /**
   * 글자 크기를 정할 때 셀 값. 기본은 `value`.
   * 0 에서 올라가는 숫자는 최종 값을 넘겨, 세는 동안 자릿수가 늘며 크기가 출렁이지 않게 한다.
   */
  sizingValue?: number;
  className?: string;
}

/**
 * 자릿수가 늘면 글자를 줄인다.
 *
 * 금액 서체는 고정폭이라 한 자가 늘 때마다 폭이 그만큼 커진다. 40px 로 두면
 * `1,234,567,890원`(12억)이 모바일 카드를 17px 넘어간다. 실측해서 정한 경계다.
 * 자릿수는 그릴 때 이미 알 수 있으므로 서버에서 렌더해도 값이 흔들리지 않는다.
 */
function scaleOf(text: string): 'base' | 'tight' | 'tighter' {
  if (text.length >= 14) return 'tighter';
  if (text.length >= 12) return 'tight';

  return 'base';
}

/*
  칸에 맞출 때 금액이 차지하는 폭을 글자 크기(em) 단위로 센다.
  숫자 서체(Geist Mono)는 모든 글자가 0.6em 이다. '원'은 0.72em 크기의 한글 한 자에 앞 여백이 붙는다.
  서체가 늦게 뜨거나 대체 서체로 그려질 때를 위해 조금 넉넉히 잡는다.
*/
const DIGIT_EM = 0.6;
const UNIT_EM = 0.85;
const FIT_SAFETY = 1.04;

function emWidthOf(text: string, withUnit: boolean): number {
  return (text.length * DIGIT_EM + (withUnit ? UNIT_EM : 0)) * FIT_SAFETY;
}

const TONE_BY_TYPE: Record<TransactionType, AmountTone> = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer',
};

export function toneOfTransactionType(type: TransactionType): AmountTone {
  return TONE_BY_TYPE[type];
}

/**
 * 금액 표시의 단일 창구.
 * 부호·색·자릿수 정렬·단위를 여기서만 정해 표와 카드가 달라 보이는 일을 막는다.
 */
export function Amount({
  value,
  tone = 'neutral',
  size = 'medium',
  signMode = 'none',
  withUnit = true,
  isCompact = false,
  isFit = false,
  sizingValue = value,
  className,
}: AmountProps) {
  const sign = amountSign(value, tone, signMode);
  // 0원은 늘어난 것도 줄어든 것도 아니다. 색을 입히면 오류처럼 보인다.
  const appliedTone = value === 0 ? 'neutral' : tone;
  const exact = formatMoney(value);
  const text = isCompact ? formatMoneyCompact(value) : exact;
  // 크기는 부호까지 넣은 '마지막에 보일 글'로 정한다.
  const sizingText = `${amountSign(sizingValue, tone, signMode)}${isCompact ? formatMoneyCompact(sizingValue) : formatMoney(sizingValue)}`;

  const amount = (
    <span
      className={cn(
        styles.amount,
        styles[`amount--${appliedTone}`],
        styles[`amount--${size}`],
        { [styles['amount--fit']]: isFit },
        className,
      )}
      data-scale={scaleOf(sizingText)}
      style={isFit ? ({ '--amount-ems': emWidthOf(sizingText, withUnit).toFixed(2) } as CSSProperties) : undefined}
      // 줄여 적었을 때만 정확한 금액을 남긴다. 그대로 적었으면 덧붙일 것이 없다.
      title={isCompact ? `${sign}${exact}원` : undefined}
    >
      {sign && <span className={styles.amount__sign}>{sign}</span>}
      {text}
      {withUnit && <span className={styles.amount__unit}>원</span>}
    </span>
  );

  // 칸 폭을 재는 틀. 금액 자신은 글 폭만큼만 차지하므로 틀이 대신 칸을 채운다.
  return isFit ? <span className={styles.amountfit}>{amount}</span> : amount;
}

export default Amount;
