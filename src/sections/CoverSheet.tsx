import { useRef, useState, type RefObject } from 'react';
import { resume, showcaseRoles, type RoleId } from '@/data/resume';
import { ExternalLink } from '@/components/ExternalLink';
import { CopyButton } from '@/components/CopyButton';
import { Icon } from '@/components/Icon';
import { Crosshair } from '@/components/Crosshair';
import { EngineModel } from '@/components/model/EngineModel';
import { FeatureTree } from '@/components/model/FeatureTree';
import { ModelStatus } from '@/components/model/ModelStatus';
import type { Part, SectionId } from '@/components/model/parts';
import { Dimension } from '@/components/drawing/Dimension';
import { DrawingSpecs } from '@/components/drawing/DrawingSpecs';
import { enterStep } from '@/lib/motion';
import styles from './CoverSheet.module.css';

const ZONES_ACROSS = ['1', '2', '3', '4', '5', '6'];
const ZONES_DOWN = ['A', 'B', 'C', 'D'];

interface Props {
  /** Set on the <header>; the sticky bar shows once it has scrolled away. */
  sectionRef: RefObject<HTMLElement | null>;
  /** The skill group in focus on the page; its cylinder lights. */
  activeGroup: string | null;
  onPreviewGroup: (label: string | null) => void;
  /** Pin a layer and scroll to its parts list. */
  onOpenLayer: (label: string) => void;
  /** Open a project's tab and scroll to it. */
  onOpenProject: (id: RoleId) => void;
  /** Scroll to a section of the page. */
  onOpenSection: (id: SectionId) => void;
}

/**
 * Sheet A-001, the cover: the name with a dimension line carrying the headline, then a CAD
 * workspace (the feature tree on the side, the engine model at the centre, unboxed on the sheet),
 * and a title block holding every way to reach Peter. A drawing border with zone markers frames
 * it, and a drafting crosshair follows a mouse pointer across it.
 */
export function CoverSheet({ sectionRef, activeGroup, onPreviewGroup, onOpenLayer, onOpenProject, onOpenSection }: Props) {
  const { name, headline, location, contact, download, ui, sections, skills } = resume;
  const frame = useRef<HTMLElement | null>(null);
  const setRefs = (el: HTMLElement | null): void => {
    frame.current = el;
    sectionRef.current = el;
  };

  // The part pointed at (model or tree) and the part picked in the model (its card stays open).
  const [hover, setHover] = useState<Part | null>(null);
  const [selected, setSelected] = useState<Part | null>(null);
  const [live, setLive] = useState(false);
  const onHover = (part: Part | null): void => {
    setHover(part);
    // A cylinder previews its layer down the page too: the bill of materials and the projects.
    onPreviewGroup(part?.kind === 'layer' ? skills[part.index]!.label : null);
  };
  const onOpen = (part: Part): void => {
    setHover(null);
    setSelected(null);
    onPreviewGroup(null);
    if (part.kind === 'layer') onOpenLayer(skills[part.index]!.label);
    else if (part.kind === 'project') onOpenProject(showcaseRoles[part.index]!.id);
    else onOpenSection(part.id);
  };

  return (
    <header ref={setRefs} id="top" className={styles.cover}>
      <Crosshair area={frame} />
      <div className={styles.frame}>
        <ol className={styles.zonesAcross} aria-hidden="true">
          {ZONES_ACROSS.map((z) => (
            <li key={z}>{z}</li>
          ))}
        </ol>
        <ol className={styles.zonesDown} aria-hidden="true">
          {ZONES_DOWN.map((z) => (
            <li key={z}>{z}</li>
          ))}
        </ol>

        <div className={styles.identity}>
          <p className={styles.sheetLabel} data-enter style={enterStep(0)}>
            A-001 · {ui.sheet} 1 / {Object.keys(sections).length + 1}
          </p>
          <div className={styles.nameBlock}>
            <h1 className={styles.name} data-enter style={enterStep(1)}>
              {name}
            </h1>
            <p className={styles.subtitle} data-enter style={enterStep(2)}>
              <Dimension draw="enter">
                {headline}
                {ui.headlineSeparator}
                {location}
              </Dimension>
            </p>
          </div>
        </div>

        <div className={styles.workspace}>
          {/* No entrance fade here: the engine poster is the page's largest paint (its LCP), and
              an element that starts at opacity 0 is not counted as painted until much later. */}
          <div className={styles.model}>
            <EngineModel
              hover={hover}
              selected={selected}
              activeGroup={activeGroup}
              onHover={onHover}
              onSelect={setSelected}
              onReady={() => setLive(true)}
            />
          </div>
          <div className={styles.status} data-enter style={enterStep(3)}>
            <ModelStatus
              part={hover ?? selected}
              picked={!!selected}
              live={live}
              onOpen={onOpen}
              onClear={() => setSelected(null)}
            />
          </div>
          <div className={styles.tree} data-enter style={enterStep(3)}>
            <FeatureTree active={hover ?? selected} onHover={onHover} onOpen={onOpen} />
          </div>
        </div>

        <div className={styles.titleBlock}>
          <div className={styles.cell} data-enter style={enterStep(3)}>
            <span className={styles.cellLabel}>{ui.drawnBy}</span>
            <span className={styles.cellValue}>{name}</span>
            <DrawingSpecs />
          </div>
          <div className={styles.cell} data-enter style={enterStep(4)}>
            <span className={styles.cellLabel}>{ui.contact}</span>
            <ul className={styles.actions} role="list">
              <li className={styles.action}>
                <a href={`mailto:${contact.email}`} className={styles.actionLink}>
                  <Icon name="mail" />
                  {contact.email}
                </a>
                <CopyButton text={contact.email} label={ui.copyEmail} className={styles.copy} />
              </li>
              <li className={styles.action}>
                <ExternalLink href={contact.linkedin.href} className={styles.actionLink}>
                  <Icon name="linkedin" />
                  {contact.linkedin.short}
                </ExternalLink>
              </li>
              <li className={styles.action}>
                <a href={contact.phone.href} className={styles.actionLink}>
                  <Icon name="phone" />
                  <span className={styles.phone}>{contact.phone.display}</span>
                </a>
              </li>
            </ul>
          </div>
          <div className={styles.cell} data-enter style={enterStep(5)}>
            <a href={download.href} download={download.filename} className={styles.primary}>
              <Icon name="download" />
              {download.label}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
