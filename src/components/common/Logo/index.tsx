interface LogoProps {
  /** 정사각 한 변의 px. 사이드바 32, 로그인 화면 56. */
  size?: number;
  className?: string;
}

/**
 * 앱 마크 — 가운데로 펼친 장부.
 *
 * 왼쪽 면과 오른쪽 면이 가운데 접선에서 만난다. 두 사람이 각자 적지만 장부는 하나라는
 * 것이 이 앱의 전부이고, 그것을 형태로 옮긴 것이다.
 *
 * 색을 하드코딩하지 않고 구성원 색 토큰을 쓴다. 차트·분담 막대·구성원 배지가 모두 같은
 * 두 색을 쓰므로 마크도 같은 값을 가리켜야 테마를 바꿀 때 혼자 어긋나지 않는다.
 * (브라우저 탭 아이콘은 CSS 변수를 읽을 수 없어 `src/app/icon.svg` 가 색을 따로 적는다.)
 *
 * viewBox 가 `0 0 32 32` 가 아니라 형태를 꼭 감싸는 크기다. 32 기준으로 그리면 위아래에
 * 빈 띠가 남아 같은 size 로도 옆 아이콘보다 작아 보인다.
 */
export default function Logo({ size = 32, className }: LogoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="3 4.1 26 26"
      fill="none"
      aria-hidden="true"
      focusable="false"
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
