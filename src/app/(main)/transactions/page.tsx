import TransactionsTabs from './components/TransactionsTabs';
import styles from './Transactions.module.scss';

/** 조립만 한다 — 훅을 직접 부르지 않는다. */
export default function TransactionsPage() {
  return (
    <div className={styles.transactions}>
      <TransactionsTabs />
    </div>
  );
}
