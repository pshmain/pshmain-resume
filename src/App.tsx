import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { groupOfSkill, resume, rolesForGroup, rolesForSkill, showcaseRoles, type RoleId, type Stat } from '@/data/resume';
import { CoverSheet } from '@/sections/CoverSheet';
import { Overview } from '@/sections/Overview';
import { Work, panelId, type Mark } from '@/sections/Work';
import { Career } from '@/sections/Career';
import { BillOfMaterials, type Focus } from '@/sections/BillOfMaterials';
import { Education } from '@/sections/Education';
import { Footer } from '@/sections/Footer';
import { StickyBar } from '@/components/StickyBar';
import { useReveal } from '@/lib/useReveal';
import { groupNo } from '@/lib/groupNo';
import styles from '@/App.module.css';

const ROLE_IDS = showcaseRoles.map((r) => r.id);
const DEFAULT_ROLE: RoleId = showcaseRoles[0]!.id;

/** "#work-codriverhq" -> "codriverhq"; anything else -> null. */
function roleFromHash(hash: string): RoleId | null {
  const id = hash.replace(/^#work-/, '');
  return hash.startsWith('#work-') && (ROLE_IDS as string[]).includes(id) ? (id as RoleId) : null;
}

/**
 * A hydration boundary. The prerendered page arrives whole; React then hydrates the cover first
 * and each sheet below it in a task of its own, so no single task holds the page up for long,
 * and a sheet someone interacts with early is hydrated first. Nothing here ever suspends.
 */
const Part = ({ children }: { children: ReactNode }) => <Suspense fallback={null}>{children}</Suspense>;

/** After React commits, so the element being scrolled to is the one now on screen. */
function scrollToWhenPainted(find: () => Element | null, block: ScrollLogicalPosition): void {
  // CSS scroll-behavior (base.css) makes this smooth, or instant under reduced motion.
  requestAnimationFrame(() => find()?.scrollIntoView({ block }));
}

export default function App() {
  const cover = useRef<HTMLElement | null>(null);
  useReveal();

  const [selected, setSelected] = useState<RoleId>(DEFAULT_ROLE);
  // The first role's panel shows on load, but its tab and bar stay as quiet as the others until
  // the visitor picks one, so nothing looks selected that they did not select.
  const [picked, setPicked] = useState(false);
  const [mark, setMark] = useState<Mark | null>(null);

  // One focus for the whole page: a part (skill) or a layer (skill group), previewed on hover
  // or focus, pinned on click. It lights a cylinder, lights rows of the bill of materials, and dims
  // the projects that did not use it.
  const [pinned, setPinned] = useState<Focus>(null);
  const [preview, setPreview] = useState<Focus>(null);
  const focus = preview ?? pinned;
  const lit = !focus ? null : focus.kind === 'skill' ? rolesForSkill(focus.name) : rolesForGroup(focus.label);
  const activeGroup = !focus ? null : focus.kind === 'layer' ? focus.label : groupOfSkill(focus.name);
  const activeSkill = focus?.kind === 'skill' ? focus.name : null;

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

  const layer = (label: string | null): Focus => (label ? { kind: 'layer', label } : null);

  // From the cover's model: a cylinder pins its layer in the bill of materials and goes there.
  const onOpenLayer = (label: string): void => {
    setPreview(null);
    setPinned(layer(label));
    const index = resume.skills.findIndex((g) => g.label === label);
    scrollToWhenPainted(() => document.getElementById(`layer-${groupNo(index)}`), 'center');
  };

  return (
    <>
      <StickyBar watch={cover} />
      <CoverSheet
        sectionRef={cover}
        activeGroup={activeGroup}
        onPreviewGroup={(label) => setPreview(layer(label))}
        onOpenLayer={onOpenLayer}
        onOpenProject={onTimeline}
        onOpenSection={(id) =>
          scrollToWhenPainted(() => document.getElementById(resume.sections[id].id), 'start')
        }
      />
      <main className={styles.main}>
        <Part>
          <Overview onStat={onStat} />
        </Part>
        <Part>
          <Work
            selected={selected}
            picked={picked}
            onSelect={(id) => select(id)}
            lit={lit}
            activeSkill={activeSkill}
            mark={mark}
          />
        </Part>
        <Part>
          <div data-reveal>
            <Career selected={selected} picked={picked} onSelect={onTimeline} lit={lit} />
          </div>
        </Part>
        <Part>
          <BillOfMaterials
            focus={focus}
            pinned={pinned}
            activeGroup={activeGroup}
            lit={lit}
            onPreview={setPreview}
            onPin={setPinned}
          />
        </Part>
        <Part>
          <div data-reveal>
            <Education />
          </div>
        </Part>
      </main>
      <Part>
        <Footer />
      </Part>
    </>
  );
}
