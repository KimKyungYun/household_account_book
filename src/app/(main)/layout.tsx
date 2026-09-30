import { redirect } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { auth } from '@/lib/auth';
import { ensureAutoEntriesUpToDate } from '@/lib/repository/autoEntry';
import { logger } from '@/lib/logger';
import { PATH } from '@/routes/paths';
import type { ReactNode } from 'react';

/**
 * 인증 정본. 서버에서 막으면 미인증 사용자에게 보호 화면의 JS 청크와 데이터가
 * 아예 전송되지 않는다 — 클라이언트 가드로는 못 하는 일이다.
 *
 * 반복 거래·대출 상환 백필도 여기서 돈다. 별도 스케줄러 없이 앱에 들어올 때 지난 회차를 채우고,
 * 하루 한 번으로 스로틀한다. 실패해도 화면은 열려야 하므로 예외를 삼킨다 —
 * 다음 진입에서 다시 시도된다.
 */
export default async function MainLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect(PATH.LOGIN);
  if (!session.user.householdId) redirect(PATH.ONBOARDING);

  try {
    await ensureAutoEntriesUpToDate({ householdId: session.user.householdId, userId: session.user.id });
  } catch (error) {
    logger.error('자동 거래 백필 실패', error);
  }

  return <AppShell>{children}</AppShell>;
}
