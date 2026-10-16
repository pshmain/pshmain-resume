import { useEffect, useState, type FocusEvent, type MouseEvent, type PointerEvent, type ReactNode, type SyntheticEvent } from 'react';
import { resume, showcaseRoles } from '@/data/resume';
import { cx } from '@/lib/cx';
import { groupNo } from '@/lib/groupNo';
import { panelId } from '@/sections/Work';
import { layerParts, projectParts, samePart, sectionName, sectionParts, usage, type Part, type SectionId } from './parts';
import styles from './FeatureTree.module.css';

interface Props {
  /** The part pointed at in the model or here; its row lights. */
  active: Part | null;
  onHover: (part: Part | null) => void;
  onOpen: (part: Part) => void;
}

type Branch = 'root' | 'configs' | 'cylinders' | 'hardware';
/* Hardware starts folded: the model's callouts name it, and the property panel needs the room. */
const OPEN: Record<Branch, boolean> = { root: true, configs: true, cylinders: true, hardware: false };

/**
 * The engine's feature tree, as in a CAD program: the assembly, with its configurations
 * (projects), cylinders (skill layers) and hardware (sections of the page), each branch
 * expandable and collapsible. Every leaf is a real link to its part of the page, so this is how
 * keyboards, screen readers, and visitors who would rather not turn the model get around.
 * Without JavaScript the links are plain anchors and the branches still fold. Pointing at a row
 * lights its part in the model, and pointing at a part lights its row.
 */
export function FeatureTree({ active, onHover, onOpen }: Props) {
  const { ui, skills } = resume;
  // Phones fold the cylinders too, once loaded (the server cannot know the screen).
  const [open, setOpen] = useState(OPEN);
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setOpen({ ...OPEN, cylinders: false });
  }, []);
  const toggle = (branch: Branch) => (e: SyntheticEvent<HTMLDetailsElement>) => {
    const next = e.currentTarget.open;
    setOpen((o) => (o[branch] === next ? o : { ...o, [branch]: next }));
  };

  const bind = (part: Part) => ({
    // Mouse only: a tap fires pointerenter too, which would leave a highlight stuck on touch screens.
    onPointerEnter: (e: PointerEvent<HTMLAnchorElement>) => {
      if (e.pointerType === 'mouse') onHover(part);
    },
    onPointerLeave: () => onHover(null),
    // Keyboard focus previews; a tap's focus must not, or the property panel above the tree on
    // phones grows mid-tap and moves the row out from under the finger.
    onFocus: (e: FocusEvent<HTMLAnchorElement>) => {
      if (e.currentTarget.matches(':focus-visible')) onHover(part);
    },
    onBlur: () => onHover(null),
    onClick: (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      onOpen(part);
    },
  });

  /** A row: its key (a number or monogram; none draws a part glyph), name, and a note. */
  const leaf = (part: Part, href: string, key: string | null, name: string, meta?: string) => (
    <li key={name}>
      <a href={href} className={cx(styles.leaf, samePart(active, part) && styles.active)} {...bind(part)}>
        <span className={cx(styles.key, !key && styles.partGlyph)} aria-hidden="true">
          {key}
        </span>
        <span className={styles.name}>{name}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
      </a>
    </li>
  );

  const branch = (id: Branch, label: string, count: number, children: ReactNode) => (
    <details className={styles.branch} open={open[id]} onToggle={toggle(id)}>
      <summary className={styles.summary}>
        <span className={styles.caret} aria-hidden="true" />
        {label}{' '}
        <span className={styles.count}>{count}</span>
      </summary>
      <ul className={styles.leaves} role="list">
        {children}
      </ul>
    </details>
  );

  return (
    <nav className={styles.tree} aria-label={ui.featureTree}>
      <p className={styles.title} aria-hidden="true">
        {ui.featureTree}
      </p>
      <details className={styles.root} open={open.root} onToggle={toggle('root')}>
        <summary className={styles.summary}>
          <span className={styles.caret} aria-hidden="true" />
          <span className={styles.rootGlyph} aria-hidden="true" />
          {ui.treeAssembly}
        </summary>
        <div className={styles.branches}>
          {branch(
            'configs',
            ui.treeConfigs,
            showcaseRoles.length,
            showcaseRoles.map((role, i) => {
              const fired = usage[i]!.filter(Boolean).length;
              return leaf(projectParts[i]!, `#${panelId(role.id)}`, role.showcase.monogram, role.company, `${fired}/${skills.length}`);
            }),
          )}
          {branch(
            'cylinders',
            ui.treeCylinders,
            skills.length,
            skills.map((group, i) => leaf(layerParts[i]!, `#layer-${groupNo(i)}`, groupNo(i), group.label)),
          )}
          {branch(
            'hardware',
            ui.treeHardware,
            sectionParts.length,
            sectionParts.map((part) => {
              const id = (part as { id: SectionId }).id;
              const { part: name, section } = sectionName(id);
              return leaf(part, `#${resume.sections[id].id}`, null, name, section);
            }),
          )}
        </div>
      </details>
    </nav>
  );
}
