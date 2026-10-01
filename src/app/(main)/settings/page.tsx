import AccountSection from './components/AccountSection';
import HouseholdSection from './components/HouseholdSection';
import MembersSection from './components/MembersSection';
import ThemeSection from './components/ThemeSection';
import styles from './Settings.module.scss';

export default function SettingsPage() {
  return (
    <div className={styles.settings}>
      <MembersSection />
      <HouseholdSection />
      <ThemeSection />
      <AccountSection />
    </div>
  );
}
