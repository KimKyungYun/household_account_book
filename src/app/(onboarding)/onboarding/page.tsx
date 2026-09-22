import OnboardingForm from './components/OnboardingForm';
import styles from './Onboarding.module.scss';

export default function OnboardingPage() {
  return (
    <div className={styles.onboarding}>
      <header className={styles.onboarding__header}>
        <h1 className={styles.onboarding__title}>가구 설정</h1>
        <p className={styles.onboarding__lead}>
          새로 시작하거나, 배우자가 준 코드로 들어가세요.
        </p>
      </header>

      <OnboardingForm />
    </div>
  );
}
