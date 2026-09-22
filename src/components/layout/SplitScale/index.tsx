import { cn } from '@/utils/ts/cn';
import formatMoney from '@/utils/ts/formatMoney';
import Amount from '@/components/common/Amount';
import type { SettlementDto } from '@/service/settlement/type';
import styles from './SplitScale.module.scss';

interface SplitScaleProps {
  settlement: SettlementDto;
  /** 사이드바(세로로 좁음) / 스트립(가로로 넓음) 두 자리에 들어간다. */
  layout?: 'stack' | 'strip';
  className?: string;
}

/**
 * 분담 저울 — 이 앱의 시그니처.
 *
 * 띠의 **두 색 길이**는 각자 실제로 낸 비율이고, 띠 위의 **눈금**은 합의한 분담 비율이다.
 * 둘이 벌어진 만큼이 곧 정산할 돈이라, 숫자를 읽기 전에 눈으로 먼저 알 수 있다.
 * 이게 일반 가계부에 없는 것이고, 부부가 이 앱을 여는 이유다.
 */
export function SplitScale({ settlement, layout = 'stack', className }: SplitScaleProps) {
  const { lines, sharedTotal, transfer } = settlement;
  const paidTotal = lines.reduce((sum, line) => sum + Math.max(line.paidAmount, 0), 0);

  const creditor = transfer ? lines.find((line) => line.memberId === transfer.toMemberId) : null;
  const debtor = transfer ? lines.find((line) => line.memberId === transfer.fromMemberId) : null;

  return (
    <div className={cn(styles.splitscale, styles[`splitscale--${layout}`], className)}>
      <p className={styles.splitscale__caption}>이번 달 공동지출 분담</p>

      <div
        className={styles.splitscale__bar}
        role="img"
        aria-label={ariaLabel(settlement)}
      >
        {sharedTotal === 0 || paidTotal === 0 ? (
          <span className={styles['splitscale__bar-empty']} />
        ) : (
          lines.map((line) => (
            <span
              key={line.memberId}
              className={styles.splitscale__fill}
              style={{
                width: `${(Math.max(line.paidAmount, 0) / paidTotal) * 100}%`,
                backgroundColor: line.colorHex,
              }}
            />
          ))
        )}

        {/* 합의한 비율 눈금. 띠 경계가 이 선에 붙어 있으면 정산할 게 없다. */}
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

      <p className={cn(styles.splitscale__verdict, { [styles['splitscale__verdict--settled']]: !transfer })}>
        {transfer && debtor && creditor
          ? `${debtor.displayName} → ${creditor.displayName} ${formatMoney(transfer.amount)}원`
          : sharedTotal === 0
            ? '아직 공동지출이 없습니다'
            : '분담이 맞습니다'}
      </p>
    </div>
  );
}

function ariaLabel(settlement: SettlementDto): string {
  const paid = settlement.lines.map((line) => `${line.displayName} ${formatMoney(line.paidAmount)}원`).join(', ');

  return `공동지출 ${formatMoney(settlement.sharedTotal)}원 중 ${paid}`;
}

export default SplitScale;
