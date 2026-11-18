export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function smoothstep(value) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

// Both directions use the same shot times and the same reveal.
export function captionsAt(cues, time) {
  const index = Math.max(0, cues.findLastIndex(({ at }) => time >= at));
  const cue = cues[index];
  const previous = cues[index - 1];
  const mix = previous ? smoothstep((time - cue.at) / 0.95) : 1;
  return [
    ...(previous && mix < 1 ? [{ cue: previous, alpha: 1 - mix, offset: -mix }] : []),
    { cue, alpha: mix, offset: 1 - mix },
  ];
}
