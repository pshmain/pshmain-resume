import { resume, type RoleId } from '@/data/resume';
import { Section } from '@/components/Section';
import { Timeline } from '@/components/Timeline';

interface Props {
  selected: RoleId;
  picked: boolean;
  onSelect: (id: RoleId) => void;
  lit: RoleId[] | null;
}

export function Career({ selected, picked, onSelect, lit }: Props) {
  return (
    <Section meta={resume.sections.career}>
      <Timeline selected={selected} picked={picked} onSelect={onSelect} lit={lit} />
    </Section>
  );
}
