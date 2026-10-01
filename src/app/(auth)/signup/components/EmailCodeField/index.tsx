'use client';

import { useEffect, useId, useState } from 'react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import styles from './EmailCodeField.module.scss';

interface EmailCodeFieldProps {
  email: string;
  expiresAt: number;
  resendAt: number;
  error: string | null;
  isVerifying: boolean;
  isSending: boolean;
  onVerify: (code: string) => void;
  onResend: () => void;
}

/** 남은 시간을 1초마다 다시 센다. 지금 시각을 상태로 들고 있어야 화면이 따라 줄어든다. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  return now;
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * 메일로 받은 여섯 자리를 넣는 칸. 남은 시간과 [다시 받기]를 함께 둔다.
 * 여섯 자리를 다 넣으면 바로 확인한다 — [확인]을 한 번 더 누르게 하지 않는다.
 */
export default function EmailCodeField({
  email,
  expiresAt,
  resendAt,
  error,
  isVerifying,
  isSending,
  onVerify,
  onResend,
}: EmailCodeFieldProps) {
  const id = useId();
  const errorId = useId();
  const [code, setCode] = useState('');
  const now = useNow();

  const left = expiresAt - now;
  const isExpired = left <= 0;
  const canResend = now >= resendAt;

  const submit = (value: string) => {
    if (value.length === 6 && !isExpired) onVerify(value);
  };

  return (
    <div className={styles.emailcodefield}>
      <p className={styles.emailcodefield__lead}>
        <strong>{email}</strong>로 보낸 숫자 여섯 자리를 입력해 주세요.
      </p>

      <div className={styles.emailcodefield__row}>
        <Input
          id={id}
          aria-label="인증 코드"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={code}
          isInvalid={Boolean(error) || isExpired}
          aria-describedby={error ? errorId : undefined}
          trailing={<span className={styles.emailcodefield__clock}>{isExpired ? '만료' : formatClock(left)}</span>}
          onChange={(event) => {
            // 숫자만 받는다. 메일에서 복사해 붙여도 띄어쓰기·하이픈이 끼지 않게 한다.
            const next = event.target.value.replace(/\D/g, '').slice(0, 6);
            setCode(next);
            submit(next);
          }}
        />
        <Button
          variant="secondary"
          isLoading={isVerifying}
          disabled={code.length !== 6 || isExpired}
          onClick={() => submit(code)}
        >
          확인
        </Button>
      </div>

      {/* 오류 자리는 늘 잡아 둔다 — 틀렸다는 문구가 뜰 때 아래 줄이 밀리지 않게. */}
      <p
        id={errorId}
        className={styles.emailcodefield__error}
        aria-live="polite"
      >
        {isExpired ? '코드가 만료됐어요. 다시 받아 주세요.' : error}
      </p>

      <p className={styles.emailcodefield__help}>
        메일이 안 왔나요? 스팸함도 확인해 주세요.
        <Button
          size="sm"
          variant="ghost"
          disabled={!canResend}
          isLoading={isSending}
          onClick={() => {
            setCode('');
            onResend();
          }}
        >
          {canResend ? '다시 받기' : `다시 받기 (${formatClock(resendAt - now)})`}
        </Button>
      </p>
    </div>
  );
}
