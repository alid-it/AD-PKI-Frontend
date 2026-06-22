<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";

// =========================================
// Interaktiver "Netz"-Hintergrund (Canvas)
// Partikel + Verbindungslinien, reagiert auf den Mauszeiger.
// Keine externe Abhaengigkeit.
// =========================================

const canvas = ref<HTMLCanvasElement | null>(null);

let ctx: CanvasRenderingContext2D | null = null;
let raf = 0;
let width = 0;
let height = 0;
let dpr = 1;

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

let nodes: Node[] = [];

const mouse = { x: -9999, y: -9999, active: false };

const LINK_DIST = 150; // max. Distanz fuer Verbindungslinien
const MOUSE_DIST = 200; // Reichweite des Mauszeigers

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

const buildNodes = () => {
  // Dichte an die Flaeche koppeln (Begrenzung fuer Performance)
  const count = Math.min(110, Math.floor((width * height) / 14000));
  nodes = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
  }));
};

const resize = () => {
  if (!canvas.value) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.value.width = width * dpr;
  canvas.value.height = height * dpr;
  canvas.value.style.width = width + "px";
  canvas.value.style.height = height + "px";
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildNodes();
};

const draw = () => {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);

  for (const n of nodes) {
    // Bewegung
    n.x += n.vx;
    n.y += n.vy;

    // Sanfte Anziehung zum Mauszeiger
    if (mouse.active) {
      const dx = mouse.x - n.x;
      const dy = mouse.y - n.y;
      const dist = Math.hypot(dx, dy);
      if (dist < MOUSE_DIST && dist > 0.01) {
        const force = (1 - dist / MOUSE_DIST) * 0.6;
        n.vx += (dx / dist) * force * 0.06;
        n.vy += (dy / dist) * force * 0.06;
      }
    }

    // Reibung (verhindert ein Aufschaukeln)
    n.vx *= 0.99;
    n.vy *= 0.99;

    // An den Raendern abprallen
    if (n.x < 0 || n.x > width) n.vx *= -1;
    if (n.y < 0 || n.y > height) n.vy *= -1;
    n.x = Math.max(0, Math.min(width, n.x));
    n.y = Math.max(0, Math.min(height, n.y));
  }

  // Verbindungslinien zwischen nahen Knoten
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist < LINK_DIST) {
        const alpha = (1 - dist / LINK_DIST) * 0.4;
        ctx.strokeStyle = `rgba(117, 211, 223, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // Linie zum Mauszeiger (hebt die Interaktion hervor)
    if (mouse.active) {
      const dx = a.x - mouse.x;
      const dy = a.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < MOUSE_DIST) {
        const alpha = (1 - dist / MOUSE_DIST) * 0.5;
        ctx.strokeStyle = `rgba(108, 193, 207, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }
    }
  }

  // Knotenpunkte
  for (const n of nodes) {
    ctx.fillStyle = "rgba(160, 224, 233, 0.85)";
    ctx.beginPath();
    ctx.arc(n.x, n.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  raf = requestAnimationFrame(draw);
};

const onMouseMove = (e: MouseEvent) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.active = true;
};

const onMouseLeave = () => {
  mouse.active = false;
  mouse.x = -9999;
  mouse.y = -9999;
};

onMounted(() => {
  if (!canvas.value) return;
  ctx = canvas.value.getContext("2d");
  resize();

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseout", onMouseLeave);

  if (prefersReducedMotion) {
    // Eine statische Aufnahme, keine fortlaufende Animation
    draw();
    cancelAnimationFrame(raf);
  } else {
    draw();
  }
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  window.removeEventListener("resize", resize);
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseout", onMouseLeave);
});
</script>

<template>
  <canvas ref="canvas" class="login-network" aria-hidden="true"></canvas>
</template>

<style scoped>
.login-network {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
