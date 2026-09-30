import { act, cleanup, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountUp } from '@/hooks/useCountUp';

function Probe({ target }: { target: number }) {
  return <output>{useCountUp(target)}</output>;
}

/** rAF 를 손으로 돌린다. 프레임을 흘려보내야 카운트가 진행된다. */
function flushFrames(count: number, stepMs: number) {
  for (let i = 0; i < count; i += 1) {
    act(() => {
      vi.advanceTimersByTime(stepMs);
    });
  }
}

describe('useCountUp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom 에는 rAF 가 있지만 타이머와 엮이지 않는다. setTimeout 으로 바꿔 흐름을 잡는다.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 16) as unknown as number);
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
  });

  afterEach(() => {
    // vitest 의 globals 가 꺼져 있어 testing-library 가 스스로 정리하지 않는다.
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('시간이 흐르면 목표값에 닿는다', () => {
    render(<Probe target={6_710_000} />);
    flushFrames(60, 20);
    expect(screen.getByRole('status').textContent).toBe('6710000');
  });

  /**
   * Strict Mode 는 effect 를 mount → cleanup → mount 로 두 번 돌린다.
   * '한 번만 센다'를 ref 로 막아 두면 두 번째 mount 에서 rAF 를 걸지 않아
   * 숫자가 0 에 멈춘다 — 화면에 '남은 돈 0원'이 뜬 원인이다.
   */
  it('Strict Mode 에서 두 번 마운트해도 0 에 멈추지 않는다', () => {
    render(
      <StrictMode>
        <Probe target={6_710_000} />
      </StrictMode>,
    );
    flushFrames(60, 20);
    expect(screen.getByRole('status').textContent).toBe('6710000');
  });
});
