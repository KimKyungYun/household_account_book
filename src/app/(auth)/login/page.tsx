import Link from 'next/link';
import { PATH } from '@/routes/paths';
import LoginForm from './components/LoginForm';
import styles from './Login.module.scss';

export default function LoginPage() {
  return (
    <div className={styles.login}>
      <header className={styles.login__header}>
        <span
          className={styles.login__mark}
          aria-hidden="true"
        >
          가
        </span>
        <h1 className={styles.login__title}>우리집 가계부</h1>
        <p className={styles.login__lead}>두 사람이 같은 장부를 씁니다.</p>
      </header>

      <LoginForm />

      <p className={styles.login__footer}>
        아직 계정이 없다면 <Link href={PATH.SIGNUP}>가입하기</Link>
      </p>
    </div>
  );
}
