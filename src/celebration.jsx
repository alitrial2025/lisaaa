import React, { useEffect, useRef } from 'react';
import './celebration.css';

const gold = ['#ffe8ad', '#ffc46a', '#df9251', '#c76c4c'];
const paper = ['#b77527', '#e9b651', '#b6594a', '#5a7969', '#7699a1'];

function fireworkParticles(width, height) {
  const compact = width < 640;
  const size = Math.min(width, height);
  const bursts = compact
    ? [[.14, .21, 0, .13], [.85, .14, .42, .12]]
    : [[.36, .19, 0, .145], [.88, .27, .42, .16]];
  return bursts.flatMap(([x, y, delay, radius]) => {
    const count = compact ? 20 : 30;
    return Array.from({ length: count }, (_, index) => {
      const angle = 2 * Math.PI * (index + Math.random() * .65) / count;
      const distance = size * radius * (.5 + Math.random() * .5);
      return {
        x: x * width, y: y * height, delay,
        vx: Math.cos(angle) * distance, vy: Math.sin(angle) * distance,
        life: .79 + Math.random() * .46,
        color: gold[index % gold.length],
        weight: 1 + Math.random() * .85,
      };
    });
  });
}

function confettiParticles(width, height) {
  const compact = width < 640;
  return Array.from({ length: compact ? 46 : 74 }, (_, index) => {
    const side = index % 2 === 0 ? 1 : -1;
    return {
      x: (side === 1 ? .06 : .94) * width,
      y: height * (side === 1 ? .39 : .57),
      vx: side * Math.min(width, 950) * (.14 + Math.random() * .47),
      vy: -180 - Math.random() * 225,
      delay: Math.random() * .19,
      life: 1.85 + Math.random() * .6,
      color: paper[index % paper.length],
      size: 4 + Math.random() * 4,
      angle: Math.random() * 2 * Math.PI,
      spin: (Math.random() - .5) * 12,
    };
  });
}

function paintSpark(ctx, particle, age) {
  const distance = 1 - Math.exp(-3.1 * age);
  const tail = Math.max(0, distance - .17 * (1 - age / particle.life));
  const drift = 29 * age ** 2;
  ctx.globalAlpha = Math.min(1, age * 18) * (1 - age / particle.life) ** .9;
  ctx.strokeStyle = particle.color;
  ctx.lineWidth = particle.weight;
  ctx.beginPath();
  ctx.moveTo(particle.x + particle.vx * tail, particle.y + particle.vy * tail + drift);
  ctx.lineTo(particle.x + particle.vx * distance, particle.y + particle.vy * distance + drift);
  ctx.stroke();
}

function paintConfetti(ctx, particle, age) {
  const x = particle.x + particle.vx * (1 - Math.exp(-2 * age)) / 2;
  const y = particle.y + particle.vy * age + 200 * age ** 2;
  const flip = Math.max(.19, Math.abs(Math.cos(particle.angle + age * 6)));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(particle.angle + age * particle.spin);
  ctx.globalAlpha = Math.min(1, (particle.life - age) / .45) * .9;
  ctx.fillStyle = particle.color;
  ctx.fillRect(-particle.size / 2, -3 * flip, particle.size, 6 * flip);
  ctx.restore();
}

export function Celebration({ kind, onFinish }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas.getBoundingClientRect();
    if (!ctx || !width || !height) {
      onFinish();
      return;
    }
    const scale = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.lineCap = 'round';

    const opening = kind === 'fireworks';
    const particles = opening ? fireworkParticles(width, height) : confettiParticles(width, height);
    const paint = opening ? paintSpark : paintConfetti;
    const duration = Math.max(...particles.map(({ delay, life }) => delay + life));
    let start;
    let request;
    function tick(now) {
      start ??= now;
      const elapsed = (now - start) / 1000;
      if (elapsed >= duration || document.hidden) {
        onFinish();
        return;
      }

      ctx.clearRect(0, 0, width, height);
      for (const particle of particles) {
        const age = elapsed - particle.delay;
        if (age >= 0 && age < particle.life) paint(ctx, particle, age);
      }
      request = requestAnimationFrame(tick);
    }

    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [kind, onFinish]);

  return <canvas className={'celebration celebration--' + kind} ref={ref} aria-hidden="true" />;
}
