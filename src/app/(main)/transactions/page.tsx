import TransactionBoard from './components/TransactionBoard';
import styles from './Transactions.module.scss';

export default function TransactionsPage() {
  return (
    <div className={styles.transactions}>
      <TransactionBoard />
    </div>
  );
}
