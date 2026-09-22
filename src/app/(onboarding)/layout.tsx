import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PATH } from '@/routes/paths';
import styles from './OnboardingLayout.module.scss';
import type { ReactNode } from 'react';

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect(PATH.LOGIN);
  if (session.user.householdId) redirect(PATH.DASHBOARD);

  return (
    <div className={styles.onboardinglayout}>
      <div className={styles.onboardinglayout__panel}>{children}</div>
    </div>
  );
}
