import type { KeyboardEvent, MouseEvent } from 'react';
import { resume, showcaseRoles, stackForRole, type RoleId, type ShowcaseRole } from '@/data/resume';
import { findShot } from '@/assets/shots';
import { cx } from '@/lib/cx';
import { Section } from '@/components/Section';
import { ExternalLink } from '@/components/ExternalLink';
import { ArrowIcon } from '@/components/ArrowIcon';
import { Gallery } from '@/components/Gallery';
import { enterStep } from '@/lib/motion';
import styles from './Work.module.css';

/** A bullet to highlight: where a stat tile's number comes from. */
export interface Mark {
  roleId: RoleId;
  bullet: number;
}

interface Props {
  selected: RoleId;
  /** Whether the visitor has chosen a role yet. Until then no card is drawn as selected. */
  picked: boolean;
  onSelect: (id: RoleId) => void;
  /** Roles that used the active skill; null when no skill is active. */
  lit: RoleId[] | null;
  activeSkill: string | null;
  mark: Mark | null;
}

export const panelId = (id: RoleId): string => `work-${id}`;
const tabId = (id: RoleId): string => `tab-${id}`;

/**
 * On phones the cards fill the screen and the panel they switch starts below it, so a tap would
 * seem to do nothing. Bring the panel up when its top is out of view.
 */
function revealPanel(id: RoleId): void {
  requestAnimationFrame(() => {
    const panel = document.getElementById(panelId(id));
    if (panel && panel.getBoundingClientRect().top > window.innerHeight * 0.75) {
      panel.scrollIntoView({ block: 'start' });
    }
  });
}

/** First screenshot page of a role, used for its tab card thumbnail. */
function thumbFor(role: ShowcaseRole) {
  const slide = role.showcase.slides.find((s) => s.kind === 'shot');
  return slide?.kind === 'shot' ? findShot(role.id, slide.page, 'thumb') : undefined;
}

export function Work({ selected, picked, onSelect, lit, activeSkill, mark }: Props) {
  const { sections, ui } = resume;
  const roles = showcaseRoles;

  // WAI-ARIA tabs with automatic activation: arrows, Home and End move and select.
  const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    const i = roles.findIndex((r) => r.id === selected);
    const last = roles.length - 1;
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? i === last ? 0 : i + 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? i === 0 ? last : i - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : -1;
    const role = roles[next];
    if (!role) return;
    e.preventDefault();
    onSelect(role.id);
    document.getElementById(tabId(role.id))?.focus();
  };

  return (
    <Section meta={sections.work}>
      <div className={styles.tabs} role="tablist" aria-label={ui.workTabs} onKeyDown={onKey}>
        {roles.map((role, i) => {
          const isSelected = role.id === selected;
          const thumb = thumbFor(role);
          const onClick = (e: MouseEvent<HTMLAnchorElement>): void => {
            e.preventDefault();
            onSelect(role.id);
            revealPanel(role.id);
          };
          return (
            <a
              key={role.id}
              id={tabId(role.id)}
              href={`#${panelId(role.id)}`}
              role="tab"
              aria-selected={isSelected}
              aria-controls={panelId(role.id)}
              tabIndex={isSelected ? 0 : -1}
              className={cx(
                styles.tab,
                isSelected && picked && styles.selected,
                lit && !lit.includes(role.id) && styles.dim,
              )}
              onClick={onClick}
              data-enter
              style={enterStep(11 + i)}
            >
              <span className={styles.thumb}>
                {thumb ? (
                  <img src={thumb.src} width={thumb.width} height={thumb.height} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className={styles.monogram} aria-hidden="true">
                    {role.showcase.monogram}
                  </span>
                )}
              </span>
              <span className={styles.tabText}>
                <span className={styles.kicker}>{role.kicker}</span>
                <span className={styles.company}>{role.company}</span>
                {role.formerName && (
                  <span className={styles.former}>
                    {ui.formerly} {role.formerName}
                  </span>
                )}
                <span className={styles.dates}>
                  {role.start}
                  {ui.dateSeparator}
                  {role.end}
                </span>
              </span>
            </a>
          );
        })}
      </div>

      {roles.map((role) => (
        <RolePanel
          key={role.id}
          role={role}
          active={role.id === selected}
          activeSkill={activeSkill}
          marked={mark?.roleId === role.id ? mark.bullet : null}
        />
      ))}
    </Section>
  );
}

interface PanelProps {
  role: ShowcaseRole;
  active: boolean;
  activeSkill: string | null;
  marked: number | null;
}

/** Gallery beside a summary (title, impact, stack), then the bullets across the full width. */
function RolePanel({ role, active, activeSkill, marked }: PanelProps) {
  const { ui } = resume;
  const stack = stackForRole(role.id);
  const headingId = `${panelId(role.id)}-heading`;
  return (
    <article
      id={panelId(role.id)}
      role="tabpanel"
      aria-labelledby={headingId}
      className={styles.panel}
      data-active={active || undefined}
      data-reveal
    >
      <div className={styles.media}>
        <Gallery role={role} />
      </div>

      <div className={styles.summary}>
        <header className={styles.header}>
          <h3 id={headingId} className={styles.heading}>
            {role.title}
            {ui.roleSeparator}
            {role.company}
          </h3>
          {role.formerName && (
            <p className={styles.formerLine}>
              {ui.formerly} {role.formerName}
            </p>
          )}
          <p className={styles.meta}>
            <span className={styles.metaDates}>
              {role.start}
              {ui.dateSeparator}
              {role.end}
            </span>
            <span className={styles.location}>{role.location}</span>
          </p>
          {role.href && role.domain && (
            <ExternalLink href={role.href} className={styles.visit}>
              {ui.visit} {role.domain} <ArrowIcon />
            </ExternalLink>
          )}
        </header>

        <ul className={styles.impact} role="list" aria-label={ui.impact}>
          {role.showcase.impact.map((item) => (
            <li key={item} className={styles.impactChip}>
              {item}
            </li>
          ))}
        </ul>

        {stack.length > 0 && (
          <div className={styles.stack}>
            <h4 className={styles.subhead}>{ui.stack}</h4>
            <ul className={styles.stackChips} role="list">
              {stack.map((name) => (
                <li key={name} className={cx(styles.stackChip, name === activeSkill && styles.lit)}>
                  {name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <ul className={styles.bullets} role="list">
        {role.bullets.map((text, i) => (
          <li key={text} className={cx(styles.bullet, marked === i && styles.marked)} data-bullet={i}>
            <span className={styles.dash} aria-hidden="true">
              —
            </span>
            <span className={styles.bulletText}>{text}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
