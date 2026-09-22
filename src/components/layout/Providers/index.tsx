'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { isApiError } from '@/interface/errorType';
import checkApiError from '@/utils/ts/checkApiError';
import type { ReactNode } from 'react';

/**
 * 앱 전체의 'use client' 경계를 이 파일 하나로 모은다.
 *
 * 토스트 정책:
 *  - query 실패는 토스트를 띄우지 않는다. 화면 진입만으로 토스트가 여러 개 터지는 걸 막고,
 *    각 섹션이 ErrorBoundary/EmptyState 로 스스로 알린다.
 *  - mutation 실패만 여기서 한 개 띄운다. 개별 onError 를 주면 그쪽이 이긴다.
 */
function createQueryClient() {
  const queryClient = new QueryClient({
    mutationCache: new MutationCache({
      // 거래 1건 추가가 대시보드 요약·예산 소진율·정산 차액·리포트 피벗을 모두 바꾼다.
      // 도메인별 정밀 무효화를 손으로 관리하면 "예산 화면만 안 갱신되는" 버그가 반드시 난다.
      onSuccess: () => {
        queryClient.invalidateQueries();
      },
      onError: (error) => {
        if (isApiError(error) && error.status === 401) return;
        toast.error(checkApiError(error));
      },
    }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (isApiError(error) && error.status === 401) return false;

          return failureCount < 1;
        },
        staleTime: 1000 * 60,
      },
    },
  });

  return queryClient;
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastContainer
        position="top-center"
        autoClose={2500}
        hideProgressBar
        closeOnClick
        theme="colored"
      />
    </QueryClientProvider>
  );
}
