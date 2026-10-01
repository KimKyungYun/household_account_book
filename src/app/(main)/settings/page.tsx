import AccountSection from './components/AccountSection';
import HouseholdSection from './components/HouseholdSection';
import MembersSection from './components/MembersSection';
import PasswordSection from './components/PasswordSection';
import ThemeSection from './components/ThemeSection';
import styles from './Settings.module.scss';

export default function SettingsPage() {
  return (
    <div className={styles.settings}>
      <MembersSection />
      <HouseholdSection />
      <ThemeSection />
      <PasswordSection />
      <AccountSection />
    </div>
  );
}
