import React from 'react';
import { PortraitImage } from './portraits.jsx';
import { mediaPath } from './chapters.js';
import { graduationPhotos } from './graduation-photos.js';

export function CompanionPrint({ name }) {
  if (!name) return null;
  const print = { graduation: graduationPhotos[0], 'hand-in-hand': graduationPhotos[1] }[name];
  return (
    <figure className={print ? 'companion-print companion-print--graduation' : 'companion-print'} aria-hidden="true">
      <div className="companion-image">
        {print ? <img src={mediaPath(print.thumbnail)} width="260" height="390" alt="" decoding="async" /> :
          <PortraitImage name={name} sizes="(max-width: 740px) 24vw, 12vw" decorative eager />}
      </div>
      <figcaption>{print?.title ?? (name === 'smiling' ? 'Between classes' : 'Study days')}</figcaption>
    </figure>
  );
}
