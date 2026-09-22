import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PATH } from '@/routes/paths';

/** 진입점은 판단만 한다 — 로그인 여부와 가구 여부에 따라 갈 곳이 정해져 있다. */
export default async function RootPage() {
  const session = await auth();
  if (!session?.user?.id) redirect(PATH.LOGIN);

  redirect(session.user.householdId ? PATH.DASHBOARD : PATH.ONBOARDING);
}
