import Amount, { toneOfTransactionType } from '@/components/common/Amount';
import Badge from '@/components/common/Badge';
import { formatDateLabel, todayInSeoul } from '@/utils/ts/formatDate';
import type { TransactionListItemDto } from '@/service/transaction/type';
import styles from './TransactionRow.module.scss';

interface TransactionRowProps {
  transaction: TransactionListItemDto;
  onClick: (transaction: TransactionListItemDto) => void;
}

/** 모바일 목록의 한 줄. 왼쪽 색 띠가 '누가 냈는지'를 말한다. */
export function TransactionRow({ transaction, onClick }: TransactionRowProps) {
  // 반복 거래는 이번 달 끝까지 미리 만들어지므로 아직 오지 않은 날짜의 건이 섞인다.
  // 둘 다 PENDING 이지만 뜻이 다르다 — 미래는 '예정', 지난 건은 금액 '확인 필요'다.
  const isUpcoming = transaction.date > todayInSeoul();

  return (
    <button
      type="button"
      className={styles.transactionrow}
      style={{ borderInlineStartColor: transaction.member.colorHex }}
      onClick={() => onClick(transaction)}
    >
      <span className={styles.transactionrow__main}>
        <span className={styles.transactionrow__title}>
          {transaction.category?.colorHex && (
            <span
              className={styles.transactionrow__dot}
              style={{ backgroundColor: transaction.category.colorHex }}
              aria-hidden="true"
            />
          )}
          {transaction.merchant || transaction.category?.name || '옮긴 돈'}
        </span>
        <span className={styles.transactionrow__meta}>
          {formatDateLabel(transaction.date)}
          {transaction.category && ` · ${transaction.category.parentName ?? ''} ${transaction.category.name}`}
          {` · ${transaction.member.displayName}`}
        </span>
      </span>

      <span className={styles.transactionrow__side}>
        <Amount
          value={transaction.amount}
          tone={toneOfTransactionType(transaction.type)}
          signMode="tone"
        />
        <span className={styles.transactionrow__badges}>
          {transaction.status === 'PENDING' && (
            <Badge tone={isUpcoming ? 'neutral' : 'warning'}>{isUpcoming ? '예정' : '확인 필요'}</Badge>
          )}
          {transaction.splitMode === 'PERSONAL' && transaction.type !== 'TRANSFER' && <Badge tone="neutral">개인</Badge>}
        </span>
      </span>
    </button>
  );
}

export default TransactionRow;
