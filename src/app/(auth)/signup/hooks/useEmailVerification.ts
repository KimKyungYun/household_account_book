'use client';

import { useState } from 'react';
import { isApiError } from '@/interface/errorType';
import { requestEmailCode, verifyEmailCode } from '@/service/auth';
import checkApiError from '@/utils/ts/checkApiError';

interface SendResult {
  ok: boolean;
  /** 실패했을 때 이메일 칸에 꽂을 문구. */
  emailError?: string;
}

/**
 * 가입 전 이메일 인증의 상태 한 벌 — 코드를 보낸 주소, 만료·재발송 시각, 인증을 마친 주소.
 *
 * 전역 MutationCache 를 거치지 않으려고 useMutation 을 쓰지 않는다. 그쪽은 실패마다 토스트를
 * 띄우는데, 여기 오류(코드가 틀림, 1분 뒤 다시)는 칸 바로 아래에 적는 편이 읽힌다.
 */
export function useEmailVerification() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const send = async (email: string): Promise<SendResult> => {
    setIsSending(true);
    try {
      const result = await requestEmailCode({ email });
      setSentTo(email);
      setExpiresAt(new Date(result.expiresAt).getTime());
      setResendAt(Date.now() + result.resendAfterSeconds * 1000);
      setCodeError(null);

      return { ok: true };
    } catch (error) {
      return { ok: false, emailError: isApiError(error) ? error.fieldErrors?.email ?? error.message : checkApiError(error) };
    } finally {
      setIsSending(false);
    }
  };

  const verify = async (code: string) => {
    if (!sentTo) return;
    setIsVerifying(true);
    try {
      await verifyEmailCode({ email: sentTo, code });
      setVerifiedEmail(sentTo);
      setCodeError(null);
    } catch (error) {
      setCodeError(isApiError(error) ? error.fieldErrors?.code ?? error.message : checkApiError(error));
    } finally {
      setIsVerifying(false);
    }
  };

  /** 이메일을 바꾸려면 처음부터 다시 한다. */
  const reset = () => {
    setSentTo(null);
    setExpiresAt(null);
    setResendAt(null);
    setVerifiedEmail(null);
    setCodeError(null);
  };

  return {
    sentTo,
    expiresAt,
    resendAt,
    verifiedEmail,
    codeError,
    isSending,
    isVerifying,
    send,
    verify,
    reset,
  };
}

export type EmailVerification = ReturnType<typeof useEmailVerification>;
