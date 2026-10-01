import { categoryEmoji } from '@/utils/ts/categoryEmoji';
import { cn } from '@/utils/ts/cn';
import styles from './EmojiPicker.module.scss';

/**
 * 고를 수 있는 아이콘. 가계부에서 자주 나뉘는 쓰임새를 고루 담는다.
 * 키보드의 이모지 창을 열게 하지 않는다 — 기기마다 창이 달라 찾다가 입력이 끊긴다.
 */
const EMOJIS = [
  '🍚', '🍜', '🍔', '☕', '🍺', '🛒',
  '🚗', '🚌', '⛽', '✈️', '🏠', '💡',
  '📱', '💊', '🏥', '💪', '📚', '🎓',
  '🎬', '🎮', '🎵', '⚽', '🏖️', '👕',
  '💄', '🎁', '💐', '🧺', '🐶', '👶',
  '👛', '💳', '🧾', '💼', '🏪', '📈',
  '💰', '🐷', '🏦', '🔁', '🎯', '⭐',
] as const;

interface EmojiPickerProps {
  /** 고른 이모지. null 이면 이름으로 자동으로 고른다. */
  value: string | null;
  onChange: (emoji: string | null) => void;
  /** 자동일 때 무엇이 될지 보여 주려고 받는다. */
  name: string;
  id?: string;
  describedBy?: string;
}

/** 대분류 아이콘 고르기. 첫 칸은 「자동」 — 이름으로 골라 주는 그림이 그대로 미리 보인다. */
export default function EmojiPicker({ value, onChange, name, id, describedBy }: EmojiPickerProps) {
  const auto = categoryEmoji(name.trim() || '분류');
  // 예전에 목록 밖의 이모지를 저장해 두었으면 그것도 칸으로 보여 줘야 지금 무엇인지 안다.
  const options: readonly string[] = value && !(EMOJIS as readonly string[]).includes(value) ? [value, ...EMOJIS] : EMOJIS;

  return (
    <div
      className={styles.emojipicker}
      id={id}
      role="radiogroup"
      aria-label="분류 아이콘"
      aria-describedby={describedBy}
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        className={cn(styles.emojipicker__option, styles['emojipicker__option--auto'], {
          [styles['emojipicker__option--selected']]: value === null,
        })}
        onClick={() => onChange(null)}
      >
        <span aria-hidden="true">{auto}</span>
        <span className={styles.emojipicker__autolabel}>자동</span>
      </button>

      {options.map((emoji) => (
        <button
          key={emoji}
          type="button"
          role="radio"
          aria-checked={value === emoji}
          aria-label={emoji}
          className={cn(styles.emojipicker__option, {
            [styles['emojipicker__option--selected']]: value === emoji,
          })}
          onClick={() => onChange(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
