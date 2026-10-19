/* ==========================================================================
   World Window · Galaxy prototype
   ----------------------------------------------------------------------------
   Metaphor
     · The sun          = you — the gravitational center of your current mind.
     · Inner orbits     = your ideas (gold / orange stars). Closer = more familiar.
     · The shoreline    = the bright orbit; the edge of what you know today.
     · Cyan lighthouses = today's letter: real-world concepts arriving from
                          beyond the shoreline. Orbit radius = semantic distance.
     · Dashed arcs      = the anchor: the old star each lighthouse found you through.
   Motion
     · Orbits that carry stars stay still (so they can be hovered / opened).
     · Background dust rotates differentially — inner fast, outer slow.
   ========================================================================== */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/* --------------------------------------------------------------------------
   Mock data (to be replaced by worldData from world-window.js)
   -------------------------------------------------------------------------- */
const ORBITS = [15, 21, 28, 35, 42];
const SHORE = 49;
const SUN_R = 7.6;

const IDEAS = [
  { id: 'apple', name: 'Apple', zh: '苹果的隐喻', status: 'active', orbit: 4, angle: -2.62, color: '#f2a65a', color2: '#c4622f',
    core: 'Why does one fruit carry knowledge, temptation and a computer company at once?', coreZh: '为什么一颗水果能同时承载知识、诱惑和一家电脑公司？', age: 'Seeded 12 days ago' },
  { id: 'bedtime', name: 'Bedtime routine', zh: '睡前仪式', status: 'active', orbit: 2, angle: 2.72, color: '#f08a6b', color2: '#b5523a',
    core: 'A ritual that tells the body the day is over — can it be designed like an interface?', coreZh: '一个告诉身体"今天结束了"的仪式——它能像界面一样被设计吗？', age: 'Seeded 3 days ago' },
  { id: 'spacecraft', name: 'How do spacecraft fly', zh: '飞船怎么飞', status: 'active', orbit: 1, angle: -0.22, color: '#f6c177', color2: '#c98a3a',
    core: 'Falling around the earth forever — orbit as a kind of patient falling.', coreZh: '永远绕着地球坠落——轨道是一种耐心的坠落。', age: 'Seeded yesterday' },
  { id: 'plant', name: 'Plant Emotion Translator', zh: '植物情绪翻译器', status: 'active', orbit: 3, angle: -1.25, color: '#e8b46a', color2: '#9a6a2c',
    core: 'Translate the slow signals of a plant into moods a person can read.', coreZh: '把植物缓慢的信号，翻译成人能读懂的情绪。', age: 'Seeded 9 days ago' },
  { id: 'solitude', name: 'Campus Solitude', zh: '校园独处空间', status: 'active', orbit: 0, angle: 1.95, color: '#f4d8a8', color2: '#c99a5a',
    core: 'Places on campus where being alone does not feel like being left out.', coreZh: '校园里那些"独处却不孤单"的地方。', age: 'Seeded 5 days ago' },
  { id: 'diet', name: 'Emotional Diet', zh: '情绪价值饮食顾问', status: 'dormant', orbit: 2, angle: 0.62, color: '#c99a74', color2: '#8a5d3e',
    core: 'Eating for how you want to feel, not just for what you need.', coreZh: '为想要的心情而吃，而不只是为营养而吃。', age: 'Quiet for 5 days' },
  { id: 'needed', name: 'Feeling Needed', zh: '被需要感', status: 'dormant', orbit: 4, angle: 0.28, color: '#d8a07a', color2: '#93603f',
    core: 'The quiet hunger to be someone another person relies on.', coreZh: '想成为别人依靠的那种安静的渴望。', age: 'Quiet for 6 days' },
  { id: 'dusk', name: 'Dusk Thoughts', zh: '黄昏念头', status: 'active', orbit: 1, angle: -2.1, color: '#f3a35f', color2: '#b8612c',
    core: 'Thoughts that arrive at sunset and leave with the dark.', coreZh: '黄昏时到来、随天黑一起消失的念头。', age: 'Seeded 2 days ago' },
  { id: 'letters', name: 'Letters to Self', zh: '写给自己的信', status: 'dwarf', orbit: 3, angle: 1.42, color: '#a9b8cf', color2: '#6c7c96',
    core: 'Writing to a future self who may not remember why.', coreZh: '写给一个也许不记得原因的未来的自己。', age: 'Cooled 14 days ago' },
  { id: 'tree', name: 'A Tree, Not Leaves', zh: '一棵树而不是几片叶子', status: 'active', orbit: 0, angle: -1.55, color: '#f6c98a', color2: '#c48a48',
    core: 'A thought is a tree; what we write down is only a few leaves.', coreZh: '想法是一棵树，写下来的只有几片叶子。', age: 'Seeded 8 days ago' },
  { id: 'torch', name: 'Torches in the Dark', zh: '黑暗中的火把', status: 'dormant', orbit: 4, angle: -0.95, color: '#d49168', color2: '#8c5636',
    core: 'Humans throw one torch; AI can throw a thousand at once.', coreZh: '人只能扔一根火把，AI 可以同时扔出一千根。', age: 'Quiet for 4 days' },
  { id: 'glitch', name: 'Glitch as Beauty', zh: '差错之美', status: 'dwarf', orbit: 2, angle: -1.8, color: '#9fb0c8', color2: '#66758e',
    core: 'Where the logic breaks is where beauty slips in.', coreZh: '逻辑断裂的地方，正是美溜进来的地方。', age: 'Cooled 21 days ago' }
];

const LIGHTS = [
  { id: 'design-fiction', name: 'Design Fiction', zh: '设计虚构', type: 'CONCEPT', role: 'border', roleLabel: 'BORDER LIGHT', roleZh: '贴边星',
    anchor: 'apple', distance: 0.32, angle: 3.55,
    desc: 'Making objects from futures that do not exist yet, so we can argue about them today.',
    descZh: '为尚不存在的未来制造物件，好让我们今天就能为它争论。',
    why: 'Your Apple is already a story an object tells. Design Fiction asks the reverse: build the object first, and let it tell a story about a world that might come.',
    whyZh: '你的"苹果"本身就是一个物件讲出的故事。设计虚构反过来做：先造出物件，让它讲述一个可能到来的世界。' },
  { id: 'boundary-object', name: 'Boundary Object', zh: '边界物', type: 'CONCEPT', role: 'echo', roleLabel: 'OLD STAR ECHO', roleZh: '老星回声',
    anchor: 'bedtime', distance: 0.72, angle: 3.0,
    desc: 'Something flexible enough for different worlds to share, yet solid enough to keep its identity.',
    descZh: '足够柔软、能被不同世界共享，又足够坚固、能保持自身的东西。',
    why: 'A bedtime routine is a boundary object between your day self and your night self — each reads it differently, yet both agree on it.',
    whyZh: '睡前仪式就是白天的你与夜晚的你之间的边界物——双方读法不同，却都认同它。' },
  { id: 'space-oddity', name: 'Space Oddity', zh: '太空怪谈', type: 'WORK', role: 'far', roleLabel: 'DISTANT LIGHT', roleZh: '意外远星',
    anchor: 'spacecraft', distance: 1.22, angle: 1.06,
    desc: 'David Bowie, 1969. A song about floating in a tin can, far above the world, and choosing not to come back.',
    descZh: '大卫·鲍伊，1969。一首关于漂浮在铁罐里、远离世界、并选择不再回来的歌。',
    why: 'You asked how spacecraft fly. Major Tom answers a different question: what it feels like when the falling never ends.',
    whyZh: '你问飞船怎么飞。Major Tom 回答的是另一个问题：当坠落永不结束时，那是什么感觉。' }
];

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */
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
const lightRadius = l => SHORE + 3 + l.distance * 18;

const GLSL_COMMON = /* glsl */`
  vec3 lin(vec3 c) { return pow(max(c, vec3(0.0)), vec3(2.2)); }
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
`;

const params = new URLSearchParams(location.search);
const T_OFFSET = Number(params.get('t') || 0);

/* --------------------------------------------------------------------------
   Renderer / scene / post
   -------------------------------------------------------------------------- */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const PR = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(PR);
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x030305, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 5000);

const galaxy = new THREE.Group();
galaxy.rotation.z = 0.13; // slight roll, like the reference
scene.add(galaxy);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(PR);
composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
// safety net: kill NaN / negative pixels before bloom spreads them into black flicker
composer.addPass(new ShaderPass({
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main() { vec4 c = texture2D(tDiffuse, vUv); vec3 rgb = c.rgb; if (!(rgb.r >= 0.0 && rgb.r <= 65504.0)) rgb.r = 0.0; if (!(rgb.g >= 0.0 && rgb.g <= 65504.0)) rgb.g = 0.0; if (!(rgb.b >= 0.0 && rgb.b <= 65504.0)) rgb.b = 0.0; gl_FragColor = vec4(min(rgb, vec3(64.0)), 1.0); }'
}));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.45, 0.78);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const pointScale = () => (innerHeight * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));

/* --------------------------------------------------------------------------
   Textures
   -------------------------------------------------------------------------- */
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
  const panel = (x) => { g.fillRect(x, -16, 62, 32); g.strokeRect(x, -16, 62, 32); for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x + i * 15.5, -16); g.lineTo(x + i * 15.5, 16); g.stroke(); } g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 62, 0); g.stroke(); };
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

/* --------------------------------------------------------------------------
   1. Deep sky: background stars + nebula wisps + sparkles
   -------------------------------------------------------------------------- */
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

  // nebula wisps far behind
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

  // twinkling sparkles (the "five-pointed star" of the reference, reimagined)
  const sparkles = [];
  [[-62, 30, -70, 9], [58, 26, -96, 6], [-110, 14, 20, 5], [96, 34, -20, 7], [10, 44, -120, 5], [-30, 22, 70, 4]].forEach(([x, y, z, s], i) => {
    const m = new THREE.SpriteMaterial({ map: SPARKLE_TEX, color: i % 3 === 1 ? '#bfe6ff' : '#fff4e2', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const sp = new THREE.Sprite(m); sp.position.set(x, y, z); sp.scale.setScalar(s); sp.userData = { base: s, phase: rand() * TAU };
    galaxy.add(sp); sparkles.push(sp);
  });

  return { mat, wisps, sparkles };
})();

/* --------------------------------------------------------------------------
   Orbital planes — real systems are not one flat plate.
   Each idea orbit / lighthouse orbit gets its own inclination & node.
   -------------------------------------------------------------------------- */
const ORBIT_TILT = [
  { inc: 0.12, node: 0.5 }, { inc: -0.17, node: 1.9 }, { inc: 0.24, node: -0.8 },
  { inc: -0.1, node: 2.7 }, { inc: 0.3, node: 1.2 }
];
const LIGHT_TILT = [{ inc: 0.2, node: -2.0 }, { inc: -0.3, node: 0.8 }, { inc: 0.4, node: 2.4 }];
// free-floating inclined star streams, not tied to any idea
const PLANES = [
  { r: 38, w: 8, inc: 0.36, node: 0.9, wt: 1.0, tint: 'cyan', spd: 1.9 },
  { r: 74, w: 10, inc: -0.44, node: 2.2, wt: 1.2, tint: 'rose', spd: 0.45 },
  { r: 26, w: 4, inc: 0.22, node: -1.3, wt: 0.6, tint: 'gold', spd: 2.6 },
  { r: 98, w: 9, inc: 0.62, node: 3.6, wt: 0.9, tint: 'blue', spd: 0.3 }
];
const tiltEuler = t => new THREE.Euler(t.inc, t.node, 0, 'YXZ');
// Ry(node) shifts azimuth by -node; add it back so 'angle' keeps meaning screen position
const tilted = (r, a, t) => polar(r, a + t.node).applyEuler(tiltEuler(t));

/* --------------------------------------------------------------------------
   2. Galaxy stars — arms, clusters, inclined streams, a halo of flung-out stars
   -------------------------------------------------------------------------- */
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
    if (k < 0.33) {                               // spiral arms (rigid density wave)
      const arm = rand() < 0.5 ? 0 : Math.PI;
      r = 11 + Math.pow(rand(), 0.8) * 104;
      th = arm + Math.log(r / 9) * 2.1 + gauss() * (0.13 + r / 600);
      speed = 0.045; y = gauss() * (0.25 + 1.4 * Math.exp(-r / 16));
    } else if (k < 0.47) {                        // idea orbit bands (each on its own plane)
      const b = pick(BANDS); r = b.r + gauss() * b.w; th = rand() * TAU; inc = b.inc; node = b.node;
      speed = (0.03 + 0.95 / r) * (0.9 + rand() * 0.2) * b.spd; y = gauss() * 0.22;
    } else if (k < 0.63) {                        // inclined streams
      const p = pick(PLANES); r = p.r + gauss() * p.w * 0.5; th = rand() * TAU; inc = p.inc + gauss() * 0.015; node = p.node; tint = p.tint;
      speed = (0.02 + 0.8 / r) * (0.92 + rand() * 0.16) * p.spd; y = gauss() * 0.3;
    } else if (k < 0.77) {                        // star clusters — clumps that travel together
      const c = CLUSTERS[(rand() * CLUSTERS.length) | 0];
      r = c.r + gauss() * c.s; th = c.th + (gauss() * c.s) / c.r; inc = c.inc; node = c.node;
      speed = (0.03 + 0.95 / c.r) * c.spd; y = gauss() * c.s * 0.35;
    } else if (k < 0.85) {                        // halo — stars flung out of the plane
      halo = true;
      r = 14 + Math.pow(rand(), 0.6) * 110; th = rand() * TAU;
      inc = (rand() * 2 - 1) * 1.35; node = rand() * TAU;
      speed = (0.012 + 0.7 / r) * (0.7 + rand() * 0.6); y = gauss() * 1.5;
    } else {                                      // faint fill, keeps the disk from looking empty
      r = 10 + -Math.log(1 - rand() * 0.98) * 34; th = rand() * TAU;
      speed = (0.03 + 0.95 / r) * (0.8 + rand() * 0.4); y = gauss() * (0.3 + 1.8 * Math.exp(-r / 14));
    }
    r = Math.max(SUN_R + 2, r);
    orbit.set([r, th, y, speed], i * 4);
    tilt.set([inc, node], i * 2);

    // power-law brightness: most are faint, a few are brilliant
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
        // brilliant stars: hot pin-point core + faint halo + tiny cross glint
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

/* --------------------------------------------------------------------------
   2b. Embers — little lights that drift up and out of the disk
   -------------------------------------------------------------------------- */
const embers = (() => {
  const N = 1400;
  const seed = new Float32Array(N * 4), extra = new Float32Array(N * 4), col = new Float32Array(N * 3);
  const cols = [[1, 0.8, 0.45], [1, 0.62, 0.32], [0.6, 0.88, 1], [1, 0.95, 0.85], [1, 0.6, 0.62]];
  for (let i = 0; i < N; i++) {
    const r = 10 + Math.pow(rand(), 0.8) * 95;
    seed.set([r, rand() * TAU, rand(), 0.03 + rand() * 0.07], i * 4);           // r, theta, phase, rate
    extra.set([6 + rand() * 26, (rand() * 2 - 1) * 0.6, 0.12 + rand() * 0.22, rand() < 0.5 ? 1 : -1], i * 4); // rise, drift, size, side
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

/* --------------------------------------------------------------------------
   2c. Shooting stars
   -------------------------------------------------------------------------- */
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
    const head = makeGlowLater();
    line.visible = false; head.visible = false;
    scene.add(line); scene.add(head);
    pool.push({ line, head, mat, t: 0, life: 0, active: false, from: new THREE.Vector3(), dir: new THREE.Vector3(), speed: 0, len: 0 });
  }
  function makeGlowLater() {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: '#fff6e6', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(3);
    return s;
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

/* --------------------------------------------------------------------------
   3. Disk haze — patchy nebular glow following the arms (no rings, no "iris")
   -------------------------------------------------------------------------- */
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

/* --------------------------------------------------------------------------
   4. The sun — you. A luminous star, not an eye.
   -------------------------------------------------------------------------- */
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
        float mu = sqrt(1.0 - r * r);                       // limb angle
        vec3 hot  = vec3(1.0, 0.97, 0.88);
        vec3 gold = vec3(1.0, 0.8, 0.46);
        vec3 edge = vec3(0.98, 0.52, 0.2);
        vec3 col = mix(edge, gold, smoothstep(0.0, 0.55, mu));
        col = mix(col, hot, smoothstep(0.55, 1.0, mu) * 0.85);
        // slow boiling granulation
        vec2 sp = vUv / (0.6 + 0.4 * mu);
        float g = fbm(sp * 5.0 + vec2(uTime * 0.04, -uTime * 0.03));
        float g2 = fbm(sp * 14.0 - vec2(uTime * 0.07, uTime * 0.05));
        col *= 0.88 + 0.16 * g + 0.08 * g2;
        // soft bright limb rim
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
        // soft coronal streamers
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

/* --------------------------------------------------------------------------
   5. Orbits, shoreline, ticks, satellite orbit
   -------------------------------------------------------------------------- */
const orbitLines = [];
function makeOrbit(r, { color = '#efe6d8', opacity = 0.2, dashed = false, dash = 1.2, gap = 1.6, segs = 720, delay = 0, inc = 0, node = 0, spin = 0 } = {}) {
  const pts = [];
  for (let i = 0; i <= segs; i++) { const a = (i / segs) * TAU; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, transparent: true, opacity: 0, dashSize: dash, gapSize: gap, depthWrite: false, blending: THREE.AdditiveBlending })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const line = new THREE.Line(geo, mat);
  if (dashed) line.computeLineDistances();
  // pivot carries the plane's tilt; the line spins inside it (dashes visibly travel)
  const pivot = new THREE.Object3D();
  pivot.rotation.set(inc, node, 0, 'YXZ');
  pivot.add(line);
  geo.setDrawRange(0, 0);
  line.renderOrder = 4;
  line.userData = { segs, opacity, delay, spin, pivot };
  galaxy.add(pivot);
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
LIGHTS.forEach((l, i) => makeOrbit(lightRadius(l), { color: '#9fe6f5', opacity: 0.14, dashed: true, dash: 0.5, gap: 1.4, delay: 0.6 + i * 0.05, spin: [0.03, -0.015, 0.008][i], ...LIGHT_TILT[i] }));
const satOrbit = makeOrbit(74, { opacity: 0.22, dashed: true, dash: 1.4, gap: 1.2, delay: 0.7, inc: 0.5, node: 0.3 });

/* --------------------------------------------------------------------------
   5b. Moonlets — tiny solid bodies on their own tilted orbits, at mixed speeds
   -------------------------------------------------------------------------- */
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
    // some follow the inclined streams, some free
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

// shoreline ticks
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

/* --------------------------------------------------------------------------
   6. Planets
   -------------------------------------------------------------------------- */
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
    vec3 L = normalize(-vW);                      // sun at origin
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
  m.renderOrder = 6;
  return m;
}

// decorative wanderers — they keep moving
const decor = [];
function addDecor({ r, angle, speed, size, color, color2, bands, ring = false, ringColor = '#f3c3a8', y = 0 }) {
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

// satellite on its tilted orbit
const satellite = (() => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: SATELLITE_TEX, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
  s.scale.setScalar(6.5);
  s.renderOrder = 6;
  galaxy.add(s);
  return s;
})();

/* --------------------------------------------------------------------------
   7. Ideas (your stars) & lighthouses (today's lights)
   -------------------------------------------------------------------------- */
const labelsEl = document.getElementById('labels');
const items = [];
const itemById = {};

IDEAS.forEach((idea, i) => {
  const r = ORBITS[idea.orbit];
  const pos = tilted(r, idea.angle, ORBIT_TILT[idea.orbit]);
  const size = idea.status === 'active' ? 1.15 + (i % 3) * 0.2 : idea.status === 'dormant' ? 0.95 : 0.6;
  const group = new THREE.Group(); group.position.copy(pos);
  const mesh = makePlanet({ color: idea.color, color2: idea.color2, bands: 8 + (i % 4) * 3, size, emissive: idea.status === 'active' ? 0.25 : 0.05 });
  const glow = makeGlow(idea.color, size * (idea.status === 'dwarf' ? 3.5 : 5), idea.status === 'active' ? 0.32 : idea.status === 'dormant' ? 0.2 : 0.12);
  group.add(mesh, glow);
  group.scale.setScalar(0.0001);
  galaxy.add(group);
  const it = { kind: 'idea', data: idea, group, mesh, glow, size, glowBase: glow.material.opacity, glowScale: glow.scale.x, hover: 0, appear: 0, local: pos };
  items.push(it); itemById[idea.id] = it;
});

const anchorIds = new Set(LIGHTS.map(l => l.anchor));
const lightItems = LIGHTS.map((light, i) => {
  const r = lightRadius(light);
  const pos = tilted(r, light.angle, LIGHT_TILT[i]);
  const size = 1.75 + (1 - light.distance) * 0.25;
  const group = new THREE.Group(); group.position.copy(pos);
  const mesh = makePlanet({ color: '#6fd8ee', color2: '#2a8fb0', bands: 11, size, emissive: 0.55 });
  const glow = makeGlow('#7fdcf0', size * 4.5, 0.42);
  const halo = makeGlow('#bff2ff', size * 2.6, 0.6);
  // lighthouse beam
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
  reticle.scale.setScalar(size * 5.5); reticle.renderOrder = 7;
  group.add(mesh, glow, halo, beam, reticle, ...pulses);
  group.scale.setScalar(0.0001);
  galaxy.add(group);

  // arc to anchor
  const anchor = itemById[light.anchor];
  const a = pos.clone(), b = anchor.local.clone();
  const mid = a.clone().add(b).multiplyScalar(0.5); mid.y += 7 + a.distanceTo(b) * 0.18;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const pts = curve.getPoints(160);
  const arcGeo = new THREE.BufferGeometry().setFromPoints(pts);
  arcGeo.setAttribute('aT', new THREE.BufferAttribute(new Float32Array(pts.map((_, k) => k / (pts.length - 1))), 1));
  const arcMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDraw: { value: 0 }, uSel: { value: 0 }, uA: { value: new THREE.Color('#7fdcf0') }, uB: { value: new THREE.Color('#f2a65a') } },
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
  galaxy.add(arc);
  const spark = makeGlow('#dff8ff', 3.2, 0);
  galaxy.add(spark);

  const it = { kind: 'light', data: light, index: i, group, mesh, glow, halo, beam, beamMat, pulses, reticle, size, glowBase: 0.42, glowScale: glow.scale.x,
    hover: 0, appear: 0, local: pos, curve, arcMat, spark, arrived: false, kept: false };
  items.push(it); itemById[light.id] = it;
  return it;
});

// labels
function makeLabel(it) {
  const el = document.createElement('div');
  const d = it.data;
  if (it.kind === 'light') {
    el.className = 'label light';
    el.innerHTML = `${d.name}<span class="sub">${d.roleLabel} · ${d.zh}</span>`;
  } else {
    el.className = `label idea ${d.status}`;
    el.innerHTML = `${d.name}<span class="sub">${d.zh}</span>`;
  }
  labelsEl.appendChild(el);
  it.label = el;
  it.labelPinned = it.kind === 'light' || anchorIds.has(d.id);
}
items.forEach(makeLabel);

galaxy.updateMatrixWorld(true);
items.forEach(it => { it.world = galaxy.localToWorld(it.local.clone()); });

/* --------------------------------------------------------------------------
   8. Shockwaves
   -------------------------------------------------------------------------- */
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

/* --------------------------------------------------------------------------
   9. Camera rig
   -------------------------------------------------------------------------- */
const DEFAULT = { az: 0, el: 0.52, dist: 150, target: new THREE.Vector3(-8, -2, 6) };
const rig = { az: -1.15, el: 1.36, dist: 360, target: DEFAULT.target.clone() };
const goal = { az: DEFAULT.az, el: DEFAULT.el, dist: DEFAULT.dist, target: DEFAULT.target.clone() };
const mouse = { x: 0, y: 0, px: 0, py: 0, inside: false };
let introDone = false;

function applyCamera(az, el, dist, target) {
  camera.position.set(
    target.x + Math.sin(az) * Math.cos(el) * dist,
    target.y + Math.sin(el) * dist,
    target.z + Math.cos(az) * Math.cos(el) * dist
  );
  camera.lookAt(target);
}

/* --------------------------------------------------------------------------
   10. Interaction
   -------------------------------------------------------------------------- */
let hovered = null, selected = null, dragging = false, downAt = null;
const tooltip = document.getElementById('tooltip');
const letter = document.getElementById('letter');
const letterContent = document.getElementById('letterContent');
const nudge = document.getElementById('nudge');
const toastEl = document.getElementById('toast');

canvas.addEventListener('pointerdown', e => {
  if (!introDone) { skipIntro(); return; }
  downAt = { x: e.clientX, y: e.clientY, az: goal.az, el: goal.el };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  mouse.px = e.clientX; mouse.py = e.clientY; mouse.inside = true;
  mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1;
  if (downAt) {
    const dx = e.clientX - downAt.x, dy = e.clientY - downAt.y;
    if (!dragging && Math.hypot(dx, dy) > 5) { dragging = true; canvas.classList.add('dragging'); }
    if (dragging) {
      goal.az = downAt.az - dx * 0.0045;
      goal.el = THREE.MathUtils.clamp(downAt.el + dy * 0.003, 0.06, 1.25);
    }
  }
});
canvas.addEventListener('pointerup', e => {
  if (downAt && !dragging) {
    if (hovered) openLetter(hovered);
    else if (selected) closeLetter();
  }
  downAt = null; dragging = false; canvas.classList.remove('dragging');
});
canvas.addEventListener('pointerleave', () => { mouse.inside = false; });
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (!introDone) return;
  goal.dist = THREE.MathUtils.clamp(goal.dist * (1 + e.deltaY * 0.0011), 85, 320);
}, { passive: false });
window.addEventListener('keydown', e => { if (e.key === 'Escape') closeLetter(); });
document.getElementById('letterClose').addEventListener('click', closeLetter);
document.getElementById('nudgeBtn').addEventListener('click', () => openLetter(lightItems[0]));

const projV = new THREE.Vector3();
function toScreen(world) {
  projV.copy(world).project(camera);
  return { x: (projV.x * 0.5 + 0.5) * innerWidth, y: (-projV.y * 0.5 + 0.5) * innerHeight, visible: projV.z < 1 };
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
    const s = toScreen(it.world);
    if (!s.visible) continue;
    const d = Math.hypot(s.x - mouse.px, s.y - mouse.py);
    const reach = Math.max(18, pixelRadius(it) * 1.6 + 8);
    if (d < reach && d < bestD) { best = it; bestD = d; }
  }
  return best;
}

function showTooltip(it) {
  const d = it.data;
  tooltip.classList.toggle('light', it.kind === 'light');
  if (it.kind === 'light') {
    document.getElementById('ttKicker').textContent = `TODAY'S LIGHT · ${d.roleLabel}`;
    document.getElementById('ttTitle').textContent = `${d.name}  ${d.zh}`;
    document.getElementById('ttBody').textContent = d.desc;
  } else {
    const st = { active: 'ACTIVE STAR', dormant: 'RESTING STAR', dwarf: 'WHITE DWARF' }[d.status];
    document.getElementById('ttKicker').textContent = `YOUR STAR · ${st}${anchorIds.has(d.id) ? ' · ANCHOR' : ''}`;
    document.getElementById('ttTitle').textContent = `${d.name}  ${d.zh}`;
    document.getElementById('ttBody').textContent = d.core;
  }
  tooltip.classList.add('show');
}

function focusOn(it) {
  const right = new THREE.Vector3(Math.cos(goal.az), 0, -Math.sin(goal.az));
  goal.dist = 118;
  goal.target.copy(it.world).lerp(new THREE.Vector3(0, 0, 0), 0.3).addScaledVector(right, 118 * 0.1);
  goal.target.y = it.world.y - 2;
}

function openLetter(it) {
  selected = it;
  focusOn(it);
  nudge.classList.add('hide');
  tooltip.classList.remove('show');
  const d = it.data;
  letter.classList.toggle('idea', it.kind === 'idea');
  letter.classList.remove('expanded');
  if (it.kind === 'light') {
    const anchor = itemById[d.anchor].data;
    letterContent.innerHTML = `
      <div class="l-kicker">TODAY'S LETTER · No.0${it.index + 1} · ${d.roleLabel}</div>
      <h2 class="l-title">${d.name}</h2>
      <div class="l-zh">${d.zh} · ${d.roleZh}</div>
      <p class="l-desc">${d.desc}</p>
      <div class="l-anchor"><span class="line"></span>anchored to your star <b>${anchor.name}</b></div>
      <div class="l-more"><div class="l-more-inner">
        <div class="l-meta">
          <span class="l-chip accent">${d.type}</span>
          <span class="l-chip">DISTANCE ${d.distance.toFixed(2)}</span>
          <span class="l-chip">${(lightRadius(d) - SHORE).toFixed(1)} AU BEYOND SHORE</span>
        </div>
        <p class="l-desc-zh">${d.descZh}</p>
        <div class="l-section">
          <h4>WHY IT FOUND YOU · 它为何找到你</h4>
          <p>${d.why}</p>
          <p class="zh">${d.whyZh}</p>
        </div>
      </div></div>
      <button class="l-expand" data-toggle><span class="more">展开全部 · More</span><span class="less">收起 · Less</span><i>⌄</i></button>
      <div class="l-actions">
        <button class="l-btn primary ${it.kept ? 'done' : ''}" data-act="keep"><span>${it.kept ? '✦ Kept' : 'Keep'}</span><small>收藏</small></button>
        <button class="l-btn" data-act="collide"><span>Collide</span><small>碰撞</small></button>
      </div>`;
  } else {
    const st = { active: 'ACTIVE STAR', dormant: 'RESTING STAR', dwarf: 'WHITE DWARF' }[d.status];
    const stZh = { active: '活跃', dormant: '静息', dwarf: '白矮星' }[d.status];
    const linked = lightItems.filter(l => l.data.anchor === d.id).map(l => l.data);
    letterContent.innerHTML = `
      <div class="l-kicker">YOUR STAR · ORBIT ${d.orbit + 1} · ${st}</div>
      <h2 class="l-title">${d.name}</h2>
      <div class="l-zh">${d.zh} · ${stZh}</div>
      <p class="l-desc">${d.core}</p>
      ${linked.length ? `<div class="l-anchor"><span class="line"></span>a light arrived: <b class="c">${linked.map(l => l.name).join(', ')}</b></div>` : ''}
      <div class="l-more"><div class="l-more-inner">
        <div class="l-meta">
          <span class="l-chip accent">IDEA CARD</span>
          <span class="l-chip">${d.age.toUpperCase()}</span>
        </div>
        <p class="l-desc-zh">${d.coreZh}</p>
        ${linked.length ? `<div class="l-section"><h4>WHY THE LIGHT CAME</h4><p>${linked.map(l => l.why).join('<br>')}</p></div>` : ''}
        <div class="l-section">
          <h4>GROWTH TIMELINE · 生长</h4>
          <div class="l-timeline">
            <div><span>SEED</span>A first, blurry sentence.</div>
            <div><span>BREAKTHROUGH</span>Found the tension inside it.</div>
            <div><span>NOW</span>${d.status === 'dwarf' ? 'Cooling quietly, waiting to be remembered.' : 'Still growing.'}</div>
          </div>
        </div>
      </div></div>
      <button class="l-expand" data-toggle><span class="more">展开全部 · More</span><span class="less">收起 · Less</span><i>⌄</i></button>
      <div class="l-actions">
        <button class="l-btn primary" data-act="drawer"><span>Continue in the drawer</span><small>继续聊</small></button>
      </div>`;
  }
  letterContent.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => onAction(btn.dataset.act, it, btn)));
  letterContent.querySelector('[data-toggle]')?.addEventListener('click', () => letter.classList.toggle('expanded'));
  letter.classList.add('open');
  letter.setAttribute('aria-hidden', 'false');
}

function closeLetter() {
  if (!selected) return;
  selected = null;
  letter.classList.remove('open');
  letter.setAttribute('aria-hidden', 'true');
  goal.dist = DEFAULT.dist;
  goal.target.copy(DEFAULT.target);
}

let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

const collisions = [];
function onAction(act, it, btn) {
  if (act === 'keep' && !it.kept) {
    it.kept = true;
    btn.classList.add('done');
    btn.querySelector('span').textContent = '✦ Kept';
    spawnWave(it.local, '#f4c27a', 9, 1.6, 1, 0.08);
    spawnWave(it.local, '#ffffff', 5, 1.0, 0.8, 0.12);
    toast('✦ This light now orbits in your sky.');
  } else if (act === 'collide') {
    collisions.push({ it, t: 0 });
    toast('A collision is on its way — watch the arc.');
  } else if (act === 'drawer') {
    toast('Opening the drawer… (prototype)');
  }
}
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
      spawnWave(anchor.local, '#f4c27a', 22, 2.4, 1, 0.05);
      spawnWave(anchor.local, '#7fdcf0', 14, 1.8, 0.9, 0.08);
      spawnWave(anchor.local, '#ffffff', 7, 1.1, 1, 0.15);
      anchor.flash = 1;
      galaxy.remove(c.ghost);
      collisions.splice(i, 1);
      toast(`✦ A supernova is forming between “${c.it.data.name}” and “${anchor.data.name}”.`);
    }
  }
}

/* --------------------------------------------------------------------------
   11. HUD
   -------------------------------------------------------------------------- */
const now = new Date();
const monthShort = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
document.getElementById('hudDate').textContent = `TODAY'S LETTER · ${monthShort} ${now.getDate()}, ${now.getFullYear()}`;
document.getElementById('veilDate').textContent = `TODAY'S LETTER · ${monthShort} ${now.getDate()}, ${now.getFullYear()}`;
document.getElementById('postmarkDate').textContent = `${now.getDate()} ${monthShort}`;
document.getElementById('hudCounts').innerHTML = `<b>${IDEAS.length}</b> your stars · <b>${anchorIds.size}</b> anchors · <b class="c">${LIGHTS.length}</b> lighthouses`;
const hudEls = {
  clock: document.getElementById('hudClock'), vel: document.getElementById('hudVel'), bearing: document.getElementById('hudBearing'),
  zoom: document.getElementById('hudZoom'), compass: document.getElementById('hudCompass')
};
let hudTick = 0;
let lastCamPos = null;
function updateHud(dt) {
  hudTick += dt;
  if (hudTick < 0.1) return;
  const speed = lastCamPos ? Math.min(40, camera.position.distanceTo(lastCamPos) / hudTick) : 0;
  lastCamPos = camera.position.clone();
  hudTick = 0;
  const d = new Date();
  hudEls.clock.textContent = d.toTimeString().slice(0, 8);
  hudEls.vel.textContent = (19.7 + speed * 0.4 + Math.sin(performance.now() / 1300) * 0.08).toFixed(1);
  const bearing = ((THREE.MathUtils.radToDeg(rig.az) % 360) + 360 + 128.4) % 360;
  hudEls.bearing.textContent = bearing.toFixed(1);
  hudEls.zoom.style.width = `${clamp01(1 - (rig.dist - 60) / 260) * 100}%`;
  hudEls.compass.style.transform = `rotate(${-THREE.MathUtils.radToDeg(rig.az)}deg)`;
}

/* --------------------------------------------------------------------------
   12. Intro timeline
   -------------------------------------------------------------------------- */
const veil = document.getElementById('veil');
const skipHint = document.getElementById('skipHint');
const hud = document.getElementById('hud');
const INTRO_END = 10.5;
let startTime = performance.now() - T_OFFSET * 1000;

function skipIntro() {
  const t = (performance.now() - startTime) / 1000;
  if (t < INTRO_END - 0.5) startTime = performance.now() - (INTRO_END - 0.5) * 1000;
}

const flags = { veil: false, hud: false, nudge: false, sunWave: false };
function intro(t) {
  if (!flags.veil && t > 1.9) { flags.veil = true; veil.classList.add('gone'); }
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

  // camera dive
  if (!introDone) {
    const c = easeInOutCubic(clamp01((t - 1.5) / 6.2));
    rig.az = lerp(-1.15, DEFAULT.az, c);
    rig.el = lerp(1.36, DEFAULT.el, c);
    rig.dist = lerp(360, DEFAULT.dist, c);
    rig.target.copy(DEFAULT.target);
    goal.az = rig.az; goal.el = rig.el; goal.dist = rig.dist;
  }

  // orbits draw in
  const orbitBase = clamp01((t - 4.0) / 2.6);
  orbitLines.forEach(l => {
    const p = easeInOutCubic(clamp01((orbitBase - l.userData.delay * 0.6) / 0.6));
    l.geometry.setDrawRange(0, Math.floor(p * (l.userData.segs + 1)));
    l.material.opacity = l.userData.opacity * Math.min(1, p * 1.5);
  });
  shoreTicks.opacity = 0.35 * easeOutCubic(clamp01((t - 5.6) / 1.2));
  satellite.material.opacity = 0.85 * clamp01((t - 6.2) / 1);

  // ideas pop in
  items.forEach((it, i) => {
    if (it.kind !== 'idea') return;
    it.appear = easeOutBack(clamp01((t - 5.2 - i * 0.09) / 0.7));
  });
  decor.forEach((g, i) => { g.userData.appear = easeOutBack(clamp01((t - 5.0 - i * 0.04) / 0.8)); });
  sky.sparkles.forEach((s, i) => { s.userData.appear = clamp01((t - 6 - i * 0.2) / 1.2); });

  // lighthouses arrive
  lightItems.forEach((it, i) => {
    const t0 = 7.2 + i * 0.85;
    it.appear = easeOutBack(clamp01((t - t0) / 0.8));
    it.arc = easeInOutCubic(clamp01((t - t0 - 0.35) / 1.3));
    if (!it.arrived && t > t0) {
      it.arrived = true;
      spawnWave(it.local, '#7fdcf0', 16, 2.2, 1, 0.05);
      spawnWave(it.local, '#ffffff', 7, 1.2, 0.9, 0.1);
    }
  });

  if (!flags.hud && t > 6.4) { flags.hud = true; hud.classList.add('on'); skipHint.classList.add('gone'); }
  if (!flags.nudge && t > INTRO_END - 0.8) { flags.nudge = true; if (!selected) nudge.classList.add('on'); }
  if (!introDone && t > 7.8) introDone = true;
}

/* --------------------------------------------------------------------------
   13. Frame loop
   -------------------------------------------------------------------------- */
let last = performance.now();
const tmpV = new THREE.Vector3();

function updateLabels(t) {
  for (const it of items) {
    const s = toScreen(it.world);
    const isHot = hovered === it || selected === it;
    const related = (selected && selected.kind === 'light' && selected.data.anchor === it.data.id) ||
                    (hovered && hovered.kind === 'light' && hovered.data.anchor === it.data.id);
    const arcReady = it.kind === 'idea' ? lightItems.some(l => l.data.anchor === it.data.id && (l.arc || 0) > 0.95) : (it.appear > 0.6);
    const show = s.visible && ((it.labelPinned && arcReady) || isHot || related);
    it.label.classList.toggle('show', show);
    it.label.classList.toggle('focus', isHot || related);
    if (!s.visible) continue;
    const pr = pixelRadius(it) * (1 + it.hover * 0.35);
    if (it.kind === 'light') {
      it.label.style.transform = `translate(${s.x - pr - 10}px, ${s.y - pr - 4}px) translate(-100%, -100%)`;
    } else {
      it.label.style.transform = `translate(${s.x}px, ${s.y - pr - 8}px) translate(-50%, -100%)`;
    }
  }
  if (hovered && tooltip.classList.contains('show')) {
    const x = Math.min(mouse.px + 22, innerWidth - 300), y = Math.min(mouse.py + 18, innerHeight - 140);
    tooltip.style.transform = `translate(${x}px, ${y}px)`;
  }
}

function frame(nowMs) {
  const dt = Math.min(0.05, (nowMs - last) / 1000);
  last = nowMs;
  const t = (nowMs - startTime) / 1000;
  const time = t; // shared shader time

  intro(t);

  // uniforms
  dust.mat.uniforms.uTime.value = time;
  haze.mat.uniforms.uTime.value = time;
  sky.mat.uniforms.uTime.value = time;
  sun.coreMat.uniforms.uTime.value = time;
  sun.glowMat.uniforms.uTime.value = time;
  embers.mat.uniforms.uTime.value = time;
  orbitLines.forEach(l => { if (l.userData.spin) l.rotation.y = time * l.userData.spin; });
  moonlets.update(time, clamp01((t - 5.4) / 1.5));
  meteors.update(dt, introDone);

  // decor wanderers
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

  // hover
  const next = pick();
  if (next !== hovered) {
    hovered = next;
    canvas.classList.toggle('pointing', !!hovered);
    if (hovered) showTooltip(hovered); else tooltip.classList.remove('show');
  }

  // items
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
      // traveling letter spark
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

  // camera
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

  updateLabels(t);
  updateHud(dt);

  composer.render();
  requestAnimationFrame(frame);
}

/* --------------------------------------------------------------------------
   14. Resize & go
   -------------------------------------------------------------------------- */
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.setSize(innerWidth, innerHeight);
  dust.mat.uniforms.uScale.value = pointScale();
  embers.mat.uniforms.uScale.value = pointScale();
});

applyCamera(rig.az, rig.el, rig.dist, rig.target);
requestAnimationFrame(frame);

// debug: ?open=<id> opens a letter straight away
if (params.get('open') && itemById[params.get('open')]) {
  setTimeout(() => openLetter(itemById[params.get('open')]), 100);
}
