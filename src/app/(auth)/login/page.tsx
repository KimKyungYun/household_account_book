import Link from 'next/link';
import BrandLogo from '@/components/common/BrandLogo';
import { PATH } from '@/routes/paths';
import LoginForm from './components/LoginForm';
import styles from './Login.module.scss';

export default function LoginPage() {
  return (
    <div className={styles.login}>
      <header className={styles.login__header}>
        {/* 로고가 곧 제목이다. SVG 의 이름(aria-label)이 h1 의 이름이 된다. */}
        <h1 className={styles.login__title}>
          <BrandLogo
            layout="stacked"
            height={72}
          />
        </h1>
        <p className={styles.login__lead}>혼자 써도, 함께 써도 같은 장부를 씁니다.</p>
      </header>

      <LoginForm />

      <p className={styles.login__footer}>
        아직 계정이 없다면 <Link href={PATH.SIGNUP}>가입하기</Link>
      </p>
    </div>
  );
}
