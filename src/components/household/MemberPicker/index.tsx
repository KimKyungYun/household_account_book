import SegmentedControl from '@/components/common/SegmentedControl';
import Select from '@/components/common/Select';
import type { MeMemberDto } from '@/service/auth/type';

/** 이보다 많으면 버튼 줄 대신 선택 상자로 바꾼다. 폰 폭에서 네 칸부터 이름이 잘린다. */
const SEGMENT_LIMIT = 3;

interface MemberPickerProps {
  name: string;
  label: string;
  members: readonly MeMemberDto[];
  value: string;
  onChange: (memberId: string) => void;
  id?: string;
}

/** '누가 냈나' 고르기. 둘·셋이면 버튼 줄, 넷 이상(가족)이면 선택 상자. */
export function MemberPicker({ name, label, members, value, onChange, id }: MemberPickerProps) {
  const options = members.map((member) => ({ value: member.id, label: member.displayName }));

  if (members.length > SEGMENT_LIMIT) {
    return (
      <Select
        id={id}
        name={name}
        aria-label={label}
        options={options}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <SegmentedControl
      name={name}
      options={options}
      value={value}
      onChange={onChange}
      ariaLabel={label}
    />
  );
}

export default MemberPicker;
