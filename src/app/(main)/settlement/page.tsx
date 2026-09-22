import SettlementPanel from './components/SettlementPanel';
import styles from './Settlement.module.scss';

export default function SettlementPage() {
  return (
    <div className={styles.settlement}>
      <SettlementPanel />
    </div>
  );
}
