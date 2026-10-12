import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MODAL_QUERY, useModalHistory } from '@/hooks/useModalHistory';

function Probe({ isOpen, urlKey, onClose }: { isOpen: boolean; urlKey: string; onClose: () => void }) {
  useModalHistory(isOpen, urlKey, onClose);

  return isOpen ? <div
    role="dialog"
    aria-label={urlKey}
  /> : null;
}

/** 자산 화면처럼 고치기 창을 닫으면서 같은 순간에 삭제 확인 창을 연다. */
function SwapBoard() {
  const [step, setStep] = useState<'none' | 'form' | 'confirm'>('none');

  return (
    <>
      <button
        type="button"
        onClick={() => setStep('form')}
      >
        열기
      </button>
      <button
        type="button"
        onClick={() => setStep('confirm')}
      >
        지우기
      </button>
      {step === 'form' && (
        <Probe
          isOpen
          urlKey="asset-form"
          onClose={() => setStep('none')}
        />
      )}
      <Probe
        isOpen={step === 'confirm'}
        urlKey="asset-delete"
        onClose={() => setStep('none')}
      />
    </>
  );
}

/** 거래 화면처럼 수정 창 위에 삭제 확인 창을 겹치고, 확정하면 두 창을 함께 닫는다. */
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
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
      >
        지우기
      </button>
      <button
        type="button"
        onClick={() => {
          setIsConfirming(false);
          setIsEditing(false);
        }}
      >
        확정
      </button>
      <Probe
        isOpen={isEditing}
        urlKey="transaction-edit"
        onClose={() => setIsEditing(false)}
      />
      <Probe
        isOpen={isConfirming}
        urlKey="transaction-delete"
        onClose={() => setIsConfirming(false)}
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

function modalQuery() {
  return new URL(window.location.href).searchParams.get(MODAL_QUERY);
}

describe('useModalHistory', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/assets');
  });

  afterEach(async () => {
    // vitest 의 globals 가 꺼져 있어 testing-library 가 스스로 정리하지 않는다.
    cleanup();
    // 언마운트로 걸린 기록 되돌리기가 다음 테스트에 새지 않게 흘려보낸다.
    await settle();
  });

  it('창을 닫으면서 다른 창을 열면 새 창이 열린 채로 남는다', async () => {
    render(<SwapBoard />);

    fireEvent.click(screen.getByText('열기'));
    await settle();
    expect(modalQuery()).toBe('asset-form');

    fireEvent.click(screen.getByText('지우기'));
    await settle();

    expect(screen.queryByRole('dialog', { name: 'asset-delete' })).not.toBeNull();
    expect(modalQuery()).toBe('asset-delete');
  });

  it('물려받은 창은 뒤로가기 한 번에 닫히고 페이지로 돌아간다', async () => {
    render(<SwapBoard />);

    fireEvent.click(screen.getByText('열기'));
    await settle();
    fireEvent.click(screen.getByText('지우기'));
    await settle();

    act(() => window.history.back());
    await settle();

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(modalQuery()).toBeNull();
  });

  it('겹친 두 창이 함께 닫히면 페이지 주소까지 되돌린다', async () => {
    render(<StackBoard />);

    fireEvent.click(screen.getByText('열기'));
    await settle();
    fireEvent.click(screen.getByText('지우기'));
    await settle();
    expect(screen.queryAllByRole('dialog')).toHaveLength(2);
    expect(modalQuery()).toBe('transaction-delete');

    fireEvent.click(screen.getByText('확정'));
    await settle();

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(modalQuery()).toBeNull();
  });
});
