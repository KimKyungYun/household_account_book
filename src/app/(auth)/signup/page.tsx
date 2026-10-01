import Link from 'next/link';
import { PATH } from '@/routes/paths';
import SignupForm from './components/SignupForm';
import styles from './Signup.module.scss';

export default function SignupPage() {
  return (
    <div className={styles.signup}>
      <header className={styles.signup__header}>
        <h1 className={styles.signup__title}>계정 만들기</h1>
        <p className={styles.signup__lead}>가입하고 나면 새 장부를 만들거나, 받은 초대 코드로 함께 쓸 수 있어요.</p>
      </header>

      <SignupForm />

      <p className={styles.signup__footer}>
        이미 계정이 있다면 <Link href={PATH.LOGIN}>로그인</Link>
      </p>
    </div>
  );
}
