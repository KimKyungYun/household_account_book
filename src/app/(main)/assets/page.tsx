import AssetsTabs from './components/AssetsTabs';
import styles from './Assets.module.scss';

/** 조립만 한다 — 훅을 직접 부르지 않는다. */
export default function AssetsPage() {
  return (
    <div className={styles.assets}>
      <AssetsTabs />
    </div>
  );
}
