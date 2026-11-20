import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { mediaPath, timeline } from './chapters.js';
import { graduationPhotos } from './graduation-photos.js';
import './chapter-index.css';

import { filmHash } from './film-navigation.js';

function ShareMoment({ position }) {
  const [notice, setNotice] = useState('');
  const [showLink, setShowLink] = useState(false);
  const input = useRef(null);
  const address = new URL(window.location.href);
  address.hash = position ? filmHash(position) : '';

  async function share() {
    setNotice('');
    setShowLink(false);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Becoming Lisa', url: address.href });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(address.href);
      setNotice('Link copied.');
    } catch {
      setShowLink(true);
    }
  }

  useLayoutEffect(() => {
    if (showLink) { input.current.focus(); input.current.select(); }
  }, [showLink]);

  return (
    <div className="moment-share">
      <button type="button" onClick={share}>{position ? 'Share this moment' : 'Share the film'}</button>
      {notice && <span role="status">{notice}</span>}
      {showLink && <input ref={input} aria-label="Link to copy" value={address.href} readOnly />}
    </div>
  );
}

function ChapterTools({ position, bookmark, savePlace, reading, onReading, choose, visitSection }) {
  const [status, setStatus] = useState('');
  return (
    <>
      <div className="chapter-tools">
        <ShareMoment position={position} />
        {position && !reading && <button type="button" onClick={() => setStatus(savePlace() ? 'Place saved on this device.' : 'This device could not save your place.')}>Save my place</button>}
        {bookmark && <button type="button" onClick={() => choose(bookmark)}>Return to saved place</button>}
        {onReading && <button type="button" onClick={onReading}>{reading ? 'Return to scroll view' : 'Read the story'}</button>}
        <a href="#keepsakes" onClick={visitSection}>Keepsakes ↗</a>
      </div>
      <div className="chapter-tools__foot">
        {!reading && <span>Previous chapter <kbd>[</kbd> &nbsp; Next chapter <kbd>]</kbd></span>}
        <span role="status">{status}</span>
      </div>
    </>
  );
}

export function ChapterIndex({ open, onClose, onSelect, position, bookmark, savePlace, reading, onReading }) {
  const dialog = useRef(null);

  useLayoutEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    element.showModal();
    root.style.overflow = 'hidden';

    return () => {
      root.style.overflow = previousOverflow;
      element.close();
    };
  }, [open]);

  const choose = place => { onClose(); onSelect(place); };
  function visitSection(event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const hash = event.currentTarget.hash;
    onClose();
    requestAnimationFrame(() => {
      if (location.hash !== hash) history.pushState(null, '', hash);
      const section = document.getElementById(hash.slice(1));
      section?.scrollIntoView({ behavior: 'instant' });
      const title = section?.querySelector('h2');
      title?.setAttribute('tabindex', '-1');
      title?.focus({ preventScroll: true });
    });
  }

  return createPortal(
    <dialog
      id="chapter-index"
      ref={dialog}
      className="chapter-index"
      aria-labelledby="chapter-index-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      {open && (
        <div className="chapter-index__sheet">
          <header className="chapter-index__heading">
            <h2 id="chapter-index-title">Chapters</h2>
            <button type="button" className="chapter-index__close" onClick={onClose} aria-label="Close chapters" autoFocus>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </header>
          <div className="chapter-index__contents">
            <ol className="chapter-index__frames">
              {timeline.map(({ id, label }, index) => (
                <li key={id}>
                  <button
                    className="chapter-index__frame"
                    type="button"
                    aria-current={position?.id === id ? 'step' : undefined}
                    onClick={() => choose({ id })}
                  >
                    <span className="chapter-index__still">
                      <img src={mediaPath(id + '.webp')} alt="" decoding="async" />
                    </span>
                    <span className="chapter-index__caption">
                      <span className="chapter-index__number" aria-hidden="true">0{index + 1}</span>
                      <span className="chapter-index__name">{label}</span>
                      <svg className="chapter-index__arrow" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M3 13 13 3M4 3h9v9" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <a className="chapter-cover" href="#for-lisa" onClick={visitSection}>
              <img src={mediaPath(graduationPhotos[0].file)} alt="" width="688" height="1032" />
              <span><small>For Lisa</small><em>Graduation day</em></span>
              <svg className="cover-arrow" width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 13 13 3M4 3h9v9" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </a>
          </div>
          <ChapterTools position={position} bookmark={bookmark} savePlace={savePlace} reading={reading}
            onReading={onReading} choose={choose} visitSection={visitSection} />
        </div>
      )}
    </dialog>,
    document.body,
  );
}
