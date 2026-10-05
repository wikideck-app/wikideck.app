"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  r: number;
  speed: number;
  alpha: number;
  phase: number;
  violet: boolean;
};

export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let stars: Star[] = [];
    let target = { x: 0, y: 0 };
    const offset = { x: 0, y: 0 };

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = innerWidth;
      h = innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(150, (w * h) / 13_000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.4 + Math.random() * 1.3,
        speed: 0.04 + Math.random() * 0.16,
        alpha: 0.25 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        violet: Math.random() < 0.12,
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      offset.x += (target.x - offset.x) * 0.04;
      offset.y += (target.y - offset.y) * 0.04;
      for (const s of stars) {
        if (!reduce) {
          s.y -= s.speed;
          if (s.y < -2) {
            s.y = h + 2;
            s.x = Math.random() * w;
          }
        }
        const twinkle = reduce ? 1 : 0.6 + 0.4 * Math.sin(t / 1400 + s.phase);
        const depth = s.r / 1.7;
        ctx.globalAlpha = s.alpha * twinkle;
        ctx.fillStyle = s.violet ? "#9ea3ff" : "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x + offset.x * depth * 16, s.y + offset.y * depth * 16, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: MouseEvent) => {
      target = { x: e.clientX / w - 0.5, y: e.clientY / h - 0.5 };
    };

    resize();
    raf = requestAnimationFrame(draw);
    addEventListener("resize", resize);
    if (!reduce) addEventListener("mousemove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("mousemove", onMove);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0" />;
}
