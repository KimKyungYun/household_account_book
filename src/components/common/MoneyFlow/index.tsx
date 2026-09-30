'use client';

import formatMoney from '@/utils/ts/formatMoney';
import styles from './MoneyFlow.module.scss';

export interface MoneyFlowSegment {
  id: string;
  name: string;
  amount: number;
  colorHex: string | null;
}

interface MoneyFlowProps {
  /** 이번 달에 번 돈. 띠 전체 폭이 이 값이다. */
  income: number;
  /** 이번 달에 쓴 돈. 띠에서 색이 채워지는 길이다. */
  expense: number;
  /** 쓴 돈을 분류별로 쪼갠 것. 큰 것부터 넣는다. */
  segments: MoneyFlowSegment[];
}

/**
 * 이 달의 흐름 — 번 돈 한 줄에서 쓴 돈이 빠져나가고 남은 만큼이 비어 있다.
 *
 * 도넛과 겹치지 않는다. 도넛은 **쓴 돈 안에서의 비중**이고, 이 띠는
 * **번 돈 대비 쓴 돈**이다. 그래서 여기서만 '얼마가 남았는지'가 길이로 보인다.
 *
 * 띠 안에 글자를 넣지 않는다. 폭이 좁아 대부분 잘리고, 잘린 이름은 색보다 읽기
 * 어렵다. 분류와 금액은 조각에 마우스를 올리면 나온다.
 */
export function MoneyFlow({ income, expense, segments }: MoneyFlowProps) {
  const isOver = expense > income;
  // 넘쳤을 때는 쓴 돈이 띠 전체가 된다. 그래야 넘친 몫이 길이로 드러난다.
  const total = Math.max(income, expense);
  const left = Math.max(income - expense, 0);

  if (total <= 0) {
    return (
      <p className={styles.moneyflow__empty}>
        이번 달 기록이 없습니다. 거래를 등록하면 여기에 나타납니다.
      </p>
    );
  }

  const ratioOf = (amount: number) => amount / total;
  // 분류 합이 쓴 돈보다 적을 수 있다(상위 몇 개만 받아 올 때). 남는 몫을 따로 둔다.
  const namedTotal = segments.reduce((sum, segment) => sum + segment.amount, 0);
  const restExpense = Math.max(expense - namedTotal, 0);

  return (
    <div className={styles.moneyflow}>
      <div
        className={styles.moneyflow__track}
        role="img"
        aria-label={`번 돈 ${formatMoney(income)}원 가운데 ${formatMoney(expense)}원을 썼습니다.`}
      >
        {segments.map((segment) => (
          <span
            key={segment.id}
            className={styles.moneyflow__spent}
            style={{
              width: `${ratioOf(segment.amount) * 100}%`,
              backgroundColor: segment.colorHex ?? 'var(--member-a)',
            }}
            title={`${segment.name} ${formatMoney(segment.amount)}원`}
          />
        ))}

        {restExpense > 0 && (
          <span
            className={styles.moneyflow__spent}
            style={{
              width: `${ratioOf(restExpense) * 100}%`,
              backgroundColor: 'var(--text-tertiary)',
            }}
            title={`그 밖 ${formatMoney(restExpense)}원`}
          />
        )}

        {/* 남은 몫. 비어 있지만 은은히 빛나 '아직 쓰지 않은 돈'임을 말한다. */}
        {left > 0 && (
          <span
            className={styles.moneyflow__left}
            style={{ width: `${ratioOf(left) * 100}%` }}
          />
        )}
      </div>

      {/* 평소에는 띠가 스스로 설명한다. 넘쳤을 때만 말로 짚어 준다. */}
      {isOver && (
        <p className={styles.moneyflow__warning}>
          번 돈보다 {formatMoney(expense - income)}원 더 썼습니다.
        </p>
      )}
    </div>
  );
}

export default MoneyFlow;
