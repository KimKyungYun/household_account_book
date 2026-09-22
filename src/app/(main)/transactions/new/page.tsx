import NewTransaction from './components/NewTransaction';
import styles from './New.module.scss';

/**
 * 전용 등록 화면.
 * 평소 등록은 목록·대시보드에서 뜨는 시트/모달로 하고, 이 경로는
 * 홈 화면에 추가한 '빠른 입력' 바로가기(manifest shortcuts)가 바로 떨어지는 자리다.
 */
export default function NewTransactionPage() {
  return (
    <div className={styles.new}>
      <NewTransaction />
    </div>
  );
}
