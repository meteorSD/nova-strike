// NOVA STRIKE — arena FPS shooter, three.js core only (no examples/addons).
import * as THREE from "./three.module.min.js";

/* ============================== SETUP ============================== */

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03030a);
scene.fog = new THREE.FogExp2(0x03030a, 0.028);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
camera.rotation.order = "YXZ";

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
  // horizontal accent lines
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

/* ============================== AUDIO ============================== */

let audioCtx = null;
let muted = localStorage.getItem("novaStrikeMuted") === "1";
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
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}
function noiseBurst({ dur = 0.25, gain = 0.22, delay = 0, filterFreq = 900 }) {
  if (muted || !audioCtx) return;
  const t0 = audioCtx.currentTime + delay;
  const bufferSize = audioCtx.sampleRate * dur;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const filt = audioCtx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = filterFreq;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt).connect(g).connect(audioCtx.destination);
  src.start(t0);
}
const sfx = {
  shoot: () => tone({ freq: 880, slideTo: 220, dur: 0.09, type: "sawtooth", gain: 0.12 }),
  hit: () => tone({ freq: 1400, dur: 0.06, type: "square", gain: 0.14 }),
  overheat: () => tone({ freq: 200, dur: 0.3, type: "sawtooth", gain: 0.15, slideTo: 80 }),
  explosion: () => { noiseBurst({ dur: 0.35, gain: 0.28, filterFreq: 1400 }); tone({ freq: 150, dur: 0.3, type: "square", gain: 0.12, slideTo: 40 }); },
  playerHurt: () => { noiseBurst({ dur: 0.2, gain: 0.22, filterFreq: 600 }); tone({ freq: 110, dur: 0.2, type: "sawtooth", gain: 0.16 }); },
  waveClear: () => { [440, 660, 880, 1180].forEach((f, i) => tone({ freq: f, dur: 0.16, type: "triangle", gain: 0.14, delay: i * 0.09 })); },
  waveStart: () => tone({ freq: 260, dur: 0.3, type: "sawtooth", gain: 0.13, slideTo: 520 }),
  gameOver: () => [520, 400, 300, 180].forEach((f, i) => tone({ freq: f, dur: 0.28, type: "sawtooth", gain: 0.16, delay: i * 0.16 })),
};

/* ============================== PLAYER ============================== */

const player = {
  height: 1.7,
  radius: 0.5,
  velocity: new THREE.Vector3(),
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
const HEAT_PER_SHOT = 9.5;
const HEAT_COOL_RATE = 26; // per second
let overheated = false;
const FIRE_COOLDOWN = 0.11;
let fireTimer = 0;

/* weapon viewmodel */
const gunGroup = new THREE.Group();
const gunBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.14, 0.16, 0.62),
  new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.7, roughness: 0.3, emissive: 0x0d3b3a, emissiveIntensity: 0.6 })
);
const gunBarrel = new THREE.Mesh(
  new THREE.CylinderGeometry(0.03, 0.03, 0.32, 10),
  new THREE.MeshStandardMaterial({ color: 0x33fff0, emissive: 0x33fff0, emissiveIntensity: 1.4, metalness: 0.2, roughness: 0.2 })
);
gunBarrel.rotation.x = Math.PI / 2;
gunBarrel.position.set(0, 0, -0.5);
gunGroup.add(gunBody, gunBarrel);
gunGroup.position.set(0.28, -0.22, -0.55);
camera.add(gunGroup);
scene.add(camera);

const muzzleFlash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowCyan, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
muzzleFlash.scale.set(0.5, 0.5, 1);
muzzleFlash.position.set(0, 0, -0.85);
gunGroup.add(muzzleFlash);
let muzzleTimer = 0;
let recoil = 0;

/* ============================== POINTER LOCK / INPUT ============================== */

let locked = false;
let paused = false;
let gameOver = false;
let started = false;
const SENSITIVITY = 0.0022;

function onMouseMove(e) {
  if (!locked || paused || gameOver) return;
  player.yaw -= e.movementX * SENSITIVITY;
  player.pitch -= e.movementY * SENSITIVITY;
  const limit = Math.PI / 2 - 0.02;
  player.pitch = Math.max(-limit, Math.min(limit, player.pitch));
  camera.rotation.set(player.pitch, player.yaw, 0, "YXZ");
}
document.addEventListener("mousemove", onMouseMove);

function requestLock() {
  canvas.requestPointerLock();
}
document.addEventListener("pointerlockchange", () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && started && !gameOver) {
    setPaused(true);
  }
});

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0 && locked && !paused && !gameOver) {
    isFiring = true;
  }
});
window.addEventListener("mouseup", () => { isFiring = false; });
let isFiring = false;

window.addEventListener("keydown", (e) => {
  switch (e.code) {
    case "KeyW": moveState.forward = true; break;
    case "KeyS": moveState.back = true; break;
    case "KeyA": moveState.left = true; break;
    case "KeyD": moveState.right = true; break;
    case "ShiftLeft": case "ShiftRight": moveState.sprint = true; break;
    case "KeyM": toggleMute(); break;
    case "Escape": if (started && !gameOver && locked) setPaused(true); break;
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

function toggleMute() {
  muted = !muted;
  localStorage.setItem("novaStrikeMuted", muted ? "1" : "0");
  document.getElementById("mute-indicator").textContent = `SON : ${muted ? "OFF" : "ON"} (M)`;
}
document.getElementById("mute-indicator").textContent = `SON : ${muted ? "OFF" : "ON"} (M)`;

/* ============================== UI WIRING ============================== */

const hud = document.getElementById("hud");
const startOverlay = document.getElementById("start-overlay");
const pauseOverlay = document.getElementById("pause-overlay");
const gameoverOverlay = document.getElementById("gameover-overlay");
const healthFill = document.getElementById("health-fill");
const healthNum = document.getElementById("health-num");
const heatFill = document.getElementById("heat-fill");
const heatLabel = document.getElementById("heat-label");
const scoreEl = document.getElementById("score");
const waveInfoEl = document.getElementById("wave-info");
const enemiesLeftEl = document.getElementById("enemies-left");
const crosshair = document.getElementById("crosshair");
const damageFlash = document.getElementById("damage-flash");
const lowHealthVignette = document.getElementById("low-health-vignette");
const waveBanner = document.getElementById("wave-banner");
const waveBannerNum = document.getElementById("wave-banner-num");

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

/* ============================== ENEMIES ============================== */

const enemyGroup = new THREE.Group();
scene.add(enemyGroup);
const enemies = [];

const ENEMY_TYPES = {
  drone: { geo: () => new THREE.IcosahedronGeometry(0.55, 0), color: 0x33fff0, hp: 20, speed: 3.1, damage: 8, score: 100 },
  brute: { geo: () => new THREE.BoxGeometry(1.05, 1.05, 1.05), color: 0xff2fd6, hp: 55, speed: 1.9, damage: 16, score: 220 },
  sprinter: { geo: () => new THREE.TetrahedronGeometry(0.6, 0), color: 0xfff23a, hp: 12, speed: 5.3, damage: 6, score: 150 },
};

function glowForColor(hex) {
  if (hex === 0xff2fd6) return glowMagenta;
  if (hex === 0xfff23a) return glowYellow;
  return glowCyan;
}

function spawnEnemy(typeKey) {
  const def = ENEMY_TYPES[typeKey];
  const mesh = new THREE.Mesh(
    def.geo(),
    new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.2 })
  );
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowForColor(def.color), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(1.8, 1.8, 1);
  mesh.add(halo);

  // spawn at random position on the arena edge
  const angle = Math.random() * Math.PI * 2;
  const r = ARENA_HALF - 2;
  mesh.position.set(Math.cos(angle) * r, 1, Math.sin(angle) * r);

  const enemy = {
    mesh,
    type: typeKey,
    hp: def.hp * healthScaleForWave(),
    maxHp: def.hp * healthScaleForWave(),
    speed: def.speed * speedScaleForWave(),
    damage: def.damage,
    score: def.score,
    hitTimer: 0,
    strafePhase: Math.random() * Math.PI * 2,
  };
  enemyGroup.add(mesh);
  enemies.push(enemy);
}

function healthScaleForWave() {
  return 1 + Math.floor((wave - 1) / 3) * 0.55;
}
function speedScaleForWave() {
  return Math.min(1 + wave * 0.035, 1.9);
}

/* ============================== PARTICLES / TRACERS ============================== */

const particles = [];
function spawnExplosion(position, color) {
  const count = 14;
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
function spawnTracer(from, to) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(0.012, 0.012, len, 4, 1, true);
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0, len / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0x9df7ee, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(from);
  mesh.lookAt(to);
  scene.add(mesh);
  tracers.push({ mesh, life: 0.09, age: 0 });
}

/* ============================== SCORE / WAVE STATE ============================== */

let score = 0;
let wave = 0;
let enemiesToSpawnThisWave = 0;
let enemiesSpawnedThisWave = 0;
let spawnTimer = 0;
let spawnInterval = 1.1;
const MAX_CONCURRENT = 8;
let waveTransition = false;

function startWave(n) {
  wave = n;
  enemiesToSpawnThisWave = 4 + (n - 1) * 3;
  enemiesSpawnedThisWave = 0;
  spawnInterval = Math.max(0.45, 1.15 - n * 0.04);
  spawnTimer = 0;
  waveTransition = false;
  sfx.waveStart();
  waveInfoEl.textContent = `VAGUE ${n}`;
  waveBannerNum.textContent = String(n);
  waveBanner.classList.add("show");
  setTimeout(() => waveBanner.classList.remove("show"), 1300);
  updateEnemiesLeftUI();
}

function pickEnemyTypeForWave() {
  const roll = Math.random();
  if (wave >= 5 && roll < 0.22) return "sprinter";
  if (wave >= 3 && roll < 0.45) return "brute";
  return "drone";
}

function updateEnemiesLeftUI() {
  const remaining = (enemiesToSpawnThisWave - enemiesSpawnedThisWave) + enemies.length;
  enemiesLeftEl.textContent = `Cibles restantes : ${remaining}`;
}

/* ============================== HIT FEEDBACK ============================== */

let hitFlashTimer = 0;
function flashCrosshair() {
  crosshair.classList.add("hit");
  hitFlashTimer = 0.1;
}
let damageFlashTimer = 0;
function flashDamage() {
  damageFlash.classList.add("show");
  damageFlashTimer = 0.32;
}

/* ============================== GAME RESET ============================== */

function resetGame() {
  score = 0;
  player.health = player.maxHealth;
  player.alive = true;
  heat = 0;
  overheated = false;
  gameOver = false;
  camera.position.set(0, player.height, 8);
  player.yaw = 0;
  player.pitch = 0;
  camera.rotation.set(0, 0, 0, "YXZ");
  for (const en of enemies) enemyGroup.remove(en.mesh);
  enemies.length = 0;
  scoreEl.textContent = "0";
  updateHealthUI();
}

/* ============================== SHOOTING LOGIC ============================== */

const raycaster = new THREE.Raycaster();
const centerNDC = new THREE.Vector2(0, 0);
const MAX_RANGE = 60;

function tryShoot(dt) {
  if (fireTimer > 0) return;
  if (overheated) return;
  fireTimer = FIRE_COOLDOWN;
  heat = Math.min(100, heat + HEAT_PER_SHOT);
  if (heat >= 100) {
    overheated = true;
    sfx.overheat();
  }
  sfx.shoot();
  muzzleTimer = 0.045;
  recoil = 0.09;

  scene.updateMatrixWorld(true); // guarantee fresh enemy transforms before hit-scan
  raycaster.setFromCamera(centerNDC, camera);
  const meshes = enemies.map((e) => e.mesh);
  const hits = raycaster.intersectObjects(meshes, false);
  const gunTipWorld = new THREE.Vector3();
  gunBarrel.getWorldPosition(gunTipWorld);

  if (hits.length > 0) {
    const hit = hits[0];
    spawnTracer(gunTipWorld, hit.point);
    const enemy = enemies.find((e) => e.mesh === hit.object);
    if (enemy) damageEnemy(enemy, 12);
    flashCrosshair();
    sfx.hit();
  } else {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const endPoint = new THREE.Vector3().copy(camera.position).add(dir.multiplyScalar(MAX_RANGE));
    spawnTracer(gunTipWorld, endPoint);
  }
}

function damageEnemy(enemy, amount) {
  enemy.hp -= amount;
  if (enemy.hp <= 0) killEnemy(enemy);
}

function killEnemy(enemy) {
  const idx = enemies.indexOf(enemy);
  if (idx === -1) return;
  enemies.splice(idx, 1);
  const color = ENEMY_TYPES[enemy.type].color;
  spawnExplosion(enemy.mesh.position, color);
  enemyGroup.remove(enemy.mesh);
  sfx.explosion();
  score += enemy.score;
  scoreEl.textContent = String(score);
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

/* ============================== PLAYER DAMAGE / DEATH ============================== */

function damagePlayer(amount) {
  if (!player.alive) return;
  player.health -= amount;
  flashDamage();
  sfx.playerHurt();
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
  const best = Number(localStorage.getItem("novaStrikeHighScore") || 0);
  const isBest = score > best;
  if (isBest) localStorage.setItem("novaStrikeHighScore", String(score));
  document.getElementById("final-score").textContent = String(score);
  document.getElementById("final-wave").textContent = String(wave);
  document.getElementById("final-best").textContent = String(Math.max(best, score));
  document.getElementById("newbest-tag").classList.toggle("hidden", !isBest);
  gameoverOverlay.classList.remove("hidden");
}

/* ============================== MAIN LOOP ============================== */

const clock = new THREE.Clock();
const tmpForward = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const tmpDir = new THREE.Vector3();
const worldUp = new THREE.Vector3(0, 1, 0);

function update(dt) {
  if (!started || paused || gameOver) return;

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

  tmpDir.set(0, 0, 0);
  if (moveState.forward) tmpDir.add(tmpForward);
  if (moveState.back) tmpDir.sub(tmpForward);
  if (moveState.right) tmpDir.add(tmpRight);
  if (moveState.left) tmpDir.sub(tmpRight);
  if (tmpDir.lengthSq() > 0) tmpDir.normalize();

  const speed = player.speedBase * (moveState.sprint ? player.sprintMult : 1);
  camera.position.x += tmpDir.x * speed * dt;
  camera.position.z += tmpDir.z * speed * dt;

  const bound = ARENA_HALF - player.radius - 0.6;
  camera.position.x = Math.max(-bound, Math.min(bound, camera.position.x));
  camera.position.z = Math.max(-bound, Math.min(bound, camera.position.z));
  camera.position.y = player.height + Math.sin(clock.elapsedTime * (tmpDir.lengthSq() > 0 ? 9 : 0)) * (tmpDir.lengthSq() > 0 ? 0.035 : 0);

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

  // ---- enemies ----
  const playerPos = camera.position;
  for (const enemy of enemies) {
    const toPlayer = new THREE.Vector3().subVectors(playerPos, enemy.mesh.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    toPlayer.normalize();

    // slight strafing wobble for sprinters
    enemy.strafePhase += dt * (enemy.type === "sprinter" ? 4 : 1.5);
    const wobble = enemy.type === "sprinter" ? Math.sin(enemy.strafePhase) * 0.4 : 0;
    const perp = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).multiplyScalar(wobble);

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
    enemy.mesh.lookAt(playerPos.x, enemy.mesh.position.y, playerPos.z);
    enemy.mesh.rotation.z = Math.sin(clock.elapsedTime * 3 + enemy.strafePhase) * 0.15;
    enemy.mesh.position.y = 0.9 + Math.sin(clock.elapsedTime * 4 + enemy.strafePhase) * 0.08;
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

  // ---- transient UI timers ----
  if (hitFlashTimer > 0) {
    hitFlashTimer -= dt;
    if (hitFlashTimer <= 0) crosshair.classList.remove("hit");
  }
  if (damageFlashTimer > 0) {
    damageFlashTimer -= dt;
    if (damageFlashTimer <= 0) damageFlash.classList.remove("show");
  }

  // pulse pillar lights subtly
  const pulse = 0.35 + Math.sin(clock.elapsedTime * 2) * 0.1;
  keyLight.intensity = 3.0 + Math.sin(clock.elapsedTime * 1.3) * 0.4;
  rimA.intensity = 2.0 + pulse;
  rimB.intensity = 2.0 + pulse;
}

function render() {
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

updateHealthUI();
updateHeatUI();

/* ============================== DEBUG / TEST HOOKS ============================== */
// Exposed for automated headless testing — does not affect normal gameplay.
window.__NOVA_STRIKE__ = {
  get score() { return score; },
  get wave() { return wave; },
  get health() { return player.health; },
  get enemyCount() { return enemies.length; },
  get gameOver() { return gameOver; },
  get started() { return started; },
  get camera() { return camera; },
  startGame() {
    if (!started) {
      ensureAudio();
      started = true;
      startOverlay.classList.add("hidden");
      hud.classList.add("visible");
      startWave(1);
    }
  },
  forceShoot() { tryShoot(0.016); },
  forceSpawn(type = "drone") { spawnEnemy(type); enemiesSpawnedThisWave++; updateEnemiesLeftUI(); },
  forceDamagePlayer(n) { damagePlayer(n); },
  setMoveState(state) { Object.assign(moveState, state); },
  getEnemies() { return enemies.map((e) => ({ type: e.type, hp: e.hp, pos: e.mesh.position.toArray() })); },
  simulateFrame(dt = 0.05) { update(dt); },
};
