import { ImageResponse } from 'next/og';
import { APP_TITLE, BRAND_ORANGE } from '@/lib/brand';

/*
  카카오톡·메신저에 링크를 붙였을 때 뜨는 미리보기 그림. 브랜드 주황 바탕에 흰 '모아' 로고 하나.

  로고는 components/common/Logo 의 글자 좌표를 그대로 옮겨 그린다(글꼴 없이 도형으로 그린 글자라
  이미지 생성기에 글꼴을 싣지 않아도 된다). 로고 모양을 바꾸면 여기도 같이 바꾼다 —
  src/app/icon.svg, public/icons 의 PNG 와 같은 사정이다.
*/

export const alt = APP_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const GLYPH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -4 211 103">
  <g fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 27 L36 7 L62 27 L62 61 L10 61 Z"/>
    <line x1="36" y1="61" x2="36" y2="88"/>
    <line x1="1" y1="88" x2="71" y2="88"/>
    <circle cx="124" cy="47" r="22"/>
    <line x1="168" y1="7" x2="168" y2="88"/>
    <line x1="168" y1="47" x2="188" y2="47"/>
  </g>
</svg>`;

const GLYPH_SRC = `data:image/svg+xml;base64,${Buffer.from(GLYPH_SVG).toString('base64')}`;

/** 로고 높이. 메신저가 그림을 작게 줄여도 글자가 읽히도록 크게 둔다. */
const GLYPH_HEIGHT = 240;
const GLYPH_WIDTH = Math.round((GLYPH_HEIGHT * 211) / 103);

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BRAND_ORANGE,
        }}
      >
        <img
          src={GLYPH_SRC}
          width={GLYPH_WIDTH}
          height={GLYPH_HEIGHT}
          alt=""
        />
      </div>
    ),
    size,
  );
}
