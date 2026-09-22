import AccountSection from './components/AccountSection';
import HouseholdSection from './components/HouseholdSection';
import ShareSection from './components/ShareSection';
import ThemeSection from './components/ThemeSection';
import styles from './Settings.module.scss';

export default function SettingsPage() {
  return (
    <div className={styles.settings}>
      <ShareSection />
      <HouseholdSection />
      <ThemeSection />
      <AccountSection />
    </div>
  );
}
