import { useRef } from 'react';
import { heroFrames } from '@/assets/heroFrames';
import { useDitherEngine } from '@/engine/useDitherEngine';
import { Hero } from '@/sections/Hero';
import { Profile } from '@/sections/Profile';
import { SelectedWork } from '@/sections/SelectedWork';
import { Experience } from '@/sections/Experience';
import { Skills } from '@/sections/Skills';
import { Education } from '@/sections/Education';
import { Footer } from '@/sections/Footer';
import { Gate } from '@/components/Gate';
import styles from '@/App.module.css';

export default function App() {
  const hero = useRef<HTMLElement | null>(null);
  const heroCanvas = useRef<HTMLCanvasElement | null>(null);
  const ash = useRef<HTMLCanvasElement | null>(null);
  const engine = useDitherEngine({ hero, heroCanvas, ash }, heroFrames);

  return (
    <>
      <canvas ref={ash} className={styles.ash} aria-hidden="true" />
      <Hero sectionRef={hero} canvasRef={heroCanvas} />
      <Gate engine={engine} />
      <main className={styles.main} data-gate-hide>
        <Profile />
        <SelectedWork />
        <Experience />
        <Skills />
        <Education />
      </main>
      <Footer />
    </>
  );
}
