import React, { useCallback, useEffect, useRef, useState } from 'react';
import { m, useInView, useMotionValue, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import { Celebration } from './celebration.jsx';
import { graduationPhotos } from './graduation-photos.js';
import { mediaPath } from './chapters.js';
import './dedication.css';

function GraduationPrint({ photo, index, progress }) {
  // Separate the prints before changing their stacking order.
  const stops = [0, .48, 1];
  const x = useTransform(progress, stops, index ? ['35%', '52%', '17%'] : ['-12%', '-46%', '-34%']);
  const rotate = useTransform(progress, stops, index ? [7, 9, 2] : [-3, -8, -9]);
  const scale = useTransform(progress, stops, index ? [.83, .84, 1] : [1, .84, .80]);
  const zIndex = useTransform(progress, value => Number(index === (value < .48 ? 0 : 1)) + 1);
  return (
    <m.figure className="graduation-print" style={{ x, rotate, scale, zIndex }}>
      <img src={mediaPath(photo.file)} width="688" height="1032" loading="lazy" decoding="async" alt={photo.alt} />
      <figcaption>{photo.title}</figcaption>
    </m.figure>
  );
}

export function Dedication({ reducedMotion }) {
  const section = useRef(null);
  const stage = useRef(null);
  const signoff = useRef(null);
  const celebrated = useRef(false);
  const signoffInView = useInView(signoff, { amount: .7, margin: '0px 0px -30px 0px' });
  const [confetti, setConfetti] = useState(false);
  const finishConfetti = useCallback(() => setConfetti(false), []);
  const progress = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const [selected, setSelected] = useState(0);
  const active = useRef(0);
  useMotionValueEvent(progress, 'change', value => {
    const next = value < .48 ? 0 : 1;
    if (next !== active.current) {
      active.current = next;
      setSelected(next);
    }
  });

  useEffect(() => {
    const short = window.matchMedia('(max-height: 660px)');
    const sync = () => {
      if (!reducedMotion && !short.matches) progress.set(scrollYProgress.get());
    };
    sync();
    const unsubscribe = scrollYProgress.on('change', sync);
    short.addEventListener('change', sync);
    return () => { unsubscribe(); short.removeEventListener('change', sync); };
  }, [progress, reducedMotion, scrollYProgress]);

  function choosePhoto(index) {
    const distance = section.current.offsetHeight - stage.current.offsetHeight;
    if (reducedMotion || distance < 2) {
      progress.set(index);
      return;
    }
    window.scrollTo({
      top: window.scrollY + section.current.getBoundingClientRect().top + distance * index,
      behavior: 'smooth',
    });
  }

  useEffect(() => {
    if (reducedMotion || !signoffInView || celebrated.current) return;
    const timer = window.setTimeout(() => {
      if (!document.hidden) {
        celebrated.current = true;
        setConfetti(true);
      }
    }, 190);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, signoffInView]);

  return (
    <section id="for-lisa" ref={section} className="endpaper" data-static={reducedMotion || undefined} aria-labelledby="dedication-title">
      <div className="graduation-stage" ref={stage}>
        {!reducedMotion && confetti && <Celebration kind="confetti" onFinish={finishConfetti} />}
        <div className="graduation-spread">
          <div className="graduation-album">
            <div className="graduation-prints">
              {graduationPhotos.map((photo, index) => (
                <GraduationPrint key={photo.file} photo={photo} index={index} progress={progress} />
              ))}
            </div>
            <div className="graduation-selector" role="group" aria-label="Graduation photos">
              {['The portrait', 'The candid'].map((label, index) => (
                <button key={label} type="button" aria-pressed={selected === index} onClick={() => choosePhoto(index)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="endpaper__letter">
            <p className="endpaper__kicker">Graduation day <span aria-hidden="true">/</span> Class of 2026</p>
            <h2 id="dedication-title">Here’s to<br /><em>you, Lisa.</em></h2>
            <p className="endpaper__message">
              For the pages you filled, the friends who shared them, and the smile you carried
              through it all. We’re so proud of you.
            </p>
            <p className="endpaper__signoff" ref={signoff}>Happy graduation.</p>
          </div>
        </div>
        <footer className="endpaper__footer">
          <a href="#keepsakes">Explore the keepsakes <span aria-hidden="true">↓</span></a>
          <a href="#top">Back to the opening <span aria-hidden="true">↑</span></a>
        </footer>
      </div>
    </section>
  );
}
