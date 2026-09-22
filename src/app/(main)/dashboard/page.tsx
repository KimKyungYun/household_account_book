import DashboardBudget from './components/DashboardBudget';
import DashboardCategories from './components/DashboardCategories';
import DashboardRecent from './components/DashboardRecent';
import DashboardSettlement from './components/DashboardSettlement';
import DashboardStats from './components/DashboardStats';
import DashboardTrend from './components/DashboardTrend';
import DashboardUpcoming from './components/DashboardUpcoming';
import styles from './Dashboard.module.scss';

/** 조립만 한다 — 훅을 직접 부르지 않는다. 각 섹션이 자기 데이터를 가져온다. */
export default function DashboardPage() {
  return (
    <div className={styles.dashboard}>
      <DashboardStats />

      <div className={styles.dashboard__grid}>
        <DashboardTrend />
        <DashboardCategories />
        <DashboardBudget />
        <DashboardUpcoming />
        <DashboardSettlement />
        <DashboardRecent />
      </div>
    </div>
  );
}
