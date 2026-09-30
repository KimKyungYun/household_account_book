import DashboardAssets from './components/DashboardAssets';
import DashboardCalendar from './components/DashboardCalendar';
import DashboardCategories from './components/DashboardCategories';
import DashboardRecent from './components/DashboardRecent';
import DashboardStats from './components/DashboardStats';
import DashboardTrend from './components/DashboardTrend';
import DashboardUpcoming from './components/DashboardUpcoming';
import styles from './Dashboard.module.scss';

/**
 * 조립만 한다 — 훅을 직접 부르지 않는다. 각 섹션이 자기 데이터를 가져온다.
 *
 * 위쪽 넷(이번 달 요약·달력·앞으로 오갈 돈·모은 돈)이 이 화면의 본론이다.
 * 나머지는 각자의 화면에 제대로 된 판이 있어 여기서는 곁들이기만 한다.
 */
export default function DashboardPage() {
  return (
    <div className={styles.dashboard}>
      <DashboardStats />
      <DashboardCalendar />

      <div className={styles.dashboard__pair}>
        <DashboardUpcoming />
        <DashboardAssets />
      </div>

      <div className={styles.dashboard__grid}>
        <DashboardTrend />
        <DashboardCategories />
        <DashboardRecent />
      </div>
    </div>
  );
}
