'use client';

import { useEffect, useRef } from 'react';
import useReducedMotion from '@/hooks/useReducedMotion';

/**
 * Animated arena backdrop. Purely decorative, so it is `aria-hidden`, it stops
 * entirely under reduced-motion (rendering one static frame instead), and it
 * pauses when the tab is hidden.
 */
export default function ParticleField() {
  const canvasRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let particles = [];
    let frame = 0;
    let running = true;

    const palette = ['rgba(164,91,255,', 'rgba(55,229,240,', 'rgba(255,181,71,', 'rgba(77,124,255,'];

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      // Particle count scales with area so phones do far less work.
      const count = Math.min(90, Math.round((width * height) / 22000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 1.9,
        vx: (Math.random() - 0.5) * 0.16,
        vy: -0.05 - Math.random() * 0.22,
        alpha: 0.15 + Math.random() * 0.45,
        color: palette[Math.floor(Math.random() * palette.length)],
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        const twinkle = reducedMotion ? 1 : 0.65 + 0.35 * Math.sin(frame * 0.02 + p.phase);
        ctx.beginPath();
        ctx.fillStyle = `${p.color}${(p.alpha * twinkle).toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      if (!running) return;
      frame += 1;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
      }
      draw();
      requestAnimationFrame(step);
    };

    resize();
    window.addEventListener('resize', resize);

    if (reducedMotion) {
      draw(); // one static starfield, no animation loop
    } else {
      requestAnimationFrame(step);
    }

    const onVisibility = () => {
      if (reducedMotion) return;
      running = document.visibilityState === 'visible';
      if (running) requestAnimationFrame(step);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-70"
    />
  );
}
