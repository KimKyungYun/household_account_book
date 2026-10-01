interface BrandLogoProps {
  /** `horizontal` 마크 옆에 글자(사이드바), `stacked` 마크 아래 글자(로그인 화면). */
  layout?: 'horizontal' | 'stacked';
  /** 그려질 높이(px). 너비는 비율대로 따라간다. */
  height?: number;
  /** 바깥 링크·제목이 이미 이름을 말하면 true — 화면 판독기가 두 번 읽지 않게 한다. */
  isDecorative?: boolean;
  className?: string;
}

/** 마크(펼친 장부)의 두 면. Logo 와 같은 형태를 같은 좌표계(3 4.1 26 26)로 그린다. */
function Mark({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="3 4.1 26 26"
    >
      <path
        d="M16 10.5 5.5 7.2A1.2 1.2 0 0 0 4 8.3v14.2c0 .5.3 1 .8 1.1L16 27z"
        fill="var(--member-a)"
      />
      <path
        d="m16 10.5 10.5-3.3A1.2 1.2 0 0 1 28 8.3v14.2c0 .5-.3 1-.8 1.1L16 27z"
        fill="var(--member-b)"
      />
    </svg>
  );
}

/**
 * 앱 로고 — 펼친 장부 마크와 '우리집가계부' 한 단어를 한 덩어리로 묶은 것.
 *
 * 글자를 따로 적지 않고 SVG 안에 넣어 마크와 함께 커지고 줄어든다. 두 단어를 띄우지 않고 붙여
 * 한 단어로 만들고, 앞의 '우리집'에만 마크의 두 색을 잇는 그라데이션을 준다 — 색이 바뀌는 자리가
 * 띄어쓰기를 대신한다. 전체 폭은 `textLength` 로 고정해 글꼴이 달라도 마크와의 비율이 같다.
 *
 * 색은 토큰만 쓴다. 다크·라이트에서 마크와 함께 바뀐다.
 */
const WORD_WIDTH = 114;

const LAYOUT = {
  // 마크(30) · 간격(8) · 글자(114)
  horizontal: { viewBox: [0, 0, 152, 32], mark: { x: 0, y: 1, size: 30 }, text: { x: 38, y: 24 } },
  // 마크를 글자 가운데 위에
  stacked: { viewBox: [0, 0, 120, 62], mark: { x: 43, y: 0, size: 34 }, text: { x: 3, y: 60 } },
} as const;

export function BrandLogo({ layout = 'horizontal', height = 32, isDecorative = false, className }: BrandLogoProps) {
  const { viewBox, mark, text } = LAYOUT[layout];
  const [, , width, viewHeight] = viewBox;
  // 그라데이션 id 는 문서에서 겹쳐도 정의가 같아 그대로 쓴다(사이드바·메뉴에 동시에 있어도 같은 그림).
  const gradientId = `brand-logo-gradient-${layout}`;

  return (
    <svg
      className={className}
      height={height}
      width={(height * width) / viewHeight}
      viewBox={viewBox.join(' ')}
      fill="none"
      role={isDecorative ? undefined : 'img'}
      aria-hidden={isDecorative || undefined}
      aria-label={isDecorative ? undefined : '우리집 가계부'}
      focusable="false"
    >
      <defs>
        {/* '우리집' 세 글자 폭(전체의 절반)에만 걸리도록 좌표로 잡는다. */}
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={text.x}
          x2={text.x + WORD_WIDTH / 2}
          y1="0"
          y2="0"
        >
          <stop
            offset="0%"
            stopColor="var(--member-a)"
          />
          <stop
            offset="100%"
            stopColor="var(--member-b)"
          />
        </linearGradient>
      </defs>

      <Mark
        x={mark.x}
        y={mark.y}
        size={mark.size}
      />

      {/* 글꼴은 지정하지 않는다 — 페이지 글꼴(Pretendard)을 그대로 물려받는다. */}
      <text
        x={text.x}
        y={text.y}
        fontSize="20"
        fontWeight="800"
        textLength={WORD_WIDTH}
        lengthAdjust="spacingAndGlyphs"
      >
        <tspan fill={`url(#${gradientId})`}>우리집</tspan>
        <tspan fill="var(--text-primary)">가계부</tspan>
      </text>
    </svg>
  );
}

export default BrandLogo;
