'use client';

import { useEffect, useState } from 'react';

/** 검색어처럼 타이핑마다 요청을 보내면 안 되는 값에 쓴다. */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);

    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export default useDebounce;
