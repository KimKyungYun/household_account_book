import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import Modal from '@/components/common/Modal';

/** 수정 창 위에 삭제 확인 창을 겹치고, 확정하면 두 창을 함께 닫는다. */
function StackBoard() {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
      >
        열기
      </button>
      <Modal
        urlKey="transaction-edit"
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="거래 수정"
        footer={
          <button
            type="button"
            onClick={() => setIsConfirming(true)}
          >
            지우기
          </button>
        }
      />
      <Modal
        urlKey="transaction-delete"
        isOpen={isConfirming}
        onClose={() => setIsConfirming(false)}
        title="지울까요?"
        footer={
          <button
            type="button"
            onClick={() => {
              setIsConfirming(false);
              setIsEditing(false);
            }}
          >
            확정
          </button>
        }
      />
    </>
  );
}

/** 방문 기록 이동(history.go)은 비동기라 popstate 가 올 때까지 기다린다. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

describe('Modal', () => {
  afterEach(async () => {
    // vitest 의 globals 가 꺼져 있어 testing-library 가 스스로 정리하지 않는다.
    cleanup();
    await settle();
  });

  it('겹친 두 창이 함께 닫히면 배경 스크롤 잠금이 풀린다', async () => {
    render(<StackBoard />);

    fireEvent.click(screen.getByText('열기'));
    await settle();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(screen.getByText('지우기'));
    await settle();
    expect(screen.queryAllByRole('dialog')).toHaveLength(2);

    fireEvent.click(screen.getByText('확정'));
    await settle();

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });
});
