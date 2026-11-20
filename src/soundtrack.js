import { mediaPath } from './chapters.js';

export function createSoundtrack() {
  const Audio = window.AudioContext ?? window.webkitAudioContext;
  const context = new Audio();
  const master = context.createGain();
  master.gain.value = .7;
  master.connect(context.destination);
  const tracks = new Map();
  const downloads = new AbortController();
  let requested = null;
  let playing = null;

  function load(cue) {
    if (!tracks.has(cue)) {
      const track = fetch(mediaPath('score/' + cue + '.mp3'), { signal: downloads.signal })
        .then(response => {
          if (!response.ok) throw new Error('Soundtrack unavailable');
          return response.arrayBuffer();
        })
        .then(bytes => context.decodeAudioData(bytes))
        .catch(error => {
          tracks.delete(cue);
          throw error;
        });
      tracks.set(cue, track);
    }
    return tracks.get(cue);
  }

  async function select(cue) {
    const request = { cue };
    requested = request;
    if (cue === playing?.cue) return;

    let buffer;
    if (cue) {
      try {
        buffer = await load(cue);
      } catch (error) {
        if (requested === request) throw error;
        return;
      }
    }
    if (requested !== request) return;

    const time = context.currentTime;
    const outgoing = playing;
    playing = null;
    if (outgoing) {
      outgoing.gain.gain.setTargetAtTime(0, time, .18);
      outgoing.source.stop(time + .95);
    }
    if (!buffer) return;

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(master);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    // The arrangements share a tempo and chord progression, so they can crossfade in phase.
    const startedAt = outgoing?.startedAt ?? time;
    source.start(time, (time - startedAt) % buffer.duration);
    gain.gain.setTargetAtTime(1, time, .18);
    playing = { cue, source, gain, startedAt };
  }

  return {
    unlock: () => context.resume(),
    select,
    close() {
      requested = null;
      downloads.abort();
      void context.close();
    },
  };
}
