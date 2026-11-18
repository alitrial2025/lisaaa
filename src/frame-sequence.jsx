import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import manifest from './frame-atlas.json';
import { mediaPath } from './chapters.js';

const { fps, columns, rows, clips } = manifest;
const framesPerSheet = columns * rows;
const cacheLimit = 4;
const ambientWidth = 36;

export function createFrameCache() {
  const sheets = new Map();
  const sourceClips = new Set();

  function release(sheet) {
    sheet.controller.abort();
    sheet.bitmap?.close();
  }

  function get(clip, index, priority) {
    const key = `${clip}/${String(index).padStart(3, '0')}`;
    const existing = sheets.get(key);
    if (existing) {
      sheets.delete(key);
      sheets.set(key, existing);
      return existing;
    }

    const controller = new AbortController();
    const sheet = { controller, bitmap: null };
    sheet.pending = fetch(mediaPath(`frames/${key}.avif`), { signal: controller.signal, priority })
      .then((response) => {
        if (!response.ok) throw new Error(`Frame sheet unavailable: ${response.status}`);
        return response.blob();
      })
      .then((blob) => createImageBitmap(blob))
      .then((bitmap) => {
        if (controller.signal.aborted) {
          bitmap.close();
          return null;
        }
        sheet.bitmap = bitmap;
        return bitmap;
      })
      .catch(() => {
        if (sheets.get(key) === sheet) sheets.delete(key);
        return null;
      });
    sheets.set(key, sheet);
    if (sheets.size > cacheLimit) {
      const oldest = sheets.keys().next().value;
      release(sheets.get(oldest));
      sheets.delete(oldest);
    }
    return sheet;
  }

  return {
    get,
    useSource(clip) {
      sourceClips.add(clip);
    },
    usesSource(clip) {
      return sourceClips.has(clip);
    },
    clear() {
      sheets.forEach(release);
      sheets.clear();
    },
  };
}

// The atmosphere samples the already decoded frame. Its small backing store keeps
// each redraw inexpensive even when the ambient image fills a wide viewport.
function drawAmbient(canvas, source) {
  if (!canvas) return;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  canvas.dataset.ready = '';
}

function NativeFrames({ chapter, frame, ambient, ambientCanvas, onFrame }) {
  const video = useRef(null);
  const lastPaint = useRef(-1);
  const [unavailable, setUnavailable] = useState(false);
  const [ready, setReady] = useState(false);
  const targetTime = frame / fps;

  useLayoutEffect(() => {
    lastPaint.current = -1;
  }, [ambient]);

  const sync = useCallback(() => {
    const element = video.current;
    if (!element || element.seeking || element.readyState < 1) return;

    const target = Math.min(targetTime, element.duration);
    if (element.readyState >= 2 && element.currentTime !== lastPaint.current) {
      lastPaint.current = element.currentTime;
      drawAmbient(ambientCanvas.current, element);
      setReady(true);
      onFrame(element.currentTime);
    }
    if (Math.abs(element.currentTime - target) > 0.001) element.currentTime = target;
  }, [ambientCanvas, onFrame, targetTime]);

  useLayoutEffect(() => {
    if (unavailable) onFrame(targetTime);
    else sync();
  }, [ambient, onFrame, sync, targetTime, unavailable]);

  if (unavailable) return null;
  return (
    <video
      ref={video}
      src={mediaPath(`${chapter.id}.mp4`)}
      poster={mediaPath(`${chapter.id}.webp`)}
      muted
      playsInline
      disablePictureInPicture
      disableRemotePlayback
      preload="auto"
      controls={false}
      style={{ visibility: ready ? 'visible' : 'hidden' }}
      onLoadedMetadata={sync}
      onLoadedData={sync}
      onSeeked={sync}
      onError={() => setUnavailable(true)}
    />
  );
}

export const FrameSequence = memo(function FrameSequence({ chapter, visible, progress, cache, onFrame, ambient = true }) {
  const canvas = useRef(null);
  const ambientCanvas = useRef(null);
  const previous = useRef(0);
  const [useSource, setUseSource] = useState(() => cache.usesSource(chapter.id));
  const { count, width, height } = clips[chapter.id];
  const frame = Math.round(progress * (count - 1));
  const sheetIndex = Math.floor(frame / framesPerSheet);

  useEffect(() => {
    if (!visible && !useSource) cache.get(chapter.id, 0, 'low');
  }, [cache, chapter.id, useSource, visible]);

  useLayoutEffect(() => {
    if (!visible || useSource) return;

    function switchToSource() {
      cache.useSource(chapter.id);
      setUseSource(true);
    }

    const target = canvas.current;
    const context = target.getContext('2d', { alpha: false });
    if (!context) {
      switchToSource();
      return;
    }

    let cancelled = false;
    const direction = frame < previous.current ? -1 : 1;
    previous.current = frame;
    const adjacent = sheetIndex + direction;

    function draw(bitmap) {
      const tile = frame % framesPerSheet;
      const x = (tile % columns) * width;
      const y = Math.floor(tile / columns) * height;
      context.drawImage(bitmap, x, y, width, height, 0, 0, width, height);
      target.dataset.ready = '';
      drawAmbient(ambientCanvas.current, target);
      onFrame(frame / fps);
      if (adjacent >= 0 && adjacent * framesPerSheet < count) cache.get(chapter.id, adjacent, 'low');
    }

    function requestFrame() {
      const sheet = cache.get(chapter.id, sheetIndex, 'high');
      if (sheet.bitmap) {
        draw(sheet.bitmap);
        return;
      }
      sheet.pending.then((bitmap) => {
        if (cancelled) return;
        if (bitmap) draw(bitmap);
        else if (sheet.controller.signal.aborted) requestFrame();
        else switchToSource();
      });
    }

    requestFrame();
    return () => { cancelled = true; };
  }, [ambient, cache, chapter.id, count, frame, height, onFrame, sheetIndex, useSource, visible, width]);

  return (
    <>
      <div className="film-backdrop" aria-hidden="true">
        <img
          src={mediaPath(`${chapter.id}.webp`)}
          alt=""
          width={width}
          height={height}
          fetchPriority={chapter.id === 'library' ? 'high' : 'auto'}
          loading={visible ? 'eager' : 'lazy'}
          decoding="async"
        />
        {!useSource && <canvas ref={canvas} width={width} height={height} />}
        {visible && useSource && (
          <NativeFrames chapter={chapter} frame={frame} ambient={ambient} ambientCanvas={ambientCanvas} onFrame={onFrame} />
        )}
      </div>
      {ambient && (
        <div
          className="film-ambient"
          aria-hidden="true"
          style={{ backgroundImage: `url("${mediaPath(`${chapter.id}-wash.webp`)}")` }}
        >
          <canvas ref={ambientCanvas} width={ambientWidth} height={Math.round(ambientWidth * height / width)} />
        </div>
      )}
    </>
  );
});
