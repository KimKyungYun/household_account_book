import Card from '@/components/common/Card';
import Skeleton, { SkeletonRows } from '@/components/common/Skeleton';
import styles from './Loading.module.scss';

/**
 * 메뉴를 눌러 다른 화면으로 옮겨 가는 동안의 자리.
 *
 * 레이아웃이 세션을 읽으므로 모든 화면이 요청 때 서버에서 그려진다. 이 파일이 없으면
 * 서버가 답할 때까지(특히 서버가 막 깨어날 때) 누른 메뉴가 반응하지 않는 것처럼 보인다.
 * 있으면 누르는 즉시 셸은 그대로 두고 본문만 이 윤곽으로 바뀐다.
 */
export default function MainLoading() {
  return (
    <div className={styles.loading}>
      <Card tone="feature">
        <div
          className={styles.loading__hero}
          role="status"
          aria-label="화면을 불러오는 중"
        >
          <Skeleton
            width={120}
            height={16}
          />
          <Skeleton
            width={220}
            height={44}
          />
        </div>
      </Card>
      <Card isFlush>
        <SkeletonRows count={5} />
      </Card>
    </div>
  );
}
