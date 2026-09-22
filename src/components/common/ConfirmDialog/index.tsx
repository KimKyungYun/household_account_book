'use client';

import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import styles from './ConfirmDialog.module.scss';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
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
