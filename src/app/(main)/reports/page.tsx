import ReportPanel from './components/ReportPanel';
import styles from './Reports.module.scss';

export default function ReportsPage() {
  return (
    <div className={styles.reports}>
      <ReportPanel />
    </div>
  );
}
