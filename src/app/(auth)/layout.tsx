import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PATH } from '@/routes/paths';
import styles from './AuthLayout.module.scss';
import type { ReactNode } from 'react';

/** 이미 로그인했으면 인증 화면을 보여줄 이유가 없다. 서버에서 먼저 돌려보낸다. */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (session?.user?.id) redirect(session.user.householdId ? PATH.DASHBOARD : PATH.ONBOARDING);

  return (
    <div className={styles.authlayout}>
      <div className={styles.authlayout__panel}>{children}</div>
    </div>
  );
}
