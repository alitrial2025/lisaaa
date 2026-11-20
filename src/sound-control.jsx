import React, { useEffect, useRef, useState } from 'react';
import { placeAtScroll } from './film-navigation.js';
import { createSoundtrack } from './soundtrack.js';
import './sound-control.css';

export function SoundControl({ staticFilm }) {
  const player = useRef(null);
  const intent = useRef(0);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => {
    intent.current++;
    player.current?.close();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const dedication = document.getElementById('for-lisa');
    const keepsakes = document.getElementById('keepsakes');
    let nextFrame = 0;
    let previous;
    let active = true;
    const update = () => {
      nextFrame = 0;
      let cue = null;
      if (!document.hidden) {
        const height = window.innerHeight;
        const gallery = keepsakes.getBoundingClientRect();
        if (gallery.top <= height / 2 || gallery.bottom <= height + 2) cue = 'keepsakes';
        else if (dedication.getBoundingClientRect().top <= height / 2) cue = 'dedication';
        else cue = placeAtScroll().id;
      }
      if (cue === previous) return;
      previous = cue;
      player.current.select(cue).catch(() => {
        if (!active || cue !== previous) return;
        void player.current.select(null);
        setEnabled(false);
        setError('Soundtrack unavailable. Try again.');
      });
    };
    const schedule = () => { if (!nextFrame) nextFrame = requestAnimationFrame(update); };
    const handleVisibility = () => {
      cancelAnimationFrame(nextFrame);
      if (!document.hidden) void player.current.unlock().catch(() => {});
      update();
    };
    schedule();
    const observer = new ResizeObserver(schedule);
    observer.observe(keepsakes);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    window.addEventListener('film-navigate', schedule);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      active = false;
      cancelAnimationFrame(nextFrame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
      window.removeEventListener('film-navigate', schedule);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, staticFilm]);

  async function toggle() {
    const request = ++intent.current;
    setError('');
    if (enabled) {
      setEnabled(false);
      void player.current.select(null);
      return;
    }
    try {
      player.current ??= createSoundtrack();
      await player.current.unlock();
      if (request === intent.current) setEnabled(true);
    } catch {
      if (request === intent.current) setError('Soundtrack unavailable. Try again.');
    }
  }

  return (
    <div className="sound-control">
      <button type="button" aria-pressed={enabled} aria-label="Soundtrack"
        title={enabled ? 'Mute soundtrack' : 'Play soundtrack'} onClick={toggle}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 9h4l5-4v14l-5-4H3z" />
          {enabled ? <path d="M16 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12" /> : <path d="m16 10 4 4m0-4-4 4" />}
        </svg>
        <span>Sound</span>
      </button>
      <span className="sound-control__notice" role="status">{error}</span>
    </div>
  );
}
