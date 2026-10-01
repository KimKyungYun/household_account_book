import { cn } from '@/utils/ts/cn';
import styles from './Table.module.scss';
import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
  /** 태블릿 이하에서 숨길 열. 좁은 화면에서 먼저 버릴 정보를 여기로 표시한다. */
  hideOnTablet?: boolean;
  render: (row: T, index: number) => ReactNode;
}

interface TableProps<T> {
  /** 스크린리더용 표 설명. 표가 무엇의 목록인지 밝힌다. */
  caption: string;
  columns: readonly Column<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  getRowClassName?: (row: T) => string | undefined;
  /**
   * 줄을 눌러 들어가게 한다.
   * 마우스 편의일 뿐이라 이것만 두지 않는다 — 키보드로도 닿아야 하므로 같은 일을 하는
   * 버튼을 행 안에 함께 남긴다.
   */
  onRowClick?: (row: T) => void;
  emptyContent?: ReactNode;
  className?: string;
}

export function Table<T>({
  caption,
  columns,
  rows,
  getRowKey,
  getRowClassName,
  onRowClick,
  emptyContent,
  className,
}: TableProps<T>) {
  return (
    <div className={cn(styles.table, className)}>
      <table className={styles.table__grid}>
        <caption className={styles.table__caption}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  styles.table__th,
                  styles[`table__th--${column.align ?? 'left'}`],
                  { [styles['table__th--hide-tablet']]: Boolean(column.hideOnTablet) },
                )}
                style={column.width ? { width: column.width } : undefined}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                className={styles.table__empty}
                colSpan={columns.length}
              >
                {emptyContent ?? '내역이 없어요.'}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={getRowKey(row)}
                className={cn(
                  styles.table__tr,
                  { [styles['table__tr--clickable']]: Boolean(onRowClick) },
                  getRowClassName?.(row),
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      styles.table__td,
                      styles[`table__td--${column.align ?? 'left'}`],
                      { [styles['table__td--hide-tablet']]: Boolean(column.hideOnTablet) },
                    )}
                  >
                    {column.render(row, index)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
