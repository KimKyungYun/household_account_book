'use client';

import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import styles from './ConfirmDialog.module.scss';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** 주소에 붙는 이름(`?modal=`). 화면마다 무엇을 확인하는지 적는다 — 'transaction-delete'. */
  urlKey: string;
  title: string;
  description?: string;
  /** 실행 버튼 문구. 무슨 일이 일어나는지 그대로 적는다 — '확인' 대신 '삭제'. */
  confirmLabel: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

/** 삭제 확인이 여섯 화면에 있다. Modal 위 얇은 래퍼로 문구만 갈아 쓴다. */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  urlKey,
  title,
  description,
  confirmLabel,
  cancelLabel = '취소',
  isDestructive = false,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      urlKey={urlKey}
      title={title}
      description={description}
      footer={
        <div className={styles.confirmdialog__actions}>
          <Button
            variant="secondary"
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    />
  );
}

export default ConfirmDialog;
