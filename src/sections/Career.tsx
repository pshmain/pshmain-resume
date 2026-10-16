import { resume, type RoleId } from '@/data/resume';
import { Sheet } from '@/components/drawing/Sheet';
import { Timeline } from '@/components/Timeline';

interface Props {
  selected: RoleId;
  picked: boolean;
  onSelect: (id: RoleId) => void;
  lit: RoleId[] | null;
}

/** Sheet A-201, the schedule: every role on one timeline. */
export function Career({ selected, picked, onSelect, lit }: Props) {
  return (
    <Sheet meta={resume.sections.career}>
      <Timeline selected={selected} picked={picked} onSelect={onSelect} lit={lit} />
    </Sheet>
  );
}
