import { mediaPath } from './chapters.js';

function lineWrap(context, value, maxWidth) {
  const lines = [];
  for (const paragraph of value.split(/\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? line + ' ' + word : word;
      if (line && context.measureText(next).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function exportPostcard(message) {
  const canvas = document.createElement('canvas');
  canvas.width = 1500;
  canvas.height = 1000;
  const context = canvas.getContext('2d');
  const photo = new Image();
  photo.src = mediaPath('lisa-smiling.webp');
  await Promise.all([
    photo.decode(),
    document.fonts.load('italic 180px "Instrument Serif"'),
    document.fonts.load('400 180px "Instrument Serif"'),
  ]);

  context.fillStyle = '#fcf0dc';
  context.fillRect(0, 0, 1500, 1000);
  context.strokeStyle = '#ba955e';
  context.lineWidth = 2;
  context.strokeRect(32, 32, 1436, 936);
  context.fillStyle = '#d5d9c1';
  context.fillRect(750, 96, 655, 808);
  const scale = Math.min(655 / photo.naturalWidth, 808 / photo.naturalHeight);
  const photoWidth = scale * photo.naturalWidth;
  const photoHeight = scale * photo.naturalHeight;
  context.drawImage(photo, 750 + (655 - photoWidth) / 2, 904 - photoHeight, photoWidth, photoHeight);

  context.fillStyle = '#653817';
  context.font = '26px monospace';
  context.fillText('CLASS OF 2026', 110, 228);
  context.fillStyle = '#241a11';
  context.font = '178px "Instrument Serif", Georgia, serif';
  context.fillText('For', 104, 433);
  context.fillStyle = '#9a4c20';
  context.font = 'italic 195px "Instrument Serif", Georgia, serif';
  context.fillText('Lisa.', 105, 601);
  context.fillStyle = '#523b29';
  context.font = '36px "Space Grotesk Variable", Arial, sans-serif';
  const note = message || 'Happy graduation.';
  const lines = lineWrap(context, note.split(/\n/).length > 6 ? note.replace(/\s+/g, ' ') : note, 565);
  const lineHeight = Math.min(46, 228 / Math.max(1, lines.length));
  if (lineHeight < 46) context.font = Math.max(16, lineHeight - 5) + 'px Arial, sans-serif';
  lines.forEach((line, index) => context.fillText(line, 112, 681 + index * lineHeight, 565));

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not render the postcard');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = message ? 'a-note-for-lisa.png' : 'for-lisa-2026.png';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
