'use client';

import { useQuery } from '@tanstack/react-query';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getMe } from '@/service/auth';

/** 가구 프로필. 화면 여러 곳이 구성원 색·표시명을 쓰므로 한 쿼리로 모은다. */
export function useMe() {
  return useQuery({
    queryKey: QUERY_KEY.ME.INFO(),
    queryFn: getMe,
    staleTime: 1000 * 60 * 5,
  });
}
