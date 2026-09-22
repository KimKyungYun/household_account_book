import { Geist_Mono } from 'next/font/google';
import ThemeScript from '@/components/layout/ThemeScript';
import Providers from '@/components/layout/Providers';
import '@/styles/index.scss';
import 'react-toastify/dist/ReactToastify.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

/**
 * 금액 전용 서체.
 *
 * 가계부에서 읽는 것은 문장이 아니라 숫자다. 자릿수가 픽셀 단위로 맞아야 표와 카드에서
 * 금액을 눈으로 비교할 수 있어 고정폭 서체를 쓴다. 한글에는 절대 쓰지 않는다.
 *
 * Geist Mono 는 숫자의 뼈대가 또렷하고 장식이 없어 큰 금액을 세워도 산만하지 않다.
 */
const numericFont = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-numeric',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '우리집 가계부',
  description: '부부가 함께 쓰는 수입·지출 기록',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ko"
      className={numericFont.variable}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
