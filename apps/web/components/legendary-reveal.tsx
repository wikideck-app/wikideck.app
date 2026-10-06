"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { CardDto } from "@wikideck/shared";
import { FlipCard } from "@/components/wiki-card";
import { LEGENDARY_IMPACT_S } from "@/lib/audio";

type Props = {
  card: CardDto;
  isNew?: boolean;
  duration: number;
  onSkip: () => void;
  onImpact: () => void;
  onDone: () => void;
  flipped: boolean;
};

const FADE_OUT_S = 0.7;

type Dot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  hue: number;
};

export function LegendaryReveal({
  card,
  isNew,
  duration,
  onSkip,
  onImpact,
  onDone,
  flipped,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const cardBox = useRef<HTMLDivElement>(null);
  const cb = useRef({ onImpact, onDone, onSkip });
  useEffect(() => {
    cb.current = { onImpact, onDone, onSkip };
  });

  useEffect(() => {
    const cv = canvas.current;
    const box = cardBox.current;
    const el = root.current;
    if (!cv || !box || !el) return;
    const ctx = cv.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const impactAt = LEGENDARY_IMPACT_S;
    const endAt = Math.max(impactAt + 2, duration - FADE_OUT_S);
    const start = performance.now();
    let impacted = false;
    let finished = false;
    let last = start;
    let raf = 0;

    const incoming = Array.from({ length: 150 }, (_, i) => ({
      a: Math.random() * Math.PI * 2,
      r: 0.35 + Math.random() * 0.65,
      spin: (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 1.6),
      delay: Math.random() * 1.6,
      size: 1 + Math.random() * 2.2,
      hue: i % 5 === 0 ? 0 : 40 + Math.random() * 12,
    }));
    const sparks: Dot[] = [];
    const burst = (cx: number, cy: number) => {
      for (let i = 0; i < 260; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 120 + Math.random() * 700;
        sparks.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 80,
          life: 0,
          max: 1.2 + Math.random() * 2.4,
          size: 1 + Math.random() * 3.2,
          hue: Math.random() < 0.25 ? 320 + Math.random() * 60 : 36 + Math.random() * 18,
        });
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const t = (now - start) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const cx = w / 2;
      const cy = h / 2 - Math.min(40, h * 0.04);
      const base = Math.min(w, h);

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      const build = Math.min(1, t / impactAt);
      const after = t < impactAt ? 0 : Math.min(1, (t - impactAt) / (endAt - impactAt));
      const energy = t < impactAt ? build * build : 1 - after * 0.75;

      const rayLen =
        base * (0.35 + 0.75 * energy) * (t >= impactAt ? 1 + Math.max(0, 0.6 - (t - impactAt)) : 1);
      const rays = 20;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.22);
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2;
        const half = 0.035 + (i % 3) * 0.012;
        const len = rayLen * (0.7 + ((i * 53) % 7) / 14);
        const g = ctx.createRadialGradient(0, 0, base * 0.1, 0, 0, len);
        g.addColorStop(0, `rgba(255,236,170,${0.32 * energy})`);
        g.addColorStop(1, "rgba(255,170,40,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, len, a - half, a + half);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      const haloR = base * (0.18 + 0.32 * energy);
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
      halo.addColorStop(0, `rgba(255,236,170,${0.4 * energy})`);
      halo.addColorStop(0.5, `rgba(255,170,40,${0.22 * energy})`);
      halo.addColorStop(1, "rgba(255,120,0,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fill();

      if (t < impactAt + 0.1) {
        for (const p of incoming) {
          const k = Math.max(0, Math.min(1, (t - p.delay) / (impactAt - p.delay)));
          if (k <= 0) continue;
          const r = base * 0.75 * p.r * Math.pow(1 - k, 1.6) + 18;
          const a = p.a + p.spin * k * 2.4;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r * 0.85;
          ctx.fillStyle = `hsla(${p.hue},100%,${p.hue ? 68 : 92}%,${0.35 + 0.65 * k})`;
          ctx.beginPath();
          ctx.arc(x, y, p.size * (1 + k), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (t >= impactAt && !impacted) {
        impacted = true;
        burst(cx, cy);
        cb.current.onImpact();
        navigator.vibrate?.([60, 40, 120]);
      }
      if (impacted) {
        const s = t - impactAt;
        for (let ring = 0; ring < 3; ring++) {
          const k = s - ring * 0.18;
          if (k <= 0 || k > 1.3) continue;
          const r = base * 0.9 * (1 - Math.pow(1 - Math.min(1, k / 1.3), 3));
          ctx.strokeStyle = `rgba(255,${220 - ring * 30},${150 - ring * 40},${(1 - k / 1.3) * 0.85})`;
          ctx.lineWidth = 6 - ring * 1.6;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (s < (endAt - impactAt) * 0.8 && Math.random() < 0.7) {
          const a = Math.random() * Math.PI * 2;
          sparks.push({
            x: cx + Math.cos(a) * base * 0.12,
            y: cy + Math.sin(a) * base * 0.16,
            vx: Math.cos(a) * (40 + Math.random() * 160),
            vy: Math.sin(a) * (40 + Math.random() * 160) - 60,
            life: 0,
            max: 1 + Math.random() * 1.8,
            size: 1 + Math.random() * 2.4,
            hue: 38 + Math.random() * 14,
          });
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life += dt;
        if (p.life >= p.max) {
          sparks.splice(i, 1);
          continue;
        }
        p.vy += 260 * dt;
        p.vx *= 1 - 0.8 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const a = Math.pow(1 - p.life / p.max, 1.4);
        ctx.fillStyle = `hsla(${p.hue},100%,70%,${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      if (!reduced) {
        let dx = 0;
        let dy = 0;
        let sc = 1;
        if (t < impactAt) {
          const amp = 1 + build * build * 9;
          dx = (Math.random() - 0.5) * amp;
          dy = (Math.random() - 0.5) * amp;
          sc = 1 + build * 0.08;
        } else {
          const s = t - impactAt;
          sc = 1.08 + 0.1 * Math.exp(-s * 4) * Math.cos(s * 14) + 0.015 * Math.sin(s * 1.6);
          dy = Math.sin(s * 1.4) * 5;
        }
        box.style.transform = `translate(${dx}px, ${dy}px) scale(${sc})`;
      }

      if (t >= endAt && !finished) {
        finished = true;
        el.style.transition = `opacity ${FADE_OUT_S}s ease`;
        el.style.opacity = "0";
        setTimeout(() => cb.current.onDone(), FADE_OUT_S * 1000);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [duration]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === " " || e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        if (!e.repeat) cb.current.onSkip();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return createPortal(
    <div
      ref={root}
      role="dialog"
      aria-label="Carte légendaire"
      onClick={() => cb.current.onSkip()}
      className="fixed inset-0 z-100 flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_45%,rgb(40_20_70/0.92),rgb(5_2_15/0.97)_75%)] legendary-in"
    >
      <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 size-full" />
      <div className="legendary-flash" aria-hidden />

      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        <p className="legendary-title" aria-live="polite">
          Légendaire
        </p>
        <div ref={cardBox} className="will-change-transform">
          <FlipCard
            card={card}
            isNew={isNew}
            flipped={flipped}
            onToggle={() => {}}
            className="w-[min(72vw,19rem)] sm:w-80"
          />
        </div>
        <p className="legendary-name">{card.title}</p>
      </div>

      <p className="absolute bottom-6 text-xs text-white/40">Touchez l&apos;écran pour passer</p>
    </div>,
    document.body,
  );
}
