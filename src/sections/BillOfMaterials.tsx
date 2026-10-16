import type { FocusEvent, PointerEvent } from 'react';
import { resume, showcaseRoles, type RoleId } from '@/data/resume';
import { cx } from '@/lib/cx';
import { revealStep } from '@/lib/motion';
import { Sheet } from '@/components/drawing/Sheet';
import { groupNo } from '@/lib/groupNo';
import styles from './BillOfMaterials.module.css';

/** What is in focus across the page: one part (skill), or one layer (skill group). */
export type Focus = { kind: 'skill'; name: string } | { kind: 'layer'; label: string } | null;

interface Props {
  focus: Focus;
  pinned: Focus;
  /** The group lit by the focus: the layer itself, or the group of the focused part. */
  activeGroup: string | null;
  lit: RoleId[] | null;
  onPreview: (focus: Focus) => void;
  onPin: (focus: Focus) => void;
}

const same = (a: Focus, b: Focus): boolean =>
  !!a && !!b && a.kind === b.kind && (a.kind === 'skill' ? a.name === (b as typeof a).name : a.label === (b as typeof a).label);

/**
 * Sheet A-301, the bill of materials: one parts list per skill layer, numbered to match its
 * cylinder in the cover's engine, with a used-in column per project. Hovering or focusing a part
 * or a layer previews it; clicking pins it. The focus lights the matching cylinder and dims
 * the project tabs and schedule bars that did not use it.
 */
export function BillOfMaterials({ focus, pinned, activeGroup, lit, onPreview, onPin }: Props) {
  const { sections, skills, ui } = resume;
  const total = skills.reduce((n, g) => n + g.skills.length, 0);
  const usedAt = lit ? showcaseRoles.filter((r) => lit.includes(r.id)).map((r) => r.company) : [];

  // Mouse only: a tap fires pointerenter too, which would leave a preview stuck on touch screens.
  const hover = (next: Focus) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse') onPreview(next);
  };
  // Keyboard focus previews; a tap's focus must not, or the status line above can rewrap mid-tap
  // and move the button out from under the finger.
  const keyFocus = (next: Focus) => (e: FocusEvent<HTMLButtonElement>) => {
    if (e.currentTarget.matches(':focus-visible')) onPreview(next);
  };
  const toggle = (next: Focus): void => {
    onPreview(null);
    onPin(same(pinned, next) ? null : next);
  };

  return (
    <Sheet meta={sections.skills} note={`${total} ${ui.parts}`}>
      <p className={styles.status} aria-live="polite">
        {focus ? (
          <>
            <span className={styles.statusName}>{focus.kind === 'skill' ? focus.name : focus.label}</span>
            {ui.roleSeparator}
            {usedAt.length > 0 ? `${ui.usedAt} ${usedAt.join(', ')}.` : ''}
          </>
        ) : (
          ui.skillHint
        )}
      </p>
      <p className={styles.legend} aria-hidden="true">
        {showcaseRoles.map((r) => (
          <span key={r.id}>
            <span className={styles.legendKey}>{r.showcase.monogram}</span> {r.company}
          </span>
        ))}
        <span>● {ui.used}</span>
        <span>○ {ui.notUsed}</span>
      </p>

      <div className={styles.groups}>
        {skills.map((group, gi) => {
          const headId = `bom-${gi}`;
          const layer: Focus = { kind: 'layer', label: group.label };
          return (
            <div
              key={group.label}
              id={`layer-${groupNo(gi)}`}
              className={cx(styles.group, activeGroup === group.label && styles.activeGroup)}
              data-reveal
              style={revealStep(gi)}
            >
              <button
                type="button"
                id={headId}
                className={styles.head}
                aria-pressed={same(pinned, layer)}
                onClick={() => toggle(layer)}
                onPointerEnter={hover(layer)}
                onPointerLeave={() => onPreview(null)}
                onFocus={keyFocus(layer)}
                onBlur={() => onPreview(null)}
              >
                <span className={styles.headNo}>{groupNo(gi)}</span>
                <span className={styles.headLabel}>{group.label}</span>
                <span className={styles.headCount}>
                  {group.skills.length} {group.skills.length === 1 ? ui.part : ui.parts}
                </span>
              </button>
              <table className={styles.table} aria-labelledby={headId}>
                <thead className="sr-only">
                  <tr>
                    <th scope="col">{ui.bomItem}</th>
                    <th scope="col">{ui.bomComponent}</th>
                    {showcaseRoles.map((r) => (
                      <th key={r.id} scope="col">
                        {ui.bomUsedIn} {r.company}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.skills.map((skill, si) => {
                    const part: Focus = { kind: 'skill', name: skill.name };
                    const isActive = focus?.kind === 'skill' && focus.name === skill.name;
                    return (
                      <tr key={skill.name} className={cx(styles.row, isActive && styles.activeRow)}>
                        <td className={styles.item}>
                          {gi + 1}.{si + 1}
                        </td>
                        <th scope="row" className={styles.component}>
                          <button
                            type="button"
                            className={styles.partButton}
                            aria-pressed={same(pinned, part)}
                            onClick={() => toggle(part)}
                            onPointerEnter={hover(part)}
                            onPointerLeave={() => onPreview(null)}
                            onFocus={keyFocus(part)}
                            onBlur={() => onPreview(null)}
                          >
                            {skill.name}
                          </button>
                        </th>
                        {showcaseRoles.map((r) => {
                          const used = skill.roles.includes(r.id);
                          return (
                            <td key={r.id} className={cx(styles.mark, used && styles.used)}>
                              <span aria-hidden="true">{used ? '●' : '○'}</span>
                              <span className="sr-only">{used ? ui.used : ui.notUsed}</span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
