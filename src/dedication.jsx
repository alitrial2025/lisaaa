import React, { useRef } from 'react';
import { m, useScroll, useTransform } from 'motion/react';
import { PortraitImage } from './portraits.jsx';
import './dedication.css';

export function Dedication({ reducedMotion }) {
  const section = useRef(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start end', 'end end'] });
  const rearY = useTransform(scrollYProgress, [0, 1], [54, 0]);
  const frontY = useTransform(scrollYProgress, [0, 1], [94, 0]);
  const rearTilt = useTransform(scrollYProgress, [0, 1], [-13, -8]);
  const frontTilt = useTransform(scrollYProgress, [0, 1], [12, 7]);
  const letterMotion = reducedMotion ? {} : {
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.13 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  };

  return (
    <section id="for-lisa" className="endpaper" ref={section} aria-labelledby="dedication-title">
      <div className="endpaper__inside">
        <div className="endpaper__spread">
          <m.div className="endpaper__letter" {...letterMotion}>
            <p className="endpaper__kicker">A dedication</p>
            <h2 id="dedication-title">Here’s to<br /><em>you, Lisa.</em></h2>
            <p className="endpaper__message">
              For the pages you filled, the friends who shared them, and the smile you carried
              through it all. We’re so proud of you.
            </p>
            <p className="endpaper__signoff">Happy graduation.</p>
          </m.div>
          <div className="endpaper__album">
            <m.figure
              className="endpaper__print endpaper__print--study"
              style={reducedMotion ? { rotate: -8 } : { y: rearY, rotate: rearTilt }}
            >
              <div className="endpaper__photo">
                <PortraitImage name="reading" sizes="(max-width: 740px) 51vw, 27vw" />
              </div>
              <figcaption>Study days</figcaption>
            </m.figure>
            <m.figure
              className="endpaper__print endpaper__print--smile"
              style={reducedMotion ? { rotate: 7 } : { y: frontY, rotate: frontTilt }}
            >
              <div className="endpaper__photo">
                <PortraitImage name="smiling" sizes="(max-width: 740px) 50vw, 26vw" />
              </div>
              <figcaption>Between pages</figcaption>
            </m.figure>
          </div>
        </div>
        <footer className="endpaper__footer">
          <span>Class of 2026</span>
          <a href="#top">
            Back to the opening
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none">
              <path d="M8 13V3m-4 4 4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </footer>
      </div>
    </section>
  );
}
