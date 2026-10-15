import { useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { resume, type ShowcaseRole } from '@/data/resume';
import { findShot, type ShotImage } from '@/assets/shots';
import { cx } from '@/lib/cx';
import { BrowserFrame, PhoneFrame } from '@/components/DeviceFrame';
import { Diagram } from '@/components/Diagram';
import { Icon } from '@/components/Icon';
import styles from './Gallery.module.css';

interface Zoomable extends ShotImage {
  alt: string;
}

type Resolved =
  | { kind: 'diagram'; label: string }
  | { kind: 'shot'; label: string; desktop: Zoomable; phone?: Zoomable };

/** "https://www.example.com/a/" -> "example.com/a", for the browser frame's address pill. */
function addressOf(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

/** The role's slides with their files looked up; a slide whose capture is missing is dropped. */
function resolveSlides(role: ShowcaseRole): Resolved[] {
  return role.showcase.slides.flatMap((slide): Resolved[] => {
    if (slide.kind === 'diagram') return [slide];
    const desktop = findShot(role.id, slide.page, 'desktop');
    if (!desktop) return [];
    const phone = findShot(role.id, slide.page, 'phone');
    return [
      {
        kind: 'shot',
        label: slide.label,
        desktop: { ...desktop, alt: slide.alt.desktop },
        ...(phone && { phone: { ...phone, alt: slide.alt.phone } }),
      },
    ];
  });
}

interface Props {
  role: ShowcaseRole;
}

/**
 * One slide at a time (screenshots in device frames, or the role's diagram), with previous/next
 * and labelled slide buttons. Screenshots open full size in a <dialog>. Without JavaScript every
 * slide shows, stacked, and each screenshot is a plain link to its file.
 */
export function Gallery({ role }: Props) {
  const { ui } = resume;
  const slides = resolveSlides(role);
  const zoomables = slides.flatMap((s) => (s.kind === 'shot' ? [s.desktop, ...(s.phone ? [s.phone] : [])] : []));
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const step = (delta: number): void => setIndex((i) => (i + delta + slides.length) % slides.length);
  const zoomStep = (delta: number): void =>
    setZoom((z) => (z === null ? z : (z + delta + zoomables.length) % zoomables.length));

  const open = (image: Zoomable) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setZoom(zoomables.indexOf(image));
    dialog.current?.showModal();
  };

  const onStageKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else return;
    e.preventDefault();
  };

  // The dialog sits inside the gallery in the React tree, so its arrow keys must not also
  // reach onStageKey and change the slide behind it.
  const onDialogKey = (e: KeyboardEvent<HTMLDialogElement>): void => {
    e.stopPropagation();
    if (e.key === 'ArrowRight') zoomStep(1);
    else if (e.key === 'ArrowLeft') zoomStep(-1);
  };

  const zoomed = zoom === null ? undefined : zoomables[zoom];

  const zoomLink = (image: Zoomable, className?: string) => (
    <a href={image.src} className={cx(styles.zoom, className)} onClick={open(image)}>
      <img
        src={image.src}
        width={image.width}
        height={image.height}
        alt={image.alt}
        loading="lazy"
        decoding="async"
        className={styles.image}
      />
      <span className={styles.zoomHint} aria-hidden="true">
        <Icon name="expand" />
      </span>
      <span className="sr-only">{ui.openFull}</span>
    </a>
  );

  return (
    <div className={styles.gallery} role="group" aria-label={`${role.company}: ${ui.gallery}`} onKeyDown={onStageKey}>
      <div className={styles.stage}>
        {slides.map((slide, i) => (
          <figure key={slide.label} className={styles.slide} data-current={i === index || undefined}>
            {slide.kind === 'diagram' ? (
              <Diagram diagram={role.showcase.diagram} />
            ) : (
              <div className={cx(styles.pair, slide.phone && styles.withPhone)}>
                <BrowserFrame address={addressOf(slide.desktop.url)} url={slide.desktop.url}>
                  {zoomLink(slide.desktop)}
                </BrowserFrame>
                {slide.phone && (
                  <div className={styles.phoneSlot}>
                    <PhoneFrame>{zoomLink(slide.phone, styles.phoneShot)}</PhoneFrame>
                  </div>
                )}
              </div>
            )}
            <figcaption className={styles.caption}>{slide.label}</figcaption>
          </figure>
        ))}
      </div>

      {slides.length > 1 && (
        <div className={styles.controls}>
          <button type="button" className={styles.arrowButton} onClick={() => step(-1)}>
            <Icon name="chevronLeft" />
            <span className="sr-only">{ui.previous}</span>
          </button>
          <ul className={styles.picker} role="list">
            {slides.map((slide, i) => (
              <li key={slide.label}>
                <button
                  type="button"
                  className={styles.pick}
                  aria-current={i === index || undefined}
                  onClick={() => setIndex(i)}
                >
                  {slide.label}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className={styles.arrowButton} onClick={() => step(1)}>
            <Icon name="chevronRight" />
            <span className="sr-only">{ui.next}</span>
          </button>
        </div>
      )}

      {zoomables.length > 0 && (
        <dialog
          ref={dialog}
          className={styles.lightbox}
          aria-label={`${role.company}: ${ui.gallery}`}
          onClose={() => setZoom(null)}
          onKeyDown={onDialogKey}
          onClick={(e) => {
            if (e.target === e.currentTarget) dialog.current?.close();
          }}
        >
          {zoomed && (
            <figure className={styles.zoomFigure}>
              <img
                src={zoomed.src}
                width={zoomed.width}
                height={zoomed.height}
                alt={zoomed.alt}
                className={styles.zoomImage}
              />
              <figcaption className={styles.zoomCaption}>
                {ui.slideCount.replace('{n}', String((zoom ?? 0) + 1)).replace('{total}', String(zoomables.length))}
                {ui.roleSeparator}
                {zoomed.alt}
              </figcaption>
            </figure>
          )}
          <button type="button" className={styles.close} onClick={() => dialog.current?.close()}>
            <Icon name="close" />
            <span className="sr-only">{ui.close}</span>
          </button>
          {zoomables.length > 1 && (
            <>
              <button type="button" className={cx(styles.zoomNav, styles.zoomPrev)} onClick={() => zoomStep(-1)}>
                <Icon name="chevronLeft" />
                <span className="sr-only">{ui.previous}</span>
              </button>
              <button type="button" className={cx(styles.zoomNav, styles.zoomNext)} onClick={() => zoomStep(1)}>
                <Icon name="chevronRight" />
                <span className="sr-only">{ui.next}</span>
              </button>
            </>
          )}
        </dialog>
      )}
    </div>
  );
}
