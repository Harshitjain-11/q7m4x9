import React, { useEffect, useRef } from 'react';

/**
 * WindFlowStreamlines
 *
 * Lightweight, high-performance HTML5 Canvas simulation rendering aerodynamic
 * atmospheric streamlines inspired by Elexon UK offshore/onshore wind vectors.
 *
 * Features:
 * - High-DPI crisp rendering with automatic pixel ratio scaling
 * - Emerald (#14866D) and Petrol Teal (#247C8B) velocity gradients
 * - Cursor aerodynamic deflection (fluid stream deviation)
 * - Zero external dependencies; respects prefers-reduced-motion
 */
export default function WindFlowStreamlines({ className = '', height = 480 }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let heightPx = 0;
    let dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      heightPx = rect.height;
      dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = heightPx * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Particle / Streamline Configuration
    const STREAMLINE_COUNT = Math.min(65, Math.floor(window.innerWidth / 22));
    const particles = [];

    const palette = [
      { r: 20, g: 134, b: 109, a: 0.65 }, // Emerald
      { r: 36, g: 124, b: 139, a: 0.75 }, // Petrol Teal
      { r: 24, g: 53, b: 45, a: 0.45 },   // Forest Ink
      { r: 199, g: 131, b: 54, a: 0.5 },  // Amber gust
    ];

    for (let i = 0; i < STREAMLINE_COUNT; i++) {
      particles.push({
        x: Math.random() * (width + 200) - 100,
        y: Math.random() * heightPx,
        speed: 1.2 + Math.random() * 2.2,
        length: 45 + Math.random() * 95,
        width: 1.0 + Math.random() * 1.8,
        color: palette[i % palette.length],
        phase: Math.random() * Math.PI * 2,
        amplitude: 18 + Math.random() * 24,
        frequency: 0.003 + Math.random() * 0.004,
        history: [],
      });
    }

    let time = 0;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, width, heightPx);

      // Subtle atmospheric isobar gradient lines in background
      ctx.strokeStyle = 'rgba(216, 212, 199, 0.25)';
      ctx.lineWidth = 0.75;
      ctx.setLineDash([4, 8]);
      for (let y = 60; y < heightPx; y += 90) {
        ctx.beginPath();
        ctx.moveTo(0, y + Math.sin(y + time * 0.01) * 8);
        ctx.bezierCurveTo(
          width * 0.35, y - 25,
          width * 0.65, y + 25,
          width, y + Math.cos(y + time * 0.01) * 8
        );
        ctx.stroke();
      }
      ctx.setLineDash([]);

      time += 0.015;

      particles.forEach((p) => {
        // Base streamline motion
        let vx = p.speed;
        let vy = Math.sin(p.x * p.frequency + time + p.phase) * (p.amplitude * 0.035);

        // Aerodynamic cursor deviation (smooth fluid deflection)
        if (mouseRef.current.active) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 140;

          if (dist < maxDist && dist > 1) {
            const force = (1 - dist / maxDist) * 3.5;
            vx += (dx / dist) * force;
            vy += (dy / dist) * force;
          }
        }

        p.x += vx;
        p.y += vy;

        // Wrap around seamlessly
        if (p.x > width + 100) {
          p.x = -80;
          p.y = Math.random() * heightPx;
          p.history = [];
        }
        if (p.y < -50) p.y = heightPx + 40;
        if (p.y > heightPx + 50) p.y = -40;

        // Store trail history
        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > 20) {
          p.history.shift();
        }

        // Draw streamline ribbon
        if (p.history.length > 2) {
          ctx.beginPath();
          ctx.moveTo(p.history[0].x, p.history[0].y);

          for (let j = 1; j < p.history.length - 1; j++) {
            const xc = (p.history[j].x + p.history[j + 1].x) / 2;
            const yc = (p.history[j].y + p.history[j + 1].y) / 2;
            ctx.quadraticCurveTo(p.history[j].x, p.history[j].y, xc, yc);
          }

          const head = p.history[p.history.length - 1];
          const tail = p.history[0];
          const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
          grad.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0.0)`);
          grad.addColorStop(0.7, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.color.a * 0.5})`);
          grad.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.color.a})`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = p.width;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Streamline leading tip
          ctx.beginPath();
          ctx.arc(head.x, head.y, p.width * 1.1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${Math.min(1, p.color.a * 1.3)})`;
          ctx.fill();
        }
      });

      if (!prefersReducedMotion) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    if (prefersReducedMotion) {
      // Single static aesthetic frame
      render();
    } else {
      animFrameRef.current = requestAnimationFrame(render);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      className={`windflow-canvas-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
        }}
      />
    </div>
  );
}
