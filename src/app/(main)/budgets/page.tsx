import BudgetBoard from './components/BudgetBoard';
import styles from './Budgets.module.scss';

export default function BudgetsPage() {
  return (
    <div className={styles.budgets}>
      <BudgetBoard />
    </div>
  );
}
