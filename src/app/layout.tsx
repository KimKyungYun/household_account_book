import { Geist_Mono } from 'next/font/google';
import ThemeScript from '@/components/layout/ThemeScript';
import Providers from '@/components/layout/Providers';
import '@/styles/index.scss';
import 'react-toastify/dist/ReactToastify.css';
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE, APP_TITLE } from '@/lib/brand';
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
  // 공유 이미지(opengraph-image)의 주소를 절대 경로로 만들 기준. 카카오톡 등은 상대 경로를 못 읽는다.
  metadataBase: new URL(process.env.AUTH_URL ?? 'http://localhost:4000'),
  // 탭에는 '모아 - 모으는 재미가 시작되는 곳'. 제목을 따로 정한 화면은 '제목 · 모아' 로 보인다.
  title: { default: APP_TITLE, template: `%s · ${APP_NAME}` },
  applicationName: APP_NAME,
  description: `${APP_TAGLINE}. ${APP_DESCRIPTION}`,
  openGraph: { type: 'website', locale: 'ko_KR', title: APP_TITLE, description: APP_DESCRIPTION, siteName: APP_NAME },
  twitter: { card: 'summary_large_image', title: APP_TITLE, description: APP_DESCRIPTION },
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
