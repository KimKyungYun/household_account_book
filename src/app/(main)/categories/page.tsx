import CategoryBoard from './components/CategoryBoard';
import styles from './Categories.module.scss';

export default function CategoriesPage() {
  return (
    <div className={styles.categories}>
      <CategoryBoard />
    </div>
  );
}
