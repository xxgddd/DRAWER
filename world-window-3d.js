/* ==========================================================================
   World Window · 3D Galaxy Engine (Integrated with DrawerWorldWindow)
   ========================================================================== */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const ORBITS = [15, 21, 28, 35, 42];
const SHORE = 49;
const SUN_R = 7.6;

const ORBIT_TILT = [
  { inc: 0.12, node: 0.5 }, { inc: -0.17, node: 1.9 }, { inc: 0.24, node: -0.8 },
  { inc: -0.1, node: 2.7 }, { inc: 0.3, node: 1.2 }
];
const LIGHT_TILT = [
  { inc: 0.2, node: -2.0 }, { inc: -0.3, node: 0.8 },
  { inc: 0.4, node: 2.4 }, { inc: -0.22, node: -0.6 }
];
const PLANES = [
  { r: 38, w: 8, inc: 0.36, node: 0.9, wt: 1.0, tint: 'cyan', spd: 1.9 },
  { r: 74, w: 10, inc: -0.44, node: 2.2, wt: 1.2, tint: 'rose', spd: 0.45 },
  { r: 26, w: 4, inc: 0.22, node: -1.3, wt: 0.6, tint: 'gold', spd: 2.6 },
  { r: 98, w: 9, inc: 0.62, node: 3.6, wt: 0.9, tint: 'blue', spd: 0.3 }
];

const ACTIVE_COLORS = [
  ['#f2a65a', '#c4622f'], ['#f08a6b', '#b5523a'], ['#f6c177', '#c98a3a'],
  ['#e8b46a', '#9a6a2c'], ['#f4d8a8', '#c99a5a'], ['#f3a35f', '#b8612c'],
  ['#f6c98a', '#c48a48']
];
const DORMANT_COLORS = [
  ['#c99a74', '#8a5d3e'], ['#d8a07a', '#93603f'], ['#d49168', '#8c5636']
];
const DWARF_COLORS = [
  ['#a9b8cf', '#6c7c96'], ['#9fb0c8', '#66758e']
];

const TAU = Math.PI * 2;
const clamp01 = x => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = t => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const rand = Math.random;
const gauss = () => { let u = 0; while (!u) u = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * rand()); };
const toLin = c => Math.pow(c, 2.2);
const polar = (r, a, y = 0) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
const tiltEuler = t => new THREE.Euler(t.inc, t.node, 0, 'YXZ');
const tilted = (r, a, t) => polar(r, a + t.node).applyEuler(tiltEuler(t));
const lightRadius = d => SHORE + 3 + (Number(d.distance) || 0.5) * 18;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const GLSL_COMMON = /* glsl */`
  vec3 lin(vec3 c) { return pow(max(c, vec3(0.0)), vec3(2.2)); }
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
`;

function initGalaxyEngine() {
  const frameEl = document.querySelector('#worldWindowView .world-window-frame');
  const canvas = document.getElementById('worldWindowGl');
  const labelsEl = document.getElementById('worldWindowLabels');
  const hud = document.getElementById('worldWindowHud');
  const veil = document.getElementById('worldVeil');
  const skipHint = document.getElementById('worldSkipHint');
  const tooltip = document.getElementById('worldWindowTooltip');
  const letter = document.getElementById('worldLetterCard');
  const nudge = document.getElementById('worldDailyNudge');
  const toastEl = document.getElementById('worldToast');

  if (!frameEl || !canvas) return null;

  const getBounds = () => {
    const r = frameEl.getBoundingClientRect();
    return {
      left: r.left,
      top: r.top,
      width: Math.max(320, r.width || window.innerWidth),
      height: Math.max(240, r.height || window.innerHeight)
    };
  };

  let bounds = getBounds();
  const PR = Math.min(window.devicePixelRatio || 1, 2);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(PR);
  renderer.setSize(bounds.width, bounds.height);
  renderer.setClearColor(0x030305, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, bounds.width / bounds.height, 0.1, 5000);

  const galaxy = new THREE.Group();
  galaxy.rotation.z = 0.13;
  scene.add(galaxy);

  const dynamicGroup = new THREE.Group();
  galaxy.add(dynamicGroup);

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(PR);
  composer.setSize(bounds.width, bounds.height);
  composer.addPass(new RenderPass(scene, camera));
  // Safety net: sanitize NaN / Inf / negative pixels before UnrealBloomPass
  composer.addPass(new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main() { vec4 c = texture2D(tDiffuse, vUv); vec3 rgb = c.rgb; if (!(rgb.r >= 0.0 && rgb.r <= 65504.0)) rgb.r = 0.0; if (!(rgb.g >= 0.0 && rgb.g <= 65504.0)) rgb.g = 0.0; if (!(rgb.b >= 0.0 && rgb.b <= 65504.0)) rgb.b = 0.0; gl_FragColor = vec4(min(rgb, vec3(64.0)), 1.0); }'
  }));
  const bloom = new UnrealBloomPass(new THREE.Vector2(bounds.width, bounds.height), 0.5, 0.45, 0.78);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const pointScale = () => (bounds.height * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));

  /* ------------------------------------------------------------------------
     Procedural textures
     ------------------------------------------------------------------------ */
  function canvasTexture(size, draw) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const GLOW_TEX = canvasTexture(128, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.12, 'rgba(255,255,255,0.6)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.14)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
  const SPARKLE_TEX = canvasTexture(256, (g, s) => {
    const c = s / 2;
    const gr = g.createRadialGradient(c, c, 0, c, c, c * 0.35);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.globalCompositeOperation = 'lighter';
    [[1, 0.012], [0.55, 0.008]].forEach(([len, w], i) => {
      g.save(); g.translate(c, c); g.rotate(i * Math.PI / 4);
      for (let k = 0; k < 2; k++) {
        const lg = g.createLinearGradient(-c * len, 0, c * len, 0);
        lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.95)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = lg; g.fillRect(-c * len, -s * w, c * len * 2, s * w * 2);
        g.rotate(Math.PI / 2);
      }
      g.restore();
    });
  });
  const RETICLE_TEX = canvasTexture(256, (g, s) => {
    const c = s / 2;
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(c, c, c * 0.78, i * TAU / 4 + 0.2, (i + 1) * TAU / 4 - 0.2); g.stroke(); }
    g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.5)';
    g.beginPath(); g.arc(c, c, c * 0.92, 0, TAU); g.setLineDash([4, 10]); g.stroke();
    g.setLineDash([]); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4; g.beginPath(); g.moveTo(c + Math.cos(a) * c * 0.84, c + Math.sin(a) * c * 0.84); g.lineTo(c + Math.cos(a) * c * 0.98, c + Math.sin(a) * c * 0.98); g.stroke(); }
  });
  const SATELLITE_TEX = canvasTexture(256, (g, s) => {
    g.translate(s / 2, s / 2); g.rotate(-0.35);
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.fillStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 3;
    const panel = x => { g.fillRect(x, -16, 62, 32); g.strokeRect(x, -16, 62, 32); for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x + i * 15.5, -16); g.lineTo(x + i * 15.5, 16); g.stroke(); } g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 62, 0); g.stroke(); };
    panel(-100); panel(38);
    g.beginPath(); g.moveTo(-38, 0); g.lineTo(-22, 0); g.moveTo(22, 0); g.lineTo(38, 0); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.roundRect(-22, -20, 44, 40, 6); g.fill();
    g.beginPath(); g.arc(0, -34, 10, Math.PI, 0); g.stroke(); g.beginPath(); g.moveTo(0, -34); g.lineTo(0, -20); g.stroke();
  });
  const NEBULA_TEX = canvasTexture(256, (g, s) => {
    for (let i = 0; i < 18; i++) {
      const x = s * (0.3 + rand() * 0.4), y = s * (0.3 + rand() * 0.4), r = s * (0.15 + rand() * 0.3);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    }
  });

  /* ------------------------------------------------------------------------
     1. Deep sky + wisps + sparkles
     ------------------------------------------------------------------------ */
  const sky = (() => {
    const N = 9000;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), misc = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const u = rand() * 2 - 1, th = rand() * TAU, r = 1400 + rand() * 900, s = Math.sqrt(1 - u * u);
      pos.set([Math.cos(th) * s * r, u * r, Math.sin(th) * s * r], i * 3);
      const p = rand();
      const c = p < 0.12 ? [1, 0.75, 0.55] : p < 0.22 ? [0.7, 0.82, 1] : [1, 0.97, 0.92];
      const b = 0.25 + Math.pow(rand(), 3) * 0.9;
      col.set(c.map(v => toLin(v) * b), i * 3);
      misc.set([0.8 + Math.pow(rand(), 6) * 2.6, rand()], i * 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aMisc', new THREE.BufferAttribute(misc, 2));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPR: { value: PR }, uFade: { value: 0 } },
      vertexShader: /* glsl */`
        uniform float uTime, uPR, uFade; attribute vec3 aColor; attribute vec2 aMisc;
        varying vec3 vColor; varying float vA;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aMisc.x * uPR;
          vA = (0.6 + 0.4 * sin(uTime * (0.5 + aMisc.y * 2.0) + aMisc.y * 80.0)) * uFade;
          vColor = aColor;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor; varying float vA;
        void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vColor, pow(1.0 - d * 2.0, 1.5) * vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);

    const wisps = [];
    [['#2b3f86', -0.6, 0.22, 1700], ['#5a2f62', 0.9, 0.35, 1500], ['#1e5566', 2.3, 0.05, 1800], ['#6a3a1e', -2.2, 0.28, 1600], ['#243069', 3.6, 0.45, 1900]]
      .forEach(([color, az, el, size]) => {
        const m = new THREE.SpriteMaterial({ map: NEBULA_TEX, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
        const s = new THREE.Sprite(m);
        s.position.set(Math.sin(az) * 1300 * Math.cos(el), Math.sin(el) * 1300, -Math.cos(az) * 1300 * Math.cos(el));
        s.scale.setScalar(size);
        s.userData.base = 0.14;
        scene.add(s); wisps.push(s);
      });

    const sparkles = [];
    [[-62, 30, -70, 9], [58, 26, -96, 6], [-110, 14, 20, 5], [96, 34, -20, 7], [10, 44, -120, 5], [-30, 22, 70, 4]].forEach(([x, y, z, s], i) => {
      const m = new THREE.SpriteMaterial({ map: SPARKLE_TEX, color: i % 3 === 1 ? '#bfe6ff' : '#fff4e2', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const sp = new THREE.Sprite(m); sp.position.set(x, y, z); sp.scale.setScalar(s); sp.userData = { base: s, phase: rand() * TAU };
      galaxy.add(sp); sparkles.push(sp);
    });

    return { mat, wisps, sparkles };
  })();

  /* ------------------------------------------------------------------------
     2. Galaxy stars (150k)
     ------------------------------------------------------------------------ */
  const dust = (() => {
    const N = 150000;
    const orbit = new Float32Array(N * 4), tilt = new Float32Array(N * 2), col = new Float32Array(N * 3), misc = new Float32Array(N * 2);
    const palette = {
      white: [1, 0.95, 0.86], warm: [1, 0.56, 0.26], gold: [1, 0.78, 0.4],
      cyan: [0.5, 0.84, 1], blue: [0.6, 0.68, 1], rose: [1, 0.52, 0.56]
    };
    const BAND_SPD = [1.0, 0.55, 1.7, 0.8, 1.3];
    const BANDS = ORBITS.map((r, i) => ({ r, w: 0.7 + i * 0.1, wt: 0.55, spd: BAND_SPD[i], ...ORBIT_TILT[i] }))
      .concat([{ r: SHORE, w: 0.8, wt: 1.5, inc: 0, node: 0, spd: 0.7 }, { r: 55, w: 2.8, wt: 0.6, inc: 0, node: 0, spd: 1.5 }]);
    const CLUSTERS = Array.from({ length: 34 }, () => {
      const r = 13 + Math.pow(rand(), 0.75) * 98;
      return { r, th: rand() * TAU, s: 0.7 + rand() * 3.4, inc: rand() < 0.35 ? gauss() * 0.3 : 0, node: rand() * TAU, spd: 0.4 + rand() * 1.6 };
    });
    const pick = arr => { const tot = arr.reduce((s, b) => s + b.wt, 0); let x = rand() * tot; for (const b of arr) { if ((x -= b.wt) <= 0) return b; } return arr[0]; };
    const colorFor = (r, tint) => {
      if (tint && rand() < 0.65) return palette[tint];
      const warm = Math.exp(-r / 30), p = rand();
      if (p < 0.15 + 0.45 * warm) return palette.warm;
      if (p < 0.33 + 0.45 * warm) return palette.gold;
      if (p < 0.5 + 0.3 * warm) return palette.blue;
      if (p < 0.6 + 0.3 * warm) return palette.cyan;
      if (p < 0.66 + 0.3 * warm) return palette.rose;
      return palette.white;
    };

    for (let i = 0; i < N; i++) {
      const k = rand();
      let r, th, y, speed, inc = 0, node = 0, tint = null, halo = false;
      if (k < 0.33) {
        const arm = rand() < 0.5 ? 0 : Math.PI;
        r = 11 + Math.pow(rand(), 0.8) * 104;
        th = arm + Math.log(r / 9) * 2.1 + gauss() * (0.13 + r / 600);
        speed = 0.045; y = gauss() * (0.25 + 1.4 * Math.exp(-r / 16));
      } else if (k < 0.47) {
        const b = pick(BANDS); r = b.r + gauss() * b.w; th = rand() * TAU; inc = b.inc; node = b.node;
        speed = (0.03 + 0.95 / r) * (0.9 + rand() * 0.2) * b.spd; y = gauss() * 0.22;
      } else if (k < 0.63) {
        const p = pick(PLANES); r = p.r + gauss() * p.w * 0.5; th = rand() * TAU; inc = p.inc + gauss() * 0.015; node = p.node; tint = p.tint;
        speed = (0.02 + 0.8 / r) * (0.92 + rand() * 0.16) * p.spd; y = gauss() * 0.3;
      } else if (k < 0.77) {
        const c = CLUSTERS[(rand() * CLUSTERS.length) | 0];
        r = c.r + gauss() * c.s; th = c.th + (gauss() * c.s) / c.r; inc = c.inc; node = c.node;
        speed = (0.03 + 0.95 / c.r) * c.spd; y = gauss() * c.s * 0.35;
      } else if (k < 0.85) {
        halo = true;
        r = 14 + Math.pow(rand(), 0.6) * 110; th = rand() * TAU;
        inc = (rand() * 2 - 1) * 1.35; node = rand() * TAU;
        speed = (0.012 + 0.7 / r) * (0.7 + rand() * 0.6); y = gauss() * 1.5;
      } else {
        r = 10 + -Math.log(1 - rand() * 0.98) * 34; th = rand() * TAU;
        speed = (0.03 + 0.95 / r) * (0.8 + rand() * 0.4); y = gauss() * (0.3 + 1.8 * Math.exp(-r / 14));
      }
      r = Math.max(SUN_R + 2, r);
      orbit.set([r, th, y, speed], i * 4);
      tilt.set([inc, node], i * 2);

      const roll = rand();
      let b, size;
      if (roll < 0.02 || (halo && roll < 0.14)) { b = 1.0 + rand() * 0.9; size = 0.42 + rand() * 0.55; }
      else if (roll < 0.16) { b = 0.45 + rand() * 0.4; size = 0.18 + rand() * 0.14; }
      else { b = 0.06 + rand() * 0.2; size = 0.08 + rand() * 0.09; }
      b *= 0.4 + 0.6 * THREE.MathUtils.smoothstep(r, 10, 30);
      col.set(colorFor(r, tint).map(v => toLin(v) * b), i * 3);
      misc.set([size, rand()], i * 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    geo.setAttribute('aOrbit', new THREE.BufferAttribute(orbit, 4));
    geo.setAttribute('aTilt', new THREE.BufferAttribute(tilt, 2));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aMisc', new THREE.BufferAttribute(misc, 2));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uReveal: { value: 0 }, uScale: { value: pointScale() }, uPR: { value: PR } },
      vertexShader: /* glsl */`
        uniform float uTime, uReveal, uScale, uPR;
        attribute vec4 aOrbit; attribute vec2 aTilt; attribute vec3 aColor; attribute vec2 aMisc;
        varying vec3 vColor; varying float vAlpha; varying float vSharp;
        void main() {
          float r = aOrbit.x;
          float th = aOrbit.y + uTime * aOrbit.w;
          vec3 p = vec3(cos(th) * r, aOrbit.z, sin(th) * r);
          float ci = cos(aTilt.x), si = sin(aTilt.x);
          p = vec3(p.x, p.y * ci - p.z * si, p.y * si + p.z * ci);
          float cn = cos(aTilt.y), sn = sin(aTilt.y);
          p = vec3(p.x * cn + p.z * sn, p.y, -p.x * sn + p.z * cn);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float front = uReveal * 150.0;
          float vis = 1.0 - smoothstep(front - 18.0, front, r);
          float wd = (r - front + 5.0) / 5.0;
          float wave = exp(-wd * wd) * (1.0 - smoothstep(0.8, 1.0, uReveal));
          float tw = 0.65 + 0.35 * sin(uTime * (0.6 + aMisc.y * 3.0) + aMisc.y * 60.0);
          float s = aMisc.x * uScale * uPR / max(-mv.z, 0.1);
          vAlpha = (vis * tw + wave * 1.4) * clamp(s, 0.3, 1.0);
          vColor = aColor * (1.0 + wave * 1.6);
          vSharp = smoothstep(2.5, 7.0, s);
          gl_PointSize = clamp(s, 1.0, 64.0);
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor; varying float vAlpha; varying float vSharp;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c) * 2.0;
          if (d > 1.0) discard;
          float soft = pow(1.0 - d, 1.8);
          float core = exp(-d * d * 30.0);
          float halo = exp(-d * 4.5) * 0.3;
          float glint = (exp(-abs(c.x) * 60.0) + exp(-abs(c.y) * 60.0)) * (1.0 - d) * 0.35;
          float star = core * 1.6 + halo + glint;
          float a = mix(soft, star, vSharp);
          gl_FragColor = vec4(mix(vColor, vec3(1.0), core * vSharp * 0.5), a * vAlpha);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 2;
    galaxy.add(points);
    return { mat };
  })();

  /* ------------------------------------------------------------------------
     2b. Rising embers
     ------------------------------------------------------------------------ */
  const embers = (() => {
    const N = 1400;
    const seed = new Float32Array(N * 4), extra = new Float32Array(N * 4), col = new Float32Array(N * 3);
    const cols = [[1, 0.8, 0.45], [1, 0.62, 0.32], [0.6, 0.88, 1], [1, 0.95, 0.85], [1, 0.6, 0.62]];
    for (let i = 0; i < N; i++) {
      const r = 10 + Math.pow(rand(), 0.8) * 95;
      seed.set([r, rand() * TAU, rand(), 0.03 + rand() * 0.07], i * 4);
      extra.set([6 + rand() * 26, (rand() * 2 - 1) * 0.6, 0.12 + rand() * 0.22, rand() < 0.5 ? 1 : -1], i * 4);
      const c = cols[(rand() * cols.length) | 0], b = 0.7 + rand() * 0.8;
      col.set(c.map(v => toLin(v) * b), i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    geo.setAttribute('aExtra', new THREE.BufferAttribute(extra, 4));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uFade: { value: 0 }, uScale: { value: pointScale() }, uPR: { value: PR } },
      vertexShader: /* glsl */`
        uniform float uTime, uFade, uScale, uPR;
        attribute vec4 aSeed, aExtra; attribute vec3 aColor;
        varying vec3 vColor; varying float vA;
        void main() {
          float life = fract(uTime * aSeed.w + aSeed.z);
          float th = aSeed.y + uTime * (0.02 + 0.5 / aSeed.x) + life * aExtra.y;
          float r = aSeed.x + life * 8.0;
          vec3 p = vec3(cos(th) * r, aExtra.w * life * aExtra.x, sin(th) * r);
          p.x += sin(life * 6.2831 + aSeed.z * 20.0) * 1.2;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float s = aExtra.z * uScale * uPR / max(-mv.z, 0.1);
          gl_PointSize = clamp(s, 1.0, 40.0);
          float flick = 0.7 + 0.3 * sin(uTime * 7.0 + aSeed.z * 50.0);
          vA = sin(3.14159 * life) * uFade * flick;
          vColor = aColor;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor; varying float vA;
        void main() { float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; float a = exp(-d * d * 26.0) * 1.4 + exp(-d * 4.0) * 0.12; gl_FragColor = vec4(vColor, a * vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 3;
    galaxy.add(points);
    return { mat };
  })();

  /* ------------------------------------------------------------------------
     2c. Shooting stars
     ------------------------------------------------------------------------ */
  const meteors = (() => {
    const pool = [];
    const segs = 40;
    const tailGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: segs + 1 }, (_, i) => new THREE.Vector3(i / segs - 1, 0, 0)));
    tailGeo.setAttribute('aT', new THREE.BufferAttribute(new Float32Array(Array.from({ length: segs + 1 }, (_, i) => i / segs)), 1));
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { uA: { value: 0 }, uColor: { value: new THREE.Color('#fff2dc') } },
        vertexShader: /* glsl */`attribute float aT; varying float vT; void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */`uniform float uA; uniform vec3 uColor; varying float vT; void main() { gl_FragColor = vec4(uColor * (1.0 + vT * 2.0), pow(vT, 2.2) * uA); }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
      });
      const line = new THREE.Line(tailGeo, mat);
      line.frustumCulled = false;
      const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: '#fff6e6', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      head.scale.setScalar(3);
      line.visible = false; head.visible = false;
      scene.add(line); scene.add(head);
      pool.push({ line, head, mat, t: 0, life: 0, active: false, from: new THREE.Vector3(), dir: new THREE.Vector3(), speed: 0, len: 0 });
    }
    let next = 2;
    const X = new THREE.Vector3(1, 0, 0);
    function spawn() {
      const m = pool.find(p => !p.active);
      if (!m) return;
      const side = rand() < 0.5 ? 1 : -1;
      m.from.set(side * (40 + rand() * 110), 25 + rand() * 55, -110 + rand() * 120);
      m.dir.set(-side * (0.7 + rand() * 0.5), -(0.25 + rand() * 0.35), (rand() * 2 - 1) * 0.5).normalize();
      m.speed = 70 + rand() * 60; m.len = 14 + rand() * 22; m.life = 1.1 + rand() * 0.8; m.t = 0; m.active = true;
      m.mat.uniforms.uColor.value.set(rand() < 0.3 ? '#bfeaff' : '#fff0d6');
      m.line.quaternion.setFromUnitVectors(X, m.dir);
      m.line.visible = m.head.visible = true;
    }
    function update(dt, enabled) {
      if (enabled) { next -= dt; if (next <= 0) { spawn(); if (rand() < 0.25) spawn(); next = 1.6 + rand() * 3.6; } }
      for (const m of pool) {
        if (!m.active) continue;
        m.t += dt;
        const p = m.t / m.life;
        const fade = Math.sin(Math.min(1, p) * Math.PI);
        const headPos = m.from.clone().addScaledVector(m.dir, m.speed * m.t);
        m.line.position.copy(headPos);
        m.line.scale.set(m.len * Math.min(1, p * 3), 1, 1);
        m.mat.uniforms.uA.value = fade;
        m.head.position.copy(headPos);
        m.head.material.opacity = fade * 0.9;
        if (p >= 1) { m.active = false; m.line.visible = m.head.visible = false; }
      }
    }
    return { update };
  })();

  /* ------------------------------------------------------------------------
     3. Disk haze
     ------------------------------------------------------------------------ */
  const haze = (() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uReveal: { value: 0 } },
      vertexShader: /* glsl */`varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: GLSL_COMMON + /* glsl */`
        uniform float uTime, uReveal; varying vec2 vP;
        void main() {
          vec2 p = vec2(vP.x, -vP.y);
          float r = length(p);
          float a = atan(p.y, p.x);
          float rot = a - uTime * 0.03;
          vec2 q = vec2(cos(rot), sin(rot)) * r;
          float n = fbm(q * 0.03 + 4.0);
          float n2 = fbm(q * 0.08 - 7.0);
          float clump = smoothstep(0.38, 0.8, n);
          float arms = pow(0.5 + 0.5 * cos(2.0 * (a - log(max(r, 9.0) / 9.0) * 2.1 - uTime * 0.045)), 3.0);
          float radial = smoothstep(12.0, 34.0, r) * exp(-r / 60.0);
          vec3 cool = lin(vec3(0.3, 0.38, 0.75));
          vec3 rose = lin(vec3(0.7, 0.35, 0.5));
          vec3 warm = lin(vec3(0.95, 0.55, 0.3));
          vec3 col = mix(cool, mix(rose, warm, n2), smoothstep(110.0, 20.0, r) * 0.7);
          col *= radial * (0.15 + arms * 1.3) * (0.25 + clump * 1.4);
          float front = uReveal * 150.0;
          col *= (1.0 - smoothstep(front - 25.0, front, r)) * smoothstep(140.0, 95.0, r);
          gl_FragColor = vec4(col * 0.28, 1.0);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 1;
    galaxy.add(mesh);
    return { mat };
  })();

  /* ------------------------------------------------------------------------
     4. The sun — you
     ------------------------------------------------------------------------ */
  const sun = (() => {
    const billboardVS = /* glsl */`
      uniform float uSize, uPush; varying vec2 vUv;
      void main() {
        vUv = position.xy;
        vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        mv.xy += position.xy * uSize;
        mv.z += uPush;
        gl_Position = projectionMatrix * mv;
      }`;
    const quad = new THREE.PlaneGeometry(2, 2);

    const coreMat = new THREE.ShaderMaterial({
      uniforms: { uSize: { value: 0.001 }, uPush: { value: 0 }, uTime: { value: 0 }, uIgnite: { value: 0 } },
      vertexShader: billboardVS,
      fragmentShader: GLSL_COMMON + /* glsl */`
        uniform float uTime, uIgnite; varying vec2 vUv;
        void main() {
          float r = length(vUv);
          if (r > 1.0) discard;
          float mu = sqrt(1.0 - r * r);
          vec3 hot  = vec3(1.0, 0.97, 0.88);
          vec3 gold = vec3(1.0, 0.8, 0.46);
          vec3 edge = vec3(0.98, 0.52, 0.2);
          vec3 col = mix(edge, gold, smoothstep(0.0, 0.55, mu));
          col = mix(col, hot, smoothstep(0.55, 1.0, mu) * 0.85);
          vec2 sp = vUv / (0.6 + 0.4 * mu);
          float g = fbm(sp * 5.0 + vec2(uTime * 0.04, -uTime * 0.03));
          float g2 = fbm(sp * 14.0 - vec2(uTime * 0.07, uTime * 0.05));
          col *= 0.88 + 0.16 * g + 0.08 * g2;
          col += vec3(1.0, 0.7, 0.4) * smoothstep(0.8, 1.0, r) * 0.18;
          col *= 0.95;
          col *= mix(2.5, 1.0, uIgnite);
          gl_FragColor = vec4(lin(max(col, vec3(0.0))), 1.0);
        }`
    });
    const core = new THREE.Mesh(quad, coreMat);
    core.renderOrder = -1;
    core.frustumCulled = false;
    galaxy.add(core);

    const glowMat = new THREE.ShaderMaterial({
      uniforms: { uSize: { value: SUN_R * 4.5 }, uPush: { value: -0.5 }, uTime: { value: 0 }, uIgnite: { value: 0 } },
      vertexShader: billboardVS,
      fragmentShader: GLSL_COMMON + /* glsl */`
        uniform float uTime, uIgnite; varying vec2 vUv;
        void main() {
          float r = length(vUv);
          float a = atan(vUv.y, vUv.x);
          float g = exp(-r * 9.0) * 0.85 + exp(-r * 3.0) * 0.1;
          float n = fbm(vec2(a * 3.0, r * 4.0 - uTime * 0.08));
          float streamers = pow(n, 3.0) * exp(-r * 4.5) * 0.7;
          float ticks = step(0.75, fract(a / 6.2831853 * 96.0 + uTime * 0.01)) * smoothstep(0.005, 0.0, abs(r - 0.3)) * 0.6;
          float ring2 = smoothstep(0.003, 0.0, abs(r - 0.37)) * step(0.5, fract(a / 6.2831853 * 40.0 - uTime * 0.02)) * 0.45;
          vec3 col = lin(vec3(1.0, 0.66, 0.34)) * (g + streamers) + lin(vec3(1.0, 0.85, 0.65)) * (ticks + ring2) * 0.5;
          float fade = smoothstep(1.0, 0.6, r);
          gl_FragColor = vec4(col * uIgnite * fade, 1.0);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(quad, glowMat);
    glow.renderOrder = 3;
    glow.frustumCulled = false;
    galaxy.add(glow);

    return { coreMat, glowMat };
  })();

  /* ------------------------------------------------------------------------
     5. Orbits, shoreline, moonlets, wanderers
     ------------------------------------------------------------------------ */
  const orbitLines = [];
  function makeOrbit(r, { color = '#efe6d8', opacity = 0.2, dashed = false, dash = 1.2, gap = 1.6, segs = 720, delay = 0, inc = 0, node = 0, spin = 0, parent = galaxy } = {}) {
    const pts = [];
    for (let i = 0; i <= segs; i++) { const a = (i / segs) * TAU; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = dashed
      ? new THREE.LineDashedMaterial({ color, transparent: true, opacity: 0, dashSize: dash, gapSize: gap, depthWrite: false, blending: THREE.AdditiveBlending })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const line = new THREE.Line(geo, mat);
    if (dashed) line.computeLineDistances();
    const pivot = new THREE.Object3D();
    pivot.rotation.set(inc, node, 0, 'YXZ');
    pivot.add(line);
    geo.setDrawRange(0, 0);
    line.renderOrder = 4;
    line.userData = { segs, opacity, delay, spin, pivot };
    parent.add(pivot);
    orbitLines.push(line);
    return line;
  }
  ORBITS.forEach((r, i) => makeOrbit(r, { opacity: 0.22 + i * 0.015, delay: i * 0.06, ...ORBIT_TILT[i] }));
  makeOrbit(SHORE, { color: '#fff1dc', opacity: 0.85, delay: 0.3 });
  makeOrbit(SHORE + 0.7, { color: '#ffd6a8', opacity: 0.22, delay: 0.32 });
  makeOrbit(SHORE - 0.6, { color: '#ffd6a8', opacity: 0.14, delay: 0.34 });
  makeOrbit(60, { opacity: 0.14, dashed: true, delay: 0.4, spin: 0.05 });
  makeOrbit(86, { opacity: 0.1, dashed: true, dash: 0.6, gap: 2.4, delay: 0.5, spin: -0.02 });
  PLANES.forEach((p, i) => makeOrbit(p.r, { color: { cyan: '#9fe6f5', rose: '#f3b2b8', gold: '#f6d29a', blue: '#b4c0ff' }[p.tint], opacity: 0.16, dashed: i % 2 === 0, dash: 0.8, gap: 1.8, delay: 0.45 + i * 0.05, inc: p.inc, node: p.node, spin: i % 2 === 0 ? (0.02 + 0.8 / p.r) * p.spd : 0 }));
  const satOrbit = makeOrbit(74, { opacity: 0.22, dashed: true, dash: 1.4, gap: 1.2, delay: 0.7, inc: 0.5, node: 0.3 });

  const moonlets = (() => {
    const N = 140;
    const geo = new THREE.SphereGeometry(1, 16, 12);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */`
        varying vec3 vN, vW, vC;
        void main() {
          mat4 m = modelMatrix * instanceMatrix;
          vN = normalize(mat3(m) * normal);
          vec4 w = m * vec4(position, 1.0); vW = w.xyz;
          vC = vec3(1.0);
          #ifdef USE_INSTANCING_COLOR
            vC = instanceColor;
          #endif
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vN, vW, vC;
        void main() {
          vec3 N = normalize(vN);
          vec3 L = normalize(-vW);
          vec3 V = normalize(cameraPosition - vW);
          float diff = max(dot(N, L), 0.0);
          float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          vec3 col = vC * (0.12 + 1.15 * diff) + vC * rim * 0.35;
          gl_FragColor = vec4(col, 1.0);
        }`
    });
    const mesh = new THREE.InstancedMesh(geo, mat, N);
    mesh.frustumCulled = false;
    const cols = ['#f3e6d0', '#e9a46a', '#cfd7e6', '#f0c27e', '#b8a48e', '#f2b3a3', '#9fd6e8'];
    const data = [];
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const plane = rand() < 0.55 ? PLANES[(rand() * PLANES.length) | 0] : null;
      const r = plane ? plane.r + gauss() * plane.w * 0.4 : 18 + rand() * 90;
      const inc = plane ? plane.inc : gauss() * 0.35;
      const node = plane ? plane.node : rand() * TAU;
      const spd = (0.02 + 0.85 / r) * (plane ? plane.spd : 0.4 + rand() * 1.6) * (rand() < 0.12 ? -1 : 1);
      data.push({ r, a: rand() * TAU, spd, euler: new THREE.Euler(inc, node, 0, 'YXZ'), size: 0.16 + Math.pow(rand(), 3) * 0.45, y: gauss() * 0.4 });
      c.set(cols[(rand() * cols.length) | 0]);
      mesh.setColorAt(i, c);
    }
    mesh.instanceColor.needsUpdate = true;
    galaxy.add(mesh);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    function update(time, appear) {
      for (let i = 0; i < N; i++) {
        const d = data[i];
        const a = d.a + time * d.spd;
        p.set(Math.cos(a) * d.r, d.y, Math.sin(a) * d.r).applyEuler(d.euler);
        s.setScalar(d.size * appear);
        m4.compose(p, q, s);
        mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    return { update };
  })();

  const shoreTicks = (() => {
    const pts = [];
    for (let i = 0; i < 360; i += 2) {
      const a = THREE.MathUtils.degToRad(i), len = i % 30 === 0 ? 2.2 : i % 10 === 0 ? 1.2 : 0.5;
      pts.push(polar(SHORE + 1.1, a), polar(SHORE + 1.1 + len, a));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: '#ffe9cc', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const seg = new THREE.LineSegments(geo, mat);
    galaxy.add(seg);
    return mat;
  })();

  const SPHERE = new THREE.SphereGeometry(1, 48, 32);
  const planetVS = /* glsl */`
    varying vec3 vN, vW, vL;
    void main() {
      vL = position;
      vN = normalize(mat3(modelMatrix) * normal);
      vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const planetFS = /* glsl */`
    uniform vec3 uColor, uColor2; uniform float uBands, uHover, uEmissive;
    varying vec3 vN, vW, vL;
    void main() {
      vec3 N = normalize(vN);
      vec3 L = normalize(-vW);
      vec3 V = normalize(cameraPosition - vW);
      float diff = max(dot(N, L), 0.0);
      float band = 0.5 + 0.5 * sin(vL.y * uBands + sin(vL.x * 3.0 + vL.z * 2.0) * 0.8);
      vec3 base = mix(uColor, uColor2, band * 0.6);
      float rim = pow(1.0 - max(dot(N, V), 0.0), 2.4);
      vec3 col = base * (0.22 + 0.9 * diff + uEmissive) + uColor * rim * (0.5 + uHover * 0.6);
      col *= 1.0 + uHover * 0.18;
      gl_FragColor = vec4(col, 1.0);
    }`;
  function makePlanet({ color, color2 = color, bands = 9, size = 1, emissive = 0 }) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uColor2: { value: new THREE.Color(color2) }, uBands: { value: bands }, uHover: { value: 0 }, uEmissive: { value: emissive } },
      vertexShader: planetVS, fragmentShader: planetFS
    });
    const mesh = new THREE.Mesh(SPHERE, mat);
    mesh.scale.setScalar(size);
    mesh.renderOrder = 0;
    return mesh;
  }
  function makeGlow(color, size, opacity) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(size);
    s.renderOrder = 5;
    return s;
  }
  function makeFlatRing(color, inner = 0.92, outer = 1) {
    const m = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 96), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 5;
    return m;
  }

  const decor = [];
  function addDecor({ r, angle, speed, size, color, color2, bands, y = 0, ring = false, ringColor = '#f4d9b8' }) {
    const g = new THREE.Group();
    const p = makePlanet({ color, color2, bands, size });
    g.add(p);
    g.add(makeGlow(color, size * 5, 0.22));
    if (ring) {
      const rg = new THREE.Mesh(new THREE.RingGeometry(size * 1.5, size * 2.3, 96), new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
      rg.rotation.set(-Math.PI / 2 + 0.35, 0.2, 0);
      g.add(rg);
      const rg2 = new THREE.Mesh(new THREE.RingGeometry(size * 2.4, size * 2.5, 96), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
      rg2.rotation.copy(rg.rotation);
      g.add(rg2);
    }
    g.userData = { r, angle, speed, y, size };
    g.scale.setScalar(0.0001);
    galaxy.add(g);
    decor.push(g);
  }
  addDecor({ r: 88, angle: 0.18, speed: 0.006, size: 2.3, color: '#f2a497', color2: '#c96a62', bands: 7, ring: true });
  addDecor({ r: 76, angle: -0.72, speed: 0.008, size: 1.7, color: '#f4efe6', color2: '#cfc6b8', bands: 4 });
  addDecor({ r: 62, angle: -1.95, speed: 0.011, size: 1.0, color: '#c9b7a0', color2: '#8c7a66', bands: 14 });
  addDecor({ r: 58, angle: 1.78, speed: 0.012, size: 1.5, color: '#e9e6f0', color2: '#8a8aa0', bands: 26 });
  addDecor({ r: 102, angle: -2.55, speed: 0.004, size: 1.3, color: '#e8d2b0', color2: '#a78a5f', bands: 6 });
  addDecor({ r: 70, angle: 2.62, speed: 0.009, size: 0.8, color: '#b9c4d6', color2: '#7d889a', bands: 10 });
  addDecor({ r: 96, angle: 0.95, speed: 0.005, size: 0.9, color: '#f0c48a', color2: '#b0803f', bands: 8 });
  for (let i = 0; i < 16; i++) {
    const r = 55 + rand() * 50;
    addDecor({ r, angle: rand() * TAU, speed: 0.05 / Math.sqrt(r), size: 0.25 + rand() * 0.35, color: rand() < 0.5 ? '#f4ead8' : '#e9a070', color2: '#8a7a6a', bands: 6, y: gauss() * 0.6 });
  }

  const satellite = (() => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: SATELLITE_TEX, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    s.scale.setScalar(6.5);
    s.renderOrder = 6;
    galaxy.add(s);
    return s;
  })();

  /* ------------------------------------------------------------------------
     Dynamic items: User's Stars (ideas) & Today's Lighthouses (lights)
     ------------------------------------------------------------------------ */
  let items = [];
  let lightItems = [];
  let itemById = {};
  let anchorIds = new Set();
  let dynamicOrbits = [];
  let currentWorldData = null;
  let currentSignature = '';
  let sceneBorn = performance.now();
  const seenIds = new Set();

  function clearDynamicScene() {
    while (dynamicGroup.children.length > 0) {
      dynamicGroup.remove(dynamicGroup.children[0]);
    }
    dynamicOrbits.forEach(line => {
      const idx = orbitLines.indexOf(line);
      if (idx !== -1) orbitLines.splice(idx, 1);
    });
    dynamicOrbits = [];
    if (labelsEl) labelsEl.innerHTML = '';
    items = [];
    lightItems = [];
    itemById = {};
    anchorIds = new Set();
  }

  function mapWorldDataToModels(data) {
    const langEn = window.currentLanguage === 'en';
    const rawPoints = data?.context?.points || [];
    const rawLights = data?.lights || [];

    // Spread angles nicely so stars on the same orbit don't collide
    const usedAnglesByOrbit = [[], [], [], [], []];
    const mappedIdeas = rawPoints.map((pt, i) => {
      const idea = pt.idea || {};
      const id = String(pt.id ?? idea.id ?? `idea-${i}`);
      const nameEn = idea.universeLabelEn || idea.nameEn || idea.name || `Star ${i + 1}`;
      const nameZh = idea.nameZh || idea.name || nameEn;
      const displayTitle = langEn ? nameEn : nameZh;
      const displaySub = langEn ? (nameZh !== nameEn ? nameZh : 'YOUR STAR') : (nameEn !== nameZh ? nameEn : '你的星');
      const now = Date.now();
      const updated = Number(idea.updatedAt || idea.createdAt || now);
      const daysIdle = Math.max(0, Math.floor((now - updated) / (24 * 3600 * 1000)));
      const status = idea.status === 'archived' || daysIdle > 18
        ? 'dwarf'
        : daysIdle > 5
          ? 'dormant'
          : 'active';
      const orbitIdx = i % ORBITS.length;
      let angle = Math.atan2(Number(pt.y) || 0, Number(pt.x) || 0);
      if (!Number.isFinite(angle) || (pt.x === 0 && pt.y === 0)) {
        angle = (i * 2.39996) % TAU - Math.PI;
      }
      while (usedAnglesByOrbit[orbitIdx].some(a => Math.abs(Math.atan2(Math.sin(angle - a), Math.cos(angle - a))) < 0.42)) {
        angle += 0.48;
      }
      usedAnglesByOrbit[orbitIdx].push(angle);

      const palette = status === 'dwarf' ? DWARF_COLORS : status === 'dormant' ? DORMANT_COLORS : ACTIVE_COLORS;
      const [color, color2] = palette[i % palette.length];
      const coreText = idea.card?.core
        || idea.nodes?.[0]?.text
        || idea.chatHistory?.find(m => m.role === 'user')?.content
        || (langEn ? 'A thought orbiting quietly in your drawer.' : '一颗在你的抽屉里安静旋转的念头。');

      return {
        id,
        rawIdea: idea,
        name: displayTitle,
        zh: displaySub,
        status,
        orbit: orbitIdx,
        angle,
        color,
        color2,
        core: String(coreText).slice(0, 180),
        coreZh: idea.card?.core && idea.nodes?.[0]?.text && idea.card.core !== idea.nodes[0].text ? String(idea.nodes[0].text).slice(0, 160) : '',
        age: daysIdle === 0
          ? (langEn ? 'Active today' : '今日活跃')
          : (langEn ? `${daysIdle}d ago` : `${daysIdle} 天前记录`)
      };
    });

    const roleMeta = {
      border: { roleLabel: 'BORDER LIGHT', roleZh: '贴边星' },
      echo: { roleLabel: 'OLD STAR ECHO', roleZh: '老星回声' },
      far: { roleLabel: 'DISTANT LIGHT', roleZh: '意外远星' }
    };
    const typeMeta = {
      person: { en: 'PERSON', zh: '人物' },
      work: { en: 'WORK', zh: '作品' },
      field: { en: 'FIELD', zh: '领域' },
      concept: { en: 'CONCEPT', zh: '概念' },
      question: { en: 'QUESTION', zh: '提问' }
    };

    const usedLightAngles = [];
    const mappedLights = rawLights.map((light, i) => {
      const anchorIdeaId = String(light.anchorId ?? light.nearestIdeaId ?? mappedIdeas[i % Math.max(1, mappedIdeas.length)]?.id ?? '');
      const anchorObj = mappedIdeas.find(m => m.id === anchorIdeaId) || mappedIdeas[0];
      const baseAngle = anchorObj
        ? anchorObj.angle + (i % 2 === 0 ? 0.55 : -0.55) + i * 0.25
        : Math.atan2(Number(light.y) || 0, Number(light.x) || 0);
      let angle = baseAngle;
      while (usedLightAngles.some(a => Math.abs(Math.atan2(Math.sin(angle - a), Math.cos(angle - a))) < 0.65)) {
        angle += 0.68;
      }
      usedLightAngles.push(angle);

      const rm = roleMeta[light.role] || roleMeta.border;
      const tm = typeMeta[light.type] || typeMeta.concept;
      const namePrimary = langEn ? (light.nameEn || light.name) : (light.nameZh || light.name);
      const nameSecondary = langEn ? (light.nameZh || light.name) : (light.nameEn || tm.en);
      const descPrimary = langEn ? (light.descriptionEn || light.description) : (light.descriptionZh || light.description);
      const descSecondary = langEn ? (light.description || '') : (light.descriptionEn || '');
      const whyPrimary = langEn ? (light.relationEn || light.relation) : (light.relationZh || light.relation);
      const whySecondary = langEn ? (light.relation || '') : (light.relationEn || '');
      const dist = Math.max(0.22, Math.min(1.45, Number(light.semanticDistance) || (light.role === 'far' ? 1.2 : light.role === 'echo' ? 0.72 : 0.35)));

      return {
        id: String(light.id || `light-${i}`),
        rawLight: light,
        name: namePrimary,
        zh: nameSecondary && nameSecondary !== namePrimary ? nameSecondary : rm.roleZh,
        type: langEn ? tm.en : `${tm.zh} · ${tm.en}`,
        role: light.role || 'border',
        roleLabel: rm.roleLabel,
        roleZh: rm.roleZh,
        anchor: anchorObj ? anchorObj.id : '',
        distance: dist,
        angle,
        desc: descPrimary || '',
        descZh: descSecondary !== descPrimary ? descSecondary : '',
        why: whyPrimary || '',
        whyZh: whySecondary !== whyPrimary ? whySecondary : ''
      };
    });

    return { mappedIdeas, mappedLights };
  }

  function rebuildDynamicScene(data) {
    clearDynamicScene();
    const { mappedIdeas, mappedLights } = mapWorldDataToModels(data);
    anchorIds = new Set(mappedLights.map(l => l.anchor).filter(Boolean));

    sceneBorn = performance.now();
    const alreadyRevealed = false;
    let newIdeaCount = 0;
    let newLightCount = 0;
    const delayFor = (id, kind) => {
      if (seenIds.has(id)) return -100;
      seenIds.add(id);
      if (kind === 'idea') return 0.15 + (newIdeaCount++) * 0.07;
      return 1.8 + (newLightCount++) * 0.85;
    };

    mappedIdeas.forEach((idea, i) => {
      const r = ORBITS[idea.orbit];
      const pos = tilted(r, idea.angle, ORBIT_TILT[idea.orbit]);
      const size = idea.status === 'active' ? 1.15 + (i % 3) * 0.2 : idea.status === 'dormant' ? 0.95 : 0.6;
      const group = new THREE.Group();
      group.position.copy(pos);
      const mesh = makePlanet({ color: idea.color, color2: idea.color2, bands: 8 + (i % 4) * 3, size, emissive: idea.status === 'active' ? 0.25 : 0.05 });
      const glow = makeGlow(idea.color, size * (idea.status === 'dwarf' ? 3.5 : 5), idea.status === 'active' ? 0.32 : idea.status === 'dormant' ? 0.2 : 0.12);
      group.add(mesh, glow);
      group.scale.setScalar(alreadyRevealed ? 1 : 0.0001);
      dynamicGroup.add(group);
      const it = { kind: 'idea', data: idea, index: i, group, mesh, glow, size, glowBase: glow.material.opacity, glowScale: glow.scale.x, hover: 0, appear: 0, local: pos, delay: delayFor(`idea:${idea.id}`, 'idea') };
      items.push(it);
      itemById[idea.id] = it;
    });

    mappedLights.forEach((light, i) => {
      const tilt = LIGHT_TILT[i % LIGHT_TILT.length];
      const r = lightRadius(light);
      const orbitLine = makeOrbit(r, {
        color: '#9fe6f5',
        opacity: 0.14,
        dashed: true,
        dash: 0.5,
        gap: 1.4,
        delay: 0.6 + i * 0.05,
        spin: [0.03, -0.015, 0.008, -0.02][i % 4],
        parent: dynamicGroup,
        ...tilt
      });
      dynamicOrbits.push(orbitLine);

      const pos = tilted(r, light.angle, tilt);
      const size = 1.75 + Math.max(0, 1 - light.distance * 0.6) * 0.25;
      const group = new THREE.Group();
      group.position.copy(pos);
      const mesh = makePlanet({ color: '#6fd8ee', color2: '#2a8fb0', bands: 11, size, emissive: 0.55 });
      const glow = makeGlow('#7fdcf0', size * 4.5, 0.42);
      const halo = makeGlow('#bff2ff', size * 2.6, 0.6);

      const beamMat = new THREE.ShaderMaterial({
        uniforms: { uA: { value: 0 }, uTime: { value: 0 } },
        vertexShader: /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: GLSL_COMMON + /* glsl */`
          uniform float uA, uTime; varying vec2 vUv;
          void main() {
            float x = 1.0 - abs(vUv.x - 0.5) * 2.0;
            float core = pow(x, 6.0) + pow(x, 40.0) * 2.0;
            float fall = pow(1.0 - vUv.y, 2.2);
            float flicker = 0.85 + 0.15 * sin(uTime * 2.0 + vUv.y * 20.0);
            gl_FragColor = vec4(lin(vec3(0.6, 0.92, 1.0)) * core * fall * flicker * uA, 1.0);
          }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
      });
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 12), beamMat);
      beam.position.y = 6;
      beam.renderOrder = 6;
      const pulses = [makeFlatRing('#7fdcf0', 0.965, 1), makeFlatRing('#7fdcf0', 0.975, 1)];
      const reticle = new THREE.Sprite(new THREE.SpriteMaterial({ map: RETICLE_TEX, color: '#bff2ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      reticle.scale.setScalar(size * 5.5);
      reticle.renderOrder = 7;
      group.add(mesh, glow, halo, beam, reticle, ...pulses);
      group.scale.setScalar(alreadyRevealed ? 1 : 0.0001);
      dynamicGroup.add(group);

      const anchor = itemById[light.anchor] || items[0];
      const a = pos.clone();
      const b = anchor ? anchor.local.clone() : new THREE.Vector3(ORBITS[0], 0, 0);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.y += 7 + a.distanceTo(b) * 0.18;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const pts = curve.getPoints(160);
      const arcGeo = new THREE.BufferGeometry().setFromPoints(pts);
      arcGeo.setAttribute('aT', new THREE.BufferAttribute(new Float32Array(pts.map((_, k) => k / (pts.length - 1))), 1));
      const arcMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uDraw: { value: alreadyRevealed ? 1 : 0 }, uSel: { value: 0 }, uA: { value: new THREE.Color('#7fdcf0') }, uB: { value: new THREE.Color('#f2a65a') } },
        vertexShader: /* glsl */`attribute float aT; varying float vT; void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */`
          uniform float uTime, uDraw, uSel; uniform vec3 uA, uB; varying float vT;
          void main() {
            if (vT > uDraw) discard;
            float dash = step(0.45, fract(vT * 34.0 - uTime * 0.9));
            vec3 col = mix(uA, uB, smoothstep(0.15, 0.95, vT));
            float hd = (vT - uDraw) * 30.0;
            float head = exp(-hd * hd) * (1.0 - step(0.999, uDraw));
            float a = mix(0.18 + 0.7 * dash, 0.45 + 0.55 * dash, uSel) + head * 2.0;
            gl_FragColor = vec4(col * (1.6 + uSel * 1.2 + head * 2.0), min(a, 1.0));
          }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
      });
      const arc = new THREE.Line(arcGeo, arcMat);
      arc.renderOrder = 6;
      dynamicGroup.add(arc);
      const spark = makeGlow('#dff8ff', 3.2, 0);
      dynamicGroup.add(spark);

      const it = {
        kind: 'light', data: light, index: i, group, mesh, glow, halo, beam, beamMat, pulses, reticle, size,
        glowBase: 0.42, glowScale: glow.scale.x, hover: 0, appear: 0, arc: 0,
        local: pos, curve, arcMat, spark, arrived: false, kept: false, delay: delayFor(`light:${light.id}`, 'light')
      };
      items.push(it);
      lightItems.push(it);
      itemById[light.id] = it;
    });

    items.forEach(it => {
      const el = document.createElement('div');
      const d = it.data;
      if (it.kind === 'light') {
        el.className = 'label light';
        el.innerHTML = `${esc(d.name)}<span class="sub">${esc(d.roleLabel)}</span>${d.zh && d.zh !== d.roleZh ? `<span class="sub alt">${esc(d.zh)}</span>` : ''}`;
      } else {
        el.className = `label idea ${d.status}`;
        el.innerHTML = `${esc(d.name)}<span class="sub">${esc(d.zh)}</span>`;
      }
      labelsEl?.appendChild(el);
      it.label = el;
      it.labelPinned = it.kind === 'light' || anchorIds.has(d.id);
    });

    galaxy.updateMatrixWorld(true);
    items.forEach(it => { it.world = galaxy.localToWorld(it.local.clone()); });
  }

  /* ------------------------------------------------------------------------
     8. Shockwaves & Collisions
     ------------------------------------------------------------------------ */
  const waves = [];
  function spawnWave(local, color, maxScale, dur, opacity = 0.9, width = 0.06) {
    const m = makeFlatRing(color, 1 - width, 1);
    m.position.copy(local);
    galaxy.add(m);
    waves.push({ m, t: 0, dur, maxScale, opacity });
  }
  function updateWaves(dt) {
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.t += dt;
      const p = clamp01(w.t / w.dur);
      const s = 0.5 + easeOutCubic(p) * w.maxScale;
      w.m.scale.set(s, s, s);
      w.m.material.opacity = w.opacity * Math.pow(1 - p, 1.6);
      if (p >= 1) { galaxy.remove(w.m); w.m.geometry.dispose(); w.m.material.dispose(); waves.splice(i, 1); }
    }
  }

  const collisions = [];
  function updateCollisions(dt) {
    for (let i = collisions.length - 1; i >= 0; i--) {
      const c = collisions[i];
      c.t += dt;
      const p = clamp01(c.t / 1.3);
      const pt = c.it.curve.getPoint(easeInOutCubic(p));
      if (!c.ghost) { c.ghost = makeGlow('#ffffff', 6, 1); galaxy.add(c.ghost); }
      c.ghost.position.copy(pt);
      c.ghost.scale.setScalar(6 + Math.sin(p * Math.PI) * 6);
      if (p >= 1) {
        const anchor = itemById[c.it.data.anchor];
        if (anchor) {
          spawnWave(anchor.local, '#f4c27a', 22, 2.4, 1, 0.05);
          spawnWave(anchor.local, '#7fdcf0', 14, 1.8, 0.9, 0.08);
          spawnWave(anchor.local, '#ffffff', 7, 1.1, 1, 0.15);
          anchor.flash = 1;
        }
        galaxy.remove(c.ghost);
        collisions.splice(i, 1);
      }
    }
  }

  /* ------------------------------------------------------------------------
     9. Camera rig & Interaction
     ------------------------------------------------------------------------ */
  const DEFAULT = { az: 0, el: 0.52, dist: 150, target: new THREE.Vector3(-8, -2, 6) };
  const rig = { az: -1.15, el: 1.36, dist: 360, target: DEFAULT.target.clone() };
  const goal = { az: DEFAULT.az, el: DEFAULT.el, dist: DEFAULT.dist, target: DEFAULT.target.clone() };
  const mouse = { x: 0, y: 0, px: 0, py: 0, inside: false };
  let introDone = false;
  let hovered = null, selected = null, dragging = false, downAt = null;

  function applyCamera(az, el, dist, target) {
    camera.position.set(
      target.x + Math.sin(az) * Math.cos(el) * dist,
      target.y + Math.sin(el) * dist,
      target.z + Math.cos(az) * Math.cos(el) * dist
    );
    camera.lookAt(target);
  }

  canvas.addEventListener('pointerdown', e => {
    if (!introDone) { skipIntro(); return; }
    downAt = { x: e.clientX, y: e.clientY, az: goal.az, el: goal.el };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    bounds = getBounds();
    mouse.px = e.clientX - bounds.left;
    mouse.py = e.clientY - bounds.top;
    mouse.inside = true;
    mouse.x = (mouse.px / bounds.width) * 2 - 1;
    mouse.y = (mouse.py / bounds.height) * 2 - 1;
    if (downAt) {
      const dx = e.clientX - downAt.x, dy = e.clientY - downAt.y;
      if (!dragging && Math.hypot(dx, dy) > 5) { dragging = true; canvas.classList.add('dragging'); }
      if (dragging) {
        goal.az = downAt.az - dx * 0.0045;
        goal.el = THREE.MathUtils.clamp(downAt.el + dy * 0.003, 0.06, 1.25);
      }
    }
  });
  canvas.addEventListener('pointerup', () => {
    if (downAt && !dragging) {
      if (hovered) {
        if (hovered.kind === 'light') {
          window.DrawerWorldWindow?.selectLight(hovered.data.id);
        } else {
          openItemLetter(hovered);
        }
      } else if (selected) {
        window.DrawerWorldWindow?.closeLetter();
      }
    }
    downAt = null; dragging = false; canvas.classList.remove('dragging');
  });
  canvas.addEventListener('pointerleave', () => { mouse.inside = false; });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (!introDone) return;
    goal.dist = THREE.MathUtils.clamp(goal.dist * (1 + e.deltaY * 0.0011), 85, 320);
  }, { passive: false });

  document.getElementById('worldLetterExpandBtn')?.addEventListener('click', () => {
    letter?.classList.toggle('expanded');
  });

  const projV = new THREE.Vector3();
  function toScreen(world) {
    projV.copy(world).project(camera);
    return {
      x: (projV.x * 0.5 + 0.5) * bounds.width,
      y: (-projV.y * 0.5 + 0.5) * bounds.height,
      visible: projV.z < 1
    };
  }
  function pixelRadius(it) {
    const d = camera.position.distanceTo(it.world);
    return (it.size * pointScale()) / d;
  }

  function pick() {
    if (!introDone || dragging || !mouse.inside) return null;
    let best = null, bestD = Infinity;
    for (const it of items) {
      if (it.appear < 0.9) continue;
      if (sunClearance(it.world) < 0.35) continue;
      const s = toScreen(it.world);
      if (!s.visible) continue;
      const d = Math.hypot(s.x - mouse.px, s.y - mouse.py);
      const reach = Math.max(18, pixelRadius(it) * 1.6 + 8);
      if (d < reach && d < bestD) { best = it; bestD = d; }
    }
    return best;
  }

  function showHoverTooltip(it) {
    if (!tooltip) return;
    const d = it.data;
    tooltip.classList.toggle('light', it.kind === 'light');
    if (it.kind === 'light') {
      tooltip.innerHTML = `
        <div class="tt-kicker mono">TODAY'S LIGHT · ${esc(d.roleLabel)}</div>
        <div class="tt-title">${esc(d.name)} <span style="opacity:.65;font-size:.82em">${esc(d.zh)}</span></div>
        <div class="tt-body">${esc(d.desc)}</div>
        <div class="tt-hint mono">CLICK TO OPEN</div>`;
    } else {
      const st = { active: 'ACTIVE STAR', dormant: 'RESTING STAR', dwarf: 'WHITE DWARF' }[d.status];
      tooltip.innerHTML = `
        <div class="tt-kicker mono">YOUR STAR · ${st}${anchorIds.has(d.id) ? ' · ANCHOR' : ''}</div>
        <div class="tt-title">${esc(d.name)}</div>
        <div class="tt-body">${esc(d.core)}</div>
        <div class="tt-hint mono">CLICK TO INSPECT</div>`;
    }
    tooltip.classList.add('show');
  }

  function focusOn(it) {
    if (!it?.world) return;
    const right = new THREE.Vector3(Math.cos(goal.az), 0, -Math.sin(goal.az));
    goal.dist = 118;
    goal.target.copy(it.world).lerp(new THREE.Vector3(0, 0, 0), 0.3).addScaledVector(right, 118 * 0.1);
    goal.target.y = it.world.y - 2;
  }

  function populateLetterCardForItem(it) {
    if (!letter || !it) return;
    const d = it.data;
    letter.classList.toggle('idea', it.kind === 'idea');
    letter.classList.remove('expanded');

    const anchorEl = document.getElementById('worldLetterAnchorLine');
    const chipsEl = document.getElementById('worldLetterChips');
    const extraEl = document.getElementById('worldLetterExtraSection');
    const lightActions = document.getElementById('worldLetterLightActions');
    const ideaActions = document.getElementById('worldLetterIdeaActions');

    if (it.kind === 'light') {
      const anchorObj = itemById[d.anchor]?.data;
      if (anchorEl) {
        anchorEl.hidden = !anchorObj;
        anchorEl.innerHTML = anchorObj
          ? `<span class="line"></span>anchored to your star <b>${esc(anchorObj.name)}</b>`
          : '';
      }
      if (chipsEl) {
        chipsEl.innerHTML = `
          <span class="l-chip accent">${esc(d.type)}</span>
          <span class="l-chip">DISTANCE ${d.distance.toFixed(2)}</span>
          <span class="l-chip">${(lightRadius(d) - SHORE).toFixed(1)} AU BEYOND SHORE</span>`;
      }
      if (extraEl) extraEl.innerHTML = '';
      if (lightActions) lightActions.hidden = false;
      if (ideaActions) ideaActions.hidden = true;
    } else {
      const st = { active: 'ACTIVE STAR', dormant: 'RESTING STAR', dwarf: 'WHITE DWARF' }[d.status];
      const stZh = { active: '活跃', dormant: '静息', dwarf: '白矮星' }[d.status];
      const linked = lightItems.filter(l => l.data.anchor === d.id).map(l => l.data);

      document.getElementById('worldLetterKicker').textContent = `YOUR STAR · ORBIT ${d.orbit + 1} · ${st}`;
      document.getElementById('worldLetterName').textContent = d.name;
      document.getElementById('worldLetterVerification').textContent = `${d.age} · ${stZh}`;
      document.getElementById('worldLetterDescription').textContent = d.core;
      document.getElementById('worldLetterRelation').textContent = linked.length
        ? linked.map(l => l.why).join('\n')
        : (window.currentLanguage === 'en' ? 'Orbiting inside your cognitive shoreline.' : '正在你的认知海岸线之内安静环绕。');

      if (anchorEl) {
        anchorEl.hidden = !linked.length;
        anchorEl.innerHTML = linked.length
          ? `<span class="line"></span>a light arrived: <b class="c">${linked.map(l => esc(l.name)).join(', ')}</b>`
          : '';
      }
      if (chipsEl) {
        chipsEl.innerHTML = `
          <span class="l-chip accent">IDEA CARD</span>
          <span class="l-chip">${esc(d.age.toUpperCase())}</span>`;
      }
      if (extraEl) {
        const nodes = (d.rawIdea?.nodes || []).slice(-3);
        extraEl.innerHTML = nodes.length ? `
          <div class="l-section">
            <h4>GROWTH TIMELINE · 生长轨迹</h4>
            <div class="l-timeline">
              ${nodes.map(n => `<div><span>${esc(n.time || n.type || 'NODE')}</span>${esc(String(n.text || '').slice(0, 90))}</div>`).join('')}
            </div>
          </div>` : '';
      }
      if (lightActions) lightActions.hidden = true;
      if (ideaActions) {
        ideaActions.hidden = false;
        const openBtn = document.getElementById('worldOpenIdeaBtn');
        if (openBtn) {
          openBtn.onclick = () => {
            if (typeof window.selectIdea === 'function' && d.rawIdea?.id != null) {
              window.selectIdea(d.rawIdea.id, { expandChat: true });
            }
          };
        }
      }
    }
  }

  function openItemLetter(it) {
    if (!it) return;
    selected = it;
    focusOn(it);
    nudge?.classList.add('yielding');
    tooltip?.classList.remove('show');
    populateLetterCardForItem(it);
    letter?.classList.add('open');
    letter?.setAttribute('aria-hidden', 'false');
  }

  let toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  /* ------------------------------------------------------------------------
     11. HUD & Intro Timeline
     ------------------------------------------------------------------------ */
  const hudEls = {
    clock: document.getElementById('worldHudClock'),
    vel: document.getElementById('worldHudVel'),
    bearing: document.getElementById('worldHudBearing'),
    zoom: document.getElementById('worldHudZoom'),
    compass: document.getElementById('worldHudCompass')
  };
  const nowDate = new Date();
  const monthShort = nowDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const postmarkDate = document.getElementById('worldPostmarkDate');
  if (postmarkDate) postmarkDate.textContent = `${nowDate.getDate()} ${monthShort}`;
  const veilDate = document.getElementById('worldVeilDate');
  if (veilDate) veilDate.textContent = `TODAY'S LETTER · ${monthShort} ${nowDate.getDate()}, ${nowDate.getFullYear()}`;

  let hudTick = 0;
  let lastCamPos = null;
  function updateHud(dt) {
    hudTick += dt;
    if (hudTick < 0.1) return;
    const speed = lastCamPos ? Math.min(40, camera.position.distanceTo(lastCamPos) / hudTick) : 0;
    lastCamPos = camera.position.clone();
    hudTick = 0;
    const d = new Date();
    if (hudEls.clock) hudEls.clock.textContent = d.toTimeString().slice(0, 8);
    if (hudEls.vel) hudEls.vel.textContent = (19.7 + speed * 0.4 + Math.sin(performance.now() / 1300) * 0.08).toFixed(1);
    const bearing = ((THREE.MathUtils.radToDeg(rig.az) % 360) + 360 + 128.4) % 360;
    if (hudEls.bearing) hudEls.bearing.textContent = bearing.toFixed(1);
    if (hudEls.zoom) hudEls.zoom.style.width = `${clamp01(1 - (rig.dist - 60) / 260) * 100}%`;
    if (hudEls.compass) hudEls.compass.style.transform = `rotate(${-THREE.MathUtils.radToDeg(rig.az)}deg)`;
  }

  const INTRO_END = 10.5;
  // Set to true to skip the opening sequence (veil, camera dive, sun ignition).
  const SKIP_OPENING = false;
  const clockStart = () => performance.now() - (SKIP_OPENING ? INTRO_END * 1000 : 0);
  let startTime = clockStart();
  const flags = { veil: SKIP_OPENING, hud: false, nudge: false, sunWave: SKIP_OPENING };
  if (SKIP_OPENING) {
    veil?.remove();
    skipHint?.remove();
  }

  function skipIntro() {
    const t = (performance.now() - startTime) / 1000;
    if (t < INTRO_END - 0.5) startTime = performance.now() - (INTRO_END - 0.5) * 1000;
  }

  skipHint?.addEventListener('click', skipIntro);
  veil?.addEventListener('click', skipIntro);

  function intro(t) {
    if (!flags.veil && t > 1.9) { flags.veil = true; veil?.classList.add('gone'); }
    const sunP = clamp01((t - 2.1) / 1.6);
    const ignite = easeOutBack(sunP);
    sun.coreMat.uniforms.uSize.value = Math.max(0.001, SUN_R * ignite);
    sun.coreMat.uniforms.uIgnite.value = clamp01((t - 2.1) / 2.4);
    sun.glowMat.uniforms.uIgnite.value = easeOutCubic(clamp01((t - 2.0) / 2.2));
    if (!flags.sunWave && t > 2.6) {
      flags.sunWave = true;
      spawnWave(new THREE.Vector3(), '#ffd8a8', 120, 4.2, 0.65, 0.012);
      spawnWave(new THREE.Vector3(), '#ffffff', 60, 2.6, 0.5, 0.02);
    }
    const reveal = easeOutCubic(clamp01((t - 2.5) / 4.2));
    dust.mat.uniforms.uReveal.value = reveal;
    haze.mat.uniforms.uReveal.value = reveal;
    sky.mat.uniforms.uFade.value = easeOutCubic(clamp01((t - 1.6) / 2.5));
    embers.mat.uniforms.uFade.value = easeOutCubic(clamp01((t - 5.0) / 3.0));
    sky.wisps.forEach(w => { w.material.opacity = w.userData.base * 0.25 * clamp01((t - 2.5) / 3); });

    if (!introDone) {
      const c = easeInOutCubic(clamp01((t - 1.5) / 6.2));
      rig.az = lerp(-1.15, DEFAULT.az, c);
      rig.el = lerp(1.36, DEFAULT.el, c);
      rig.dist = lerp(360, DEFAULT.dist, c);
      rig.target.copy(DEFAULT.target);
      goal.az = rig.az; goal.el = rig.el; goal.dist = rig.dist;
    }

    const orbitBase = clamp01((t - 4.0) / 2.6);
    orbitLines.forEach(l => {
      const p = easeInOutCubic(clamp01((orbitBase - l.userData.delay * 0.6) / 0.6));
      l.geometry.setDrawRange(0, Math.floor(p * (l.userData.segs + 1)));
      l.material.opacity = l.userData.opacity * Math.min(1, p * 1.5);
    });
    shoreTicks.opacity = 0.35 * easeOutCubic(clamp01((t - 5.6) / 1.2));
    satellite.material.opacity = 0.85 * clamp01((t - 6.2) / 1);

    // ideas & lighthouses run on their own clock (data loads asynchronously),
    // but never before the opening reaches its reveal moment (~5s)
    const lt = (performance.now() - Math.max(sceneBorn, startTime + 5000)) / 1000;
    items.forEach(it => {
      if (it.kind !== 'idea') return;
      it.appear = it.delay < 0 ? 1 : easeOutBack(clamp01((lt - it.delay) / 0.7));
    });
    decor.forEach((g, i) => { g.userData.appear = easeOutBack(clamp01((t - 5.0 - i * 0.04) / 0.8)); });
    sky.sparkles.forEach((s, i) => { s.userData.appear = clamp01((t - 6 - i * 0.2) / 1.2); });

    // lighthouses arrive one by one, then an arc reaches back to their anchor star
    lightItems.forEach(it => {
      if (it.delay < 0) {
        it.appear = 1; it.arc = 1; it.arrived = true;
        return;
      }
      const t0 = it.delay;
      it.appear = easeOutBack(clamp01((lt - t0) / 0.8));
      it.arc = easeInOutCubic(clamp01((lt - t0 - 0.6) / 1.4));
      if (!it.arrived && lt > t0) {
        it.arrived = true;
        spawnWave(it.local, '#7fdcf0', 16, 2.2, 1, 0.05);
        spawnWave(it.local, '#ffffff', 7, 1.2, 0.9, 0.1);
      }
    });

    if (!flags.hud && t > 6.4) { flags.hud = true; hud?.classList.add('on'); skipHint?.classList.add('gone'); }
    if (!flags.nudge && t > INTRO_END - 0.8) { flags.nudge = true; if (!selected) nudge?.classList.add('on'); }
    if (!introDone && t > 7.8) introDone = true;
  }

  /* ------------------------------------------------------------------------
     13. Frame loop
     ------------------------------------------------------------------------ */
  let running = false;
  let rafId = null;
  let last = performance.now();
  const tmpV = new THREE.Vector3();

  const sunWorld = new THREE.Vector3(0, 0, 0);
  const occV = new THREE.Vector3();
  const occW = new THREE.Vector3();
  const smooth = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  // 1 = clearly visible, 0 = hidden behind the sun
  function sunClearance(world) {
    occV.copy(world).sub(camera.position);
    const len2 = occV.lengthSq();
    occW.copy(sunWorld).sub(camera.position);
    const tt = occW.dot(occV) / len2;
    if (tt <= 0 || tt >= 1) return 1;
    const dist = occW.addScaledVector(occV, -tt).length();
    return smooth(SUN_R * 1.0, SUN_R * 1.9, dist);
  }
  // 1 = near side / level with the sun, fades toward ~0.15 on the far side of the galaxy
  function nearSide(world) {
    const behind = camera.position.distanceTo(world) - camera.position.distanceTo(sunWorld);
    return 1 - smooth(14, 62, behind) * 0.85;
  }

  function updateLabels() {
    for (const it of items) {
      if (!it.label) continue;
      const s = toScreen(it.world);
      const isHot = hovered === it || selected === it;
      const related = (selected && selected.kind === 'light' && selected.data.anchor === it.data.id) ||
                      (hovered && hovered.kind === 'light' && hovered.data.anchor === it.data.id);
      const arcReady = it.kind === 'idea'
        ? (lightItems.some(l => l.data.anchor === it.data.id && (l.arc || 0) > 0.95) || (it.appear > 0.85 && !lightItems.length))
        : (it.appear > 0.6);
      const wanted = s.visible && ((it.labelPinned && arcReady) || isHot || related);
      const clear = sunClearance(it.world);
      const depth = (isHot || related) ? Math.max(0.75, nearSide(it.world)) : nearSide(it.world);
      const alpha = wanted ? clear * depth : 0;
      it.label.classList.toggle('show', alpha > 0.02);
      it.label.style.opacity = alpha > 0.02 ? alpha.toFixed(3) : '0';
      it.label.classList.toggle('focus', isHot || related);
      if (!s.visible) continue;
      const pr = pixelRadius(it) * (1 + it.hover * 0.35);
      if (it.kind === 'light') {
        it.label.style.transform = `translate(${s.x - pr - 10}px, ${s.y - pr - 4}px) translate(-100%, -100%)`;
      } else {
        it.label.style.transform = `translate(${s.x}px, ${s.y - pr - 8}px) translate(-50%, -100%)`;
      }
    }
    if (hovered && tooltip?.classList.contains('show')) {
      const x = Math.min(mouse.px + 22, bounds.width - 300);
      const y = Math.min(mouse.py + 18, bounds.height - 140);
      tooltip.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  function frame(nowMs) {
    if (!running) return;
    const dt = Math.min(0.05, (nowMs - last) / 1000);
    last = nowMs;
    const t = (nowMs - startTime) / 1000;
    const time = t;

    intro(t);

    dust.mat.uniforms.uTime.value = time;
    haze.mat.uniforms.uTime.value = time;
    sky.mat.uniforms.uTime.value = time;
    sun.coreMat.uniforms.uTime.value = time;
    sun.glowMat.uniforms.uTime.value = time;
    embers.mat.uniforms.uTime.value = time;
    orbitLines.forEach(l => { if (l.userData.spin) l.rotation.y = time * l.userData.spin; });
    moonlets.update(time, clamp01((t - 5.4) / 1.5));
    meteors.update(dt, introDone);

    decor.forEach(g => {
      const u = g.userData;
      const a = u.angle + time * u.speed;
      g.position.set(Math.cos(a) * u.r, u.y, Math.sin(a) * u.r);
      g.scale.setScalar(Math.max(0.0001, u.appear || 0));
      g.children[0].rotation.y = time * 0.2;
    });
    {
      const a = time * 0.035 + 2.2;
      tmpV.set(Math.cos(a) * 74, 0, Math.sin(a) * 74).applyEuler(satOrbit.userData.pivot.rotation);
      satellite.position.copy(tmpV);
    }
    sky.sparkles.forEach(s => {
      const k = 0.65 + 0.35 * Math.sin(time * 1.3 + s.userData.phase);
      s.material.opacity = (s.userData.appear || 0) * k;
      s.scale.setScalar(s.userData.base * (0.8 + 0.3 * k));
      s.material.rotation = time * 0.05 + s.userData.phase;
    });

    const next = pick();
    if (next !== hovered) {
      hovered = next;
      canvas.classList.toggle('pointing', !!hovered);
      if (hovered) showHoverTooltip(hovered); else tooltip?.classList.remove('show');
    }

    for (const it of items) {
      const target = (hovered === it || selected === it) ? 1 : 0;
      it.hover += (target - it.hover) * (1 - Math.exp(-dt * 10));
      it.flash = Math.max(0, (it.flash || 0) - dt * 0.5);
      const breathe = it.kind === 'light' ? 1 + Math.sin(time * 1.6 + it.index) * 0.04 : 1;
      it.group.scale.setScalar(Math.max(0.0001, it.appear) * (1 + it.hover * 0.16 + it.flash * 0.4) * breathe);
      it.mesh.material.uniforms.uHover.value = it.hover + it.flash;
      it.mesh.rotation.y = time * 0.15;
      it.glow.material.opacity = it.glowBase * (1 + it.hover * 0.35 + it.flash * 1.5);
      if (it.kind === 'light') {
        it.beamMat.uniforms.uA.value = clamp01(it.appear) * (0.55 + it.hover * 0.6);
        it.beamMat.uniforms.uTime.value = time;
        it.beam.rotation.y = rig.az;
        it.halo.material.opacity = 0.45 + 0.15 * Math.sin(time * 3 + it.index);
        it.pulses.forEach((p, k) => {
          const ph = ((time * 0.38 + k * 0.5 + it.index * 0.21) % 1);
          p.scale.setScalar(it.size * (1.2 + ph * 3.2));
          p.material.opacity = Math.pow(1 - ph, 1.5) * 0.3 * clamp01(it.appear);
        });
        it.reticle.material.opacity = it.hover * 0.9;
        it.reticle.material.rotation = time * 0.6;
        it.arcMat.uniforms.uTime.value = time;
        it.arcMat.uniforms.uDraw.value = it.arc || 0;
        const sel = (selected === it || hovered === it || (hovered && hovered.data.id === it.data.anchor) || (selected && selected.data.id === it.data.anchor)) ? 1 : 0;
        it.arcSel = (it.arcSel || 0) + (sel - (it.arcSel || 0)) * (1 - Math.exp(-dt * 8));
        it.arcMat.uniforms.uSel.value = it.arcSel;
        if ((it.arc || 0) >= 1) {
          const p = (time * 0.16 + it.index * 0.33) % 1;
          it.spark.position.copy(it.curve.getPoint(p));
          it.spark.material.opacity = Math.sin(p * Math.PI) * (0.7 + it.arcSel * 0.3);
          it.spark.scale.setScalar(2.4 + it.arcSel * 1.6);
        }
      }
    }

    updateWaves(dt);
    updateCollisions(dt);

    if (introDone) {
      const k = 1 - Math.exp(-dt * 3.2);
      rig.az += (goal.az - rig.az) * k;
      rig.el += (goal.el - rig.el) * k;
      rig.dist += (goal.dist - rig.dist) * k;
      rig.target.lerp(goal.target, k);
    }
    const par = introDone && !dragging ? 1 : 0;
    mouse.sx = lerp(mouse.sx || 0, mouse.x * par, 1 - Math.exp(-dt * 2));
    mouse.sy = lerp(mouse.sy || 0, mouse.y * par, 1 - Math.exp(-dt * 2));
    applyCamera(rig.az + mouse.sx * 0.05, rig.el + mouse.sy * 0.025, rig.dist, rig.target);

    updateLabels();
    updateHud(dt);

    composer.render();
    rafId = requestAnimationFrame(frame);
  }

  function resize() {
    bounds = getBounds();
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
    renderer.setSize(bounds.width, bounds.height);
    composer.setSize(bounds.width, bounds.height);
    bloom.setSize(bounds.width, bounds.height);
    dust.mat.uniforms.uScale.value = pointScale();
    embers.mat.uniforms.uScale.value = pointScale();
  }

  window.addEventListener('resize', () => {
    if (running) resize();
  });

  let everActivated = false;
  function activate() {
    resize();
    if (!everActivated) {
      everActivated = true;
      startTime = clockStart();
    }
    if (!running) {
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    }
  }

  function deactivate() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function setWorldData(data) {
    const signature = JSON.stringify([
      window.currentLanguage,
      (data?.context?.points || []).map(p => String(p.id)),
      (data?.lights || []).map(l => String(l.id))
    ]);
    if (signature === currentSignature) return;
    currentSignature = signature;
    currentWorldData = data;
    rebuildDynamicScene(data);
    if (flags.nudge && !selected) nudge?.classList.add('on');
  }

  function selectLight(id) {
    const it = itemById[String(id)];
    if (!it) return;
    skipIntro();
    selected = it;
    focusOn(it);
    nudge?.classList.add('yielding');
    tooltip?.classList.remove('show');
    populateLetterCardForItem(it);
  }

  function closeLetter() {
    selected = null;
    goal.dist = DEFAULT.dist;
    goal.target.copy(DEFAULT.target);
    if (flags.nudge) nudge?.classList.remove('yielding');
  }

  function triggerCaptureWave(id) {
    const it = itemById[String(id)] || selected;
    if (!it) return;
    it.kept = true;
    spawnWave(it.local, '#f4c27a', 9, 1.6, 1, 0.08);
    spawnWave(it.local, '#ffffff', 5, 1.0, 0.8, 0.12);
    toast(window.currentLanguage === 'en' ? '✦ This light now orbits in your sky.' : '✦ 这束光已收入你的星空。');
  }

  function triggerCollideWave(id) {
    const it = itemById[String(id)] || selected;
    if (!it || it.kind !== 'light') return;
    letter?.classList.add('expanded');
    collisions.push({ it, t: 0 });
    toast(window.currentLanguage === 'en' ? 'A collision is on its way — watch the arc.' : '一次思想碰撞正在沿弧线抵达…');
  }

  applyCamera(rig.az, rig.el, rig.dist, rig.target);

  return {
    activate,
    deactivate,
    resize,
    setWorldData,
    selectLight,
    closeLetter,
    triggerCaptureWave,
    triggerCollideWave,
    toast
  };
}

const api = initGalaxyEngine();
if (api) {
  window.DrawerWorldGalaxy3D = api;
  window.DrawerWorldWindow?.onGalaxyReady?.();
}
