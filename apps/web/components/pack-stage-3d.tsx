"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

type Phase = "idle" | "shaking" | "bursting" | "reveal";

export type PackStageProps = {
  phase: Phase;
  torn: boolean;
  canTear: boolean;
  speed: number;
  godpack?: boolean;
  onTear: () => void;
  onFail: () => void;
};

const IMG_W = 1102;
const IMG_H = 1427;

const H = 3.25;
const W = (H * IMG_W) / IMG_H;

const PAD = 0.75;

const SLIT_Y = (0.5 - 0.172) * H;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const easeOutCubic = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);

const easeInOutCubic = (v: number) => {
  v = clamp01(v);
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
};

const easeOutBack = (v: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;

  return 1 + c3 * Math.pow(v - 1, 3) + c1 * Math.pow(v - 1, 2);
};

const RIP: [number, number][] = [
  [0, 16],
  [5, 18],
  [10, 14],
  [16, 18],
  [22, 15],
  [28, 19],
  [34, 15],
  [40, 18],
  [46, 14],
  [52, 19],
  [58, 15],
  [64, 18],
  [70, 14],
  [76, 18],
  [82, 15],
  [88, 19],
  [94, 15],
  [100, 17],
];

function createMaskedTexture(img: HTMLImageElement, side: "top" | "bottom") {
  const canvas = document.createElement("canvas");

  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to create canvas context");
  }

  ctx.drawImage(img, 0, 0);

  ctx.globalCompositeOperation = "destination-in";

  const px = (x: number) => (x / 100) * canvas.width;
  const py = (y: number) => (y / 100) * canvas.height;

  ctx.beginPath();

  if (side === "top") {
    ctx.moveTo(0, 0);
    ctx.lineTo(canvas.width, 0);

    for (const [x, y] of [...RIP].reverse()) {
      ctx.lineTo(px(x), py(y));
    }
  } else {
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(canvas.width, canvas.height);

    for (const [x, y] of [...RIP].reverse()) {
      ctx.lineTo(px(x), py(y));
    }
  }

  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  return texture;
}

function createGlowTexture() {
  const canvas = document.createElement("canvas");

  canvas.width = 256;
  canvas.height = 256;

  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);

  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.15, "rgba(255,247,200,1)");
  gradient.addColorStop(0.35, "rgba(255,208,75,.8)");
  gradient.addColorStop(0.6, "rgba(255,153,30,.3)");
  gradient.addColorStop(1, "rgba(255,120,0,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function createRingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 70, 128, 128, 126);
  g.addColorStop(0, "rgba(255,200,80,0)");
  g.addColorStop(0.55, "rgba(255,236,170,0.9)");
  g.addColorStop(0.7, "rgba(255,255,255,1)");
  g.addColorStop(0.85, "rgba(255,190,70,0.45)");
  g.addColorStop(1, "rgba(255,150,30,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function createRaysTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(256, 256);
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (i % 2) * 0.05;
    const len = 150 + ((i * 37) % 7) * 14 + (i % 3 === 0 ? 60 : 0);
    const half = 0.07 + (i % 4) * 0.012;
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, len);
    g.addColorStop(0, "rgba(255,246,210,0.95)");
    g.addColorStop(0.6, "rgba(255,200,90,0.35)");
    g.addColorStop(1, "rgba(255,170,40,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, len, a - half, a + half);
    ctx.closePath();
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function createPackGeometry(v0: number, v1: number, nx: number, ny: number) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y <= ny; y++) {
    const v = v0 + ((v1 - v0) * y) / ny;

    for (let x = 0; x <= nx; x++) {
      const u = x / nx;

      const px = (u - 0.5) * W;

      const py = (0.5 - v) * H;

      const horizontal = Math.sin(Math.PI * clamp01(u));

      const vertical = Math.sin(Math.PI * clamp01(v));

      const z = 0.22 * Math.pow(horizontal, 0.6) * Math.pow(vertical, 0.7);

      positions.push(px, py, z);
      uvs.push(u, 1 - v);
    }
  }

  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const a = y * (nx + 1) + x;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

type Particle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Vector3;
  spin: THREE.Vector3;
  scale: number;
  life: number;
  maxLife: number;
};

function createParticles(scene: THREE.Scene, glowTexture: THREE.Texture) {
  const group = new THREE.Group();

  const particles: Particle[] = [];

  const count = 200;

  for (let i = 0; i < count; i++) {
    const material = new THREE.SpriteMaterial({
      map: glowTexture,
      color: Math.random() > 0.35 ? 0xffc44d : 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });

    const sprite = new THREE.Sprite(material);

    sprite.visible = false;

    group.add(sprite);

    particles.push({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      rotation: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      scale: 0.02,
      life: 0,
      maxLife: 1,
    });

    sprite.userData.particle = particles[i];
  }

  scene.add(group);

  const spawn = (
    i: number,
    px: number,
    py: number,
    pz: number,
    vx: number,
    vy: number,
    vz: number,
    scale: number,
    maxLife: number,
    delay = 0,
  ) => {
    const sprite = group.children[i] as THREE.Sprite;

    const particle = particles[i];

    particle.position.set(px, py, pz);
    particle.velocity.set(vx, vy, vz);
    particle.scale = scale;
    particle.maxLife = maxLife;
    particle.life = -delay;

    sprite.visible = true;
    sprite.position.copy(particle.position);
    sprite.scale.setScalar(scale);
    sprite.material.opacity = 0;
  };

  const burst = (strength = 1, amount = 1) => {
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * W * 0.92;

      spawn(
        i,
        x,
        SLIT_Y + (Math.random() - 0.5) * 0.12,
        0.45 + Math.random() * 0.3,
        (x * 1.6 + (Math.random() - 0.5) * 0.9) * strength,
        (0.7 + Math.random() * 1.9) * strength,
        (Math.random() - 0.5) * 1.4 * strength,
        (0.025 + Math.random() * 0.07) * amount,
        0.5 + Math.random() * 0.9,
        Math.random() * 0.06,
      );
    }
  };

  const emit = (x: number, y: number, amount: number) => {
    let left = amount;

    for (let i = 0; i < count && left > 0; i++) {
      if ((group.children[i] as THREE.Sprite).visible) {
        continue;
      }

      left--;

      spawn(
        i,
        x,
        y + (Math.random() - 0.5) * 0.08,
        0.5,
        (Math.random() - 0.7) * 1.3,
        0.5 + Math.random() * 1.1,
        (Math.random() - 0.5) * 0.6,
        0.02 + Math.random() * 0.035,
        0.25 + Math.random() * 0.35,
      );
    }
  };

  const update = (dt: number) => {
    for (let i = 0; i < count; i++) {
      const sprite = group.children[i] as THREE.Sprite;

      const particle = particles[i];

      if (!sprite.visible) continue;

      particle.life += dt;

      if (particle.life < 0) {
        sprite.material.opacity = 0;
        continue;
      }

      if (particle.life >= particle.maxLife) {
        sprite.visible = false;
        continue;
      }

      particle.velocity.y -= 1.4 * dt;

      particle.position.addScaledVector(particle.velocity, dt);

      sprite.position.copy(particle.position);

      const progress = particle.life / particle.maxLife;

      const alpha = Math.pow(1 - progress, 2);

      sprite.material.opacity = alpha;

      const size = particle.scale * (1 + progress * 0.6);

      sprite.scale.setScalar(size);
    }
  };

  const dispose = () => {
    for (const sprite of group.children as THREE.Sprite[]) {
      sprite.material.dispose();
    }
  };

  return {
    group,
    burst,
    emit,
    update,
    dispose,
  };
}

export function PackStage3D(props: PackStageProps) {
  const t = useTranslations("packs");
  const host = useRef<HTMLDivElement>(null);

  const latest = useRef(props);

  useEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    const el = host.current;

    if (!el) return;

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      latest.current.onFail();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure = 1;

    renderer.domElement.className = "absolute touch-none";

    renderer.domElement.style.inset = `${-PAD * 100}%`;

    renderer.domElement.style.width = `${(1 + PAD * 2) * 100}%`;

    renderer.domElement.style.height = `${(1 + PAD * 2) * 100}%`;

    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);

    camera.position.set(0, 0, 7);

    const pmrem = new THREE.PMREMGenerator(renderer);

    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);

    scene.environment = environment.texture;

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);

    keyLight.position.set(2, 4, 5);

    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x6ea8ff, 0.5, 8);

    rimLight.position.set(-3, 1, 2);

    scene.add(rimLight);

    const openingLight = new THREE.PointLight(0xffb52e, 0, 7);

    openingLight.position.set(0, SLIT_Y, 1);

    scene.add(openingLight);

    const pack = new THREE.Group();

    scene.add(pack);

    const body = new THREE.Group();

    pack.add(body);

    const topGroup = new THREE.Group();

    body.add(topGroup);

    const bottomGroup = new THREE.Group();

    body.add(bottomGroup);

    const glowTexture = createGlowTexture();

    const cleanup: {
      dispose: () => void;
    }[] = [environment, pmrem, renderer, glowTexture];

    let top: THREE.Mesh | null = null;

    let topGeometry: THREE.BufferGeometry | null = null;

    let topBase: Float32Array | null = null;

    let bottom: THREE.Mesh | null = null;

    let topTexture: THREE.CanvasTexture | null = null;

    let bottomTexture: THREE.CanvasTexture | null = null;

    let topMaterial: THREE.MeshStandardMaterial | null = null;

    let bottomMaterial: THREE.MeshStandardMaterial | null = null;

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xffc247,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );

    glow.position.set(0, SLIT_Y, 0.75);

    glow.scale.setScalar(0);

    scene.add(glow);

    cleanup.push(glow.material);

    const flash = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );

    flash.position.set(0, SLIT_Y, 1);

    flash.scale.setScalar(0);

    scene.add(flash);

    cleanup.push(flash.material);

    const ringTexture = createRingTexture();
    const raysTexture = createRaysTexture();

    const ring = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: ringTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    ring.position.set(0, SLIT_Y, 0.9);
    ring.scale.setScalar(0);
    scene.add(ring);

    const rays = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: raysTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    rays.position.set(0, SLIT_Y, -0.3);
    rays.scale.setScalar(0);
    scene.add(rays);

    cleanup.push(ring.material, rays.material, ringTexture, raysTexture);

    const streak = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xffc247,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );

    streak.position.set(0, SLIT_Y, 0.3);

    scene.add(streak);

    const spark = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );

    spark.position.set(0, SLIT_Y, 0.55);

    scene.add(spark);

    cleanup.push(streak.material, spark.material);

    const particles = createParticles(scene, glowTexture);

    cleanup.push(particles);

    const state = {
      progress: 0,

      dragging: false,

      startX: 0,

      pointerX: 0,

      pointerY: 0,

      fired: false,

      opened: false,

      openingTime: -1,

      impactTime: -1,

      revealTime: -1,

      idleSeed: Math.random() * 10,

      rotationX: 0,

      rotationY: 0,

      cameraKick: 0,

      camRoll: 0,

      tearFrom: 0,

      lastProgress: 0,

      emitAcc: 0,

      camKickZ: 0,

      camZoom: 0,

      lastBurst: 0,

      godFired: false,
    };

    const deformTop = (p: number) => {
      if (!topGeometry || !topBase) {
        return;
      }

      const attr = topGeometry.getAttribute("position") as THREE.BufferAttribute;

      const arr = attr.array as Float32Array;

      const hx = (p - 0.5) * W;

      const reach = Math.min(1, p * 1.6);

      for (let i = 0; i < arr.length; i += 3) {
        const x = topBase[i];
        const y = topBase[i + 1];
        const z = topBase[i + 2];

        if (x >= hx || p <= 0.001) {
          arr[i] = x;
          arr[i + 1] = y;
          arr[i + 2] = z;
          continue;
        }

        const d = hx - x;

        const t = clamp01(d / (W * 0.5));

        const a = 1.05 * reach * (1 - (1 - t) * (1 - t));

        const ry = y - SLIT_Y;

        const cos = Math.cos(a);
        const sin = Math.sin(a);

        arr[i] = hx - d * cos + ry * sin;
        arr[i + 1] = SLIT_Y + d * sin + ry * cos;
        arr[i + 2] = z + 0.35 * sin * t;
      }

      attr.needsUpdate = true;

      topGeometry.computeVertexNormals();
    };

    const updateTear = (time: number) => {
      const p = state.progress;

      deformTop(p);

      const tension = easeOutCubic(p);

      body.scale.set(1 + tension * 0.018, 1 - tension * 0.01, 1);

      body.position.x = tension * 0.025;

      const hx = (p - 0.5) * W;

      const active = p > 0.01;

      const len = Math.max(0.001, hx + W / 2);

      streak.position.x = -W / 2 + len / 2;
      streak.scale.set(len + 0.5, 0.34, 1);
      streak.material.opacity = active ? 0.45 + 0.4 * p : 0;

      spark.position.x = hx;
      spark.scale.setScalar(0.45 + 0.12 * Math.sin(time * 38));
      spark.material.opacity = active ? 0.95 : 0;

      openingLight.position.x = hx;
      openingLight.intensity = active ? 2.5 + 2 * p : 0;

      if (state.dragging) {
        pack.rotation.z = Math.sin(time * 42) * 0.012 * p * p;
      }

      if (state.dragging || state.fired) {
        state.emitAcc += Math.max(0, p - state.lastProgress) * 90;

        while (state.emitAcc >= 1) {
          state.emitAcc -= 1;

          particles.emit(hx, SLIT_Y, 1);
        }
      }

      state.lastProgress = p;
    };

    const reset = () => {
      state.progress = 0;
      state.tearFrom = 0;
      state.lastProgress = 0;
      state.emitAcc = 0;
      deformTop(0);
      streak.material.opacity = 0;
      spark.material.opacity = 0;
      openingLight.position.x = 0;
      state.dragging = false;
      state.fired = false;
      state.opened = false;
      state.openingTime = -1;
      state.impactTime = -1;
      state.revealTime = -1;
      state.cameraKick = 0;
      state.camRoll = 0;
      state.camZoom = 0;
      state.camKickZ = 0;
      state.lastBurst = 0;
      state.godFired = false;
      rays.material.color.set(0xffffff);
      flash.material.color.set(0xffffff);

      pack.position.set(0, 0, 0);
      pack.rotation.set(0, 0, 0);

      body.position.set(0, 0, 0);

      body.scale.setScalar(1);

      topGroup.position.set(0, 0, 0);

      topGroup.rotation.set(0, 0, 0);

      bottomGroup.position.set(0, 0, 0);

      bottomGroup.rotation.set(0, 0, 0);

      if (topMaterial) {
        topMaterial.opacity = 1;
      }

      if (bottomMaterial) {
        bottomMaterial.opacity = 1;
      }

      glow.material.opacity = 0;
      glow.scale.setScalar(0);

      flash.material.opacity = 0;
      flash.scale.setScalar(0);

      ring.material.opacity = 0;
      ring.scale.setScalar(0);
      rays.material.opacity = 0;
      rays.scale.setScalar(0);

      openingLight.intensity = 0;

      pack.visible = true;
    };

    let disposed = false;

    const image = new Image();

    image.onload = () => {
      if (disposed) return;

      try {
        topTexture = createMaskedTexture(image, "top");

        bottomTexture = createMaskedTexture(image, "bottom");

        const materialOptions = {
          metalness: 0.45,
          roughness: 0.32,
          envMapIntensity: 0.75,
          side: THREE.DoubleSide,
          transparent: true,
          alphaTest: 0.3,
        };

        topMaterial = new THREE.MeshStandardMaterial({
          map: topTexture,
          ...materialOptions,
        });

        bottomMaterial = new THREE.MeshStandardMaterial({
          map: bottomTexture,
          ...materialOptions,
        });

        topGeometry = createPackGeometry(0, 0.22, 60, 12);

        const bottomGeometry = createPackGeometry(0.13, 1, 60, 70);

        topBase = (topGeometry.getAttribute("position").array as Float32Array).slice();

        top = new THREE.Mesh(topGeometry, topMaterial);

        bottom = new THREE.Mesh(bottomGeometry, bottomMaterial);

        topGroup.add(top);
        bottomGroup.add(bottom);

        cleanup.push(
          topGeometry,
          bottomGeometry,
          topMaterial,
          bottomMaterial,
          topTexture,
          bottomTexture,
        );

        reset();
      } catch {
        latest.current.onFail();
      }
    };

    image.onerror = () => {
      if (!disposed) {
        latest.current.onFail();
      }
    };

    image.src = "/paquet.webp";

    const canvas = renderer.domElement;

    // sinon le canvas bouffe les clics sur « Ouvrir »
    canvas.style.pointerEvents = "none";

    const pointer = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();

      state.pointerX = clamp01((event.clientX - rect.left) / rect.width) * 2 - 1;

      state.pointerY = clamp01((event.clientY - rect.top) / rect.height) * 2 - 1;

      return rect;
    };

    const pointerDown = (event: PointerEvent) => {
      const current = latest.current;

      if (!current.canTear || current.phase !== "idle" || current.torn) {
        return;
      }

      pointer(event);

      state.dragging = true;
      state.startX = event.clientX;

      el.setPointerCapture(event.pointerId);
    };

    const pointerMove = (event: PointerEvent) => {
      const rect = pointer(event);

      if (!state.dragging) {
        return;
      }

      state.progress = clamp01((event.clientX - state.startX) / (rect.width * 0.55));
    };

    const pointerUp = () => {
      if (!state.dragging) {
        return;
      }

      state.dragging = false;

      if (state.progress >= 0.82 && !state.fired) {
        state.fired = true;
        state.openingTime = 0;
        state.tearFrom = state.progress;

        navigator.vibrate?.([20, 30, 50]);

        latest.current.onTear();
      }
    };

    el.addEventListener("pointerdown", pointerDown);

    el.addEventListener("pointermove", pointerMove);

    el.addEventListener("pointerup", pointerUp);

    el.addEventListener("pointercancel", pointerUp);

    const pointerLeave = () => {
      if (!state.dragging) {
        state.pointerX = 0;
        state.pointerY = 0;
      }
    };

    el.addEventListener("pointerleave", pointerLeave);

    let baseZ = 7;

    const resize = () => {
      const multiplier = 1 + PAD * 2;

      el.style.overflowClipMargin = `${Math.ceil(
        Math.max(el.clientWidth, el.clientHeight) * PAD,
      )}px`;

      const width = el.clientWidth * multiplier;

      const height = el.clientHeight * multiplier;

      if (!width || !height) {
        return;
      }

      renderer.setSize(width, height, false);

      camera.aspect = width / height;

      const requiredHeight = H * 1.35 * multiplier;

      const requiredWidth = W * 1.65 * multiplier;

      const verticalDistance = requiredHeight / 2 / Math.tan((camera.fov * Math.PI) / 360);

      const horizontalDistance =
        requiredWidth / 2 / Math.tan((camera.fov * Math.PI) / 360) / camera.aspect;

      baseZ = Math.max(verticalDistance, horizontalDistance);

      camera.position.z = baseZ;

      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);

    resizeObserver.observe(el);

    resize();

    const clock = new THREE.Timer();

    let animationFrame = 0;

    const frame = () => {
      animationFrame = requestAnimationFrame(frame);

      if (document.hidden) {
        return;
      }

      clock.update();

      const dt = Math.min(0.05, clock.getDelta());

      const time = clock.getElapsed();

      const current = latest.current;

      const speed = current.speed || 1;

      if (!current.torn && current.phase === "idle" && state.fired) {
        reset();
      }

      if (!state.fired && !state.dragging) {
        state.progress = Math.max(0, state.progress - dt * 2.2);
      }

      if (current.torn && !state.opened) {
        state.fired = true;

        if (state.openingTime < 0) {
          state.openingTime = 0;
          state.tearFrom = state.progress;
        }

        state.openingTime += dt * speed;

        state.progress = state.tearFrom + (1 - state.tearFrom) * clamp01(state.openingTime / 0.38);
      }

      if (state.impactTime < 0 && state.revealTime < 0) {
        updateTear(time);
      }

      if (state.progress >= 1 && state.impactTime < 0 && (state.fired || current.torn)) {
        state.impactTime = 0;

        state.cameraKick = 1;

        navigator.vibrate?.([35, 25, 80]);

        particles.burst(1.5, 1.7);
      }

      if (state.impactTime >= 0) {
        state.impactTime += dt * speed;
      }

      const idle = current.phase === "idle" && !current.torn && !state.dragging;

      if (idle) {
        const breathing = Math.sin(time * 1.35 + state.idleSeed);

        const breathing2 = Math.sin(time * 0.85 + state.idleSeed);

        pack.position.y = breathing * 0.045;

        pack.rotation.x = breathing2 * 0.018;

        pack.rotation.z = breathing * 0.012;
      }

      const targetRotationY = state.pointerX * 0.22;

      const targetRotationX = state.pointerY * -0.12;

      state.rotationY += (targetRotationY - state.rotationY) * Math.min(1, dt * 5);

      state.rotationX += (targetRotationX - state.rotationX) * Math.min(1, dt * 5);

      if (state.impactTime < 0) {
        pack.rotation.y = state.rotationY;

        pack.rotation.x = state.rotationX;
      }

      if (current.phase === "shaking") {
        const intensity = 0.015 + Math.sin(time * 2) * 0.005;

        pack.rotation.z = Math.sin(time * 45) * intensity;

        pack.position.x = Math.sin(time * 58) * 0.018;

        pack.position.y = Math.sin(time * 31) * 0.012;
      }

      if (state.impactTime >= 0) {
        const openT = clamp01(state.impactTime / 0.9);

        const smooth = easeOutBack(openT);

        topGroup.position.x = -0.12 * smooth;

        topGroup.position.y = 0.95 * smooth;

        topGroup.position.z = 0.25 * smooth;

        topGroup.rotation.x = -0.9 * smooth;

        topGroup.rotation.z = -0.38 * smooth;

        bottomGroup.position.y = -0.12 * easeOutCubic(openT);

        const bodyScale = 1 + 0.055 * Math.sin(openT * Math.PI);

        body.scale.set(bodyScale, bodyScale, bodyScale);

        if (topMaterial) {
          topMaterial.opacity = 1 - clamp01((openT - 0.45) / 0.55);
        }

        if (bottomMaterial) {
          bottomMaterial.opacity = 1 - clamp01((openT - 0.72) / 0.28);
        }

        const flashIn = clamp01(openT / 0.12);

        const flashOut = 1 - clamp01((openT - 0.12) / 0.5);

        const flashStrength = flashIn * flashOut;

        flash.scale.set(0.4 + flashStrength * W * 1.7, 0.3 + flashStrength * 1.5, 1);

        flash.material.opacity = Math.pow(flashStrength, 1.4);

        const ringT = clamp01(openT / 0.55);
        ring.scale.setScalar(0.3 + easeOutCubic(ringT) * 6);
        ring.material.opacity = (1 - ringT) * (openT > 0 ? 0.9 : 0);

        const raysT = clamp01(openT / 0.85);
        const gp = !!current.godpack;
        rays.scale.setScalar((0.5 + easeOutCubic(raysT) * 5.6) * (gp ? 1.3 : 1));
        rays.material.rotation = openT * 0.9;
        rays.material.opacity = Math.sin(Math.PI * Math.min(1, raysT * 1.15)) * 0.9;

        if (gp) {
          rays.material.color.setHSL((time * 0.5) % 1, 0.95, 0.65);
          flash.material.color.setHSL((time * 0.5 + 0.15) % 1, 0.9, 0.8);
          if (!state.godFired) {
            state.godFired = true;
            state.cameraKick = 1;
            particles.burst(2, 2.4);
            navigator.vibrate?.([40, 30, 40, 30, 120]);
          }
        }

        const glowStrength = Math.sin(Math.PI * clamp01(openT));

        glow.scale.set(0.35 + glowStrength * 2.8, 0.35 + glowStrength * 2.8, 1);

        glow.material.opacity = glowStrength * 0.85;

        openingLight.intensity = glowStrength * 9;

        openingLight.position.x *= 1 - Math.min(1, dt * 12);

        const tearFade = 1 - clamp01(state.impactTime / 0.25);

        streak.material.opacity = 0.85 * tearFade;

        spark.material.opacity = tearFade;

        openingLight.distance = 4 + glowStrength * 3;

        state.cameraKick = Math.max(0, state.cameraKick - dt * 3.5);

        const kick = state.cameraKick * state.cameraKick;

        state.camRoll = Math.sin(openT * 45) * kick * 0.012;

        state.camKickZ = kick * 0.18;

        if (openT > 0.18 && openT < 0.25 && state.lastBurst === 0) {
          state.lastBurst = 1;

          particles.burst(0.8, 0.8);
        }

        if (openT > 0.48 && state.lastBurst === 1) {
          state.lastBurst = 2;

          particles.burst(0.55, 0.55);
        }

        if (openT >= 0.95 && state.revealTime < 0) {
          state.revealTime = 0;
        }
      }

      if (state.revealTime >= 0) {
        state.revealTime += dt * speed;

        const reveal = clamp01(state.revealTime / 0.45);

        const zoom = easeInOutCubic(reveal);

        state.camZoom = zoom;

        glow.material.opacity = Math.max(0, 0.85 - reveal * 1.2);

        if (reveal >= 1 && current.phase === "reveal") {
          pack.visible = false;
        }
      }

      particles.update(dt);

      camera.position.z = (baseZ - state.camKickZ) * (1 - state.camZoom * 0.045);

      camera.rotation.z = state.camRoll;

      keyLight.position.x = 2 + state.pointerX * 2.5;

      keyLight.position.y = 3 - state.pointerY * 1.5;

      renderer.render(scene, camera);
    };

    animationFrame = requestAnimationFrame(frame);

    return () => {
      disposed = true;

      cancelAnimationFrame(animationFrame);

      resizeObserver.disconnect();

      el.removeEventListener("pointerdown", pointerDown);

      el.removeEventListener("pointermove", pointerMove);

      el.removeEventListener("pointerup", pointerUp);

      el.removeEventListener("pointercancel", pointerUp);

      el.removeEventListener("pointerleave", pointerLeave);

      for (const resource of cleanup) {
        resource.dispose();
      }

      canvas.remove();
    };
  }, []);

  return (
    <div
      ref={host}
      role="img"
      aria-label={t("packAlt")}
      className={`
        relative
        h-104
        w-88
        max-w-full
        overflow-clip
        touch-none
        select-none
        ${props.canTear ? "cursor-grab active:cursor-grabbing" : ""}
      `}
    />
  );
}
