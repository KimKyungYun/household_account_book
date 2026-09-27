import type { SVGProps } from 'react';

export type IconName =
  | 'dashboard'
  | 'ledger'
  | 'plus'
  | 'wallet'
  | 'more'
  | 'budget'
  | 'repeat'
  | 'report'
  | 'settings'
  | 'category'
  | 'sun'
  | 'moon'
  | 'logout'
  | 'chevronLeft'
  | 'chevronRight'
  | 'close'
  | 'search'
  | 'download'
  | 'check';

/** 24×24 스트로크 아이콘. 굵기·라운드를 한 벌로 맞춰 화면마다 톤이 갈리지 않게 한다. */
const PATHS: Record<IconName, string> = {
  // 24×24, 스트로크 하나로 그린다. 작은 크기에서 뭉개지지 않게 형태를 단순하게 유지한다.
  dashboard: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v3A1.5 1.5 0 0 1 9.5 10h-4A1.5 1.5 0 0 1 4 8.5v-3Zm0 9A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4Zm9 1A1.5 1.5 0 0 1 14.5 14h4a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-3Zm0-10A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4A1.5 1.5 0 0 1 18.5 11h-4A1.5 1.5 0 0 1 13 9.5v-4Z',
  // 거래 — 영수증
  ledger: 'M6 3.5h12a1 1 0 0 1 1 1v15.2a.3.3 0 0 1-.46.26L16 18.5l-2.5 1.5L11 18.5 8.5 20 6 18.5l-1.54.96A.3.3 0 0 1 4 19.2V4.5a1 1 0 0 1 1-1h1ZM8 8h8M8 12h5',
  plus: 'M12 5.5v13M5.5 12h13',
  // 자산 — 지갑. 오른쪽의 짧은 획이 카드가 드나드는 자리다.
  wallet: 'M4 8.5A2 2 0 0 1 6 6.5h11A2 2 0 0 1 19 8.5v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9Zm0 0V6.8a1.3 1.3 0 0 1 1.05-1.28l9.2-1.5M15 13.5h2.5',
  // 분담 — 하나를 둘로 가른 막대
  more: 'M5.5 12h.01M12 12h.01M18.5 12h.01',
  // 예산 — 부채꼴 하나만 있는 원
  budget: 'M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12V3.5Z',
  repeat: 'M4.5 9.5A5 5 0 0 1 9.5 4.5h9m0 0-3-3m3 3-3 3M19.5 14.5a5 5 0 0 1-5 5h-9m0 0 3 3m-3-3 3-3',
  report: 'M5 19.5V13m6.5 6.5V6m6.5 13.5v-9',
  // 설정 — 톱니바퀴 대신 슬라이더. 작은 크기에서 훨씬 또렷하다.
  settings: 'M4 7h9m3 0h4M4 17h4m3 0h9M16 4.5v5M8 14.5v5',
  // 카테고리 — 태그
  category: 'M4 11.2V5a1 1 0 0 1 1-1h6.2a1 1 0 0 1 .7.3l7.3 7.3a1 1 0 0 1 0 1.4l-6.2 6.2a1 1 0 0 1-1.4 0L4.3 11.9a1 1 0 0 1-.3-.7ZM8 8h.01',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-13v1.5m0 15V21M3 12h1.5m15 0H21M5.6 5.6l1.1 1.1m10.6 10.6 1.1 1.1m0-12.8-1.1 1.1M6.7 17.3l-1.1 1.1',
  moon: 'M20 14.2A8.4 8.4 0 0 1 9.8 4 8.5 8.5 0 1 0 20 14.2Z',
  logout: 'M15 16.5l4.5-4.5L15 7.5M19.5 12H9M12 20H6.5a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 6.5 4H12',
  chevronLeft: 'M14.5 6.5 9 12l5.5 5.5',
  chevronRight: 'M9.5 6.5 15 12l-5.5 5.5',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  search: 'M11 17.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm4.8-1.7L20 20',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M4.5 19.5h15',
  check: 'M5.5 12.5 10 17 18.5 7.5',
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export default Icon;
