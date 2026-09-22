import { PATH } from '@/routes/paths';
import type { IconName } from '@/components/common/Icon';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

/** 데스크톱 사이드바 — 뎁스 없이 한 단이다. 화면이 일곱 개뿐이라 접을 이유가 없다. */
export const SIDEBAR_NAV: readonly NavItem[] = [
  { href: PATH.DASHBOARD, label: '대시보드', icon: 'dashboard' },
  { href: PATH.TRANSACTIONS, label: '거래', icon: 'ledger' },
  { href: PATH.BUDGETS, label: '예산', icon: 'budget' },
  { href: PATH.RECURRINGS, label: '반복 거래', icon: 'repeat' },
  { href: PATH.SETTLEMENT, label: '분담 정산', icon: 'scale' },
  { href: PATH.REPORTS, label: '리포트', icon: 'report' },
  { href: PATH.CATEGORIES, label: '카테고리', icon: 'category' },
  { href: PATH.SETTINGS, label: '설정', icon: 'settings' },
];

/** 모바일 하단탭 — 엄지로 닿는 자리에 다섯 개까지. 가운데는 등록 버튼이다. */
export const MOBILE_NAV: readonly NavItem[] = [
  { href: PATH.DASHBOARD, label: '대시보드', icon: 'dashboard' },
  { href: PATH.TRANSACTIONS, label: '거래', icon: 'ledger' },
  { href: PATH.SETTLEMENT, label: '정산', icon: 'scale' },
  { href: PATH.SETTINGS, label: '더보기', icon: 'more' },
];

const TITLE_BY_PATH: Record<string, string> = {
  [PATH.DASHBOARD]: '대시보드',
  [PATH.TRANSACTIONS]: '거래',
  [PATH.TRANSACTION_NEW]: '거래 등록',
  [PATH.BUDGETS]: '예산',
  [PATH.RECURRINGS]: '반복 거래',
  [PATH.SETTLEMENT]: '분담 정산',
  [PATH.REPORTS]: '리포트',
  [PATH.CATEGORIES]: '카테고리',
  [PATH.SETTINGS]: '설정',
};

export function titleOfPath(pathname: string): string {
  if (TITLE_BY_PATH[pathname]) return TITLE_BY_PATH[pathname];

  const matched = Object.keys(TITLE_BY_PATH)
    .filter((path) => path !== '/' && pathname.startsWith(path))
    .sort((a, b) => b.length - a.length)[0];

  return matched ? TITLE_BY_PATH[matched] ?? '우리집 가계부' : '우리집 가계부';
}
