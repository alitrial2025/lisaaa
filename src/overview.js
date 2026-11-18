import manifest from './frame-atlas.json';
import { mediaPath } from './chapters.js';

const stride = 5;
export const overviewColumns = 6;
export const overviewWidth = 96;

export function overviewAt(id, frame) {
  const clip = manifest.clips[id];
  const sampleCount = Math.ceil(clip.count / stride);
  const rows = Math.ceil(sampleCount / overviewColumns);
  const index = Math.max(0, Math.min(Math.round(frame / stride), sampleCount - 1));
  return {
    path: mediaPath('frames/' + id + '-overview.webp'),
    frame: index * stride,
    height: Math.round(overviewWidth * clip.height / clip.width),
    x: index % overviewColumns,
    y: Math.floor(index / overviewColumns),
    rows,
  };
}
