/**
 * 앱 이름과 캐치프레이즈. 탭 제목·로그인 화면·메일·설치 정보·공유 이미지가 모두 여기서 가져간다 —
 * 문구를 바꿀 때 한 곳만 고친다. (public/manifest.webmanifest 는 정적 파일이라 직접 적는다.)
 */
export const APP_NAME = '모아';

/** 이름을 뺀 한 마디. 탭 제목처럼 이름이 이미 앞에 붙는 자리에 쓴다. */
export const APP_SLOGAN = '모으는 재미가 시작되는 곳';

/** 캐치프레이즈 — 로그인 화면·메일처럼 문장으로 읽히는 자리. */
export const APP_TAGLINE = `${APP_SLOGAN}, ${APP_NAME}`;

/** 브라우저 탭·공유 미리보기 제목. 이름이 먼저 와야 탭이 좁아져도 무엇인지 알 수 있다. */
export const APP_TITLE = `${APP_NAME} - ${APP_SLOGAN}`;

/** 무엇을 하는 앱인지 한 줄. 검색 결과·공유 미리보기의 설명에 쓴다. */
export const APP_DESCRIPTION = '혼자, 부부, 가족이 함께 쓰는 가계부';

/** 브랜드 주황(로고 바탕). 공유 이미지처럼 CSS 변수를 읽을 수 없는 자리에 쓴다. */
export const BRAND_ORANGE = '#ff8a00';
