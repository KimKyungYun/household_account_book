import type { SVGProps } from 'react';

export type IconName =
  | 'dashboard'
  | 'ledger'
  | 'plus'
  | 'scale'
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
  dashboard: 'M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z',
  ledger: 'M6 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 5h8M8 12h8M8 16h5',
  plus: 'M12 5v14M5 12h14',
  scale: 'M12 4v3m0 0-6 2m6-2 6 2M6 9l-3 6h6L6 9Zm12 0-3 6h6l-3-6ZM9 20h6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  budget: 'M12 3a9 9 0 1 0 9 9h-9V3Z M14 3.5A9 9 0 0 1 20.5 10H14V3.5Z',
  repeat: 'M4 9a5 5 0 0 1 5-5h9m0 0-3-3m3 3-3 3M20 15a5 5 0 0 1-5 5H6m0 0 3 3m-3-3 3-3',
  report: 'M5 20V10m7 10V4m7 16v-7',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8.4-3a8.4 8.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a8.5 8.5 0 0 0-2-1.2L15.6 2h-3.9l-.4 2.5a8.5 8.5 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a8.4 8.4 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a8.5 8.5 0 0 0 2 1.2l.4 2.5h3.9l.4-2.5a8.5 8.5 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2Z',
  category: 'M4 6h16M4 12h10M4 18h6',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-14v2m0 18v-2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  logout: 'M15 17l5-5-5-5m5 5H9m3 8H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6',
  chevronLeft: 'M14 6l-6 6 6 6',
  chevronRight: 'M10 6l6 6-6 6',
  close: 'M6 6l12 12M18 6L6 18',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5.5-1.5L21 21',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 19h14',
  check: 'M5 13l4 4L19 7',
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
      strokeWidth={1.7}
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
