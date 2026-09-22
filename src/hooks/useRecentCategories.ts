'use client';

import { useCallback, useState } from 'react';

const STORAGE_KEY = 'hab-recent-categories';
const LIMIT = 8;

function read(): string[] {
  // 이 기기에서 방금 쓴 것을 앞에 두는 편의 기능이다. 없어도 화면은 정상 동작한다.
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/** 최근 고른 카테고리. 기기 안에만 남고 다른 사람에게 가지 않는다. */
export function useRecentCategories() {
  const [recentIds, setRecentIds] = useState<string[]>(() => (typeof window === 'undefined' ? [] : read()));

  const remember = useCallback((categoryId: string) => {
    setRecentIds((previous) => {
      const next = [categoryId, ...previous.filter((id) => id !== categoryId)].slice(0, LIMIT);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 시크릿 모드·저장 차단에서는 조용히 넘어간다.
      }

      return next;
    });
  }, []);

  return { recentIds, remember };
}
