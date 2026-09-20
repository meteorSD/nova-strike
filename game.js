// NOVA STRIKE 2.0 — arena FPS shooter, three.js core only (no examples/addons).
// See SPEC.md for the feature list and the acceptance criteria this file implements.
import * as THREE from "./three.module.min.js";

/* ============================== SETTINGS ============================== */

const SETTINGS_KEY = "novaStrikeSettings";
const HIGHSCORE_KEY = "novaStrikeHighScore";
const MUTE_KEY = "novaStrikeMuted";

function detectTouch() {
  try {
    return (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
      (("ontouchstart" in window) && (navigator.maxTouchPoints || 0) > 0);
  } catch (_e) {
    return false;
  }
}
const AUTO_TOUCH = detectTouch();

const DEFAULT_SETTINGS = { sens: 1, fov: 75, volume: 70, quality: "high", radar: true, touch: null };

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
  } catch (_e) { /* ignore corrupt storage */ }
  return Object.assign({}, DEFAULT_SETTINGS);
}
const settings = loadSettings();
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_e) { /* ignore */ }
}
function touchEnabled() {
  return settings.touch === null ? AUTO_TOUCH : !!settings.touch;
}
const volumeFactor = () => Math.max(0, Math.min(1, settings.volume / 100));

/* ============================== SETUP ============================== */

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03030a);
scene.fog = new THREE.FogExp2(0x03030a, 0.028);

const camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.1, 220);
camera.rotation.order = "YXZ";

function qualityRatio() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (settings.quality === "low") return 0.75;
  if (settings.quality === "medium") return Math.min(dpr, 1);
  return dpr;
}
function applyGraphics() {
  renderer.setPixelRatio(qualityRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.fov = settings.fov;
  camera.updateProjectionMatrix();
}
applyGraphics();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ============================== LIGHTING ============================== */

scene.add(new THREE.HemisphereLight(0x445577, 0x0a0a12, 0.55));
const keyLight = new THREE.PointLight(0x33fff0, 3.2, 40, 2);
keyLight.position.set(0, 8, 0);
scene.add(keyLight);
const rimA = new THREE.PointLight(0xff2fd6, 2.2, 34, 2);
rimA.position.set(14, 4, 14);
scene.add(rimA);
const rimB = new THREE.PointLight(0x33fff0, 2.2, 34, 2);
rimB.position.set(-14, 4, -14);
scene.add(rimB);

/* ============================== ARENA ============================== */

const ARENA_HALF = 22;
const WALL_HEIGHT = 7;

function makeGlowTexture(hex) {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const col = new THREE.Color(hex);
  const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
  grd.addColorStop(0, `rgba(${rgb},1)`);
  grd.addColorStop(0.4, `rgba(${rgb},.55)`);
  grd.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const glowCyan = makeGlowTexture(0x33fff0);
const glowMagenta = makeGlowTexture(0xff2fd6);
const glowYellow = makeGlowTexture(0xfff23a);
const glowRed = makeGlowTexture(0xff3b4e);
const glowGreen = makeGlowTexture(0x0fe08a);

// floor
const floorMat = new THREE.MeshStandardMaterial({ color: 0x07070f, roughness: 0.55, metalness: 0.35 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2), floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const grid = new THREE.GridHelper(ARENA_HALF * 2, 44, 0x33fff0, 0x14243a);
grid.position.y = 0.01;
scene.add(grid);

// walls (wireframe + faint fill), arranged as a square arena
function buildWall(w, h, x, z, rotY) {
  const group = new THREE.Group();
  const fillMat = new THREE.MeshBasicMaterial({ color: 0x0c1830, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(w, h), fillMat);
  group.add(fill);
  const edges = new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x33fff0 });
  group.add(new THREE.LineSegments(edges, lineMat));
  for (let i = 1; i < 4; i++) {
    const accent = new THREE.Mesh(
      new THREE.PlaneGeometry(w, 0.04),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff2fd6 : 0x33fff0, transparent: true, opacity: 0.5 })
    );
    accent.position.y = -h / 2 + (h / 4) * i;
    accent.position.z = 0.02;
    group.add(accent);
  }
  group.position.set(x, h / 2, z);
  group.rotation.y = rotY;
  scene.add(group);
}
buildWall(ARENA_HALF * 2, WALL_HEIGHT, 0, -ARENA_HALF, 0);
buildWall(ARENA_HALF * 2, WALL_HEIGHT, 0, ARENA_HALF, Math.PI);
buildWall(ARENA_HALF * 2, WALL_HEIGHT, -ARENA_HALF, 0, Math.PI / 2);
buildWall(ARENA_HALF * 2, WALL_HEIGHT, ARENA_HALF, 0, -Math.PI / 2);

// corner pillars for scale/landmarks
function buildPillar(x, z) {
  const geo = new THREE.CylinderGeometry(0.6, 0.6, WALL_HEIGHT + 2, 8);
  const mat = new THREE.MeshStandardMaterial({ color: 0x0a0f1e, emissive: 0x33fff0, emissiveIntensity: 0.35, roughness: 0.4 });
  const pillar = new THREE.Mesh(geo, mat);
  pillar.position.set(x, (WALL_HEIGHT + 2) / 2, z);
  scene.add(pillar);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowCyan, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(3, 3, 1);
  halo.position.set(x, WALL_HEIGHT + 2, z);
  scene.add(halo);
}
const cornerOffset = ARENA_HALF - 1.2;
buildPillar(cornerOffset, cornerOffset);
buildPillar(-cornerOffset, cornerOffset);
buildPillar(cornerOffset, -cornerOffset);
buildPillar(-cornerOffset, -cornerOffset);

/* ============================== COVERS (obstacles) ============================== */
// Axis-aligned crates: they block player movement, block enemy plasma and stop bullets.

const covers = [];
function addCover(x, z, hw, hd, h, accent) {
  const geo = new THREE.BoxGeometry(hw * 2, h, hd * 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x0b1120, roughness: 0.45, metalness: 0.55, emissive: accent, emissiveIntensity: 0.18 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, h / 2, z);
  scene.add(mesh);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.8 })
  );
  edges.position.copy(mesh.position);
  scene.add(edges);
  covers.push({ x, z, hw, hd, h, mesh });
}
addCover(-8, -8, 1.4, 1.4, 2.4, 0x33fff0);
addCover(8, -8, 1.4, 1.4, 2.4, 0x33fff0);
addCover(-8, 8, 1.4, 1.4, 2.4, 0xff2fd6);
addCover(8, 8, 1.4, 1.4, 2.4, 0xff2fd6);
addCover(0, -13, 2.6, 1.2, 3.2, 0x33fff0);
addCover(0, 13, 2.6, 1.2, 3.2, 0xff2fd6);
addCover(-14, 0, 1.2, 2.6, 3.2, 0xff2fd6);
addCover(14, 0, 1.2, 2.6, 3.2, 0x33fff0);

function rayBoxT(origin, dir, c) {
  let tmin = 0;
  let tmax = Infinity;
  const o = [origin.x, origin.y, origin.z];
  const d = [dir.x, dir.y, dir.z];
  const mn = [c.x - c.hw - 0.06, 0, c.z - c.hd - 0.06];
  const mx = [c.x + c.hw + 0.06, c.h, c.z + c.hd + 0.06];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-8) {
      if (o[i] < mn[i] || o[i] > mx[i]) return Infinity;
    } else {
      let t1 = (mn[i] - o[i]) / d[i];
      let t2 = (mx[i] - o[i]) / d[i];
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return Infinity;
    }
  }
  return tmin;
}
function coverBlockT(origin, dir) {
  let best = Infinity;
  for (const c of covers) {
    const t = rayBoxT(origin, dir, c);
    if (t < best) best = t;
  }
  return best;
}
/** Distance to the arena wall along a ray (so shots stop at the walls, not through them). */
function arenaT(origin, dir) {
  let best = Infinity;
  const planes = [
    [origin.x, dir.x, ARENA_HALF, -ARENA_HALF],
    [origin.z, dir.z, ARENA_HALF, -ARENA_HALF],
  ];
  for (const [o, d, hi, lo] of planes) {
    if (Math.abs(d) < 1e-8) continue;
    for (const target of [hi, lo]) {
      const t = (target - o) / d;
      if (t > 0 && t < best) best = t;
    }
  }
  return best;
}
function shotBlockT(origin, dir) {
  return Math.min(coverBlockT(origin, dir), arenaT(origin, dir));
}
function pointInsideCover(x, z, radius) {
  for (const c of covers) {
    if (x > c.x - c.hw - radius && x < c.x + c.hw + radius && z > c.z - c.hd - radius && z < c.z + c.hd + radius) return true;
  }
  return false;
}
/** Push a circle out of every crate so the player/enemies slide along the faces. */
function resolveCovers(pos, radius) {
  for (const c of covers) {
    const cx = Math.max(c.x - c.hw, Math.min(c.x + c.hw, pos.x));
    const cz = Math.max(c.z - c.hd, Math.min(c.z + c.hd, pos.z));
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * radius;
        pos.z = cz + (dz / d) * radius;
      } else {
        const left = pos.x - (c.x - c.hw);
        const right = (c.x + c.hw) - pos.x;
        const back = pos.z - (c.z - c.hd);
        const front = (c.z + c.hd) - pos.z;
        const m = Math.min(left, right, back, front);
        if (m === left) pos.x = c.x - c.hw - radius;
        else if (m === right) pos.x = c.x + c.hw + radius;
        else if (m === back) pos.z = c.z - c.hd - radius;
        else pos.z = c.z + c.hd + radius;
      }
    }
  }
}
function hasLineOfSight(from, to) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const dist = dir.length();
  if (dist < 1e-4) return true;
  dir.divideScalar(dist);
  const t = coverBlockT(from, dir);
  return t >= dist;
}

/* ============================== AUDIO ============================== */

let audioCtx = null;
let muted = localStorage.getItem(MUTE_KEY) === "1";
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
}
function tone({ freq = 440, dur = 0.12, type = "square", gain = 0.18, slideTo = null, delay = 0 }) {
  if (muted || !audioCtx) return;
  const t0 = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + dur);
  const peak = gain * volumeFactor();
  g.gain.setValueAtTime(Math.max(peak, 0.00001), t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}
function noiseBurst({ dur = 0.25, gain = 0.22, delay = 0, filterFreq = 900 }) {
  if (muted || !audioCtx) return;
  const t0 = audioCtx.currentTime + delay;
  const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const filt = audioCtx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = filterFreq;
  const g = audioCtx.createGain();
  const peak = gain * volumeFactor();
  g.gain.setValueAtTime(Math.max(peak, 0.00001), t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt).connect(g).connect(audioCtx.destination);
  src.start(t0);
}
const sfx = {
  shoot: () => tone({ freq: 880, slideTo: 220, dur: 0.09, type: "sawtooth", gain: 0.12 }),
  scatter: () => { noiseBurst({ dur: 0.22, gain: 0.24, filterFreq: 1100 }); tone({ freq: 300, slideTo: 90, dur: 0.18, type: "square", gain: 0.12 }); },
  rail: () => { tone({ freq: 380, slideTo: 1800, dur: 0.18, type: "sine", gain: 0.16 }); tone({ freq: 1200, slideTo: 420, dur: 0.22, type: "sawtooth", gain: 0.1, delay: 0.05 }); },
  hit: () => tone({ freq: 1400, dur: 0.06, type: "square", gain: 0.14 }),
  overheat: () => tone({ freq: 200, dur: 0.3, type: "sawtooth", gain: 0.15, slideTo: 80 }),
  explosion: () => { noiseBurst({ dur: 0.35, gain: 0.28, filterFreq: 1400 }); tone({ freq: 150, dur: 0.3, type: "square", gain: 0.12, slideTo: 40 }); },
  playerHurt: () => { noiseBurst({ dur: 0.2, gain: 0.22, filterFreq: 600 }); tone({ freq: 110, dur: 0.2, type: "sawtooth", gain: 0.16 }); },
  waveClear: () => { [440, 660, 880, 1180].forEach((f, i) => tone({ freq: f, dur: 0.16, type: "triangle", gain: 0.14, delay: i * 0.09 })); },
  waveStart: () => tone({ freq: 260, dur: 0.3, type: "sawtooth", gain: 0.13, slideTo: 520 }),
  bossStart: () => { [140, 110, 90].forEach((f, i) => tone({ freq: f, dur: 0.5, type: "sawtooth", gain: 0.2, delay: i * 0.22 })); },
  gameOver: () => [520, 400, 300, 180].forEach((f, i) => tone({ freq: f, dur: 0.28, type: "sawtooth", gain: 0.16, delay: i * 0.16 })),
  pickup: () => { [880, 1320].forEach((f, i) => tone({ freq: f, dur: 0.12, type: "triangle", gain: 0.15, delay: i * 0.06 })); },
  enemyShot: () => tone({ freq: 620, slideTo: 240, dur: 0.16, type: "sawtooth", gain: 0.1 }),
  dash: () => { noiseBurst({ dur: 0.18, gain: 0.16, filterFreq: 2400 }); tone({ freq: 900, slideTo: 180, dur: 0.16, type: "sine", gain: 0.1 }); },
  weaponSwitch: () => tone({ freq: 700, dur: 0.07, type: "square", gain: 0.1 }),
};

/* ============================== PLAYER ============================== */

const player = {
  height: 1.7,
  radius: 0.5,
  yaw: 0,
  pitch: 0,
  health: 100,
  maxHealth: 100,
  alive: true,
  speedBase: 6.2,
  sprintMult: 1.55,
};
camera.position.set(0, player.height, 8);

const moveState = { forward: false, back: false, left: false, right: false, sprint: false };

let heat = 0;
const HEAT_COOL_RATE = 26; // per second
let overheated = false;
let fireTimer = 0;

const dash = { active: false, t: 0, cd: 0, cdMax: 2.2, dur: 0.18, speed: 26, dir: new THREE.Vector3(0, 0, -1) };

/* ============================== WEAPONS ============================== */

const WEAPONS = [
  { key: "pulse", label: "PULSE", heat: 9.5, cooldown: 0.11, dmg: 12, pellets: 1, spread: 0, pierce: false, range: 60, color: 0x33fff0, recoil: 0.09, sound: "shoot", shake: 0.008 },
  { key: "scatter", label: "SCATTER", heat: 26, cooldown: 0.62, dmg: 9, pellets: 6, spread: 0.055, pierce: false, range: 30, color: 0xfff23a, recoil: 0.2, sound: "scatter", shake: 0.03 },
  { key: "rail", label: "RAIL", heat: 34, cooldown: 1.25, dmg: 55, pellets: 1, spread: 0, pierce: true, range: 90, color: 0xff2fd6, recoil: 0.26, sound: "rail", shake: 0.022 },
];
let currentWeapon = 0;

/* weapon viewmodels — one group per weapon, only the active one is visible */
const gunGroup = new THREE.Group();
gunGroup.position.set(0.28, -0.22, -0.55);
camera.add(gunGroup);
scene.add(camera);

function buildViewmodel(def, index) {
  const group = new THREE.Group();
  if (index === 0) {
    group.add(
      new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.62),
        new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.7, roughness: 0.3, emissive: 0x0d3b3a, emissiveIntensity: 0.6 }))
    );
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 10),
      new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 1.4, metalness: 0.2, roughness: 0.2 }));
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, -0.5);
    group.add(barrel);
    group.userData.tip = new THREE.Vector3(0, 0, -0.66);
  } else if (index === 1) {
    group.add(
      new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x1a1408, metalness: 0.6, roughness: 0.4, emissive: 0x3a3208, emissiveIntensity: 0.6 }))
    );
    const twin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.5, 10),
      new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 1.1, metalness: 0.3, roughness: 0.25 }));
    twin.rotation.x = Math.PI / 2;
    twin.position.set(0, 0, -0.55);
    group.add(twin);
    group.userData.tip = new THREE.Vector3(0, 0, -0.8);
  } else {
    group.add(
      new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.85),
        new THREE.MeshStandardMaterial({ color: 0x1a0716, metalness: 0.8, roughness: 0.25, emissive: 0x3a0a30, emissiveIntensity: 0.7 }))
    );
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.014, 6, 14),
        new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 1.6 }));
      ring.position.set(0, 0, -0.3 - i * 0.16);
      group.add(ring);
    }
    group.userData.tip = new THREE.Vector3(0, 0, -0.78);
  }
  group.visible = false;
  gunGroup.add(group);
  return group;
}
const viewmodels = WEAPONS.map((def, i) => buildViewmodel(def, i));

const muzzleFlash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowCyan, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
muzzleFlash.scale.set(0.5, 0.5, 1);
gunGroup.add(muzzleFlash);
let muzzleTimer = 0;
let recoil = 0;

function setWeapon(index) {
  if (index < 0 || index >= WEAPONS.length) return false;
  if (index === currentWeapon && viewmodels[index].visible) return false;
  currentWeapon = index;
  viewmodels.forEach((vm, i) => { vm.visible = i === index; });
  muzzleFlash.position.copy(viewmodels[index].userData.tip);
  muzzleFlash.material.map = WEAPONS[index].color === 0xfff23a ? glowYellow : WEAPONS[index].color === 0xff2fd6 ? glowMagenta : glowCyan;
  muzzleFlash.material.needsUpdate = true;
  sfx.weaponSwitch();
  updateWeaponUI();
  return true;
}

/* ============================== POINTER LOCK / INPUT ============================== */

let locked = false;
let paused = false;
let gameOver = false;
let started = false;
let isFiring = false;
const BASE_SENSITIVITY = 0.0022;
const MOUSE_SENS = () => BASE_SENSITIVITY * settings.sens;

function canAim() {
  return locked || touchEnabled();
}
function onMouseMove(e) {
  if (!locked || paused || gameOver) return;
  player.yaw -= e.movementX * MOUSE_SENS();
  player.pitch -= e.movementY * MOUSE_SENS();
  const limit = Math.PI / 2 - 0.02;
  player.pitch = Math.max(-limit, Math.min(limit, player.pitch));
}
document.addEventListener("mousemove", onMouseMove);

function requestLock() {
  if (touchEnabled()) return;
  if (canvas.requestPointerLock) canvas.requestPointerLock();
}
document.addEventListener("pointerlockchange", () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && started && !gameOver && !touchEnabled() && !settingsOpen) {
    setPaused(true);
  }
});

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0 && locked && !paused && !gameOver) isFiring = true;
});
window.addEventListener("mouseup", () => { isFiring = false; });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("wheel", (e) => {
  if (!started || paused || gameOver) return;
  const dir = e.deltaY > 0 ? 1 : -1;
  setWeapon((currentWeapon + dir + WEAPONS.length) % WEAPONS.length);
}, { passive: true });

function toggleMute() {
  muted = !muted;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  document.getElementById("mute-indicator").textContent = `SON : ${muted ? "OFF" : "ON"} (M)`;
}

window.addEventListener("keydown", (e) => {
  switch (e.code) {
    case "KeyW": moveState.forward = true; break;
    case "KeyS": moveState.back = true; break;
    case "KeyA": moveState.left = true; break;
    case "KeyD": moveState.right = true; break;
    case "ShiftLeft": case "ShiftRight": moveState.sprint = true; break;
    case "Digit1": setWeapon(0); break;
    case "Digit2": setWeapon(1); break;
    case "Digit3": setWeapon(2); break;
    case "Space": e.preventDefault(); startDash(); break;
    case "KeyM": toggleMute(); break;
    case "Escape":
      if (settingsOpen) closeSettings();
      else if (started && !gameOver && (locked || touchEnabled())) setPaused(true);
      break;
  }
});
window.addEventListener("keyup", (e) => {
  switch (e.code) {
    case "KeyW": moveState.forward = false; break;
    case "KeyS": moveState.back = false; break;
    case "KeyA": moveState.left = false; break;
    case "KeyD": moveState.right = false; break;
    case "ShiftLeft": case "ShiftRight": moveState.sprint = false; break;
  }
});
window.addEventListener("blur", () => {
  moveState.forward = moveState.back = moveState.left = moveState.right = moveState.sprint = false;
  isFiring = false;
});
document.getElementById("mute-indicator").textContent = `SON : ${muted ? "OFF" : "ON"} (M)`;

/* ============================== TOUCH CONTROLS ============================== */

const touchUI = document.getElementById("touch-ui");
const stickZone = document.getElementById("stick-zone");
const stickBase = document.getElementById("stick-base");
const stickKnob = document.getElementById("stick-knob");
const lookZone = document.getElementById("look-zone");
const touchState = { stickId: null, lookId: null, originX: 0, originY: 0, lastX: 0, lastY: 0 };

function applyTouchVisibility() {
  const on = touchEnabled();
  touchUI.classList.toggle("enabled", on);
  document.body.classList.toggle("touch", on);
}
applyTouchVisibility();

function setStickVector(nx, ny) {
  const mag = Math.hypot(nx, ny);
  const dead = 0.18;
  stickKnob.style.transform = `translate(${nx * 44}px, ${ny * 44}px)`;
  if (mag < dead) {
    moveState.forward = moveState.back = moveState.left = moveState.right = false;
    moveState.sprint = false;
    return;
  }
  const k = (mag - dead) / (1 - dead) / Math.max(mag, 1e-4);
  const ax = nx * k;
  const ay = ny * k;
  moveState.forward = ay < -0.25;
  moveState.back = ay > 0.25;
  moveState.left = ax < -0.25;
  moveState.right = ax > 0.25;
  moveState.sprint = Math.hypot(ax, ay) > 0.86;
}
function resetStick() {
  stickKnob.style.transform = "translate(0px, 0px)";
  moveState.forward = moveState.back = moveState.left = moveState.right = false;
  moveState.sprint = false;
}

function capturePointer(el, e) {
  try { el.setPointerCapture(e.pointerId); } catch (_err) { /* synthetic events have no real pointer */ }
}

stickZone.addEventListener("pointerdown", (e) => {
  touchState.stickId = e.pointerId;
  capturePointer(stickZone, e);
  touchState.originX = e.clientX;
  touchState.originY = e.clientY;
  const rect = stickBase.getBoundingClientRect();
  stickBase.style.left = `${Math.max(12, Math.min(e.clientX - rect.width / 2, window.innerWidth * 0.44 - rect.width))}px`;
  stickBase.style.bottom = `${Math.max(16, Math.min(window.innerHeight - e.clientY - rect.height / 2, window.innerHeight - 60))}px`;
});
stickZone.addEventListener("pointermove", (e) => {
  if (touchState.stickId !== e.pointerId) return;
  const nx = Math.max(-1, Math.min(1, (e.clientX - touchState.originX) / 55));
  const ny = Math.max(-1, Math.min(1, (e.clientY - touchState.originY) / 55));
  setStickVector(nx, ny);
});
function endStick(e) {
  if (touchState.stickId !== e.pointerId) return;
  touchState.stickId = null;
  resetStick();
}
stickZone.addEventListener("pointerup", endStick);
stickZone.addEventListener("pointercancel", endStick);

lookZone.addEventListener("pointerdown", (e) => {
  touchState.lookId = e.pointerId;
  capturePointer(lookZone, e);
  touchState.lastX = e.clientX;
  touchState.lastY = e.clientY;
});
lookZone.addEventListener("pointermove", (e) => {
  if (touchState.lookId !== e.pointerId || paused || gameOver) return;
  const dx = e.clientX - touchState.lastX;
  const dy = e.clientY - touchState.lastY;
  touchState.lastX = e.clientX;
  touchState.lastY = e.clientY;
  player.yaw -= dx * MOUSE_SENS() * 1.6;
  player.pitch -= dy * MOUSE_SENS() * 1.6;
  const limit = Math.PI / 2 - 0.02;
  player.pitch = Math.max(-limit, Math.min(limit, player.pitch));
});
function endLook(e) {
  if (touchState.lookId !== e.pointerId) return;
  touchState.lookId = null;
}
lookZone.addEventListener("pointerup", endLook);
lookZone.addEventListener("pointercancel", endLook);

const fireBtn = document.getElementById("btn-fire");
fireBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); if (!paused && !gameOver) isFiring = true; });
fireBtn.addEventListener("pointerup", () => { isFiring = false; });
fireBtn.addEventListener("pointercancel", () => { isFiring = false; });
document.getElementById("btn-dash").addEventListener("pointerdown", (e) => { e.preventDefault(); startDash(); });
[0, 1, 2].forEach((i) => {
  document.getElementById(`btn-w${i}`).addEventListener("pointerdown", (e) => { e.preventDefault(); setWeapon(i); });
  document.getElementById(`slot-${i}`).classList.toggle("active", i === 0);
});

/* ============================== UI WIRING ============================== */

const hud = document.getElementById("hud");
const startOverlay = document.getElementById("start-overlay");
const pauseOverlay = document.getElementById("pause-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const settingsOverlay = document.getElementById("settings-overlay");
const healthFill = document.getElementById("health-fill");
const healthNum = document.getElementById("health-num");
const heatFill = document.getElementById("heat-fill");
const heatLabel = document.getElementById("heat-label");
const dashFill = document.getElementById("dash-fill");
const dashLabel = document.getElementById("dash-label");
const scoreEl = document.getElementById("score");
const waveInfoEl = document.getElementById("wave-info");
const enemiesLeftEl = document.getElementById("enemies-left");
const crosshair = document.getElementById("crosshair");
const damageFlash = document.getElementById("damage-flash");
const lowHealthVignette = document.getElementById("low-health-vignette");
const waveBanner = document.getElementById("wave-banner");
const waveBannerNum = document.getElementById("wave-banner-num");
const comboWrap = document.getElementById("combo-wrap");
const comboMultEl = document.getElementById("combo-mult");
const comboBar = document.getElementById("combo-bar");
const killFeed = document.getElementById("kill-feed");
const bossWrap = document.getElementById("boss-wrap");
const bossFill = document.getElementById("boss-fill");
const radarCanvas = document.getElementById("radar");
const radarCtx = radarCanvas.getContext("2d");
const slotEls = [0, 1, 2].map((i) => document.getElementById(`slot-${i}`));
const touchWeaponEls = [0, 1, 2].map((i) => document.getElementById(`btn-w${i}`));

function updateWeaponUI() {
  slotEls.forEach((el, i) => el.classList.toggle("active", i === currentWeapon));
  touchWeaponEls.forEach((el, i) => el.classList.toggle("active", i === currentWeapon));
}

/* ============================== SETTINGS UI ============================== */

let settingsOpen = false;
const sensInput = document.getElementById("set-sens");
const fovInput = document.getElementById("set-fov");
const volInput = document.getElementById("set-vol");
const qualityInput = document.getElementById("set-quality");
const radarInput = document.getElementById("set-radar");
const touchInput = document.getElementById("set-touch");

function refreshSettingsUI() {
  sensInput.value = String(settings.sens);
  document.getElementById("set-sens-val").textContent = Number(settings.sens).toFixed(1);
  fovInput.value = String(settings.fov);
  document.getElementById("set-fov-val").textContent = String(settings.fov);
  volInput.value = String(settings.volume);
  document.getElementById("set-vol-val").textContent = String(settings.volume);
  qualityInput.value = settings.quality;
  radarInput.checked = !!settings.radar;
  touchInput.checked = touchEnabled();
  radarCanvas.style.display = settings.radar ? "block" : "none";
}
refreshSettingsUI();

function openSettings() {
  settingsOpen = true;
  if (started && !gameOver) setPaused(true);
  refreshSettingsUI();
  settingsOverlay.classList.remove("hidden");
}
function closeSettings() {
  settingsOpen = false;
  settingsOverlay.classList.add("hidden");
  if (started && !gameOver && !paused) requestLock();
}
document.getElementById("open-settings-start").addEventListener("click", openSettings);
document.getElementById("open-settings-pause").addEventListener("click", openSettings);
document.getElementById("close-settings").addEventListener("click", closeSettings);
document.getElementById("reset-record").addEventListener("click", () => {
  try { localStorage.removeItem(HIGHSCORE_KEY); } catch (_e) { /* ignore */ }
  document.getElementById("reset-hint").textContent = "Record effacé.";
});

sensInput.addEventListener("input", () => {
  settings.sens = Number(sensInput.value);
  document.getElementById("set-sens-val").textContent = settings.sens.toFixed(1);
  saveSettings();
});
fovInput.addEventListener("input", () => {
  settings.fov = Number(fovInput.value);
  document.getElementById("set-fov-val").textContent = String(settings.fov);
  camera.fov = settings.fov;
  camera.updateProjectionMatrix();
  saveSettings();
});
volInput.addEventListener("input", () => {
  settings.volume = Number(volInput.value);
  document.getElementById("set-vol-val").textContent = String(settings.volume);
  saveSettings();
});
qualityInput.addEventListener("change", () => {
  settings.quality = qualityInput.value;
  applyGraphics();
  saveSettings();
});
radarInput.addEventListener("change", () => {
  settings.radar = radarInput.checked;
  radarCanvas.style.display = settings.radar ? "block" : "none";
  saveSettings();
});
touchInput.addEventListener("change", () => {
  settings.touch = touchInput.checked;
  applyTouchVisibility();
  saveSettings();
});

/* ============================== ENEMIES ============================== */

const enemyGroup = new THREE.Group();
scene.add(enemyGroup);
const enemies = [];

const ENEMY_TYPES = {
  drone: { geo: () => new THREE.IcosahedronGeometry(0.55, 0), color: 0x33fff0, hp: 20, speed: 3.1, damage: 8, score: 100, ranged: false, label: "DRONE" },
  brute: { geo: () => new THREE.BoxGeometry(1.05, 1.05, 1.05), color: 0xff2fd6, hp: 55, speed: 1.9, damage: 16, score: 220, ranged: false, label: "BRUTE" },
  sprinter: { geo: () => new THREE.TetrahedronGeometry(0.6, 0), color: 0xfff23a, hp: 12, speed: 5.3, damage: 6, score: 150, ranged: false, label: "SPRINTER" },
  spitter: {
    geo: () => new THREE.OctahedronGeometry(0.62, 0), color: 0x0fe08a, hp: 26, speed: 1.7, damage: 9, score: 180,
    ranged: true, keepMin: 9, keepMax: 16, fireEvery: 2.1, projSpeed: 9.5, projDamage: 14, label: "SPITTER",
  },
  boss: {
    geo: () => new THREE.IcosahedronGeometry(1.7, 1), color: 0xff3b4e, hp: 380, speed: 1.5, damage: 26, score: 1200,
    ranged: true, keepMin: 6, keepMax: 13, fireEvery: 3.2, projSpeed: 8.5, projDamage: 18, boss: true, label: "SENTINELLE", radius: 1.7, scale: 1,
  },
};

function glowForColor(hex) {
  if (hex === 0xff2fd6) return glowMagenta;
  if (hex === 0xfff23a) return glowYellow;
  if (hex === 0xff3b4e) return glowRed;
  if (hex === 0x0fe08a) return glowGreen;
  return glowCyan;
}

function healthScaleForWave() {
  return 1 + Math.floor((wave - 1) / 3) * 0.55;
}
function speedScaleForWave() {
  return Math.min(1 + wave * 0.035, 1.9);
}

function spawnEnemy(typeKey, atX = null, atZ = null) {
  const def = ENEMY_TYPES[typeKey] || ENEMY_TYPES.drone;
  const mesh = new THREE.Mesh(
    def.geo(),
    new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: def.boss ? 1.1 : 0.9, roughness: 0.35, metalness: 0.2 })
  );
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowForColor(def.color), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(def.boss ? 5.4 : def.ranged ? 2.1 : 1.8, def.boss ? 5.4 : def.ranged ? 2.1 : 1.8, 1);
  mesh.add(halo);

  if (atX === null || atZ === null) {
    const angle = Math.random() * Math.PI * 2;
    const r = ARENA_HALF - 2;
    mesh.position.set(Math.cos(angle) * r, 1, Math.sin(angle) * r);
  } else {
    mesh.position.set(atX, 1, atZ);
  }
  resolveCovers(mesh.position, def.radius || 0.65);

  const hp = def.boss ? def.hp + wave * 40 : def.hp * healthScaleForWave();
  const enemy = {
    mesh,
    type: typeKey,
    hp,
    maxHp: hp,
    speed: def.speed * speedScaleForWave(),
    damage: def.damage,
    score: def.score,
    hitTimer: 0,
    fireTimer: 1.2 + Math.random(),
    strafePhase: Math.random() * Math.PI * 2,
    radius: def.radius || 0.65,
  };
  enemyGroup.add(mesh);
  enemies.push(enemy);
  return enemy;
}

function spawnProjectile(origin, dir, def, damage) {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.22, 1),
    new THREE.MeshBasicMaterial({ color: def.boss ? 0xff3b4e : 0x0fe08a })
  );
  mesh.position.copy(origin);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowForColor(def.boss ? 0xff3b4e : 0x0fe08a), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(1.5, 1.5, 1);
  mesh.add(halo);
  scene.add(mesh);
  const proj = { mesh, vel: dir.clone().normalize().multiplyScalar(def.projSpeed), life: 4, damage, radius: 0.3 };
  projectiles.push(proj);
  return proj;
}

const projectiles = [];
function destroyProjectile(proj, explode = true) {
  const idx = projectiles.indexOf(proj);
  if (idx === -1) return;
  projectiles.splice(idx, 1);
  if (explode) spawnExplosion(proj.mesh.position, 0x0fe08a, 8);
  scene.remove(proj.mesh);
}

/* ============================== PICKUPS ============================== */

const pickups = [];
const PICKUP_DEF = {
  health: { color: 0x0fe08a, label: "SOIN" },
  cell: { color: 0x33fff0, label: "CELLULE" },
};
function spawnPickup(kind, x = null, z = null) {
  const def = PICKUP_DEF[kind] || PICKUP_DEF.health;
  let px = x;
  let pz = z;
  if (px === null || pz === null) {
    let tries = 0;
    do {
      px = (Math.random() - 0.5) * (ARENA_HALF * 2 - 8);
      pz = (Math.random() - 0.5) * (ARENA_HALF * 2 - 8);
      tries++;
    } while (tries < 30 && (pointInsideCover(px, pz, 1.2) || Math.hypot(px - camera.position.x, pz - camera.position.z) < 3));
  }
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.34, 0),
    new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 1.3, roughness: 0.3 })
  );
  mesh.position.set(px, 1.0, pz);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowForColor(def.color), transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(1.6, 1.6, 1);
  mesh.add(halo);
  scene.add(mesh);
  pickups.push({ kind, mesh, born: elapsed });
  return mesh;
}
function tryPickup(index) {
  const p = pickups[index];
  if (!p) return false;
  if (p.kind === "health") {
    if (player.health >= player.maxHealth) return false;
    player.health = Math.min(player.maxHealth, player.health + 30);
    updateHealthUI();
    spawnDamageNumber(p.mesh.position, "+30", 0x0fe08a);
  } else {
    if (heat < 10) return false;
    heat = Math.max(0, heat - 45);
    if (overheated && heat <= 15) overheated = false;
    updateHeatUI();
    spawnDamageNumber(p.mesh.position, "-CHALEUR", 0x33fff0);
  }
  sfx.pickup();
  scene.remove(p.mesh);
  pickups.splice(index, 1);
  return true;
}

/* ============================== PARTICLES / TRACERS / NUMBERS ============================== */

const particles = [];
function spawnExplosion(position, color, count = 14) {
  for (let i = 0; i < count; i++) {
    const geo = Math.random() > 0.5 ? new THREE.TetrahedronGeometry(0.09) : new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
    mesh.position.copy(position);
    const dir = new THREE.Vector3((Math.random() - 0.5), Math.random() * 0.7 + 0.1, (Math.random() - 0.5)).normalize();
    const speed = 2.5 + Math.random() * 3.5;
    particles.push({ mesh, vel: dir.multiplyScalar(speed), life: 0.55 + Math.random() * 0.2, age: 0 });
    scene.add(mesh);
  }
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowForColor(color), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  flash.position.copy(position);
  flash.scale.set(2.2, 2.2, 1);
  scene.add(flash);
  particles.push({ mesh: flash, vel: new THREE.Vector3(), life: 0.28, age: 0, isFlash: true });
}

const tracers = [];
function spawnTracer(from, to, color = 0x9df7ee) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  if (len < 0.05) return;
  const geo = new THREE.CylinderGeometry(0.012, 0.012, len, 4, 1, true);
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0, len / 2);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(from);
  mesh.lookAt(to);
  scene.add(mesh);
  tracers.push({ mesh, life: 0.09, age: 0 });
}

const dmgNumbers = [];
function spawnDamageNumber(position, amount, color) {
  const c = document.createElement("canvas");
  c.width = 160;
  c.height = 72;
  const ctx = c.getContext("2d");
  const css = `#${new THREE.Color(color).getHexString()}`;
  ctx.font = "bold 46px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = css;
  ctx.shadowBlur = 14;
  ctx.fillStyle = css;
  ctx.fillText(String(amount), 80, 36);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  spr.scale.set(1.3, 0.6, 1);
  spr.position.copy(position);
  spr.position.y += 0.35;
  scene.add(spr);
  dmgNumbers.push({
    mesh: spr,
    vel: new THREE.Vector3((Math.random() - 0.5) * 0.7, 1.7, (Math.random() - 0.5) * 0.7),
    life: 0.8,
    age: 0,
  });
}

function pushKillFeed(label, mult) {
  const entry = document.createElement("div");
  entry.className = "kill-entry";
  entry.innerHTML = mult > 1 ? `${label} <span class="m">×${mult}</span>` : label;
  killFeed.appendChild(entry);
  while (killFeed.children.length > 5) killFeed.removeChild(killFeed.firstChild);
  setTimeout(() => {
    entry.classList.add("fade");
    setTimeout(() => entry.remove(), 450);
  }, 2600);
}

/* ============================== SCORE / WAVE / COMBO ============================== */

let score = 0;
let wave = 0;
let enemiesToSpawnThisWave = 0;
let enemiesSpawnedThisWave = 0;
let spawnTimer = 0;
let spawnInterval = 1.1;
const MAX_CONCURRENT = 9;
let waveTransition = false;
let aiEnabled = true;

let elapsed = 0;
let chain = 0;
let comboMult = 1;
let bestCombo = 1;
let lastKillAt = -99;
const COMBO_WINDOW = 3;

const stats = { shots: 0, hits: 0, kills: 0 };

function isBossWave(n) { return n % 5 === 0; }

function startWave(n) {
  wave = n;
  enemiesToSpawnThisWave = 4 + (n - 1) * 3;
  if (isBossWave(n)) enemiesToSpawnThisWave = Math.max(6, Math.round(enemiesToSpawnThisWave * 0.5));
  enemiesSpawnedThisWave = 0;
  spawnInterval = Math.max(0.45, 1.15 - n * 0.04);
  spawnTimer = 0;
  waveTransition = false;
  spawnPickup("health");
  waveInfoEl.textContent = `VAGUE ${n}`;
  waveBannerNum.textContent = String(n);
  const boss = isBossWave(n);
  waveBanner.classList.toggle("boss", boss);
  waveBanner.querySelector(".t1").textContent = boss ? "SENTINELLE DÉTECTÉE" : "VAGUE SUIVANTE";
  waveBanner.classList.add("show");
  setTimeout(() => waveBanner.classList.remove("show"), 1400);
  if (boss) {
    sfx.bossStart();
    spawnEnemy("boss");
    enemiesSpawnedThisWave++;
  } else {
    sfx.waveStart();
  }
  updateEnemiesLeftUI();
}

function pickEnemyTypeForWave() {
  const roll = Math.random();
  if (wave >= 5 && roll < 0.2) return "sprinter";
  if (wave >= 3 && roll < 0.32) return "brute";
  if (wave >= 2 && roll < 0.5) return "spitter";
  return "drone";
}

function updateEnemiesLeftUI() {
  const remaining = Math.max(0, (enemiesToSpawnThisWave - enemiesSpawnedThisWave)) + enemies.length;
  enemiesLeftEl.textContent = `Cibles restantes : ${remaining}`;
}

/* ============================== HIT FEEDBACK ============================== */

let hitFlashTimer = 0;
function flashCrosshair(kill = false) {
  crosshair.classList.add(kill ? "kill" : "hit");
  hitFlashTimer = kill ? 0.24 : 0.1;
  if (kill) crosshair.dataset.kill = "1";
}
let damageFlashTimer = 0;
function flashDamage() {
  damageFlash.classList.add("show");
  damageFlashTimer = 0.32;
}

let shakeT = 0;
let shakeDur = 0.001;
let shakeMag = 0;
function addShake(mag, dur = 0.18) {
  shakeMag = Math.max(shakeMag, mag);
  shakeT = Math.max(shakeT, dur);
  shakeDur = Math.max(dur, shakeDur);
}

/* ============================== GAME RESET ============================== */

function resetGame() {
  score = 0;
  player.health = player.maxHealth;
  player.alive = true;
  heat = 0;
  overheated = false;
  fireTimer = 0;
  gameOver = false;
  wave = 0;
  chain = 0;
  comboMult = 1;
  bestCombo = 1;
  lastKillAt = -99;
  elapsed = 0;
  stats.shots = 0;
  stats.hits = 0;
  stats.kills = 0;
  dash.active = false;
  dash.cd = 0;
  camera.position.set(0, player.height, 8);
  player.yaw = 0;
  player.pitch = 0;
  camera.rotation.set(0, 0, 0, "YXZ");
  for (const en of enemies) enemyGroup.remove(en.mesh);
  enemies.length = 0;
  for (const p of projectiles) scene.remove(p.mesh);
  projectiles.length = 0;
  for (const p of pickups) scene.remove(p.mesh);
  pickups.length = 0;
  if (killFeed) killFeed.innerHTML = "";
  bossWrap.classList.remove("show");
  scoreEl.textContent = "0";
  setWeapon(0);
  updateHealthUI();
  updateHeatUI();
  updateDashUI();
}

/* ============================== SHOOTING LOGIC ============================== */

const raycaster = new THREE.Raycaster();
const MAX_RANGE = 90;
const tmpDir = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const tmpUp = new THREE.Vector3();
const worldUp = new THREE.Vector3(0, 1, 0);

function startDash() {
  if (!started || paused || gameOver) return false;
  if (dash.cd > 0 || dash.active) return false;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  dash.dir.set(0, 0, 0);
  if (moveState.forward) dash.dir.add(forward);
  if (moveState.back) dash.dir.sub(forward);
  const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
  if (moveState.right) dash.dir.add(right);
  if (moveState.left) dash.dir.sub(right);
  if (dash.dir.lengthSq() === 0) dash.dir.copy(forward);
  dash.dir.normalize();
  dash.active = true;
  dash.t = dash.dur;
  dash.cd = dash.cdMax;
  sfx.dash();
  addShake(0.012, 0.14);
  updateDashUI();
  return true;
}

function damageEnemy(enemy, amount, hitPoint) {
  enemy.hp -= amount;
  if (hitPoint) spawnDamageNumber(hitPoint, Math.round(amount), ENEMY_TYPES[enemy.type].color);
  if (enemy.hp <= 0) killEnemy(enemy);
}

function registerKill() {
  if (elapsed - lastKillAt <= COMBO_WINDOW) chain++;
  else chain = 1;
  lastKillAt = elapsed;
  comboMult = Math.min(1 + Math.floor(chain / 3), 5);
  if (comboMult > bestCombo) bestCombo = comboMult;
}

function killEnemy(enemy) {
  const idx = enemies.indexOf(enemy);
  if (idx === -1) return;
  enemies.splice(idx, 1);
  const def = ENEMY_TYPES[enemy.type];
  spawnExplosion(enemy.mesh.position, def.color, def.boss ? 34 : 14);
  enemyGroup.remove(enemy.mesh);
  sfx.explosion();
  addShake(def.boss ? 0.05 : 0.014, def.boss ? 0.4 : 0.16);
  registerKill();
  const gained = enemy.score * comboMult;
  score += gained;
  stats.kills++;
  scoreEl.textContent = String(score);
  pushKillFeed(def.label, comboMult);
  flashCrosshair(true);
  if (Math.random() < 0.18) spawnPickup(Math.random() < 0.55 ? "health" : "cell");
  updateEnemiesLeftUI();
  checkWaveClear();
}

function checkWaveClear() {
  if (enemiesSpawnedThisWave >= enemiesToSpawnThisWave && enemies.length === 0 && !waveTransition) {
    waveTransition = true;
    sfx.waveClear();
    setTimeout(() => { if (!gameOver) startWave(wave + 1); }, 1500);
  }
}

function tryShoot(dt, force = false) {
  const w = WEAPONS[currentWeapon];
  if (!force) {
    if (fireTimer > 0) return false;
    if (overheated) return false;
    if (dash.active) return false;
    if (paused || gameOver || !started) return false;
  }
  fireTimer = w.cooldown;
  heat = Math.min(100, heat + w.heat);
  if (heat >= 100 && !overheated) {
    overheated = true;
    sfx.overheat();
  }
  sfx[w.sound]();
  muzzleTimer = 0.045;
  recoil = w.recoil;
  addShake(w.shake, 0.12);
  stats.shots++;

  scene.updateMatrixWorld(true);
  const gunTipWorld = new THREE.Vector3();
  viewmodels[currentWeapon].localToWorld(viewmodels[currentWeapon].userData.tip.clone(), gunTipWorld);

  const targets = enemies.map((e) => e.mesh).concat(projectiles.map((p) => p.mesh));
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  tmpRight.crossVectors(camDir, worldUp).normalize();
  tmpUp.crossVectors(tmpRight, camDir).normalize();

  let anyHit = false;
  for (let i = 0; i < w.pellets; i++) {
    tmpDir.copy(camDir);
    if (w.spread > 0 && w.pellets > 1) {
      const a = (Math.random() * 2 - 1) * w.spread;
      const b = (Math.random() * 2 - 1) * w.spread;
      tmpDir.addScaledVector(tmpRight, a).addScaledVector(tmpUp, b).normalize();
    }
    raycaster.set(camera.position, tmpDir);
    raycaster.far = w.range;
    const blockT = shotBlockT(camera.position, tmpDir);
    const hits = raycaster.intersectObjects(targets, false).filter((h) => h.distance <= blockT);
    const endPoint = new THREE.Vector3().copy(camera.position)
      .addScaledVector(tmpDir, Math.min(w.range, blockT === Infinity ? w.range : blockT));
    if (hits.length === 0) {
      spawnTracer(gunTipWorld, endPoint, WEAPONS[currentWeapon].color);
      continue;
    }
    const list = w.pierce ? hits : [hits[0]];
    const alreadyHit = new Set();
    for (const hit of list) {
      // a convex enemy is intersected twice (front + back face): count it once per shot
      if (alreadyHit.has(hit.object)) continue;
      alreadyHit.add(hit.object);
      const proj = projectiles.find((p) => p.mesh === hit.object);
      if (proj) {
        destroyProjectile(proj);
        anyHit = true;
        continue;
      }
      const enemy = enemies.find((e) => e.mesh === hit.object);
      if (enemy) {
        damageEnemy(enemy, w.dmg, hit.point);
        anyHit = true;
        if (!w.pierce) break;
      }
    }
    const tracerEnd = list.length ? list[list.length - 1].point : endPoint;
    spawnTracer(gunTipWorld, tracerEnd, WEAPONS[currentWeapon].color);
  }
  if (anyHit) {
    stats.hits++;
    flashCrosshair(false);
    sfx.hit();
  }
  return true;   // le tir est bien parti (≠ false : refusé par cooldown/surchauffe/dash)
}

/* ============================== UI UPDATE HELPERS ============================== */

function updateHealthUI() {
  const pct = Math.max(0, player.health / player.maxHealth) * 100;
  healthFill.style.width = `${pct}%`;
  healthNum.textContent = String(Math.max(0, Math.round(player.health)));
  healthFill.classList.toggle("low", pct <= 30);
  lowHealthVignette.classList.toggle("active", pct <= 30 && pct > 0);
}
function updateHeatUI() {
  heatFill.style.width = `${heat}%`;
  heatFill.classList.toggle("hot", overheated);
  heatLabel.textContent = overheated ? "SURCHAUFFE !" : heat > 70 ? "CHAUD" : "OK";
}
function updateDashUI() {
  const pct = dash.cd <= 0 ? 100 : Math.max(0, (1 - dash.cd / dash.cdMax) * 100);
  dashFill.style.width = `${pct}%`;
  dashFill.classList.toggle("ready", dash.cd <= 0);
  dashLabel.textContent = dash.active ? "DASH" : dash.cd <= 0 ? "PRÊT" : `${dash.cd.toFixed(1)}s`;
}
function updateComboUI() {
  const active = chain > 0 && (elapsed - lastKillAt) <= COMBO_WINDOW;
  comboWrap.classList.toggle("show", active && comboMult > 1);
  if (active) {
    comboMultEl.textContent = `×${comboMult}`;
    comboBar.style.width = `${Math.max(0, 100 * (1 - (elapsed - lastKillAt) / COMBO_WINDOW))}%`;
  }
}
function updateBossUI() {
  const boss = enemies.find((e) => e.type === "boss");
  bossWrap.classList.toggle("show", !!boss);
  if (boss) bossFill.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
}

/* ============================== PLAYER DAMAGE / DEATH ============================== */

function damagePlayer(amount) {
  if (!player.alive || gameOver) return;
  player.health -= amount;
  flashDamage();
  sfx.playerHurt();
  addShake(0.03, 0.22);
  if (player.health <= 0) {
    player.health = 0;
    triggerGameOver();
  }
  updateHealthUI();
}

function triggerGameOver() {
  player.alive = false;
  gameOver = true;
  sfx.gameOver();
  document.exitPointerLock();
  hud.classList.remove("visible");
  let best = 0;
  try { best = Number(localStorage.getItem(HIGHSCORE_KEY) || 0); } catch (_e) { best = 0; }
  const isBest = score > best;
  if (isBest) { try { localStorage.setItem(HIGHSCORE_KEY, String(score)); } catch (_e) { /* ignore */ } }
  const acc = stats.shots > 0 ? Math.round((stats.hits / stats.shots) * 100) : 0;
  document.getElementById("final-score").textContent = String(score);
  document.getElementById("final-wave").textContent = String(wave);
  document.getElementById("final-kills").textContent = String(stats.kills);
  document.getElementById("final-acc").textContent = `${acc}%`;
  document.getElementById("final-combo").textContent = `×${bestCombo}`;
  document.getElementById("final-time").textContent = `${Math.round(elapsed)}s`;
  document.getElementById("final-best").textContent = String(Math.max(best, score));
  document.getElementById("newbest-tag").classList.toggle("hidden", !isBest);
  gameoverOverlay.classList.remove("hidden");
}

/* ============================== RADAR ============================== */

const RADAR_SIZE = 150;
const RADAR_PAD = 6;
const RADAR_SCALE = (RADAR_SIZE - RADAR_PAD * 2) / (ARENA_HALF * 2);
function radarX(x) { return RADAR_PAD + (x + ARENA_HALF) * RADAR_SCALE; }
function radarY(z) { return RADAR_PAD + (z + ARENA_HALF) * RADAR_SCALE; }

function drawRadar() {
  if (!settings.radar) return;
  const ctx = radarCtx;
  ctx.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);
  ctx.fillStyle = "rgba(6,10,20,.55)";
  ctx.fillRect(0, 0, RADAR_SIZE, RADAR_SIZE);
  ctx.strokeStyle = "rgba(51,255,240,.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(RADAR_PAD, RADAR_PAD, RADAR_SIZE - RADAR_PAD * 2, RADAR_SIZE - RADAR_PAD * 2);

  // covers
  ctx.fillStyle = "rgba(140,170,200,.35)";
  for (const c of covers) {
    ctx.fillRect(radarX(c.x - c.hw), radarY(c.z - c.hd), c.hw * 2 * RADAR_SCALE, c.hd * 2 * RADAR_SCALE);
  }
  // pickups
  for (const p of pickups) {
    ctx.strokeStyle = p.kind === "health" ? "#0fe08a" : "#33fff0";
    const px = radarX(p.mesh.position.x);
    const py = radarY(p.mesh.position.z);
    ctx.beginPath();
    ctx.moveTo(px - 3, py); ctx.lineTo(px + 3, py);
    ctx.moveTo(px, py - 3); ctx.lineTo(px, py + 3);
    ctx.stroke();
  }
  // enemies
  for (const e of enemies) {
    const def = ENEMY_TYPES[e.type];
    ctx.fillStyle = `#${new THREE.Color(def.color).getHexString()}`;
    const px = radarX(e.mesh.position.x);
    const py = radarY(e.mesh.position.z);
    ctx.beginPath();
    ctx.arc(px, py, def.boss ? 4.5 : 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // player arrow
  const px = radarX(camera.position.x);
  const py = radarY(camera.position.z);
  const fx = -Math.sin(player.yaw);
  const fy = -Math.cos(player.yaw);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(px + fx * 6, py + fy * 6);
  ctx.lineTo(px - fy * 4 - fx * 3, py + fx * 4 - fy * 3);
  ctx.lineTo(px + fy * 4 - fx * 3, py - fx * 4 - fy * 3);
  ctx.closePath();
  ctx.fill();
}

/* ============================== MAIN LOOP ============================== */

const clock = new THREE.Clock();
const tmpForward = new THREE.Vector3();
const tmpMove = new THREE.Vector3();

function update(dt) {
  if (!started || paused || gameOver) return;

  elapsed += dt;

  // ---- spawning ----
  if (enemiesSpawnedThisWave < enemiesToSpawnThisWave) {
    spawnTimer -= dt;
    if (spawnTimer <= 0 && enemies.length < MAX_CONCURRENT) {
      spawnEnemy(pickEnemyTypeForWave());
      enemiesSpawnedThisWave++;
      spawnTimer = spawnInterval;
      updateEnemiesLeftUI();
    }
  }

  // ---- movement ----
  camera.getWorldDirection(tmpForward);
  tmpForward.y = 0;
  tmpForward.normalize();
  tmpRight.crossVectors(tmpForward, worldUp).normalize();

  if (dash.active) {
    dash.t -= dt;
    camera.position.addScaledVector(dash.dir, dash.speed * dt);
    if (dash.t <= 0) dash.active = false;
  } else {
    tmpMove.set(0, 0, 0);
    if (moveState.forward) tmpMove.add(tmpForward);
    if (moveState.back) tmpMove.sub(tmpForward);
    if (moveState.right) tmpMove.add(tmpRight);
    if (moveState.left) tmpMove.sub(tmpRight);
    if (tmpMove.lengthSq() > 0) tmpMove.normalize();
    const speed = player.speedBase * (moveState.sprint ? player.sprintMult : 1);
    camera.position.x += tmpMove.x * speed * dt;
    camera.position.z += tmpMove.z * speed * dt;
  }
  if (dash.cd > 0) dash.cd = Math.max(0, dash.cd - dt);

  const bound = ARENA_HALF - player.radius - 0.6;
  camera.position.x = Math.max(-bound, Math.min(bound, camera.position.x));
  camera.position.z = Math.max(-bound, Math.min(bound, camera.position.z));
  resolveCovers(camera.position, player.radius);

  const moving = dash.active || tmpMove.lengthSq() > 0 || moveState.forward || moveState.back || moveState.left || moveState.right;
  camera.position.y = player.height + (moving ? Math.sin(elapsed * 9) * 0.035 : 0);

  // ---- camera orientation + screen shake ----
  let roll = 0;
  if (shakeT > 0) {
    shakeT = Math.max(0, shakeT - dt);
    roll = (Math.random() - 0.5) * 2 * shakeMag * (shakeT / shakeDur);
    if (shakeT === 0) shakeMag = 0;
  }
  camera.rotation.set(player.pitch, player.yaw, roll, "YXZ");

  // ---- weapon recoil / muzzle ----
  if (recoil > 0) {
    gunGroup.rotation.x = -recoil * 1.4;
    recoil = Math.max(0, recoil - dt * 0.6);
  } else {
    gunGroup.rotation.x = THREE.MathUtils.lerp(gunGroup.rotation.x, 0, dt * 10);
  }
  if (muzzleTimer > 0) {
    muzzleTimer -= dt;
    muzzleFlash.material.opacity = Math.max(0, muzzleTimer / 0.045);
  } else {
    muzzleFlash.material.opacity = 0;
  }

  // ---- firing ----
  if (fireTimer > 0) fireTimer -= dt;
  if (isFiring) tryShoot(dt);

  // heat cooling
  if (!isFiring || overheated) {
    heat = Math.max(0, heat - HEAT_COOL_RATE * dt);
    if (overheated && heat <= 15) overheated = false;
  }
  updateHeatUI();
  updateDashUI();

  // combo decay
  if (chain > 0 && elapsed - lastKillAt > COMBO_WINDOW) {
    chain = 0;
    comboMult = 1;
  }
  updateComboUI();

  // ---- enemies ----
  const playerPos = camera.position;
  for (const enemy of enemies) {
    const def = ENEMY_TYPES[enemy.type];
    const toPlayer = new THREE.Vector3().subVectors(playerPos, enemy.mesh.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    if (dist > 1e-4) toPlayer.normalize();

    if (aiEnabled) {
      enemy.strafePhase += dt * (enemy.type === "sprinter" ? 4 : 1.5);
      const wobble = enemy.type === "sprinter" ? Math.sin(enemy.strafePhase) * 0.4 : 0;
      const perp = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).multiplyScalar(wobble);

      if (def.ranged) {
        if (dist < 2) {
          enemy.hitTimer -= dt;
          if (enemy.hitTimer <= 0) {
            damagePlayer(enemy.damage);
            enemy.hitTimer = def.boss ? 0.9 : 1.1;
          }
        }
        if (dist < def.keepMin) {
          enemy.mesh.position.addScaledVector(toPlayer, -enemy.speed * dt);
        } else if (dist > def.keepMax) {
          enemy.mesh.position.addScaledVector(toPlayer, enemy.speed * dt);
        } else {
          enemy.mesh.position.addScaledVector(perp, dt * 1.2);
        }
        enemy.fireTimer -= dt;
        if (enemy.fireTimer <= 0 && dist > 3 && dist < 30 && hasLineOfSight(enemy.mesh.position, playerPos)) {
          enemy.fireTimer = def.fireEvery * (0.8 + Math.random() * 0.5);
          const from = enemy.mesh.position.clone();
          from.y = 1.05;
          const target = playerPos.clone();
          target.y = 1.2;
          sfx.enemyShot();
          if (def.boss) {
            for (let k = -2; k <= 2; k++) {
              const dir = new THREE.Vector3().subVectors(target, from).normalize();
              const angle = k * 0.12;
              const cos = Math.cos(angle);
              const sin = Math.sin(angle);
              const rx = dir.x * cos - dir.z * sin;
              const rz = dir.x * sin + dir.z * cos;
              spawnProjectile(from, new THREE.Vector3(rx, dir.y, rz).normalize(), def, def.projDamage);
            }
          } else {
            spawnProjectile(from, new THREE.Vector3().subVectors(target, from).normalize(), def, def.projDamage);
          }
        }
      } else {
        const contactRange = 1.3;
        if (dist > contactRange) {
          enemy.mesh.position.addScaledVector(toPlayer, enemy.speed * dt);
          enemy.mesh.position.addScaledVector(perp, dt);
        } else {
          enemy.hitTimer -= dt;
          if (enemy.hitTimer <= 0) {
            damagePlayer(enemy.damage);
            enemy.hitTimer = 0.75;
          }
        }
      }
      resolveCovers(enemy.mesh.position, enemy.radius);
      const eb = ARENA_HALF - enemy.radius - 0.5;
      enemy.mesh.position.x = Math.max(-eb, Math.min(eb, enemy.mesh.position.x));
      enemy.mesh.position.z = Math.max(-eb, Math.min(eb, enemy.mesh.position.z));
    }

    enemy.mesh.lookAt(playerPos.x, enemy.mesh.position.y, playerPos.z);
    enemy.mesh.rotation.z = Math.sin(elapsed * 3 + enemy.strafePhase) * 0.15;
    enemy.mesh.position.y = (def.boss ? 1.5 : 0.9) + Math.sin(elapsed * 4 + enemy.strafePhase) * 0.08;
  }
  updateBossUI();

  // ---- enemy projectiles ----
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.life -= dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += dt * 5;
    p.mesh.rotation.y += dt * 4;
    const pos = p.mesh.position;
    let dead = false;
    if (p.life <= 0) dead = true;
    if (pos.x < -ARENA_HALF || pos.x > ARENA_HALF || pos.z < -ARENA_HALF || pos.z > ARENA_HALF) dead = true;
    if (pointInsideCover(pos.x, pos.z, p.radius) && pos.y < 3.2) {
      spawnExplosion(pos, 0x0fe08a, 7);
      dead = true;
    }
    const dx = pos.x - camera.position.x;
    const dz = pos.z - camera.position.z;
    const dy = pos.y - (camera.position.y - 0.4);
    if (dx * dx + dz * dz < 0.85 * 0.85 && Math.abs(dy) < 1.3) {
      damagePlayer(p.damage);
      dead = true;
    }
    if (dead) {
      projectiles.splice(i, 1);
      scene.remove(p.mesh);
    }
  }

  // ---- pickups ----
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.mesh.rotation.y += dt * 1.6;
    p.mesh.position.y = 1.0 + Math.sin(elapsed * 2.4 + i) * 0.12;
    const dx = p.mesh.position.x - camera.position.x;
    const dz = p.mesh.position.z - camera.position.z;
    if (dx * dx + dz * dz < 1.6 * 1.6) {
      if (!tryPickup(i)) {
        if (elapsed - p.born > 20) {
          scene.remove(p.mesh);
          pickups.splice(i, 1);
        }
      }
      continue;
    }
    if (elapsed - p.born > 20) {
      scene.remove(p.mesh);
      pickups.splice(i, 1);
    }
  }

  // ---- particles ----
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    if (p.isFlash) {
      p.mesh.material.opacity = Math.max(0, 0.9 * (1 - p.age / p.life));
      p.mesh.scale.setScalar(2.2 + p.age * 6);
    } else {
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= 6 * dt;
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.y += dt * 4;
      p.mesh.material.opacity = Math.max(0, 1 - p.age / p.life);
      p.mesh.material.transparent = true;
    }
    if (p.age >= p.life) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
    }
  }

  // ---- tracers ----
  for (let i = tracers.length - 1; i >= 0; i--) {
    const t = tracers[i];
    t.age += dt;
    t.mesh.material.opacity = Math.max(0, 0.85 * (1 - t.age / t.life));
    if (t.age >= t.life) {
      scene.remove(t.mesh);
      tracers.splice(i, 1);
    }
  }

  // ---- damage numbers ----
  for (let i = dmgNumbers.length - 1; i >= 0; i--) {
    const d = dmgNumbers[i];
    d.age += dt;
    d.mesh.position.addScaledVector(d.vel, dt);
    d.vel.y -= dt * 1.2;
    d.mesh.material.opacity = Math.max(0, 1 - d.age / d.life);
    if (d.age >= d.life) {
      scene.remove(d.mesh);
      dmgNumbers.splice(i, 1);
    }
  }

  // ---- transient UI timers ----
  if (hitFlashTimer > 0) {
    hitFlashTimer -= dt;
    if (hitFlashTimer <= 0) {
      crosshair.classList.remove("hit", "kill");
      delete crosshair.dataset.kill;
    }
  }
  if (damageFlashTimer > 0) {
    damageFlashTimer -= dt;
    if (damageFlashTimer <= 0) damageFlash.classList.remove("show");
  }

  drawRadar();

  // pulse pillar lights subtly
  const pulsePulse = 0.35 + Math.sin(elapsed * 2) * 0.1;
  keyLight.intensity = 3.0 + Math.sin(elapsed * 1.3) * 0.4;
  rimA.intensity = 2.0 + pulsePulse;
  rimB.intensity = 2.0 + pulsePulse;
}

function render() {
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

/* ============================== OVERLAY BUTTONS ============================== */

document.getElementById("start-btn").addEventListener("click", () => {
  ensureAudio();
  started = true;
  startOverlay.classList.add("hidden");
  hud.classList.add("visible");
  requestLock();
  startWave(1);
});
document.getElementById("resume-btn").addEventListener("click", () => {
  setPaused(false);
  requestLock();
});
document.getElementById("retry-btn").addEventListener("click", () => {
  resetGame();
  gameoverOverlay.classList.add("hidden");
  hud.classList.add("visible");
  requestLock();
  startWave(1);
});

function setPaused(p) {
  paused = p;
  pauseOverlay.classList.toggle("hidden", !p);
}

/* ============================== INITIAL UI ============================== */

setWeapon(0);
updateHealthUI();
updateHeatUI();
updateDashUI();
drawRadar();

/* ============================== DEBUG / TEST HOOKS ============================== */
// Exposed for automated headless testing — does not affect normal gameplay.

window.__NOVA_STRIKE__ = {
  get score() { return score; },
  get wave() { return wave; },
  get health() { return player.health; },
  get enemyCount() { return enemies.length; },
  get gameOver() { return gameOver; },
  get started() { return started; },
  get paused() { return paused; },
  get camera() { return camera; },
  get weapon() { return currentWeapon; },
  get weaponLabel() { return WEAPONS[currentWeapon].label; },
  get heat() { return heat; },
  get overheated() { return overheated; },
  get combo() { return { chain, mult: comboMult, best: bestCombo }; },
  get dashState() { return { active: dash.active, cooldown: dash.cd }; },
  get stats() {
    return {
      shots: stats.shots,
      hits: stats.hits,
      kills: stats.kills,
      accuracy: stats.shots > 0 ? stats.hits / stats.shots : 0,
      elapsed,
      bestCombo,
    };
  },
  get enemies() { return enemies.map((e) => ({ type: e.type, hp: e.hp, maxHp: e.maxHp, pos: e.mesh.position.toArray() })); },
  get projectiles() { return projectiles.map((p) => ({ pos: p.mesh.position.toArray(), damage: p.damage, life: p.life })); },
  get pickups() { return pickups.map((p) => ({ kind: p.kind, pos: p.mesh.position.toArray() })); },
  get covers() { return covers.map((c) => ({ x: c.x, z: c.z, hw: c.hw, hd: c.hd, h: c.h })); },
  get enemiesToSpawnLeft() { return Math.max(0, enemiesToSpawnThisWave - enemiesSpawnedThisWave); },
  get radarEnabled() { return !!settings.radar; },
  get touchEnabled() { return touchEnabled(); },

  startGame() {
    if (!started) {
      ensureAudio();
      started = true;
      startOverlay.classList.add("hidden");
      hud.classList.add("visible");
      startWave(1);
    }
  },
  setWeapon(i) { return setWeapon(i); },
  reset() { resetGame(); },
  restart() {
    resetGame();
    gameoverOverlay.classList.add("hidden");
    hud.classList.add("visible");
    startWave(1);
  },
  startWave(n) { startWave(n); },
  setIsBossWave(n) { return isBossWave(n); },
  fire() { return tryShoot(0.016); },
  fireOnce() { return tryShoot(0.016, true); },
  forceShoot() { return tryShoot(0.016); },
  setHeat(v) { heat = Math.max(0, Math.min(100, v)); if (heat < 100) overheated = false; updateHeatUI(); },
  setPlayerHealth(v) { player.health = Math.max(0, Math.min(player.maxHealth, v)); updateHealthUI(); },
  addPlayerHealth(v) { player.health = Math.max(0, Math.min(player.maxHealth, player.health + v)); updateHealthUI(); },
  forceDamagePlayer(n) { damagePlayer(n); },
  forceSpawn(type = "drone") { spawnEnemy(type); enemiesSpawnedThisWave++; updateEnemiesLeftUI(); return true; },
  forceSpawnAt(type, x, z) { const e = spawnEnemy(type, x, z); enemiesSpawnedThisWave++; updateEnemiesLeftUI(); return e ? { type: e.type, hp: e.hp } : null; },
  spawnPickupAt(kind, x, z) { spawnPickup(kind, x, z); return pickups.length; },
  spawnProjectileAt(x, z, dx, dz, speed = 9.5, damage = 14) {
    const def = { projSpeed: speed, boss: false };
    const from = new THREE.Vector3(x, 1.05, z);
    spawnProjectile(from, new THREE.Vector3(dx, 0, dz).normalize(), def, damage);
    return projectiles.length;
  },
  destroyAllProjectiles() { while (projectiles.length) destroyProjectile(projectiles[0], false); },
  killAllEnemies() { while (enemies.length) killEnemy(enemies[0]); },
  clearPickups() { while (pickups.length) { scene.remove(pickups[0].mesh); pickups.splice(0, 1); } },
  setAiEnabled(v) { aiEnabled = !!v; },
  setPlayerPosition(x, z) { camera.position.x = x; camera.position.z = z; resolveCovers(camera.position, player.radius); },
  setPlayerPositionExact(x, z) { camera.position.x = x; camera.position.z = z; },
  setYaw(y) { player.yaw = y; camera.rotation.set(player.pitch, player.yaw, 0, "YXZ"); },
  setPitch(p) { player.pitch = p; camera.rotation.set(player.pitch, player.yaw, 0, "YXZ"); },
  lookAt(x, y, z) {
    const target = new THREE.Vector3(x, y, z);
    const dir = new THREE.Vector3().subVectors(target, camera.position).normalize();
    player.yaw = Math.atan2(-dir.x, -dir.z);
    player.pitch = Math.asin(Math.max(-1, Math.min(1, dir.y)));
    camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");
  },
  setMoveState(state) { Object.assign(moveState, state); },
  startDash() { return startDash(); },
  simulateFrame(dt = 0.05) { update(dt); },
  setPaused(p) { setPaused(p); },
  getEnemies() { return enemies.map((e) => ({ type: e.type, hp: e.hp, pos: e.mesh.position.toArray() })); },
  getSettings() { return Object.assign({}, settings); },
  setSettings(obj) {
    Object.assign(settings, obj);
    applyGraphics();
    applyTouchVisibility();
    if (typeof obj.radar === "boolean") refreshSettingsUI();
    saveSettings();
    return Object.assign({}, settings);
  },
  openSettings() { openSettings(); },
  closeSettings() { closeSettings(); },
  radarStats() {
    const data = radarCtx.getImageData(0, 0, RADAR_SIZE, RADAR_SIZE).data;
    let nonEmpty = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 12) nonEmpty++;
    }
    return { nonEmpty, total: RADAR_SIZE * RADAR_SIZE, enemies: enemies.length, pickups: pickups.length, covers: covers.length };
  },
  damageNumbers: () => dmgNumbers.length,
  killFeedEntries: () => killFeed.children.length,
};