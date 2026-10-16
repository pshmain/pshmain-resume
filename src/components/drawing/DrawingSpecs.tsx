import { resume } from '@/data/resume';
import styles from './DrawingSpecs.module.css';

/** The drawing number and scale under "Drawn by", as in any title block. */
export function DrawingSpecs() {
  const { drawing, ui } = resume;
  return (
    <dl className={styles.specs}>
      <div>
        <dt>{ui.drawingNo}</dt>
        <dd>{drawing.number}</dd>
      </div>
      <div>
        <dt>{ui.scale}</dt>
        <dd>{drawing.scale}</dd>
      </div>
    </dl>
  );
}
