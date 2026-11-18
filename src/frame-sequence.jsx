import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import manifest from './frame-atlas.json';
import { mediaPath } from './chapters.js';
import { clamp } from './scene-motion.js';
import { overviewAt, overviewWidth } from './overview.js';

const { fps, columns, rows, clips } = manifest;
const framesPerSheet = columns * rows;
const cacheLimit = 5;
const ambientWidth = 36;

export function createFrameCache() {
  const sheets = new Map();
  const sourceClips = new Set();
  const overviews = new Map();

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
    overview(clip) {
      if (!overviews.has(clip)) {
        const image = new Image();
        const entry = { image };
        image.decoding = 'async';
        image.fetchPriority = 'low';
        image.src = overviewAt(clip, 0).path;
        entry.ready = image.decode().catch(() => {});
        overviews.set(clip, entry);
      }
      return overviews.get(clip);
    },
    useSource(clip) {
      sourceClips.add(clip);
    },
    usesSource(clip) {
      return sourceClips.has(clip);
    },
    clear() {
      sheets.forEach(release);
      sheets.clear();
      overviews.clear();
    },
  };
}

// The atmosphere samples the already decoded frame. Its small backing store keeps
// each redraw inexpensive even when the ambient image fills a wide viewport.
function drawAmbient(canvas, source, tile) {
  if (!canvas) return;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return;
  // Blur the small sample before compositing it across the entire viewport.
  context.filter = 'blur(1.25px) saturate(.73)';
  const destination = [-3, -3, canvas.width + 6, canvas.height + 6];
  context.drawImage(source, ...(tile ? [...tile, ...destination] : destination));
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

export const FrameSequence = memo(function FrameSequence({ chapter, visible, playhead, cache, onFrame }) {
  const canvas = useRef(null);
  const previewCanvas = useRef(null);
  const ambientCanvas = useRef(null);
  const [useSource, setUseSource] = useState(() => cache.usesSource(chapter.id));
  const [nativeFrame, setNativeFrame] = useState(0);
  const { count, width, height } = clips[chapter.id];
  const { id, start, length } = chapter;

  useEffect(() => {
    if (!visible && !useSource) {
      cache.get(id, 0, 'low');
      cache.overview(id);
    }
  }, [cache, id, useSource, visible]);

  useLayoutEffect(() => {
    if (!visible) return;
    const target = canvas.current;
    const context = target?.getContext('2d', { alpha: false, desynchronized: true });
    const preview = previewCanvas.current;
    const previewContext = preview?.getContext('2d', { alpha: false, desynchronized: true });
    let active = true;
    let lastPaint = -1;
    let lastFrame = -1;
    let wantedSheet = -1;
    let pendingSheet;
    let direction = 1;
    let renderedOverview = false;
    let rapid = false;
    let settleTimer;
    let lastPosition = playhead.get();
    let lastUpdate = 0;

    function warm(frame) {
      const lookAhead = frame + direction * 6;
      const next = Math.floor(lookAhead / framesPerSheet);
      if (lookAhead >= 0 && lookAhead < count && next !== wantedSheet) cache.get(id, next, 'low');
    }

    function drawExact() {
      const tile = lastFrame % framesPerSheet;
      const crop = [(tile % columns) * width, Math.floor(tile / columns) * height, width, height];
      context.drawImage(pendingSheet.bitmap, ...crop, 0, 0, width, height);
      drawAmbient(ambientCanvas.current, pendingSheet.bitmap, crop);
      if (!target.hasAttribute('data-ready')) target.dataset.ready = '';
      if (target.dataset.quality !== 'full') target.dataset.quality = 'full';
      if (renderedOverview) preview.removeAttribute('data-ready');
      renderedOverview = false;
      lastPaint = lastFrame;
      onFrame(lastFrame / fps);
      warm(lastFrame);
    }

    function drawPreview(entry) {
      if (!active || !previewContext || (!rapid && pendingSheet?.bitmap) || !entry.image.naturalWidth) return;
      const sample = overviewAt(id, lastFrame);
      if (lastPaint === sample.frame && renderedOverview) return;
      const crop = [sample.x * overviewWidth, sample.y * sample.height, overviewWidth, sample.height];
      previewContext.drawImage(entry.image, ...crop, 0, 0, preview.width, preview.height);
      drawAmbient(ambientCanvas.current, entry.image, crop);
      if (!renderedOverview) {
        preview.dataset.ready = '';
        target.dataset.quality = 'preview';
      }
      renderedOverview = true;
      lastPaint = sample.frame;
      onFrame(sample.frame / fps);
    }

    function requestSheet(index) {
      const sheet = cache.get(id, index, 'high');
      pendingSheet = sheet;
      wantedSheet = index;
      if (sheet.bitmap) return;
      sheet.pending.then((bitmap) => {
        if (!active || pendingSheet !== sheet) return;
        if (bitmap) {
          if (!rapid) drawExact();
        }
        else if (sheet.controller.signal.aborted) requestSheet(index);
        else {
          cache.useSource(id);
          setUseSource(true);
        }
      });
    }

    function settle() {
      rapid = false;
      const index = Math.floor(lastFrame / framesPerSheet);
      if (index !== wantedSheet) requestSheet(index);
      if (pendingSheet.bitmap) drawExact();
      else if (Math.abs(lastFrame - lastPaint) >= 5) {
        const entry = cache.overview(id);
        if (entry.image.complete) drawPreview(entry);
      }
    }

    function update(position) {
      const now = performance.now();
      const elapsed = now - lastUpdate;
      const fast = lastUpdate > 0 && elapsed < 160
        && Math.abs(position - lastPosition) / Math.max(10, elapsed) > (elapsed > 26 ? .00085 : .0012);
      lastPosition = position;
      lastUpdate = now;
      const frame = Math.round(clamp((position - start) / length) * (count - 1));
      if (frame === lastFrame) return;
      if (useSource) {
        lastFrame = frame;
        setNativeFrame(frame);
        return;
      }
      direction = frame < lastFrame ? -1 : 1;
      lastFrame = frame;
      clearTimeout(settleTimer);
      const overview = cache.overview(id);
      if ((fast || (rapid && elapsed < 100)) && overview.image.complete && overview.image.naturalWidth) {
        rapid = true;
        drawPreview(overview);
        settleTimer = setTimeout(settle, 85);
      } else {
        settle();
      }
    }

    if (!useSource && !context) {
      cache.useSource(id);
      setUseSource(true);
      return;
    }
    if (!useSource) {
      const overview = cache.overview(id);
      overview.ready.then(() => { if (lastFrame >= 5 && Math.abs(lastFrame - lastPaint) >= 5) drawPreview(overview); });
    }
    update(playhead.get());
    const unsubscribe = playhead.on('change', update);
    return () => { active = false; clearTimeout(settleTimer); unsubscribe(); };
  }, [cache, count, height, id, length, onFrame, playhead, start, useSource, visible, width]);

  return (
    <>
      <div className="film-backdrop" aria-hidden="true">
        <img
          src={mediaPath(id + '.webp')}
          alt=""
          width={width}
          height={height}
          fetchPriority={id === 'library' ? 'high' : 'auto'}
          loading={visible ? 'eager' : 'lazy'}
          decoding="async"
        />
        {!useSource && <>
          <canvas ref={canvas} width={width} height={height} />
          <canvas ref={previewCanvas} width={overviewWidth} height={Math.round(overviewWidth * height / width)} />
        </>}
        {visible && useSource && (
          <NativeFrames chapter={chapter} frame={nativeFrame} ambient ambientCanvas={ambientCanvas} onFrame={onFrame} />
        )}
      </div>
      <div className="film-ambient" aria-hidden="true" style={{ backgroundImage: 'url("' + mediaPath(id + '-wash.webp') + '")' }}>
        <canvas ref={ambientCanvas} width={ambientWidth} height={Math.round(ambientWidth * height / width)} />
      </div>
    </>
  );
});
