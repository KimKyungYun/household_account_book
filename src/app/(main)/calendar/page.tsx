import CalendarBoard from './components/CalendarBoard';
import styles from './Calendar.module.scss';

/** 조립만 한다 — 훅을 직접 부르지 않는다. */
export default function CalendarPage() {
  return (
    <div className={styles.calendar}>
      <div className={styles.calendar__layout}>
        <CalendarBoard />
      </div>
    </div>
  );
}
