'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/common/Icon';
import { cn } from '@/utils/ts/cn';
import styles from './Modal.module.scss';
import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'md' | 'lg';
  children?: ReactNode;
  footer?: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/*
  열려 있는 창을 연 순서대로 쌓아 둔다.

  Esc 와 Tab 은 document 에서 받는데, 창이 겹치면 두 리스너가 같은 노드에 나란히 서서
  stopPropagation() 으로는 서로를 막지 못한다 — 거래 편집 창 위에 삭제 확인 창을 띄우고
  Esc 를 누르면 뒤의 편집 창까지 닫혀 적던 값이 날아간다. 맨 위 한 겹만 키를 먹게 한다.
*/
const OPENED: object[] = [];

/**
 * 접근성 모달. 열려 있는 동안 배경 스크롤을 막고 포커스를 안에 가둔다.
 * **600px 이하에서는 아래에서 올라오는 바텀시트로 형태를 바꾼다** — 거래 등록이 이 형태로 뜬다.
 */
export function Modal({ isOpen, onClose, title, description, size = 'md', children, footer }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  /*
    닫기 콜백은 부르는 쪽에서 인라인 함수로 넘기는 일이 흔해 렌더마다 참조가 바뀐다.
    그대로 의존성에 두면 효과가 렌더마다 풀렸다 다시 걸리고, 그때마다 포커스를 첫 조작
    대상으로 되돌린다 — 금액을 한 글자 칠 때마다 커서가 닫기 버튼으로 튄다.
    최신 함수를 상자에 담아 두고 효과는 열고 닫을 때만 돌게 한다.
  */
  const closeRef = useRef(onClose);
  const tokenRef = useRef({});

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    const token = tokenRef.current;
    OPENED.push(token);

    returnFocusRef.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panelRef.current)?.focus();
    }, 40);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (OPENED[OPENED.length - 1] !== token) return;

      if (event.key === 'Escape') {
        event.stopPropagation();
        closeRef.current();

        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null,
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      OPENED.splice(OPENED.indexOf(token), 1);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [isOpen]);

  /*
    닫히면 곧바로 걷어낸다.
    사라지는 연출을 두면 판이 투명해진 채 화면에 남아 아래 본문의 눌림을 가로챈다 —
    한 번 열었다 닫으면 그 뒤로 아무것도 눌리지 않는다. 들어오는 결만 CSS 로 준다.
  */
  if (!isOpen) return null;

  return createPortal(
    <div className={styles.modal}>
      <button
        type="button"
        className={styles.modal__backdrop}
        aria-label="닫기"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        className={cn(styles.modal__panel, styles[`modal__panel--${size}`])}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <header className={styles.modal__header}>
          <div className={styles.modal__heading}>
            <h2
              className={styles.modal__title}
              id={titleId}
            >
              {title}
            </h2>
            {description && (
              <p
                className={styles.modal__description}
                id={descriptionId}
              >
                {description}
              </p>
            )}
          </div>

          <button

            type="button"
            className={styles.modal__close}
            onClick={onClose}
            aria-label="닫기"
          >
            <Icon name="close" />
          </button>
        </header>

        {/* 본문이 없는 확인 대화상자에서 빈 여백이 남지 않게 한다. */}
        {children && <div className={styles.modal__body}>{children}</div>}

        {footer && <footer className={styles.modal__footer}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
