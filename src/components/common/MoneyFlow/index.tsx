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

/** 띠 안에 이름을 적을 수 있는 최소 비율. 이보다 좁으면 글자가 뭉개진다. */
const LABEL_MIN_RATIO = 0.13;

/**
 * 이 달의 흐름 — 번 돈 한 줄에서 쓴 돈이 빠져나가고 남은 만큼이 비어 있다.
 *
 * 도넛과 겹치지 않는다. 도넛은 **쓴 돈 안에서의 비중**이고, 이 띠는
 * **번 돈 대비 쓴 돈**이다. 그래서 여기서만 '얼마가 남았는지'가 길이로 보인다.
 *
 * 쓴 돈이 번 돈을 넘으면 띠를 넘긴 만큼을 오른쪽 끝에 경고색으로 둔다 —
 * 숫자를 읽기 전에 눈으로 먼저 알아채는 자리다.
 */
export function MoneyFlow({ income, expense, segments }: MoneyFlowProps) {
  const isOver = expense > income;
  // 넘쳤을 때는 쓴 돈이 띠 전체가 된다. 그래야 넘친 몫이 길이로 드러난다.
  const total = Math.max(income, expense);
  const left = Math.max(income - expense, 0);

  if (total <= 0) {
    return (
      <p className={styles.moneyflow__empty}>
        이번 달 기록이 없습니다. 거래를 등록하면 번 돈과 쓴 돈이 여기 나타납니다.
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
        {segments.map((segment) => {
          const ratio = ratioOf(segment.amount);

          return (
            <span
              key={segment.id}
              className={styles.moneyflow__spent}
              style={{
                width: `${ratio * 100}%`,
                backgroundColor: segment.colorHex ?? 'var(--member-a)',
              }}
              title={`${segment.name} ${formatMoney(segment.amount)}원`}
            >
              {ratio >= LABEL_MIN_RATIO && (
                <span className={styles.moneyflow__segmentname}>{segment.name}</span>
              )}
            </span>
          );
        })}

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
          >
            <span className={styles.moneyflow__leftlabel}>남은 돈</span>
          </span>
        )}
      </div>

      <p className={styles.moneyflow__caption}>
        {isOver
          ? `띠 전체가 이번 달에 쓴 돈입니다. 번 돈보다 ${formatMoney(expense - income)}원 더 썼습니다.`
          : '띠 전체가 이번 달에 번 돈입니다. 색이 채워진 만큼을 썼습니다.'}
      </p>
    </div>
  );
}

export default MoneyFlow;
