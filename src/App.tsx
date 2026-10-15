import { useEffect, useRef, useState } from 'react';
import { heroFrames } from '@/assets/heroFrames';
import { useDitherEngine } from '@/engine/useDitherEngine';
import { resume, rolesForSkill, showcaseRoles, type RoleId, type Stat } from '@/data/resume';
import { Hero } from '@/sections/Hero';
import { Overview } from '@/sections/Overview';
import { Work, panelId, type Mark } from '@/sections/Work';
import { Career } from '@/sections/Career';
import { Skills } from '@/sections/Skills';
import { Education } from '@/sections/Education';
import { Footer } from '@/sections/Footer';
import { StickyBar } from '@/components/StickyBar';
import { useReveal } from '@/lib/useReveal';
import { revealStep } from '@/lib/motion';
import styles from '@/App.module.css';

const ROLE_IDS = showcaseRoles.map((r) => r.id);
const DEFAULT_ROLE: RoleId = showcaseRoles[0]!.id;

/** "#work-codriverhq" -> "codriverhq"; anything else -> null. */
function roleFromHash(hash: string): RoleId | null {
  const id = hash.replace(/^#work-/, '');
  return hash.startsWith('#work-') && (ROLE_IDS as string[]).includes(id) ? (id as RoleId) : null;
}

/** After React commits, so the element being scrolled to is the one now on screen. */
function scrollToWhenPainted(find: () => Element | null, block: ScrollLogicalPosition): void {
  // CSS scroll-behavior (base.css) makes this smooth, or instant under reduced motion.
  requestAnimationFrame(() => find()?.scrollIntoView({ block }));
}

export default function App() {
  const hero = useRef<HTMLElement | null>(null);
  const heroCanvas = useRef<HTMLCanvasElement | null>(null);
  const ash = useRef<HTMLCanvasElement | null>(null);
  useDitherEngine({ hero, heroCanvas, ash }, heroFrames);
  useReveal();

  const [selected, setSelected] = useState<RoleId>(DEFAULT_ROLE);
  // The first role's panel shows on load, but its card and bar stay as quiet as the others until
  // the visitor picks one, so nothing looks selected that they did not select.
  const [picked, setPicked] = useState(false);
  const [mark, setMark] = useState<Mark | null>(null);
  const [pinnedSkill, setPinnedSkill] = useState<string | null>(null);
  const [previewSkill, setPreviewSkill] = useState<string | null>(null);
  const activeSkill = previewSkill ?? pinnedSkill;
  const lit = activeSkill ? rolesForSkill(activeSkill) : null;

  // A #work-<id> URL opens on that role, on load and whenever the hash changes.
  useEffect(() => {
    const fromHash = (): void => {
      const id = roleFromHash(window.location.hash);
      if (!id) return;
      setSelected(id);
      setPicked(true);
      setMark(null);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  const select = (id: RoleId, bullet: number | null = null): void => {
    setSelected(id);
    setPicked(true);
    setMark(bullet === null ? null : { roleId: id, bullet });
    // replaceState, not location.hash: the address becomes shareable without a jump or history entry.
    window.history.replaceState(null, '', `#${panelId(id)}`);
  };

  const onStat = (stat: Stat): void => {
    if (!stat.roleId) return;
    const id = stat.roleId;
    select(id, stat.bullet ?? null);
    scrollToWhenPainted(
      () =>
        stat.bullet === undefined
          ? document.getElementById(panelId(id))
          : document.querySelector(`#${panelId(id)} [data-bullet="${stat.bullet}"]`),
      'center',
    );
  };

  const onTimeline = (id: RoleId): void => {
    select(id);
    scrollToWhenPainted(() => document.getElementById(resume.sections.work.id), 'start');
  };

  return (
    <>
      <canvas ref={ash} className={styles.ash} aria-hidden="true" />
      <StickyBar watch={hero} />
      <Hero sectionRef={hero} canvasRef={heroCanvas} />
      <main className={styles.main}>
        <Overview onStat={onStat} />
        <Work
          selected={selected}
          picked={picked}
          onSelect={(id) => select(id)}
          lit={lit}
          activeSkill={activeSkill}
          mark={mark}
        />
        <div className={styles.columns}>
          <div className={styles.career} data-reveal style={revealStep(0)}>
            <Career selected={selected} picked={picked} onSelect={onTimeline} lit={lit} />
          </div>
          <div className={styles.skills} data-reveal style={revealStep(1)}>
            <Skills
              pinned={pinnedSkill}
              active={activeSkill}
              lit={lit}
              onPin={setPinnedSkill}
              onPreview={setPreviewSkill}
            />
          </div>
          <div className={styles.education} data-reveal style={revealStep(2)}>
            <Education />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
