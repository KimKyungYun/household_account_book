'use client';

import { useEffect } from 'react';
import { refreshSessionToken } from '@/service/auth';

/**
 * 앱에 들어올 때 세션 토큰을 한 번 갱신한다. 그리는 것은 없다.
 *
 * 실패해도 아무 일도 일어나지 않는다 — 토큰이 갱신되지 않으면 요청마다 가구를
 * 한 번 더 조회할 뿐 동작은 같다.
 */
export default function SessionTokenSync() {
  useEffect(() => {
    refreshSessionToken().catch(() => undefined);
  }, []);

  return null;
}
