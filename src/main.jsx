import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion, domAnimation, useInView, useMotionValueEvent, useScroll } from 'motion/react';
import '@fontsource-variable/space-grotesk';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import { mediaPath, timeline, timelineLength } from './chapters.js';
import { captionsAt, clamp, smoothstep } from './scene-motion.js';
import { CompanionPrint } from './scene-layers.jsx';
import { createFrameCache, FrameSequence } from './frame-sequence.jsx';
import { ChapterIndex } from './chapter-index.jsx';
import { Dedication } from './dedication.jsx';
import './styles.css';

const motionQuery = '(prefers-reduced-motion: reduce)';
const subscribeMotion = (update) => {
  const query = window.matchMedia(motionQuery);
  query.addEventListener('change', update);
  return () => query.removeEventListener('change', update);
};
const prefersReducedMotion = () => window.matchMedia(motionQuery).matches;
const number = (index) => String(index + 1).padStart(2, '0');

function Arrow({ direction = 'down' }) {
  return (
    <svg className={'arrow arrow--' + direction} viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path d="M12 4v15m-6.5-6.5L12 19l6.5-6.5" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArchiveMark() {
  return (
    <svg className="archive-mark" viewBox="0 0 36 36" width="32" height="32" fill="currentColor" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} transform={'rotate(' + i * 45 + ' 18 18)'} d="M17.6 1h3.9l-.7 10.5-4.1 4.9z" />
      ))}
    </svg>
  );
}

function Masthead({ openIndex }) {
  return (
    <header className="masthead">
      <a className="wordmark" href="#top" aria-label="Lisa Archive, back to the opening">
        <ArchiveMark /><span>Lisa <i>Archive</i></span>
      </a>
      <nav aria-label="Story navigation">
        <button className="index-trigger" type="button" onClick={openIndex} aria-haspopup="dialog" aria-controls="chapter-index">
          <span className="grid-icon" aria-hidden="true" /> Chapters
        </button>
        <a className="letter-link" href="#for-lisa">For Lisa <Arrow direction="diagonal" /></a>
      </nav>
    </header>
  );
}

function FilmSurface({ scene, index, visible, progress, arrival, exit, cache, opening }) {
  const [time, setTime] = useState(0);
  const pose = time / scene.duration;
  const side = index % 2 === 0 ? 1 : -1;
  const captions = captionsAt(scene.captions, time);
  return (
    <div className="film-surface" hidden={!visible} data-scene={scene.id} data-side={side === 1 ? 'right' : 'left'}
      style={{
        '--ratio': scene.ratio,
        '--shot-tilt': (side * (5.5 - 8.5 * pose) + side * (1 - arrival) * 7) + 'deg',
        '--shot-drift': (side * (-20 * pose + (1 - arrival) * 60)) + 'px',
        '--shot-rise': (pose * -12 + (1 - arrival) * 38) + 'px',
        '--print-rise': (-33 * pose + (1 - arrival) * 65) + 'px',
        '--print-tilt': (side * (-10 + 6 * pose)) + 'deg',
        '--surface-inset': (118 * (1 - arrival)) + '%',
        '--copy-opacity': smoothstep((arrival - .52) / .48) * (1 - smoothstep(exit / .62)),
      }}
    >
      <FrameSequence chapter={scene} visible={visible} progress={progress} cache={cache} onFrame={setTime} />
      {visible && <>
        <div className="projector-light" aria-hidden="true" />
        <div className="film-matte" aria-hidden="true">
          <span className="stock-edge stock-edge--one" /><span className="stock-edge stock-edge--two" />
        </div>
        <CompanionPrint name={scene.companion} />
        <div className="scene-type" aria-hidden="true">
          <div className="scene-eyebrow"><span />{index === 0 ? 'A graduation film' : 'Chapter ' + number(index) + ' / ' + scene.label}</div>
          <div className="caption-stack">
            {captions.map(({ cue, alpha, offset }) => (
              <div key={cue.at} className="scene-caption" style={{ opacity: alpha, '--cue-offset': (offset * 45) + '%' }}>
                <div className="title-line"><span>{cue.title}</span></div>
                <div className="title-line title-line--accent"><em>{cue.emphasis}</em></div>
                <p className="caption-detail">{cue.detail}</p>
              </div>
            ))}
          </div>
          {opening && <span className="enter-placeholder" />}
        </div>
      </>}
    </div>
  );
}

function StoryOutline() {
  return (
    <div className="sr-only">
      {timeline.map((scene) => <section key={scene.id}>
        <h2>{scene.label}</h2><p>{scene.description}</p>
        {scene.captions.map((cue) => <p key={cue.at}>{cue.title} {cue.emphasis} {cue.detail}</p>)}
      </section>)}
    </div>
  );
}

function StageFooter({ index, openIndex }) {
  return (
    <div className="stage-footer">
      <button type="button" className="now-in-frame" onClick={openIndex} aria-label={'View chapters. Current chapter ' + (index + 1) + ', ' + timeline[index].label}>
        <span className="chapter-bars" aria-hidden="true">{timeline.map((scene, i) => <i key={scene.id} className={i === index ? 'active' : ''} />)}</span>
        <span className="chapter-count">{number(index)} <i>/</i> 04</span><span className="foot-separator" /><span className="chapter-name">{timeline[index].label}</span>
      </button>
      <span className="class-year">Class of 2026<span className="year-cross" aria-hidden="true">✳</span></span>
    </div>
  );
}

function ScrollFilm({ openIndex }) {
  const section = useRef(null);
  const inView = useInView(section, { initial: true, margin: '-2px 0px 120px' });
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const [position, setPosition] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (value) => setPosition(value * timelineLength));
  const [cache] = useState(createFrameCache);
  const index = Math.max(0, timeline.findLastIndex((scene) => position >= scene.start));
  const handoff = 0.14;

  useEffect(() => { if (!inView) cache.clear(); }, [cache, inView]);
  useEffect(() => () => cache.clear(), [cache]);

  const opening = position < .45;
  const nextBeat = timeline[0].length * 7 / timeline[0].duration;
  return (
    <section id="top" className="film" ref={section} aria-labelledby="film-title">
      <h1 className="sr-only" id="film-title">Becoming Lisa. A graduation film, Class of 2026.</h1>
      <div className="film-stage" data-active={timeline[index].id}>
        <div className="screen">
          {inView && timeline.map((scene, i) => {
            if (position < scene.start - .23 || position > scene.end + handoff) return null;
            const visible = position >= scene.start - handoff;
            const arrival = i === 0 ? 1 : smoothstep((position - scene.start + handoff) / (2 * handoff));
            const exit = i === timeline.length - 1 ? 0 : smoothstep((position - scene.end + handoff) / (2 * handoff));
            return <FilmSurface key={scene.id} scene={scene} index={i} visible={visible} opening={i === 0}
              progress={clamp((position - scene.start) / scene.length)} arrival={arrival} exit={exit} cache={cache} />;
          })}
          {opening && <a className="enter-story" href="#opening-scene" style={{ opacity: 1 - smoothstep((position - .1) / .35) }}>
            <span><Arrow /></span> Scroll to begin
          </a>}
        </div>
        <Masthead openIndex={openIndex} />
        <StageFooter index={index} openIndex={openIndex} />
      </div>
      <div className="story-anchors" aria-hidden="true">
        {timeline.map((scene, i) => <span key={scene.id} id={scene.id} style={{ top: ((scene.start + (i === 0 ? 0 : handoff + .012)) / timelineLength * 100) + '%' }} />)}
        <span id="opening-scene" style={{ top: (nextBeat / timelineLength * 100) + '%' }} />
      </div>
      <StoryOutline />
    </section>
  );
}

function StaticFilm({ openIndex }) {
  return (
    <section id="top" className="static-film" aria-labelledby="film-title">
      <Masthead openIndex={openIndex} />
      <div className="static-heading"><p className="scene-eyebrow"><span />A graduation film</p>
        <h1 id="film-title">Becoming <em>Lisa.</em></h1><p>{timeline[0].captions[0].detail}</p>
      </div>
      <div className="static-chapters">{timeline.map((scene, index) => <article id={scene.id} key={scene.id}>
        <div className="static-frame"><img src={mediaPath(scene.id + '.webp')} alt={scene.description} loading={index === 0 ? 'eager' : 'lazy'} />
          <CompanionPrint name={scene.companion} />
        </div>
        <p className="scene-eyebrow"><span />Chapter {number(index)}</p>
        <h2>{scene.label}</h2><p>{scene.captions[0].detail}</p>
      </article>)}</div>
    </section>
  );
}

function App() {
  const reducedMotion = useSyncExternalStore(subscribeMotion, prefersReducedMotion);
  const [indexOpen, setIndexOpen] = useState(false);
  const selectChapter = useCallback((id) => {
    const anchor = document.getElementById(id);
    if (anchor) {
      if (window.location.hash !== '#' + id) window.history.pushState(null, '', '#' + id);
      anchor.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, []);
  useEffect(() => {
    const id = window.location.hash.slice(1);
    document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
  }, [reducedMotion]);
  return (
    <LazyMotion features={domAnimation} strict>
      <main>
        {reducedMotion ? <StaticFilm openIndex={() => setIndexOpen(true)} /> : <ScrollFilm openIndex={() => setIndexOpen(true)} />}
        <Dedication reducedMotion={reducedMotion} />
      </main>
      <ChapterIndex open={indexOpen} onClose={() => setIndexOpen(false)} onSelect={selectChapter} />
    </LazyMotion>
  );
}
createRoot(document.getElementById('root')).render(<App />);
