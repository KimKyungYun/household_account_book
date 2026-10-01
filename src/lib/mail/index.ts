import nodemailer from 'nodemailer';
import { HttpError } from '@/lib/api/httpError';
import { logger } from '@/lib/logger';
import type { Transporter } from 'nodemailer';

/**
 * 메일 발송 창구. 지금은 Gmail SMTP(앱 비밀번호)로 보낸다.
 *
 * 보내는 곳을 바꿀 때(예: 도메인을 사서 Resend 로 옮길 때) 이 파일만 고친다 — 부르는 쪽은
 * `sendMail` 하나만 안다.
 */

const APP_NAME = '모아';

let transporter: Transporter | null = null;

function smtpConfig() {
  const user = process.env.SMTP_USER;
  // 구글이 보여 주는 앱 비밀번호는 네 글자씩 띄어 있다. 그대로 붙여 넣어도 되게 공백을 뺀다.
  const pass = process.env.SMTP_APP_PASSWORD?.replace(/\s/g, '');

  return user && pass ? { user, pass } : null;
}

function getTransporter(config: { user: string; pass: string }): Transporter {
  transporter ??= nodemailer.createTransport({ service: 'gmail', auth: config });

  return transporter;
}

export interface MailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail(input: MailInput): Promise<void> {
  const config = smtpConfig();

  if (!config) {
    // 로컬에서 SMTP 를 안 넣었으면 메일 대신 콘솔에 남겨 흐름을 계속 확인할 수 있게 한다.
    // 운영에서 빠졌으면 조용히 넘어가지 않는다 — 가입이 막히는데 아무도 모르게 된다.
    if (process.env.NODE_ENV !== 'production') {
      logger.warn(`SMTP 설정이 없어 메일 대신 로그로 남긴다 → ${input.to}`, input.text);

      return;
    }
    throw new HttpError('INTERNAL', '지금은 메일을 보낼 수 없어요. 잠시 뒤 다시 해 주세요.');
  }

  try {
    await getTransporter(config).sendMail({
      from: `"${APP_NAME}" <${config.user}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  } catch (error) {
    logger.error('메일 발송 실패', error);
    throw new HttpError('INTERNAL', '메일을 보내지 못했어요. 주소를 확인하고 다시 해 주세요.');
  }
}
