import RecurringBoard from './components/RecurringBoard';
import styles from './Recurrings.module.scss';

export default function RecurringsPage() {
  return (
    <div className={styles.recurrings}>
      <RecurringBoard />
    </div>
  );
}
