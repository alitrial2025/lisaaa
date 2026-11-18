import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { mediaPath, timeline } from './chapters.js';
import manifest from './frame-atlas.json';
import { overviewAt, overviewColumns } from './overview.js';
import './keepsakes.css';

const photos = [
  { file: 'lisa-smiling.webp', small: 'lisa-smiling-420.webp', title: 'Between classes', alt: 'Lisa smiling at her phone in a blue T-shirt.' },
  { file: 'lisa-reading.webp', small: 'lisa-reading-420.webp', title: 'Study days', alt: 'Lisa reading notes in her orange hoodie.' },
  ...timeline.map(scene => ({ file: scene.id + '.webp', title: scene.label, alt: scene.description })),
];

function Gallery() {
  const [photo, setPhoto] = useState(null);
  const dialog = useRef(null);
  const open = photo !== null;
  const move = direction => setPhoto(index => (index + direction + photos.length) % photos.length);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    element.showModal();
    root.style.overflow = 'hidden';
    return () => { element.close(); root.style.overflow = overflow; };
  }, [open]);

  return (
    <>
      <div className="keepsake-gallery">
        {photos.map(({ file, small, title }, index) => (
          <button className="keepsake-photo" type="button" key={file} onClick={() => setPhoto(index)} aria-haspopup="dialog">
            <span><img src={mediaPath(small ?? file)} alt="" loading="lazy" decoding="async" /></span>
            {title}<span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      {open && createPortal(
        <dialog ref={dialog} className="keepsake-viewer" aria-labelledby="keepsake-photo-title"
          onCancel={event => { event.preventDefault(); setPhoto(null); }}
          onClick={event => { if (event.target === event.currentTarget) setPhoto(null); }}
          onKeyDown={event => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              move(event.key === 'ArrowLeft' ? -1 : 1);
            }
          }}>
          <div className="viewer-body">
            <header>
              <h3 id="keepsake-photo-title">{photos[photo].title}</h3>
              <button type="button" autoFocus onClick={() => setPhoto(null)} aria-label="Close photo">×</button>
            </header>
            <img src={mediaPath(photos[photo].file)} alt={photos[photo].alt} />
            <footer>
              <button type="button" onClick={() => move(-1)}>Previous</button>
              <span aria-live="polite">{photo + 1} / {photos.length}</span>
              <button type="button" onClick={() => move(1)}>Next</button>
            </footer>
          </div>
        </dialog>, document.body)}
    </>
  );
}

function MomentSheet({ go }) {
  const [chapter, setChapter] = useState(0);
  const scene = timeline[chapter];
  return (
    <div className="moment-sheet">
      <label>Chapter
        <select value={chapter} onChange={event => setChapter(Number(event.target.value))}>
          {timeline.map(({ label }, index) => <option value={index} key={label}>{label}</option>)}
        </select>
      </label>
      <div className="moment-frames">
        {scene.captions.map(cue => {
          const time = cue.at === 0 && scene.start === 0 ? 0 : Math.min(cue.at + 1.25, scene.duration);
          const sample = overviewAt(scene.id, time * manifest.fps);
          return <button type="button" key={cue.at} onClick={() => go({ id: scene.id, time })}>
            <span aria-hidden="true" className="moment-still" style={{
              aspectRatio: scene.ratio,
              backgroundImage: 'url("' + sample.path + '")',
              backgroundSize: (overviewColumns * 100) + '% ' + (sample.rows * 100) + '%',
              backgroundPosition: (sample.x / (overviewColumns - 1) * 100) + '% ' + (sample.y / (sample.rows - 1) * 100) + '%',
            }} />
            {cue.title} {cue.emphasis}
          </button>;
        })}
      </div>
    </div>
  );
}

function Postcard() {
  const [message, setMessage] = useState('');
  const [copy, setCopy] = useState('');
  const [busy, setBusy] = useState(false);

  async function download(event) {
    event.preventDefault();
    setBusy(true);
    setCopy('');
    try {
      const { exportPostcard } = await import('./postcard.js');
      await exportPostcard(message.trim());
      setCopy('Postcard ready to save.');
    } catch {
      setCopy('The postcard could not be created. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="postcard-panel">
      <div className="postcard-preview">
        <div><span>Class of 2026</span><p>For <em>Lisa.</em></p><small>{message.trim() || 'Happy graduation.'}</small></div>
        <img src={mediaPath('lisa-smiling-420.webp')} alt="" loading="lazy" />
      </div>
      <form onSubmit={download}>
        <label htmlFor="postcard-message">Add your own message</label>
        <p>Make a copy to send to Lisa, or save the original.</p>
        <textarea id="postcard-message" rows="4" maxLength={160} placeholder="Happy graduation." value={message}
          onChange={event => { setMessage(event.target.value); setCopy(''); }} />
        <button type="submit" disabled={busy}>{busy ? 'Preparing postcard…' : 'Download postcard'}</button>
        <p className="postcard-status" role="status">{copy}</p>
      </form>
    </div>
  );
}

function FilmNotes({ go }) {
  return (
    <div className="film-notes">
      {timeline.map(scene => (
        <details key={scene.id}>
          <summary>{scene.label}</summary>
          <p>{scene.description}</p>
          <ul>{scene.captions.map(cue => (
            <li key={cue.at}>
              <button type="button" onClick={() => go({ id: scene.id, time: cue.at + 1.25 })}>{cue.title} {cue.emphasis}</button>
              <p>{cue.detail}</p>
            </li>
          ))}</ul>
        </details>
      ))}
    </div>
  );
}

export default function Keepsakes({ go }) {
  const [view, setView] = useState('Gallery');
  return (
    <>
      <nav className="keepsake-nav" aria-label="Keepsake collections">
        {['Gallery', 'Moments', 'Postcard', 'Film notes'].map(label => (
          <button key={label} type="button" aria-pressed={view === label} onClick={() => setView(label)}>{label}</button>
        ))}
      </nav>
      {view === 'Gallery' && <Gallery />}
      {view === 'Moments' && <MomentSheet go={go} />}
      {view === 'Postcard' && <Postcard />}
      {view === 'Film notes' && <FilmNotes go={go} />}
    </>
  );
}
