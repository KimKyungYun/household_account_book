import Amount from '@/components/common/Amount';
import { cn } from '@/utils/ts/cn';
import formatMoney from '@/utils/ts/formatMoney';
import type { SettlementDto } from '@/service/settlement/type';
import styles from './SplitScale.module.scss';

interface SplitScaleProps {
  settlement: SettlementDto;
  /** 사이드바(세로로 좁음) / 스트립(가로로 넓음) 두 자리에 들어간다. */
  layout?: 'stack' | 'strip';
  className?: string;
}

/**
 * 같이 쓴 돈이 두 사람 사이에서 어떻게 갈렸는지 보여주는 띠.
 *
 * 색 길이는 각자 실제로 낸 비율이고, 점선은 약속한 비율이다.
 * 둘이 벌어졌는지만 눈으로 보면 되는 자리라 금액 계산 결과는 적지 않는다 —
 * 그건 분담 정산 화면이 맡는다.
 */
export function SplitScale({ settlement, layout = 'stack', className }: SplitScaleProps) {
  const { lines, sharedTotal } = settlement;
  const paidTotal = lines.reduce((sum, line) => sum + Math.max(line.paidAmount, 0), 0);
  const isEmpty = sharedTotal === 0 || paidTotal === 0;

  return (
    <div className={cn(styles.splitscale, styles[`splitscale--${layout}`], className)}>
      <div
        className={styles.splitscale__bar}
        role="img"
        aria-label={ariaLabel(settlement)}
      >
        {isEmpty
          ? <span className={styles['splitscale__bar-empty']} />
          : lines.map((line) => (
            <span
              key={line.memberId}
              className={styles.splitscale__fill}
              style={{
                width: `${(Math.max(line.paidAmount, 0) / paidTotal) * 100}%`,
                backgroundColor: line.colorHex,
              }}
            />
          ))}

        {/* 약속한 비율 자리. 띠 경계가 이 선에 붙어 있으면 그대로 나눠 낸 것이다. */}
        {lines.length > 1 && lines[0] && (
          <span
            className={styles.splitscale__tick}
            style={{ left: `${(lines[0].shareBp / 10_000) * 100}%` }}
          >
            <span className={styles.splitscale__ticklabel}>{Math.round(lines[0].shareBp / 100)}%</span>
          </span>
        )}
      </div>

      <ul className={styles.splitscale__legend}>
        {lines.map((line) => (
          <li
            key={line.memberId}
            className={styles.splitscale__member}
          >
            <span
              className={styles.splitscale__dot}
              style={{ backgroundColor: line.colorHex }}
              aria-hidden="true"
            />
            <span className={styles.splitscale__name}>{line.displayName}</span>
            <Amount
              value={line.paidAmount}
              size="small"
              withUnit={false}
              className={styles.splitscale__paid}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ariaLabel(settlement: SettlementDto): string {
  const paid = settlement.lines.map((line) => `${line.displayName} ${formatMoney(line.paidAmount)}원`).join(', ');

  return `같이 쓴 돈 ${formatMoney(settlement.sharedTotal)}원 중 ${paid}`;
}

export default SplitScale;
