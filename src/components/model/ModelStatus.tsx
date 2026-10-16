import { useEffect, useState } from 'react';
import { resume, showcaseRoles } from '@/data/resume';
import { cx } from '@/lib/cx';
import { groupNo } from '@/lib/groupNo';
import { Icon } from '@/components/Icon';
import { sectionName, usage, type Part } from './parts';
import styles from './ModelStatus.module.css';

interface Props {
  /** The part pointed at or picked; null shows how to read the model. */
  part: Part | null;
  /** A part is picked (not just pointed at), so it can be let go. */
  picked: boolean;
  /** The 3D model is running, so the drag hint applies. */
  live: boolean;
  onOpen: (part: Part) => void;
  onClear: () => void;
}

/** The text for a part: a title, its facts, and where its link goes. */
function describe(part: Part): { title: string; lines: string[]; action: string } {
  const { ui, skills, roles, stats, education } = resume;
  if (part.kind === 'layer') {
    const group = skills[part.index]!;
    const users = showcaseRoles.filter((_, p) => usage[p]![part.index]).map((r) => r.company);
    return {
      title: `${ui.cylinder} ${groupNo(part.index)} · ${group.label}`,
      lines: [group.skills.map((s) => s.name).join(', '), `${ui.firesIn} ${users.join(', ')}`],
      action: ui.openLayer,
    };
  }
  if (part.kind === 'project') {
    const role = showcaseRoles[part.index]!;
    const used = skills.filter((_, l) => usage[part.index]![l]).map((g) => g.label);
    return {
      title: `${ui.configuration} · ${role.company}`,
      lines: [
        `${role.title} · ${role.start}${ui.dateSeparator}${role.end}`,
        role.showcase.impact.join(' · '),
        `${ui.fires.replace('{n}', String(used.length)).replace('{total}', String(skills.length))}: ${used.join(', ')}`,
      ],
      action: ui.openProject,
    };
  }
  const { part: name, section } = sectionName(part.id);
  const title = `${name} · ${section}`;
  if (part.id === 'education')
    return {
      title,
      lines: [`${education.credential}, ${education.school}, ${education.date}`, ui.blockNote],
      action: ui.openEducation,
    };
  if (part.id === 'career') {
    const first = roles[roles.length - 1]!;
    return {
      title,
      lines: [`${roles.length} ${ui.rolesSince} ${first.start}: ${roles.map((r) => r.company).join(', ')}`, ui.crankNote],
      action: ui.openCareer,
    };
  }
  return { title, lines: stats.slice(0, 2).map((s) => `${s.value} ${s.label}`), action: ui.openOverview };
}

/**
 * The model's property panel, as in a CAD program: what is pointed at or picked in the model or
 * the tree, with a link down the page to it; otherwise, how to read the model. It sits under the
 * feature tree beside the model, and under the model on phones.
 */
export function ModelStatus({ part, picked, live, onOpen, onClear }: Props) {
  const { ui } = resume;
  const [touch, setTouch] = useState(false);
  useEffect(() => setTouch(window.matchMedia('(pointer: coarse)').matches), []);
  const card = part ? describe(part) : null;

  return (
    <div className={styles.status}>
      <p className={styles.label}>{ui.properties}</p>
      {card && part ? (
        <>
          <p className={styles.title}>{card.title}</p>
          {/* The link first, so it is in view however long the facts run. */}
          <div className={styles.actions}>
            <button type="button" className={styles.go} onClick={() => onOpen(part)}>
              {card.action}
              <Icon name="arrowDown" />
            </button>
            {picked && (
              <button type="button" className={styles.clear} onClick={onClear}>
                <Icon name="close" />
                <span className="sr-only">{ui.close}</span>
              </button>
            )}
          </div>
          {card.lines.map((line) => (
            <p key={line} className={styles.line}>
              {line}
            </p>
          ))}
        </>
      ) : (
        <>
          <p className={styles.title}>{ui.treeAssembly}</p>
          <p className={styles.line}>{ui.modelLegend}</p>
          {live && <p className={cx(styles.line, styles.hint)}>{touch ? ui.modelHintTouch : ui.modelHint}</p>}
        </>
      )}
    </div>
  );
}
