import { timeline, timelineLength } from './chapters.js';
import { clamp } from './scene-motion.js';

export const handoff = 0.14;

export function chapterPosition(scene, time) {
  if (time === undefined) return scene.start + (scene.start === 0 ? 0 : handoff + 0.012);
  return scene.start + clamp(time / scene.duration) * scene.length;
}

export function sceneAt(position) {
  return timeline.findLast(scene => position >= scene.start) ?? timeline[0];
}

export function placeAtScroll() {
  const film = document.querySelector('.film');
  if (!film) {
    const articles = [...document.querySelectorAll('.static-chapters article')]
      .map(article => ({ id: article.id, top: article.getBoundingClientRect().top }));
    const rowTop = articles.findLast(article => article.top <= window.innerHeight / 2)?.top;
    const row = articles.filter(article => article.top === rowTop);
    const linked = readPlace(window.location.hash);
    const chapter = row.find(article => article.id === linked?.id) ?? row[0];
    return { id: chapter?.id ?? timeline[0].id };
  }
  const distance = film.offsetHeight - film.querySelector('.film-stage').offsetHeight;
  const position = clamp(-film.getBoundingClientRect().top / distance) * timelineLength;
  const scene = sceneAt(position);
  const time = clamp((position - scene.start) / scene.length) * scene.duration;
  return { id: scene.id, time: Number(time.toFixed(2)) };
}

export function filmHash({ id, time }) {
  return '#' + id + (time === undefined ? '' : '@' + time.toFixed(2));
}

export function readPlace(hash) {
  const [id, rawTime] = hash.replace(/^#/, '').split('@');
  if (!timeline.some(scene => scene.id === id)) return null;
  const time = Number(rawTime);
  return { id, ...(rawTime?.length && Number.isFinite(time) && time >= 0 ? { time } : {}) };
}

export function scrollToPlace({ id, time }) {
  const scene = timeline.find(chapter => chapter.id === id);
  if (!scene) return;
  const film = document.querySelector('.film');
  if (film && time !== undefined) {
    const distance = film.offsetHeight - film.querySelector('.film-stage').offsetHeight;
    window.scrollTo({
      top: window.scrollY + film.getBoundingClientRect().top + distance * chapterPosition(scene, time) / timelineLength,
      behavior: 'instant',
    });
  } else {
    const anchor = document.getElementById(id);
    anchor?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
}

export function readLocal(key) {
  try { return localStorage.getItem('lisa:' + key); } catch { return null; }
}

export function writeLocal(key, value) {
  try {
    if (value === null) localStorage.removeItem('lisa:' + key);
    else localStorage.setItem('lisa:' + key, value);
    return true;
  } catch { return false; }
}
