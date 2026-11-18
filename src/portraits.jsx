import React from 'react';
import { mediaPath } from './chapters.js';

const portraits = {
  reading: { file: 'lisa-reading', width: 1040, height: 1387, alt: 'Lisa reading notes in her orange hoodie.' },
  smiling: { file: 'lisa-smiling', width: 960, height: 1280, alt: 'Lisa smiling at her phone.' },
};

export function PortraitImage({ name, sizes, decorative = false, eager = false }) {
  const { file, width, height, alt } = portraits[name];
  return (
    <img
      src={mediaPath(`${file}.webp`)}
      srcSet={`${mediaPath(`${file}-420.webp`)} 420w, ${mediaPath(`${file}.webp`)} ${width}w`}
      sizes={sizes}
      alt={decorative ? '' : alt}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
