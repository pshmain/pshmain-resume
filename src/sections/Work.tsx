import { useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { resume, showcaseRoles, stackForRole, type RoleId, type ShowcaseRole } from '@/data/resume';
import { findShot } from '@/assets/shots';
import { cx } from '@/lib/cx';
import { Sheet } from '@/components/drawing/Sheet';
import { ExternalLink } from '@/components/ExternalLink';
import { ArrowIcon } from '@/components/ArrowIcon';
import { Gallery, hasGallery } from '@/components/Gallery';
import { Schematic } from '@/components/Schematic';
import styles from './Work.module.css';

/** A bullet to highlight: where a stat tile's number comes from. */
export interface Mark {
  roleId: RoleId;
  bullet: number;
}

interface Props {
  selected: RoleId;
  /** Whether the visitor has chosen a role yet. Until then no tab is drawn as selected. */
  picked: boolean;
  onSelect: (id: RoleId) => void;
  /** Roles that used the part or layer in focus; null when nothing is in focus. */
  lit: RoleId[] | null;
  activeSkill: string | null;
  mark: Mark | null;
}

export const panelId = (id: RoleId): string => `work-${id}`;
const tabId = (id: RoleId): string => `tab-${id}`;
/** A-101, A-102, ...: each project is its own assembly sheet. */
const sheetNo = (i: number): string => `A-${101 + i}`;

/**
 * On phones the tabs fill the screen and the panel they switch starts below it, so a tap would
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

/** First screenshot page of a role, used for its tab thumbnail. */
function thumbFor(role: ShowcaseRole) {
  const slide = role.showcase.slides[0];
  return slide ? findShot(role.id, slide.page, 'thumb') : undefined;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Sheet A-101, assemblies: a tab per project and the selected project's drawings. Once the
 * visitor picks a project, a selection box with corner handles springs to its tab.
 */
export function Work({ selected, picked, onSelect, lit, activeSkill, mark }: Props) {
  const { sections, ui } = resume;
  const roles = showcaseRoles;
  const list = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);

  // Measure the selected tab so the selection box can spring to it, and again on resize.
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const measure = (): void => {
      const tab = document.getElementById(tabId(selected));
      if (tab) setBox({ x: tab.offsetLeft, y: tab.offsetTop, w: tab.offsetWidth, h: tab.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [selected]);

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
    <Sheet meta={sections.work} note={`${roles.length} ${ui.assemblies}`}>
      <div ref={list} className={styles.tabs} role="tablist" aria-label={ui.workTabs} onKeyDown={onKey}>
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
              className={cx(styles.tab, isSelected && picked && styles.selected, lit && !lit.includes(role.id) && styles.dim)}
              onClick={onClick}
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
                <span className={styles.tabSheet}>{sheetNo(i)}</span>
                <span className={styles.company}>{role.company}</span>
                <span className={styles.kicker}>
                  {role.kicker}
                  {ui.roleSeparator}
                  {role.start}
                  {ui.dateSeparator}
                  {role.end}
                </span>
              </span>
            </a>
          );
        })}
        {picked && box && (
          // Placed by inline style; CSS springs it from tab to tab (Work.module.css).
          <span
            className={styles.selection}
            aria-hidden="true"
            style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h }}
          >
            <span className={styles.handle} />
            <span className={styles.handle} />
            <span className={styles.handle} />
            <span className={styles.handle} />
          </span>
        )}
      </div>

      {roles.map((role, i) => (
        <RolePanel
          key={role.id}
          role={role}
          sheet={sheetNo(i)}
          active={role.id === selected}
          activeSkill={activeSkill}
          marked={mark?.roleId === role.id ? mark.bullet : null}
        />
      ))}
    </Sheet>
  );
}

interface PanelProps {
  role: ShowcaseRole;
  sheet: string;
  active: boolean;
  activeSkill: string | null;
  marked: number | null;
}

/**
 * Detail views beside the specifications, then the schematic and the notes. A role with no
 * captured pages (internal tooling) leads with its specifications across the full width, and
 * the schematic carries the picture.
 */
function RolePanel({ role, sheet, active, activeSkill, marked }: PanelProps) {
  const { ui } = resume;
  const stack = stackForRole(role.id);
  const headingId = `${panelId(role.id)}-heading`;
  const withGallery = hasGallery(role);
  return (
    <article
      id={panelId(role.id)}
      role="tabpanel"
      aria-labelledby={headingId}
      className={cx(styles.panel, !withGallery && styles.noMedia)}
      data-active={active || undefined}
      data-reveal
    >
      {withGallery && (
        <div className={styles.media}>
          <Gallery role={role} />
        </div>
      )}

      <div className={styles.specs}>
        <header className={styles.header}>
          <span className={styles.panelSheet}>
            {sheet} · {ui.specifications}
          </span>
          <h3 id={headingId} className={styles.heading}>
            {role.company}
          </h3>
          {role.formerName && (
            <p className={styles.formerLine}>
              {ui.formerly} {role.formerName}
            </p>
          )}
        </header>
        <dl className={styles.table}>
          <div className={styles.row}>
            <dt>{ui.role}</dt>
            <dd>{role.title}</dd>
          </div>
          <div className={styles.row}>
            <dt>{ui.date}</dt>
            <dd>
              {role.start}
              {ui.dateSeparator}
              {role.end} · {role.location}
            </dd>
          </div>
          <div className={styles.row}>
            <dt>{ui.impact}</dt>
            <dd>
              <ul className={styles.impact} role="list">
                {role.showcase.impact.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </dd>
          </div>
          {stack.length > 0 && (
            <div className={styles.row}>
              <dt>{ui.stack}</dt>
              <dd>
                <ul className={styles.parts} role="list">
                  {stack.map((name) => (
                    <li key={name} className={cx(styles.part, name === activeSkill && styles.lit)}>
                      {name}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>
        {role.href && role.domain && (
          <ExternalLink href={role.href} className={styles.visit}>
            {ui.visit} {role.domain} <ArrowIcon />
          </ExternalLink>
        )}
      </div>

      <div className={styles.schematic}>
        <Schematic diagram={role.showcase.diagram} id={role.id} />
      </div>

      <div className={styles.notes}>
        <h4 className={styles.notesTitle}>{ui.notes}</h4>
        <ol className={styles.bullets}>
          {role.bullets.map((text, i) => (
            <li key={text} className={cx(styles.bullet, marked === i && styles.marked)} data-bullet={i}>
              <span className={styles.bulletNo} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className={styles.bulletText}>{text}</span>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
