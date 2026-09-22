import Link from 'next/link';
import { PATH } from '@/routes/paths';
import SignupForm from './components/SignupForm';
import styles from './Signup.module.scss';

export default function SignupPage() {
  return (
    <div className={styles.signup}>
      <header className={styles.signup__header}>
        <h1 className={styles.signup__title}>계정 만들기</h1>
        <p className={styles.signup__lead}>먼저 가입한 사람이 가구를 만들고, 배우자는 초대 코드로 합류합니다.</p>
      </header>

      <SignupForm />

      <p className={styles.signup__footer}>
        이미 계정이 있다면 <Link href={PATH.LOGIN}>로그인</Link>
      </p>
    </div>
  );
}
