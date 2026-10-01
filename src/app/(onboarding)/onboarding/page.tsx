import OnboardingForm from './components/OnboardingForm';
import styles from './Onboarding.module.scss';

export default function OnboardingPage() {
  return (
    <div className={styles.onboarding}>
      <header className={styles.onboarding__header}>
        <h1 className={styles.onboarding__title}>가구 설정</h1>
        <p className={styles.onboarding__lead}>
          혼자, 부부, 가족 중 어떻게 쓸지 고르거나 받은 초대 코드로 들어가세요.
        </p>
      </header>

      <OnboardingForm />
    </div>
  );
}
