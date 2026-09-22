import { cn } from '@/utils/ts/cn';
import amountSign from '@/utils/ts/amountSign';
import formatMoney from '@/utils/ts/formatMoney';
import type { AmountSignMode, AmountTone } from '@/utils/ts/amountSign';
import type { TransactionType } from '@/generated/prisma/enums';
import styles from './Amount.module.scss';

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
  className?: string;
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
  className,
}: AmountProps) {
  const sign = amountSign(value, tone, signMode);
  // 0원은 늘어난 것도 줄어든 것도 아니다. 색을 입히면 오류처럼 보인다.
  const appliedTone = value === 0 ? 'neutral' : tone;

  return (
    <span className={cn(styles.amount, styles[`amount--${appliedTone}`], styles[`amount--${size}`], className)}>
      {sign && <span className={styles.amount__sign}>{sign}</span>}
      {formatMoney(value)}
      {withUnit && <span className={styles.amount__unit}>원</span>}
    </span>
  );
}

export default Amount;
