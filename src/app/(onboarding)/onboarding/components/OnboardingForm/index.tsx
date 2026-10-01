'use client';

import { useState } from 'react';
import SegmentedControl from '@/components/common/SegmentedControl';
import CreateHouseholdForm from '../CreateHouseholdForm';
import JoinHouseholdForm from '../JoinHouseholdForm';
import styles from './OnboardingForm.module.scss';

type Mode = 'create' | 'join';

const MODE_OPTIONS = [
  { value: 'create', label: '새로 만들기' },
  { value: 'join', label: '초대 코드로 합류' },
] as const;

export default function OnboardingForm() {
  const [mode, setMode] = useState<Mode>('create');

  return (
    <div className={styles.onboardingform}>
      <SegmentedControl
        name="onboarding-mode"
        options={MODE_OPTIONS}
        value={mode}
        onChange={(value) => setMode(value as Mode)}
        ariaLabel="가구 설정 방식"
      />

      {mode === 'create' ? <CreateHouseholdForm /> : <JoinHouseholdForm />}
    </div>
  );
}
