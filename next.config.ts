import { networkInterfaces } from 'node:os';
import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * 개발 서버를 휴대폰·다른 기기에서 열 때 필요한 오리진 목록.
 *
 * Next 16 은 개발 모드에서 `/_next/*` 자산의 **크로스 오리진 요청을 기본 차단**한다.
 * 이걸 열어 두지 않고 `http://192.168.x.x:4000` 으로 들어오면 JS 청크가 403 이 되고,
 * 화면은 그려지지만 하이드레이션이 안 된다 — 로그인 버튼을 눌러도 React 핸들러가 없어
 * 브라우저가 폼을 GET 으로 그대로 보내고, 비밀번호가 주소창에 박힌다.
 *
 * IP 를 코드에 박지 않고 이 머신의 실제 인터페이스에서 읽는다. Wi-Fi 를 옮겨도 그대로 된다.
 */
function localNetworkOrigins(): string[] {
  const origins = new Set<string>(['localhost', '127.0.0.1']);

  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) origins.add(address.address);
    }
  }

  // 특정 호스트를 더 열어야 하면 환경변수로 (콤마 구분).
  for (const extra of (process.env.DEV_ALLOWED_ORIGINS ?? '').split(',')) {
    const trimmed = extra.trim();
    if (trimmed) origins.add(trimmed);
  }

  return [...origins];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: localNetworkOrigins(),

  // SCSS 안에서 "styles/..." 로 토큰을 가져오기 위한 로드 경로.
  // sass 는 tsconfig 의 paths 를 모르므로 src 를 직접 얹는다.
  sassOptions: {
    loadPaths: [path.join(process.cwd(), 'src')],
  },

  // exceljs 는 node:stream/zlib 에 의존해 번들링하면 깨진다. 서버에서 그대로 require.
  serverExternalPackages: ['exceljs'],

  typescript: { ignoreBuildErrors: false },

  // 개발 배지가 왼쪽 아래에 있으면 사이드바 하단의 분담 저울을 덮는다.
  devIndicators: { position: 'bottom-right' },

  output: 'standalone',
};

export default nextConfig;
