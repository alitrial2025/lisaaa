import React, { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion, domAnimation, useInView, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import '@fontsource-variable/space-grotesk';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import { mediaPath, timeline, timelineLength } from './chapters.js';
import { graduationPhotos } from './graduation-photos.js';
import { captionsAt, clamp, smoothstep } from './scene-motion.js';
import { CompanionPrint } from './scene-layers.jsx';
import { createFrameCache, FrameSequence } from './frame-sequence.jsx';
import { Celebration } from './celebration.jsx';
import { ChapterIndex } from './chapter-index.jsx';
import { Dedication } from './dedication.jsx';
import { SoundControl } from './sound-control.jsx';
import { chapterPosition, filmHash, handoff, placeAtScroll, readLocal, readPlace, sceneAt, scrollToPlace, writeLocal } from './film-navigation.js';
import './styles.css';

const Keepsakes = lazy(() => import('./keepsakes.jsx'));

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
        <a className="letter-link" href="#for-lisa" aria-label="For Lisa">
          <img className="letter-photo" src={mediaPath(graduationPhotos[0].thumbnail)} alt="" width="24" height="30" />
          <span>For Lisa</span><Arrow direction="diagonal" />
        </a>
      </nav>
    </header>
  );
}

function FilmSurface({ scene, index, visible, playhead, cache, fireworks, finishFireworks }) {
  const surface = useRef(null);
  const captionRefs = useRef(new Map());
  const lastTime = useRef(0);
  const previousCaptions = useRef([]);
  const previousArrival = useRef(-1);
  const previousExit = useRef(-1);
  const previousPoseTime = useRef(-1);
  const side = index % 2 === 0 ? 1 : -1;

  const updatePoses = useCallback((position, time) => {
    const style = surface.current?.style;
    if (!style || !visible) return;
    const arrival = index === 0 ? 1 : smoothstep((position - scene.start + handoff) / (2 * handoff));
    const exit = index === timeline.length - 1 ? 0 : smoothstep((position - scene.end + handoff) / (2 * handoff));
    const arrivalChanged = arrival !== previousArrival.current;
    if (arrivalChanged) {
      style.clipPath = arrival === 1 ? 'none' : 'polygon(calc(' + (118 * (1 - arrival)) + '% - 18%) 0, 100% 0, 100% 100%, ' + (118 * (1 - arrival)) + '% 100%)';
    }
    if (arrivalChanged || exit !== previousExit.current) {
      style.setProperty('--copy-opacity', smoothstep((arrival - .52) / .48) * (1 - smoothstep(exit / .62)));
      previousArrival.current = arrival;
      previousExit.current = exit;
    }
    if (!arrivalChanged && time === previousPoseTime.current) return;
    previousPoseTime.current = time;
    const pose = time / scene.duration;
    if (scene.printAt !== undefined) {
      style.setProperty('--print-reveal', smoothstep((time - scene.printAt) / 1.15));
    }
    if (index === 0) {
      const firstCross = smoothstep((time - 5.45) / 1.2);
      const secondCross = smoothstep((time - 10.85) / 1.2);
      const cross = firstCross - secondCross;
      style.setProperty('--cross', cross);
      style.setProperty('--cross-lift', Math.sin(cross * Math.PI) * -21 + 'px');
    }
    style.setProperty('--shot-tilt', (side * (5.5 - 8.5 * pose) + side * (1 - arrival) * 7) + 'deg');
    style.setProperty('--shot-drift', (side * (-20 * pose + (1 - arrival) * 60)) + 'px');
    style.setProperty('--shot-rise', (pose * -12 + (1 - arrival) * 38) + 'px');
    style.setProperty('--print-rise', (-33 * pose + (1 - arrival) * 65) + 'px');
    style.setProperty('--print-tilt', (side * (-10 + 6 * pose)) + 'deg');
  }, [index, scene, side, visible]);

  const paint = useCallback((time) => {
    lastTime.current = time;
    updatePoses(playhead.get(), time);
    const captions = captionsAt(scene.captions, time);
    for (const old of previousCaptions.current) {
      if (!captions.some(({ cue }) => cue.at === old.at)) captionRefs.current.get(old.at)?.removeAttribute('data-visible');
    }
    for (const { cue, alpha, offset } of captions) {
      const element = captionRefs.current.get(cue.at);
      if (!element) continue;
      element.dataset.visible = '';
      element.style.opacity = alpha;
      element.style.setProperty('--cue-offset', (offset * 45) + '%');
    }
    previousCaptions.current = captions.map(({ cue }) => cue);
  }, [playhead, scene, updatePoses]);

  useLayoutEffect(() => {
    if (visible) paint(lastTime.current);
  }, [paint, visible]);
  useMotionValueEvent(playhead, 'change', (position) => {
    if (position <= scene.start + handoff || position >= scene.end - handoff) updatePoses(position, lastTime.current);
  });

  return (
    <div ref={surface} className="film-surface" hidden={!visible} data-scene={scene.id}
      data-side={side === 1 ? 'right' : 'left'} style={{ '--ratio': scene.ratio }}>
      <FrameSequence chapter={scene} visible={visible} playhead={playhead} cache={cache} onFrame={paint} />
      {visible && <>
        <div className="projector-light" aria-hidden="true" />
        {fireworks && <Celebration kind="fireworks" onFinish={finishFireworks} />}
        <div className="film-matte" aria-hidden="true">
          <span className="stock-edge stock-edge--one" /><span className="stock-edge stock-edge--two" />
        </div>
        <CompanionPrint name={scene.companion} />
        <div className="scene-type" aria-hidden="true">
          <div className="scene-eyebrow"><span />{index === 0 ? 'A graduation film' : 'Chapter ' + number(index) + ' / ' + scene.label}</div>
          <div className="caption-stack">
            {scene.captions.map((cue, cueIndex) => (
              <div key={cue.at} ref={element => {
                if (element) captionRefs.current.set(cue.at, element);
                else captionRefs.current.delete(cue.at);
              }} className="scene-caption" data-crossed={index === 0 && cueIndex === 1 ? '' : undefined}>
                <div className="title-line"><span>{cue.title}</span></div>
                <div className="title-line title-line--accent"><em>{cue.emphasis}</em></div>
                <p className="caption-detail">{cue.detail}</p>
              </div>
            ))}
          </div>
          {index === 0 && <span className="enter-placeholder" />}
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

function StageFooter({ index, openIndex, go, playhead }) {
  const progress = useRef(null);
  useMotionValueEvent(playhead, 'change', position => {
    const scene = sceneAt(position);
    progress.current?.style.setProperty('--chapter-progress', clamp((position - scene.start) / scene.length));
  });
  return (
    <div className="stage-footer" ref={progress}>
      <button type="button" className="now-in-frame" onClick={openIndex} aria-label={'View chapters. Current chapter ' + (index + 1) + ', ' + timeline[index].label}>
        <span className="chapter-bars" aria-hidden="true">{timeline.map((scene, i) => <i key={scene.id} className={i === index ? 'active' : ''} />)}</span>
        <span className="chapter-count">{number(index)} <i>/</i> 04</span><span className="foot-separator" /><span className="chapter-name">{timeline[index].label}</span>
      </button>
      <nav className="chapter-strip" aria-label="Jump to a film chapter">
        {timeline.map((scene, i) => (
          <a key={scene.id} href={'#' + scene.id} aria-label={'Jump to ' + scene.label}
            aria-current={index === i ? 'step' : undefined}
            style={{ '--still-position': i / (timeline.length - 1) * 100 + '%' }}
            onClick={event => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              go({ id: scene.id });
            }}>
            <span className="strip-still" aria-hidden="true" /><span className="strip-name">{scene.label}</span>
          </a>
        ))}
      </nav>
      <span className="class-year">Class of 2026<span className="year-cross" aria-hidden="true">✳</span></span>
    </div>
  );
}

function mountedScenes(position) {
  return timeline.map(scene => {
    if (position < scene.start - .25 || position > scene.end + handoff) return '0';
    return position < scene.start - handoff ? '1' : '2';
  }).join('');
}

function ScrollFilm({ openIndex, go }) {
  const section = useRef(null);
  const enter = useRef(null);
  const inView = useInView(section, { initial: true, margin: '-2px 0px 120px' });
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const playhead = useTransform(scrollYProgress, [0, 1], [0, timelineLength]);
  const [cache] = useState(createFrameCache);
  const [fireworks, setFireworks] = useState(false);
  const finishFireworks = useCallback(() => setFireworks(false), []);
  const [view, setView] = useState(() => ({ mounts: mountedScenes(0), scene: timeline[0] }));
  const lastView = useRef(view);

  useMotionValueEvent(playhead, 'change', (position) => {
    if (fireworks && position >= .24) finishFireworks();
    const mounts = mountedScenes(position);
    const scene = sceneAt(position);
    if (lastView.current.scene !== scene || lastView.current.mounts !== mounts) {
      lastView.current = { mounts, scene };
      setView(lastView.current);
    }
    if (enter.current && (position < .45 || !enter.current.hidden)) {
      enter.current.hidden = position >= .45;
      enter.current.style.opacity = 1 - smoothstep((position - .1) / .35);
    }
  });

  useEffect(() => {
    if (!['', '#top', '#library'].includes(window.location.hash)) return;
    const timer = window.setTimeout(() => {
      if (playhead.get() < .035 && window.scrollY < 35 && !document.hidden) setFireworks(true);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [playhead]);
  useEffect(() => { if (!inView) cache.clear(); }, [cache, inView]);
  useEffect(() => () => cache.clear(), [cache]);

  const index = timeline.indexOf(view.scene);
  const nextBeat = chapterPosition(timeline[0], 7);
  return (
    <section id="top" className="film" ref={section} aria-labelledby="film-title">
      <h1 className="sr-only" id="film-title">Becoming Lisa. A graduation film, Class of 2026.</h1>
      <div className="film-stage" data-active={view.scene.id}>
        <div className="screen">
          {inView && timeline.map((scene, i) => view.mounts[i] !== '0' && (
            <FilmSurface key={scene.id} scene={scene} index={i} visible={view.mounts[i] === '2'} playhead={playhead} cache={cache}
              fireworks={i === 0 && fireworks} finishFireworks={finishFireworks} />
          ))}
          <a className="enter-story" href="#opening-scene" ref={enter}>
            <span><Arrow /></span> Scroll to begin
          </a>
        </div>
        <Masthead openIndex={openIndex} />
        <StageFooter index={index} openIndex={openIndex} go={go} playhead={playhead} />
      </div>
      <div className="story-anchors" aria-hidden="true">
        {timeline.map(scene => <span key={scene.id} id={scene.id} style={{ top: (chapterPosition(scene) / timelineLength * 100) + '%' }} />)}
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
        <h2>{scene.label}</h2>
        <p>{scene.description}</p>
        <ul className="static-captions">{scene.captions.map(cue => (
          <li key={cue.at}><strong>{cue.title} {cue.emphasis}</strong><span>{cue.detail}</span></li>
        ))}</ul>
      </article>)}</div>
    </section>
  );
}

function KeepsakeSection({ go }) {
  const section = useRef(null);
  const near = useInView(section, { margin: '400px 0px', once: true });
  return (
    <section id="keepsakes" ref={section} className="keepsakes" aria-labelledby="keepsake-title">
      <div className="keepsake-heading">
        <h2 id="keepsake-title">The keepsakes.</h2>
        <p>Photos, favorite frames, and a postcard for Lisa.</p>
      </div>
      {near && <Suspense fallback={<p className="keepsake-loading" role="status">Opening the keepsakes…</p>}>
        <Keepsakes go={go} />
      </Suspense>}
    </section>
  );
}

function App() {
  const reducedMotion = useSyncExternalStore(subscribeMotion, prefersReducedMotion);
  const [readMode, setReadMode] = useState(() => readLocal('reading') === 'yes');
  const [indexOpen, setIndexOpen] = useState(false);
  const [bookmark, setBookmark] = useState(() => readPlace(readLocal('bookmark') ?? ''));
  const [position, setPosition] = useState(null);
  const staticFilm = reducedMotion || readMode;

  const go = useCallback((place) => {
    const hash = filmHash(place);
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    requestAnimationFrame(() => {
      scrollToPlace(place);
      window.dispatchEvent(new Event('film-navigate'));
    });
  }, []);
  const openIndex = useCallback(() => {
    setPosition(placeAtScroll());
    setIndexOpen(true);
  }, []);
  const closeIndex = useCallback(() => setIndexOpen(false), []);
  const toggleReading = () => {
    const place = position ?? placeAtScroll();
    const linkedPlace = readPlace(window.location.hash);
    if (place) {
      const target = staticFilm && linkedPlace?.id === place.id ? linkedPlace : place;
      window.history.replaceState(null, '', filmHash(target));
    }
    writeLocal('reading', staticFilm ? null : 'yes');
    setReadMode(!staticFilm);
    closeIndex();
  };
  const savePlace = () => {
    if (!position || !writeLocal('bookmark', filmHash(position))) return false;
    setBookmark(position);
    return true;
  };

  useEffect(() => {
    function restore() {
      const hash = window.location.hash;
      const place = readPlace(hash);
      if (place) {
        scrollToPlace(place);
      } else if (hash) {
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
      }
    }
    restore();
    function restoreMoment() {
      const place = readPlace(window.location.hash);
      if (place?.time !== undefined) requestAnimationFrame(() => scrollToPlace(place));
    }
    window.addEventListener('popstate', restoreMoment);
    return () => window.removeEventListener('popstate', restoreMoment);
  }, [staticFilm]);

  useEffect(() => {
    if (indexOpen) return;
    function chapterKeys(event) {
      if (event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey
        || event.target.closest?.('input, textarea, select, [contenteditable], dialog')) return;
      const direction = event.key === '[' ? -1 : event.key === ']' ? 1 : 0;
      const stage = document.querySelector('.film-stage');
      if (!direction || !stage || stage.getBoundingClientRect().top < -5) return;
      const index = timeline.findIndex(scene => scene.id === stage.dataset.active);
      const next = timeline[index + direction];
      if (next) { event.preventDefault(); go({ id: next.id }); }
    }
    document.addEventListener('keydown', chapterKeys);
    return () => document.removeEventListener('keydown', chapterKeys);
  }, [go, indexOpen]);

  return (
    <LazyMotion features={domAnimation} strict>
      <main>
        {staticFilm ? <StaticFilm openIndex={openIndex} /> : <ScrollFilm openIndex={openIndex} go={go} />}
        <Dedication reducedMotion={staticFilm} />
        <KeepsakeSection go={go} />
      </main>
      <SoundControl staticFilm={staticFilm} />
      <ChapterIndex open={indexOpen} onClose={closeIndex} onSelect={go} position={position}
        bookmark={bookmark} savePlace={savePlace} reading={staticFilm} onReading={reducedMotion ? null : toggleReading} />
    </LazyMotion>
  );
}
createRoot(document.getElementById('root')).render(<App />);
