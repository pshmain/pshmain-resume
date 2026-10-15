import type { PointerEvent } from 'react';
import { resume, type RoleId } from '@/data/resume';
import { Section } from '@/components/Section';
import styles from './Skills.module.css';

interface Props {
  /** The pinned skill (click), or null. */
  pinned: string | null;
  /** The skill being shown: the hovered or focused one, else the pinned one. */
  active: string | null;
  lit: RoleId[] | null;
  onPin: (name: string | null) => void;
  onPreview: (name: string | null) => void;
}

/**
 * Skills as chips. Hover or focus previews where a skill was used, a click pins it (design/
 * dashboard.md, "IV · Skills"); the Work cards and timeline bars of other roles dim meanwhile.
 */
export function Skills({ pinned, active, lit, onPin, onPreview }: Props) {
  const { sections, skills, roles, ui } = resume;
  const usedAt = lit ? roles.filter((r) => lit.includes(r.id)).map((r) => r.company) : [];

  // Mouse only: a tap fires pointerenter too, which would leave a preview stuck on touch screens.
  const enter = (name: string) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse') onPreview(name);
  };

  return (
    <Section meta={sections.skills}>
      <p className={styles.status} aria-live="polite">
        {active ? (
          <>
            <span className={styles.statusSkill}>{active}</span>
            {ui.roleSeparator}
            {ui.usedAt} {usedAt.join(', ')}.
          </>
        ) : (
          ui.skillHint
        )}
      </p>
      <dl className={styles.groups}>
        {skills.map((group) => (
          <div key={group.label} className={styles.group}>
            <dt className={styles.label}>{group.label}</dt>
            <dd>
              <ul className={styles.chips} role="list">
                {group.skills.map((skill) => (
                  <li key={skill.name}>
                    <button
                      type="button"
                      className={styles.chip}
                      aria-pressed={pinned === skill.name}
                      data-active={active === skill.name || undefined}
                      onClick={() => {
                        onPreview(null);
                        onPin(pinned === skill.name ? null : skill.name);
                      }}
                      onPointerEnter={enter(skill.name)}
                      onPointerLeave={() => onPreview(null)}
                      onFocus={() => onPreview(skill.name)}
                      onBlur={() => onPreview(null)}
                    >
                      {skill.name}
                    </button>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
