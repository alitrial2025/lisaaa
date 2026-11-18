import React from 'react';
import { PortraitImage } from './portraits.jsx';

export function CompanionPrint({ name }) {
  if (!name) return null;
  return (
    <figure className="companion-print" aria-hidden="true">
      <div className="companion-image">
        <PortraitImage name={name} sizes="(max-width: 740px) 24vw, 12vw" decorative eager />
      </div>
      <figcaption>{name === 'smiling' ? 'Between classes' : 'Study days'}</figcaption>
    </figure>
  );
}
