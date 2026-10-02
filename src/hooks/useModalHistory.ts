'use client';

import { useEffect, useRef } from 'react';

/** 모달이 열리면 주소에 붙는 이름. `/transactions?modal=transaction-edit` */
export const MODAL_QUERY = 'modal';

/** 모달이 쌓은 방문 기록에 함께 싣는 표식. depth 는 몇 겹째 모달인지다(페이지 자체는 0). */
interface ModalHistoryState {
  __modalId?: string;
  __modalDepth?: number;
}

function topEntry(): ModalHistoryState {
  return (window.history.state ?? {}) as ModalHistoryState;
}

/*
  같은 틱에 여러 겹이 함께 닫힐 수 있다 — 거래 수정 창 위의 삭제 확인에서 '삭제'를 누르면
  두 창이 한꺼번에 닫힌다. 하나씩 history.back() 을 부르면 두 번째는 아직 맨 위가 아니라서
  건너뛰고, 주소에 `?modal=…` 이 남는다. 닫힌 것들을 모았다가 가장 아래 겹까지 한 번에 되돌린다.
*/
const pendingCloses = new Map<string, number>();
let unwindTimer: number | null = null;

function scheduleUnwind(id: string, depth: number) {
  pendingCloses.set(id, depth);
  if (unwindTimer !== null) return;

  unwindTimer = window.setTimeout(() => {
    unwindTimer = null;
    if (pendingCloses.size === 0) return;

    const target = Math.min(...pendingCloses.values()) - 1;
    pendingCloses.clear();

    // 그 사이 다른 화면으로 옮겨 갔으면 맨 위 기록에 표식이 없다(0). 그때는 건드리지 않는다.
    const top = topEntry().__modalDepth ?? 0;
    if (top > target) window.history.go(target - top);
  }, 0);
}

/** 새로고침하면 열린 모달은 없는데 주소에 `?modal=…` 만 남는다. 처음 한 번 걷어 낸다. */
let didClearStale = false;

function clearStaleModalQuery() {
  if (didClearStale) return;
  didClearStale = true;

  const url = new URL(window.location.href);
  if (!url.searchParams.has(MODAL_QUERY)) return;

  url.searchParams.delete(MODAL_QUERY);
  window.history.replaceState({ __modalDepth: 0 } satisfies ModalHistoryState, '', url);
}

/**
 * 모달을 페이지처럼 방문 기록에 올린다.
 *
 *  - 열리면 `?modal=<urlKey>` 를 붙인 기록을 하나 쌓는다.
 *  - **뒤로가기는 맨 위 모달만 닫는다.** 페이지는 그대로다. 겹친 모달은 한 겹씩 닫힌다.
 *  - 닫기 단추·Esc·바깥 누르기·저장으로 닫히면 쌓았던 기록을 걷어 낸다.
 *    그래서 앞으로가기로 닫힌 모달 주소가 되살아나지 않는다.
 *  - 모달 안의 링크로 다른 화면으로 가면 그 이동은 되돌리지 않는다.
 *
 * Next 의 App Router 는 `history.pushState` 를 가로채 useSearchParams 와 맞춰 준다.
 * 서버를 다시 부르지는 않는다.
 */
export function useModalHistory(isOpen: boolean, urlKey: string, onClose: () => void) {
  const closeRef = useRef(onClose);
  const entryRef = useRef<{ id: string; depth: number } | null>(null);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    clearStaleModalQuery();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let entry = entryRef.current;
    if (entry && pendingCloses.has(entry.id) && topEntry().__modalId === entry.id) {
      // 닫히자마자 같은 틱에 다시 열렸다(Strict 모드의 효과 재실행 등). 쌓아 둔 기록을 그대로 쓴다.
      pendingCloses.delete(entry.id);
    } else {
      const depth = (topEntry().__modalDepth ?? 0) + 1;
      entry = { id: crypto.randomUUID(), depth };
      entryRef.current = entry;

      const url = new URL(window.location.href);
      url.searchParams.set(MODAL_QUERY, urlKey);
      window.history.pushState({ __modalId: entry.id, __modalDepth: depth } satisfies ModalHistoryState, '', url);
    }

    const current = entry;
    let isPopped = false;

    // 뒤로가기로 내 기록보다 아래로 내려왔으면 닫는다. 위 겹이 닫힐 때 아래 겹은 그대로 둔다.
    const handlePopState = () => {
      if ((topEntry().__modalDepth ?? 0) >= current.depth) return;

      isPopped = true;
      entryRef.current = null;
      closeRef.current();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (!isPopped) scheduleUnwind(current.id, current.depth);
    };
  }, [isOpen, urlKey]);
}
