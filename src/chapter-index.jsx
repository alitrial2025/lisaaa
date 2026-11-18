import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { mediaPath } from './chapters.js';
import './chapter-index.css';

const chapters = [
  { id: 'library', title: 'The library' },
  { id: 'notes', title: 'The notebook' },
  { id: 'writing', title: 'The work' },
  { id: 'friends', title: 'Together' },
];

export function ChapterIndex({ open, onClose, onSelect }) {
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
          <ol className="chapter-index__frames">
            {chapters.map(({ id, title }, index) => (
              <li key={id}>
                <button
                  className="chapter-index__frame"
                  type="button"
                  onClick={() => { onClose(); onSelect(id); }}
                >
                  <span className="chapter-index__still">
                    <img src={mediaPath(id + '.webp')} alt="" decoding="async" />
                  </span>
                  <span className="chapter-index__caption">
                    <span className="chapter-index__number" aria-hidden="true">0{index + 1}</span>
                    <span className="chapter-index__name">{title}</span>
                    <svg className="chapter-index__arrow" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 13 13 3M4 3h9v9" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </dialog>,
    document.body,
  );
}
