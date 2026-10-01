interface LogoProps {
  /**
   * - `wordmark` 글자만. 브랜드 주황으로 그린다. 앱 안(사이드바·로그인)은 모두 이것을 쓴다.
   * - `icon`     주황 둥근 사각형 위에 흰 글자. 메인 로고 — 앱 아이콘·탭 아이콘과 같은 그림이다.
   */
  variant?: 'wordmark' | 'icon';
  /** 그려질 높이(px). wordmark 는 너비가 비율대로 따라간다. CSS 로 높이를 덮어써도 된다. */
  height?: number;
  /** 바깥 링크·제목이 이미 이름을 말하면 true — 화면 판독기가 두 번 읽지 않게 한다. */
  isDecorative?: boolean;
  className?: string;
}

/** 글자 '모아'를 그리는 좌표계. 획 두께(18)만큼 여유를 두었다. */
const GLYPH_BOX = { x: -10, y: -4, width: 211, height: 103 } as const;
const GLYPH_VIEWBOX = `${GLYPH_BOX.x} ${GLYPH_BOX.y} ${GLYPH_BOX.width} ${GLYPH_BOX.height}`;

/**
 * '모아'를 글꼴 없이 도형으로 그린다 — ㅁ 은 지붕을 얹은 집, ㅗ·ㅇ·ㅏ 는 같은 두께의 둥근 획.
 * 글꼴에 기대지 않아 어느 기기에서나 같은 모양이고, 16px 탭 아이콘까지 줄여도 형태가 남는다.
 *
 * ㅗ 가로획은 ㅁ 보다 조금 넓게 뻗어 글자를 받친다. '모'와 '아' 사이는 획 두께만큼 띄워
 * 두 글자를 가르고, '아'의 ㅇ 과 ㅏ 는 바짝 붙여 한 글자로 묶는다.
 * (src/app/icon.svg 와 public/icons 의 PNG 아이콘이 이 좌표를 그대로 옮겨 그린 것이다. 모양을 바꾸면 같이 바꾼다.)
 */
function MoaGlyph({ color }: { color: string }) {
  return (
    <g
      fill="none"
      stroke={color}
      strokeWidth={18}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 모: 지붕 있는 ㅁ, 그 아래 ㅗ */}
      <path d="M10 27 L36 7 L62 27 L62 61 L10 61 Z" />
      <line
        x1="36"
        y1="61"
        x2="36"
        y2="88"
      />
      <line
        x1="1"
        y1="88"
        x2="71"
        y2="88"
      />
      {/* 아: ㅇ 과 ㅏ */}
      <circle
        cx="124"
        cy="47"
        r="22"
      />
      <line
        x1="168"
        y1="7"
        x2="168"
        y2="88"
      />
      <line
        x1="168"
        y1="47"
        x2="188"
        y2="47"
      />
    </g>
  );
}

/**
 * 앱 로고 '모아'.
 *
 * 색은 토큰(`--brand`)을 쓴다. 다크·라이트 모두 로고의 주황은 같은 값이다.
 * (브라우저 탭 아이콘은 CSS 변수를 읽을 수 없어 `src/app/icon.svg` 가 색을 직접 적는다.)
 */
export function Logo({ variant = 'wordmark', height = 28, isDecorative = false, className }: LogoProps) {
  const a11y = isDecorative
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': '모아' };

  if (variant === 'icon') {
    return (
      <svg
        className={className}
        width={height}
        height={height}
        viewBox="0 0 180 180"
        focusable="false"
        {...a11y}
      >
        <rect
          width="180"
          height="180"
          rx="40"
          fill="var(--brand)"
        />
        {/* 글자 덩어리를 사각형 가운데에 놓는다(폭 132 = 사각형의 73%). */}
        <svg
          x="24"
          y="58"
          width="132"
          height="64"
          viewBox={GLYPH_VIEWBOX}
        >
          <MoaGlyph color="#ffffff" />
        </svg>
      </svg>
    );
  }

  return (
    <svg
      className={className}
      height={height}
      width={(height * GLYPH_BOX.width) / GLYPH_BOX.height}
      viewBox={GLYPH_VIEWBOX}
      focusable="false"
      {...a11y}
    >
      <MoaGlyph color="var(--brand)" />
    </svg>
  );
}

export default Logo;
