import type { MailInput } from '@/lib/mail';

/**
 * 가입 인증 코드 메일. 메일 앱은 CSS 를 거의 못 읽으므로 표와 인라인 스타일로만 그린다.
 * 다크 모드 메일 앱이 색을 뒤집어도 읽히도록 배경과 글자를 같이 정한다.
 */
export function verificationMail(to: string, code: string, minutes: number): MailInput {
  const subject = `[모아] 인증 코드 ${code}`;
  const text = [
    '모아 가입 인증 코드예요.',
    '',
    `인증 코드: ${code}`,
    '',
    `${minutes}분 안에 가입 화면에 입력해 주세요.`,
    '가입하려던 적이 없다면 이 메일은 지우셔도 돼요.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="ko">
<body style="margin:0;padding:0;background:#f4ede4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4ede4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1f1a15;">
          <tr><td style="font-size:22px;font-weight:700;color:#ff8a00;">모아</td></tr>
          <tr><td style="padding-top:20px;font-size:16px;line-height:1.6;">가입 인증 코드예요. 가입 화면에 아래 숫자를 입력해 주세요.</td></tr>
          <tr>
            <td style="padding:24px 0;">
              <div style="font-size:34px;font-weight:700;letter-spacing:10px;text-align:center;background:#fff5eb;border-radius:12px;padding:18px 0;color:#1f1a15;">${code}</div>
            </td>
          </tr>
          <tr><td style="font-size:14px;line-height:1.6;color:#6b625a;">${minutes}분이 지나면 이 코드는 쓸 수 없어요.<br>가입하려던 적이 없다면 이 메일은 지우셔도 돼요.</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { to, subject, text, html };
}
