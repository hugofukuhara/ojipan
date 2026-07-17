import * as THREE from './three.module.min.js';

// ============================================================
// おじパン もぐもぐ だいさくせん 3D
// 手描きのおじパン(ほのか原作)が3Dの草原を大冒険するスコアアタック
// ============================================================

// ---------- 手描きおじパン(2D描画 → テクスチャ化) ----------
function jit(seed, amp) {
  const v = Math.sin(seed * 127.13) * 43758.545;
  return (v - Math.floor(v) - 0.5) * 2 * amp;
}
// (おじパンは タイトルも ゲームちゅうも 3Dモデル)

// ---------- どうぶつ ずかん(小さい → 大きい / r は ワールド単位) ----------
const TIERS = [
  { r: 1.0, name: 'あり' },
  { r: 1.4, name: 'ねずみ' },
  { r: 1.8, name: 'かえる' },
  { r: 2.2, name: 'うさぎ' },
  { r: 2.6, name: 'ねこ' },
  { r: 3.0, name: 'いぬ' },
  { r: 3.5, name: 'きつね' },
  { r: 4.0, name: 'ぶた' },
  { r: 4.5, name: 'おおかみ' },
  { r: 5.0, name: 'いのしし' },
  { r: 5.6, name: 'らいおん' },
  { r: 6.2, name: 'くま' },
  { r: 7.2, name: 'ぞう' },
  { r: 8.4, name: 'きょうりゅう' },
];
const ANIMAL_STYLE = [
  { c: 0x35302b, c2: 0x201c18 },                                        // あり
  { c: 0x9a9a9a, c2: 0xd8b7c5, ear: 'round', tail: 'thin' },            // ねずみ
  { c: 0x59b04b, c2: 0xcfe8a8, frog: true },                            // かえる
  { c: 0xf5f0e8, c2: 0xe8b7c5, ear: 'long', tail: 'puff' },             // うさぎ
  { c: 0xe89a3c, c2: 0xf5e0c0, ear: 'point', tail: 'thin' },            // ねこ
  { c: 0xb07840, c2: 0xe8d0a8, ear: 'flop', tail: 'thin' },             // いぬ
  { c: 0xe07830, c2: 0xf8f0e0, ear: 'point', tail: 'bush' },            // きつね
  { c: 0xf0a0b0, c2: 0xf8c8d0, ear: 'round', tail: 'curl', snout: true },// ぶた
  { c: 0x8a8f98, c2: 0xd8dde0, ear: 'point', tail: 'bush' },            // おおかみ
  { c: 0x6a4a30, c2: 0xf5f0e0, ear: 'round', tusk: true },              // いのしし
  { c: 0xd8a840, c2: 0x8a5a20, ear: 'round', tail: 'thin', mane: true },// らいおん
  { c: 0x7a5230, c2: 0xa87848, ear: 'round' },                          // くま
  { c: 0xa0a8b0, c2: 0x8a929a, ear: 'big', tail: 'thin', trunk: true }, // ぞう
  { c: 0x5a8a3a, c2: 0xf5f0e0, rex: true },                             // きょうりゅう
];
const RANK_NAMES = [
  'あかちゃんパン', 'こどもパン', 'わかものパン', 'おとなパン',
  'おじパン', 'スーパーおじパン', 'ウルトラおじパン', 'キングおじパン',
];
const PANDA_START_R = 1.8;
const PANDA_MAX_R = 7.0;
const GIANT_MAX = 13.0;   // ビールで いちじ 超特大化 の うわげん

// ---------- おと ----------
let audio = null;
function initAudio() {
  if (audio) return;
  try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
}
function beep(f0, f1, dur, type, vol) {
  if (!audio) return;
  try {
    const t = audio.currentTime;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(audio.destination);
    o.start(t); o.stop(t + dur);
  } catch (e) {}
}
// ザクザクッ という そしゃくおん(ノイズ + バンドパスフィルター)
let noiseBuf = null;
function sEat() {
  if (!audio) return;
  try {
    if (!noiseBuf) {
      noiseBuf = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.2), audio.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = audio.currentTime;
    // ザクッ を 2かい かさねて「ザクザクッ」
    for (let k = 0; k < 2; k++) {
      const t = t0 + k * 0.075;
      const src = audio.createBufferSource();
      src.buffer = noiseBuf;
      src.playbackRate.value = 0.9 + Math.random() * 0.3;
      const bp = audio.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2600 + Math.random() * 900, t);
      bp.frequency.exponentialRampToValueAtTime(900, t + 0.09);
      bp.Q.value = 0.7;
      const g = audio.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      src.connect(bp).connect(g).connect(audio.destination);
      src.start(t); src.stop(t + 0.13);
    }
    // かむ ときの ひくい「ポリッ」
    beep(190, 120, 0.07, 'triangle', 0.05);
  } catch (e) {}
}
const sKnock = () => beep(300, 80, 0.25, 'sawtooth', 0.09);
const sOver  = () => beep(400, 100, 0.7, 'triangle', 0.12);
// だるま へんしん: きらきら〜ん と あがる おと
function sPower() {
  beep(400, 1200, 0.22, 'square', 0.07);
  beep(600, 1700, 0.32, 'sine', 0.06);
  beep(300, 900, 0.4, 'triangle', 0.05);
}
// ビール ゴクゴク → パワー
function sDrink() {
  beep(170, 90, 0.22, 'sine', 0.1);
  beep(520, 1500, 0.38, 'square', 0.06);
  beep(760, 1900, 0.45, 'sine', 0.05);
}
// ボス とうじょう(ドラマチックな おと)
function sBoss() {
  beep(120, 300, 0.5, 'sawtooth', 0.12);
  beep(90, 60, 0.8, 'triangle', 0.13);
  beep(600, 200, 0.4, 'square', 0.06);
}
// おとうさん ボム: ドカーンと ひろがる おと
function sBomb() {
  if (!audio) return;
  beep(160, 40, 0.7, 'sawtooth', 0.16);
  beep(900, 180, 0.55, 'triangle', 0.11);
  try {
    if (!noiseBuf) {
      noiseBuf = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.2), audio.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = audio.currentTime;
    const src = audio.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const lp = audio.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3000, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.6);
    const g = audio.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    src.connect(lp).connect(g).connect(audio.destination);
    src.start(t); src.stop(t + 0.65);
  } catch (e) {}
}

// ---------- 3D シーン ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const wrap = document.getElementById('wrap');
wrap.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd7f0);
scene.fog = new THREE.Fog(0xb8e0cc, 60, 130);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 400);

const hemi = new THREE.HemisphereLight(0xffffff, 0x5a8a44, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3d0, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -50;
sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -50;
sun.shadow.camera.far = 200;
scene.add(sun);
scene.add(sun.target);

// じめん(おじパンに ついてくる むげんの じめん)
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(200, 48).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x7cb955, roughness: 1 })
);
ground.receiveShadow = true;
scene.add(ground);

// ---------- マテリアル / ジオメトリ きょうゆう ----------
const matCache = new Map();
function mat(color) {
  if (!matCache.has(color)) {
    matCache.set(color, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 }));
  }
  return matCache.get(color);
}
const boxGeo = new THREE.BoxGeometry(1, 1, 1);

function part(g, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(boxGeo, mat(color));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  g.add(m);
  return m;
}

// ---------- どうぶつ モデル(ローポリ クロッシーロードふう) ----------
function makeAnimal(tier) {
  const st = ANIMAL_STYLE[tier];
  const g = new THREE.Group();
  const EYE = 0x201a14;

  if (st.frog) {
    part(g, st.c, 0, 0.32, 0, 0.85, 0.45, 0.75);
    part(g, st.c2, 0, 0.28, 0.25, 0.6, 0.25, 0.3);
    part(g, st.c, -0.22, 0.62, 0.18, 0.22, 0.22, 0.22);
    part(g, st.c, 0.22, 0.62, 0.18, 0.22, 0.22, 0.22);
    part(g, EYE, -0.22, 0.64, 0.29, 0.1, 0.1, 0.04);
    part(g, EYE, 0.22, 0.64, 0.29, 0.1, 0.1, 0.04);
    part(g, st.c, -0.35, 0.12, -0.1, 0.25, 0.2, 0.45);
    part(g, st.c, 0.35, 0.12, -0.1, 0.25, 0.2, 0.45);
  } else if (st.rex) {
    part(g, st.c, 0, 0.45, -0.75, 0.28, 0.32, 0.75, -0.15);   // しっぽ
    part(g, st.c, 0, 0.72, -0.05, 0.55, 0.68, 0.85);          // どう
    part(g, st.c2, 0, 0.6, 0.28, 0.4, 0.45, 0.35);            // おなか
    part(g, st.c, 0, 1.32, 0.38, 0.48, 0.45, 0.62);           // あたま
    part(g, 0xffffff, 0, 1.16, 0.62, 0.36, 0.1, 0.14);        // きば
    part(g, EYE, -0.15, 1.42, 0.62, 0.08, 0.1, 0.04);
    part(g, EYE, 0.15, 1.42, 0.62, 0.08, 0.1, 0.04);
    part(g, st.c, -0.2, 0.22, 0.05, 0.22, 0.45, 0.3);         // あし
    part(g, st.c, 0.2, 0.22, 0.05, 0.22, 0.45, 0.3);
    part(g, st.c, -0.32, 0.92, 0.3, 0.09, 0.26, 0.09);        // ちいさい うで
    part(g, st.c, 0.32, 0.92, 0.3, 0.09, 0.26, 0.09);
  } else {
    // よつあし どうぶつ(きほんがた)
    part(g, st.c, 0, 0.55, 0, 0.62, 0.52, 1.05);              // どう
    const hy = 0.88, hz = 0.62;
    part(g, st.c, 0, hy, hz, 0.52, 0.46, 0.44);               // あたま
    part(g, EYE, -0.14, hy + 0.05, hz + 0.23, 0.07, 0.1, 0.03);
    part(g, EYE, 0.14, hy + 0.05, hz + 0.23, 0.07, 0.1, 0.03);
    for (const [lx, lz] of [[-0.2, 0.35], [0.2, 0.35], [-0.2, -0.35], [0.2, -0.35]]) {
      part(g, st.c, lx, 0.16, lz, 0.17, 0.36, 0.17);
    }
    // みみ
    if (st.ear === 'round') {
      part(g, st.c, -0.17, hy + 0.28, hz - 0.05, 0.16, 0.16, 0.1);
      part(g, st.c, 0.17, hy + 0.28, hz - 0.05, 0.16, 0.16, 0.1);
    } else if (st.ear === 'long') {
      part(g, st.c, -0.13, hy + 0.45, hz - 0.08, 0.13, 0.5, 0.1, 0, 0, 0.12);
      part(g, st.c, 0.13, hy + 0.45, hz - 0.08, 0.13, 0.5, 0.1, 0, 0, -0.12);
    } else if (st.ear === 'point') {
      part(g, st.c, -0.16, hy + 0.3, hz - 0.05, 0.14, 0.22, 0.08, 0, 0, 0.5);
      part(g, st.c, 0.16, hy + 0.3, hz - 0.05, 0.14, 0.22, 0.08, 0, 0, -0.5);
    } else if (st.ear === 'flop') {
      part(g, st.c2, -0.27, hy + 0.1, hz - 0.05, 0.1, 0.32, 0.18);
      part(g, st.c2, 0.27, hy + 0.1, hz - 0.05, 0.1, 0.32, 0.18);
    } else if (st.ear === 'big') {
      part(g, st.c2, -0.38, hy + 0.05, hz - 0.15, 0.08, 0.42, 0.4);
      part(g, st.c2, 0.38, hy + 0.05, hz - 0.15, 0.08, 0.42, 0.4);
    }
    // しっぽ
    if (st.tail === 'thin') {
      part(g, st.c, 0, 0.75, -0.6, 0.09, 0.32, 0.09, 0.5);
    } else if (st.tail === 'puff') {
      part(g, 0xffffff, 0, 0.68, -0.58, 0.2, 0.2, 0.2);
    } else if (st.tail === 'bush') {
      part(g, st.c2, 0, 0.68, -0.68, 0.22, 0.22, 0.45, -0.35);
    } else if (st.tail === 'curl') {
      part(g, st.c2, 0, 0.72, -0.56, 0.12, 0.12, 0.12);
    }
    // とくちょう パーツ
    if (st.snout) part(g, st.c2, 0, hy - 0.05, hz + 0.26, 0.22, 0.16, 0.1);
    if (st.tusk) {
      part(g, st.c2, -0.16, hy - 0.14, hz + 0.2, 0.06, 0.18, 0.06, 0.3);
      part(g, st.c2, 0.16, hy - 0.14, hz + 0.2, 0.06, 0.18, 0.06, 0.3);
    }
    if (st.trunk) part(g, st.c, 0, hy - 0.32, hz + 0.22, 0.15, 0.55, 0.15, 0.25);
    if (st.mane) part(g, st.c2, 0, hy, hz - 0.12, 0.72, 0.7, 0.2);
  }
  return g;
}

// ---------- ささ・たけ モデル(ふしの ある くき + ほそながい は) ----------
const stalkGeo = new THREE.CylinderGeometry(0.07, 0.09, 1, 6);
const nodeGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.04, 6);
const leafGeo = new THREE.ConeGeometry(0.09, 0.75, 4);
function makeBamboo() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const h = 2.0 + jit(i * 3 + 1, 0.5);
    const st = new THREE.Group();
    st.position.set(jit(i * 7 + 2, 0.35), 0, jit(i * 9 + 3, 0.35));
    st.rotation.z = jit(i * 5 + 4, 0.1);   // すこし かたむく
    // ふし(せつ)ごとに つみあげる
    const segs = 3;
    const segH = h / segs;
    for (let s = 0; s < segs; s++) {
      const seg = new THREE.Mesh(stalkGeo, mat(0x54b04e));
      seg.scale.y = segH - 0.05;
      seg.position.y = segH * s + segH / 2;
      seg.castShadow = true;
      st.add(seg);
      const node = new THREE.Mesh(nodeGeo, mat(0x3d8a3a));
      node.position.y = segH * (s + 1) - 0.02;
      st.add(node);
    }
    // ほそながい はっぱを ほうしゃじょうに(てっぺんと まんなか)
    for (let L = 0; L < 5; L++) {
      const leaf = new THREE.Mesh(leafGeo, mat(L % 2 ? 0x4fae42 : 0x6cc858));
      leaf.position.y = h - 0.05 - (L % 2) * segH;
      leaf.rotation.y = L * 1.9 + jit(i * 23 + L, 0.6);
      leaf.rotation.z = 1.0 + jit(i * 19 + L * 7, 0.3);
      leaf.scale.set(0.9, 1, 0.3);          // ぺたんこに して はっぱらしく
      leaf.translateY(0.32);                // くきから そとへ ひらく
      leaf.castShadow = true;
      st.add(leaf);
    }
    g.add(st);
  }
  return g;
}

// ---------- おとうさん(その場で うごかない・さわると ボム) ----------
const sphereGeo = new THREE.SphereGeometry(1, 16, 12);
const SKIN = 0xf3caa0, SKIN2 = 0xe6ac82;
function makeOtousan() {
  const g = new THREE.Group();
  // つちの もりあがり
  const mound = new THREE.Mesh(sphereGeo, mat(0x8a6a44));
  mound.scale.set(2.4, 0.55, 2.4);
  mound.position.y = 0.12;
  mound.receiveShadow = true;
  g.add(mound);
  // つちの つぶ(まわりに ちらほら)
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * 6.283;
    const clod = new THREE.Mesh(sphereGeo, mat(0x9c7a52));
    clod.scale.setScalar(0.13 + jit(i * 5 + 1, 0.05));
    clod.position.set(Math.cos(a) * (2.0 + jit(i, 0.3)), 0.22, Math.sin(a) * (2.0 + jit(i * 3, 0.3)));
    g.add(clod);
  }
  // あたま(はげ ドーム)
  const head = new THREE.Mesh(sphereGeo, mat(SKIN));
  head.scale.set(1.55, 1.5, 1.4);
  head.position.y = 1.3;
  head.castShadow = true;
  g.add(head);
  // てかり(ハイライト)
  const shine = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: 0xfff2e0 }));
  shine.scale.set(0.34, 0.44, 0.1);
  shine.position.set(-0.5, 2.0, 0.9);
  g.add(shine);
  // みみ
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(sphereGeo, mat(SKIN2));
    ear.scale.set(0.26, 0.42, 0.22);
    ear.position.set(sx * 1.5, 1.12, 0.1);
    g.add(ear);
  }
  // にっこり とじめ の まゆ(への字を ふせた ⌒⌒)
  for (const sx of [-1, 1]) {
    part(g, 0x2a2018, sx * 0.5, 1.42, 1.28, 0.15, 0.1, 0.08, 0, 0, sx * 0.5);
    part(g, 0x2a2018, sx * 0.72, 1.38, 1.28, 0.15, 0.1, 0.08, 0, 0, sx * -0.5);
  }
  // めがね(くろぶち + しろレンズ)
  for (const sx of [-1, 1]) {
    part(g, 0x141414, sx * 0.6, 1.08, 1.33, 0.62, 0.54, 0.06);   // ふち
    part(g, 0xf8f8ff, sx * 0.6, 1.08, 1.38, 0.48, 0.4, 0.05);    // レンズ
  }
  part(g, 0x141414, 0, 1.12, 1.36, 0.3, 0.09, 0.07);              // ブリッジ
  return g;
}

// ---------- だるまおじパン(たまごがた・さわると へんしん&15びょう むてき) ----------
// くびれのない しずくがた(したが ふとく、うえは ほそい なめらかな 1たいがた)
const darumaBodyGeo = (() => {
  const geo = new THREE.SphereGeometry(1, 22, 18);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // y = -1(そこ) 〜 +1(てっぺん)。したを ふとく、うえを ほそく。
    const widen = 1.4 + (-y) * 0.35;   // そこ:1.75 → てっぺん:1.05
    pos.setX(i, x * widen);
    pos.setZ(i, z * widen);
  }
  geo.computeVertexNormals();
  return geo;
})();

// ボディ ひょうめんの てん(darumaBodyGeo と おなじ しき・off = そとへの うきあがり)
function darumaSurface(theta, phi, off) {
  const st = Math.sin(theta), ct = Math.cos(theta);
  const w = 1.4 + (-ct) * 0.35;
  let X = st * Math.cos(phi) * w * 0.9;
  let Y = ct * 1.35;
  let Z = st * Math.sin(phi) * w * 0.9;
  const len = Math.hypot(X, Y, Z) || 1;
  X += X / len * off; Y += Y / len * off; Z += Z / len * off;
  return new THREE.Vector3(X, Y + 1.42, Z);
}

// しろい かお = まえうえの おびを めんに はりつけた パッチ(くびれず・でっぱらず)
const darumaFaceGeo = (() => {
  const NT = 12, NP = 14, HALF = Math.PI / 2;
  const t0 = 0.72, t1 = 1.62, p0 = HALF - 0.72, p1 = HALF + 0.72;
  const verts = [], idx = [];
  for (let i = 0; i <= NT; i++) {
    const th = t0 + (t1 - t0) * i / NT;
    for (let j = 0; j <= NP; j++) {
      const ph = p0 + (p1 - p0) * j / NP;
      const P = darumaSurface(th, ph, 0.04);
      verts.push(P.x, P.y, P.z);
    }
  }
  for (let i = 0; i < NT; i++) {
    for (let j = 0; j < NP; j++) {
      const a = i * (NP + 1) + j, b = a + 1, c = a + (NP + 1), d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
})();
// りょうめん ひょうじ(うらむきに せいせいされても みえるように)
const darumaFaceMat = new THREE.MeshStandardMaterial({
  color: 0xf5f2e8, flatShading: true, roughness: 0.9, side: THREE.DoubleSide,
});

// め・はな を めんに のせる(おじパンと おなじく +Z むきの ひらたい はこ)
function darumaMark(g, C, th, ph, w, h, roll) {
  const P = darumaSurface(th, ph, 0.06);
  const m = new THREE.Mesh(boxGeo, mat(C));
  m.position.copy(P);
  m.rotation.z = roll;   // おじパンと おなじ かたむき
  m.scale.set(w, h, 0.06);
  g.add(m);
}

function makeDaruma() {
  const g = new THREE.Group();
  const C = 0x2a2622;
  // くびれのない だるまボディ(したぶくれ)
  const body = new THREE.Mesh(darumaBodyGeo, mat(C));
  body.scale.set(0.9, 1.35, 0.9);
  body.position.y = 1.42;
  body.castShadow = true;
  g.add(body);
  // しろい かお(めんに はりついた パッチ・りょうめん ひょうじ)
  const face = new THREE.Mesh(darumaFaceGeo, darumaFaceMat);
  g.add(face);
  const HALF = Math.PI / 2;
  // おじパンと おなじ かお: おおきな たれめ(ひだり -0.35 / みぎ +0.35)
  darumaMark(g, C, 1.0, HALF + 0.30, 0.22, 0.34, -0.35);
  darumaMark(g, C, 1.0, HALF - 0.30, 0.22, 0.34, 0.35);
  // 「大」の じの はな(たて + ／\ の あし)
  darumaMark(g, C, 1.2, HALF, 0.08, 0.28, 0);
  darumaMark(g, C, 1.36, HALF + 0.11, 0.08, 0.24, -0.55);
  darumaMark(g, C, 1.36, HALF - 0.11, 0.08, 0.24, 0.55);
  return g;
}
// へんしんちゅうの プレイヤーすがた
const darumaG = makeDaruma();
darumaG.visible = false;
scene.add(darumaG);

// ---------- おじパンビール(かん・のむと がめんじゅう すいこみ) ----------
const canGeo = new THREE.CylinderGeometry(0.72, 0.72, 2.1, 18);
const canRingGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.16, 18);
function makeBeer() {
  const g = new THREE.Group();
  const C = 0x2a2622;
  const can = new THREE.Mesh(canGeo, mat(0xccd5db));   // ぎんいろの かん
  can.position.y = 1.15; can.castShadow = true; g.add(can);
  const rt = new THREE.Mesh(canRingGeo, mat(0xe6c04e)); rt.position.y = 2.05; g.add(rt);
  const rb = new THREE.Mesh(canRingGeo, mat(0xe6c04e)); rb.position.y = 0.25; g.add(rb);
  // しろい ラベル
  const label = new THREE.Mesh(boxGeo, mat(0xf5f2e8));
  label.position.set(0, 1.15, 0.62); label.scale.set(0.96, 1.2, 0.18); g.add(label);
  // おじパンの かお(ラベルの うえ)
  part(g, C, -0.24, 1.32, 0.73, 0.17, 0.26, 0.05, 0, 0, -0.35);
  part(g, C, 0.24, 1.32, 0.73, 0.17, 0.26, 0.05, 0, 0, 0.35);
  part(g, C, 0, 1.16, 0.74, 0.06, 0.2, 0.05);
  part(g, C, -0.09, 1.02, 0.74, 0.06, 0.16, 0.05, 0, 0, -0.55);
  part(g, C, 0.09, 1.02, 0.74, 0.06, 0.16, 0.05, 0, 0, 0.55);
  return g;
}
let beerPending = false;
const _beerWP = new THREE.Vector3();

// ---------- ボス「ぴょんすけ」(むすこ デザイン・50000てんで とうじょう) ----------
// おおきな あたま + ちいさい しかくい どう + ぼうの てあし + さんかくみみ(こどもの えの ねこ)
const earGeo = new THREE.ConeGeometry(0.36, 0.72, 4);
function makePyonsuke() {
  const g = new THREE.Group();
  const W = 0xf7f4ec, K = 0x2a2622;
  // しかくい どう(あたまより ずっと ちいさい)
  part(g, W, 0, 1.28, 0, 0.5, 0.72, 0.36);
  // ぼうの うで(ひだり ななめした / みぎ よこ)
  part(g, W, -0.5, 1.35, 0.05, 0.5, 0.12, 0.12, 0, 0, 0.6);
  part(g, W, 0.52, 1.5, 0.05, 0.5, 0.12, 0.12, 0, 0, -0.25);
  // ぼうの あし(ひらいて)
  part(g, W, -0.22, 0.52, 0, 0.12, 0.72, 0.12, 0, 0, 0.28);
  part(g, W, 0.22, 0.52, 0, 0.12, 0.72, 0.12, 0, 0, -0.28);
  // おおきな あたま(よこ長・えの ように)
  part(g, W, 0, 2.25, 0, 1.7, 1.05, 0.66);
  // さんかくの みみ(よこ長あたまの りょうはじ)
  const el = new THREE.Mesh(earGeo, mat(W)); el.position.set(-0.88, 2.98, 0); el.rotation.z = 0.24; el.castShadow = true; g.add(el);
  const er = new THREE.Mesh(earGeo, mat(W)); er.position.set(0.88, 2.98, 0); er.rotation.z = -0.24; er.castShadow = true; g.add(er);
  // たての め ふたつ(はば ひろめ)
  part(g, K, -0.48, 2.3, 0.34, 0.1, 0.34, 0.06);
  part(g, K, 0.48, 2.3, 0.34, 0.1, 0.34, 0.06);
  // ちいさい くち(はな + w)
  part(g, K, 0, 2.08, 0.35, 0.09, 0.09, 0.05);
  part(g, K, -0.11, 1.99, 0.35, 0.13, 0.05, 0.05, 0, 0, 0.55);
  part(g, K, 0.11, 1.99, 0.35, 0.13, 0.05, 0.05, 0, 0, -0.55);
  return g;
}

// ---------- もじばこ【あ】【さ】【ほ】【の】 ----------
const LETTERS = ['チ', 'ョ', 'リ', 'ス'];
function letterTexture(ch) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.fillStyle = '#f0d29a'; c.fillRect(0, 0, 128, 128);
  c.strokeStyle = '#9a6f38'; c.lineWidth = 9; c.strokeRect(5, 5, 118, 118);
  c.fillStyle = '#3a2f26';
  c.font = '900 88px "Hiragino Maru Gothic ProN","Yu Gothic",sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(ch, 64, 72);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
const letterBoxGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
function makeLetterBox(ch) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ map: letterTexture(ch), roughness: 0.85 });
  const box = new THREE.Mesh(letterBoxGeo, m);
  box.position.y = 1.0; box.castShadow = true;
  g.add(box);
  return g;
}

// ---------- 筍(たけのこ)だん ----------
const takenokoGeo = new THREE.ConeGeometry(0.4, 1.3, 7);
takenokoGeo.rotateX(Math.PI / 2);   // とぶ ほうこう(+Z)を さきに
const takenokoBandGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 7).rotateX(Math.PI / 2);
function makeTakenoko() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(takenokoGeo, mat(0xb98a52));
  body.castShadow = true; g.add(body);
  const b1 = new THREE.Mesh(takenokoBandGeo, mat(0x8a6338)); b1.position.z = -0.2; g.add(b1);
  const b2 = new THREE.Mesh(takenokoBandGeo, mat(0x8a6338)); b2.position.z = 0.2; b2.scale.setScalar(0.85); g.add(b2);
  return g;
}
// ヒット エフェクト(ひろがって きえる わ)
const fxGeo = new THREE.SphereGeometry(1, 12, 10);

// ---------- き モデル ----------
const trunkGeo = new THREE.CylinderGeometry(0.45, 0.65, 4, 6);
const folGeo = new THREE.IcosahedronGeometry(3, 0);
function makeTree(seed) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(trunkGeo, mat(0x7a5a38));
  trunk.position.y = 2;
  trunk.castShadow = true;
  g.add(trunk);
  const fol = new THREE.Mesh(folGeo, mat([0x4e9c3f, 0x3e8a48, 0x5aa83a][(Math.abs(seed) | 0) % 3]));
  fol.position.y = 5.4 + jit(seed, 0.8);
  fol.castShadow = true;
  g.add(fol);
  const sc = 0.8 + (jit(seed * 3, 0.5) + 0.5) * 0.9;
  g.scale.set(sc, sc, sc);
  return g;
}

// ---------- くさ タイル(むげんに つづく のはら) ----------
const TILE = 26, TILE_R = 3;
const tiles = new Map();
const bladeGeo = new THREE.ConeGeometry(0.22, 0.7, 3);
bladeGeo.translate(0, 0.35, 0);
const bladeMat = mat(0x559e40);
const flowerGeo = new THREE.SphereGeometry(0.13, 6, 5);
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(),
      _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

function makeTile(i, j) {
  const g = new THREE.Group();
  const n = 110;
  const inst = new THREE.InstancedMesh(bladeGeo, bladeMat, n);
  for (let k = 0; k < n; k++) {
    const sx = jit(i * 731 + j * 37 + k * 3 + 1, 0.5) + 0.5;
    const sz = jit(i * 89 + j * 211 + k * 7 + 2, 0.5) + 0.5;
    _p.set(i * TILE + sx * TILE, 0, j * TILE + sz * TILE);
    _e.set(jit(k, 0.12), jit(k * 5, Math.PI), jit(k * 9, 0.12));
    _q.setFromEuler(_e);
    const sc = 0.7 + (jit(k * 11 + i + j, 0.5) + 0.5) * 0.9;
    _s.set(sc, sc, sc);
    _m4.compose(_p, _q, _s);
    inst.setMatrixAt(k, _m4);
  }
  g.add(inst);
  // はな
  for (let f = 0; f < 5; f++) {
    const fx = jit(i * 55 + j * 66 + f * 13 + 4, 0.5) + 0.5;
    const fz = jit(i * 77 + j * 44 + f * 19 + 5, 0.5) + 0.5;
    const fl = new THREE.Mesh(flowerGeo,
      mat([0xfff3b0, 0xffd9e8, 0xffffff][f % 3]));
    fl.position.set(i * TILE + fx * TILE, 0.22, j * TILE + fz * TILE);
    g.add(fl);
  }
  // き(タイルごとに かくりつで 1ぽん)
  if (jit(i * 13 + j * 17 + 6, 0.5) + 0.5 > 0.5) {
    const tree = makeTree(i * 31 + j * 47);
    tree.position.set(
      i * TILE + (jit(i * 3 + j * 5 + 7, 0.5) + 0.5) * TILE,
      0,
      j * TILE + (jit(i * 9 + j * 2 + 8, 0.5) + 0.5) * TILE);
    tree.userData.isTree = true;
    g.add(tree);
  }
  scene.add(g);
  return g;
}
function updateTiles() {
  const ci = Math.floor(panda.pos.x / TILE), cj = Math.floor(panda.pos.z / TILE);
  const need = new Set();
  for (let i = ci - TILE_R; i <= ci + TILE_R; i++) {
    for (let j = cj - TILE_R; j <= cj + TILE_R; j++) need.add(i + '_' + j);
  }
  for (const key of need) {
    if (!tiles.has(key)) {
      const [i, j] = key.split('_').map(Number);
      tiles.set(key, makeTile(i, j));
    }
  }
  for (const [key, g] of tiles) {
    if (!need.has(key)) { scene.remove(g); tiles.delete(key); }
  }
}

// ---------- おじパン(3D ローポリ モデル / まえ = +Z) ----------
const P_WHITE = 0xf5f2e8; // かみの しろ
const P_INK = 0x3a332c;   // クレヨンの くろ
const pandaRefs = {};
function makePandaModel(refs) {
  const g = new THREE.Group();
  // しろい からだ(おなか)
  part(g, P_WHITE, 0, 0.62, 0, 0.75, 0.6, 0.55);
  // くろい マフラー(かたの おび)
  part(g, P_INK, 0, 0.97, 0, 0.82, 0.22, 0.62);
  // くろい うで(だらんと たれる)
  refs.armL = part(g, P_INK, -0.46, 0.7, 0, 0.18, 0.52, 0.22);
  refs.armR = part(g, P_INK, 0.46, 0.7, 0, 0.18, 0.52, 0.22);
  // しろい あし(あしぶみ よう)
  refs.legL = part(g, P_WHITE, -0.18, 0.18, 0, 0.22, 0.36, 0.26);
  refs.legR = part(g, P_WHITE, 0.18, 0.18, 0, 0.22, 0.36, 0.26);
  // あたま
  part(g, P_WHITE, 0, 1.42, 0.03, 0.64, 0.56, 0.52);
  // みみ
  part(g, P_INK, -0.23, 1.74, 0, 0.17, 0.16, 0.14);
  part(g, P_INK, 0.23, 1.74, 0, 0.17, 0.16, 0.14);
  // たれめ もよう(かおの まえがわ だけに つく → うしろから みると せなか)
  part(g, P_INK, -0.16, 1.47, 0.28, 0.2, 0.3, 0.06, 0, 0, -0.35);
  part(g, P_INK, 0.16, 1.47, 0.28, 0.2, 0.3, 0.06, 0, 0, 0.35);
  // 「大」の じの はなすじ(くちは ／\ のむき)
  part(g, P_INK, 0, 1.31, 0.29, 0.07, 0.24, 0.05);
  part(g, P_INK, -0.09, 1.2, 0.29, 0.07, 0.2, 0.05, 0, 0, -0.55);
  part(g, P_INK, 0.09, 1.2, 0.29, 0.07, 0.2, 0.05, 0, 0, 0.55);
  return g;
}
const pandaG = makePandaModel(pandaRefs);
scene.add(pandaG);
let pandaYaw = 0, walkT = 0, pandaMoving = false;

// まるい かげ(ブロブシャドウ)
const blobShadowGeo = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2);
const pandaShadow = new THREE.Mesh(blobShadowGeo,
  new THREE.MeshBasicMaterial({ color: 0x1e3c14, transparent: true, opacity: 0.3 }));
scene.add(pandaShadow);

// あぶない どうぶつの あかい わっか
const ringGeo = new THREE.RingGeometry(1.05, 1.3, 32).rotateX(-Math.PI / 2);
const ringMat = new THREE.MeshBasicMaterial({
  color: 0xff4030, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
});

// ---------- ゲームじょうたい ----------
let state = 'title';
let score = 0, best = 0;
let elapsed = 0, spawnTimer = 0, invincible = 0, deadAnim = 0, shake = 0;
let darumaT = 0;   // だるま へんしん の のこりびょうすう
let lastScore = 0; // ゲームオーバーじの スコア(きょうゆうよう)
let beerGiantT = 0, preBeerR = 0;   // ビール 超特大化 の のこりびょうと もどるサイズ
let collected = [];                 // あつめた もじ
let hasWeapon = false;              // 筍 はっしゃ できるか
let boss = null;                    // ぴょんすけ ボス
let nextBossScore = 50000;          // つぎに ボスが でる スコア
let bossCount = 0;                  // これまでに でた ボスの かず(たいりょく ぞうか よう)
let shots = [], fxList = [];        // 筍だん・ヒットエフェクト
let fireCd = 0;                     // 筍 クールダウン
let testMode = false;               // テストモード
let testInvincible = false;         // テスト: ずっと むてき
let items = [];
let floats = [];
const flashEl = document.getElementById('flash');
const cryEl = document.getElementById('cry');
const panda = { pos: new THREE.Vector3(0, 0, 0), target: new THREE.Vector3(0, 0, 0), r: PANDA_START_R };
try { best = parseInt(localStorage.getItem('ojipan-best-3d') || '0', 10) || 0; } catch (e) {}

const scoreEl = document.getElementById('score');
const rankEl = document.getElementById('rank');
const bestHudEl = document.getElementById('bestHud');
const floatsEl = document.getElementById('floats');
bestHudEl.textContent = best;

function pandaRank() {
  let n = 0;
  for (const t of TIERS) if (panda.r >= t.r) n++;
  return n;
}

function clearItems() {
  for (const it of items) scene.remove(it.obj);
  items = [];
  for (const f of floats) f.el.remove();
  floats = [];
}

function reset() {
  clearItems();
  panda.pos.set(0, 0, 0);
  panda.target.set(0, 0, 0);
  panda.r = PANDA_START_R;
  pandaYaw = 0;   // さいしょは カメラの ほうを むいて とうじょう
  walkT = 0;
  pandaMoving = false;
  pandaG.rotation.set(0, pandaYaw, 0);
  score = 0; elapsed = 0; spawnTimer = 0;
  invincible = 1.2; deadAnim = 0; shake = 0;
  darumaT = 0;
  darumaG.visible = false;
  pandaG.visible = true;
  beerGiantT = 0; preBeerR = 0;
  renderer.domElement.classList.remove('drunk');
  cryEl.classList.remove('small');
  // ボス・もじ・筍 リセット
  collected = []; hasWeapon = false; nextBossScore = 50000; fireCd = 0; bossCount = 0;
  if (boss) { scene.remove(boss.obj); scene.remove(boss.sh); boss = null; }
  for (const s of shots) scene.remove(s.obj); shots = [];
  for (const f of fxList) scene.remove(f.m); fxList = [];
  updateLetterHUD();
  scoreEl.textContent = '0';
  rankEl.textContent = RANK_NAMES[0];
  camera.position.set(0, 16, 20).add(panda.pos);
  camera.lookAt(panda.pos.x, 1.5, panda.pos.z);
}

// ---------- スポーン ----------
function spawn() {
  const isBamboo = Math.random() < 0.52;
  const ang = Math.random() * 6.283;
  const R = 42;
  const px = panda.pos.x + Math.cos(ang) * R;
  const pz = panda.pos.z + Math.sin(ang) * R;
  const speedBase = 5.5 + Math.min(elapsed, 120) * 0.06 + Math.random() * 4;
  // おじパンの ちかくを めがけて よこぎる
  const tx = panda.pos.x + jit(elapsed * 7 + 1, 12);
  const tz = panda.pos.z + jit(elapsed * 13 + 2, 12);
  const dir = new THREE.Vector3(tx - px, 0, tz - pz).normalize();

  if (isBamboo) {
    const obj = makeBamboo();
    obj.position.set(px, 0, pz);
    scene.add(obj);
    items.push({
      kind: 'bamboo', r: 1.6, obj,
      vel: dir.multiplyScalar(speedBase * 0.45),
      knocked: false, ph: Math.random() * 6.28,
    });
  } else {
    const rank = Math.max(1, pandaRank());
    let tier = rank - 4 + Math.floor(Math.random() * 7);
    tier = Math.max(0, Math.min(TIERS.length - 1, tier));
    const t = TIERS[tier];
    const obj = makeAnimal(tier);
    obj.scale.setScalar(t.r * 1.05);
    obj.position.set(px, 0, pz);
    scene.add(obj);
    // かげ と きけんわっか
    const sh = new THREE.Mesh(blobShadowGeo,
      new THREE.MeshBasicMaterial({ color: 0x1e3c14, transparent: true, opacity: 0.25 }));
    sh.scale.setScalar(t.r * 0.7);
    sh.position.y = 0.02;
    obj.add(sh);
    sh.scale.divideScalar(t.r * 1.05); // おやの スケールを そうさい
    const ring = new THREE.Mesh(ringGeo, ringMat.clone());
    ring.position.y = 0.04 / (t.r * 1.05);
    ring.scale.setScalar(1 / 1.05);
    ring.visible = false;
    obj.add(ring);
    items.push({
      kind: 'animal', tier, r: t.r, obj, ring,
      vel: dir.multiplyScalar(speedBase * (1 - tier * 0.04)),
      knocked: false, spin: 0, vy: 0, ph: Math.random() * 6.28,
    });
  }
}

// おとうさん を じめんから せりあげる
function spawnOtousan() {
  const ang = Math.random() * 6.283;
  const R = 15 + Math.random() * 9;
  const px = panda.pos.x + Math.cos(ang) * R;
  const pz = panda.pos.z + Math.sin(ang) * R;
  const obj = makeOtousan();
  obj.position.set(px, 0, pz);
  obj.scale.setScalar(0.01);
  scene.add(obj);
  items.push({
    kind: 'otousan', r: 5.75, size: 2.5, obj, vel: new THREE.Vector3(),
    knocked: false, pop: 0, ph: 0,
  });
}

// だるまおじパン を くさはらに だす(ゆっくり ただよう)
function spawnDaruma() {
  const ang = Math.random() * 6.283;
  const R = 42;
  const px = panda.pos.x + Math.cos(ang) * R;
  const pz = panda.pos.z + Math.sin(ang) * R;
  const tx = panda.pos.x + jit(elapsed * 3 + 5, 12);
  const tz = panda.pos.z + jit(elapsed * 11 + 6, 12);
  const dir = new THREE.Vector3(tx - px, 0, tz - pz).normalize();
  const obj = makeDaruma();
  obj.position.set(px, 0, pz);
  scene.add(obj);
  items.push({
    kind: 'daruma', r: 2.0, obj,
    vel: dir.multiplyScalar(4 + Math.random() * 2),
    knocked: false, ph: Math.random() * 6.28,
  });
}

// おじパンビール を くさはらに だす(ゆっくり ただよう・かなりレア)
function spawnBeer() {
  const ang = Math.random() * 6.283, R = 42;
  const px = panda.pos.x + Math.cos(ang) * R, pz = panda.pos.z + Math.sin(ang) * R;
  const tx = panda.pos.x + jit(elapsed * 5 + 9, 12), tz = panda.pos.z + jit(elapsed * 7 + 8, 12);
  const dir = new THREE.Vector3(tx - px, 0, tz - pz).normalize();
  const obj = makeBeer();
  obj.position.set(px, 0, pz);
  scene.add(obj);
  items.push({
    kind: 'beer', r: 1.1, obj,
    vel: dir.multiplyScalar(3.5 + Math.random() * 2),
    knocked: false, ph: Math.random() * 6.28,
  });
}

// ビールを のんだ: がめんじゅうの どうぶつ・木を ぜんぶ ささにして すいこむ
function applyBeer() {
  sDrink();
  shake = 0.4;
  // ゆっくり がめんが ゆがむ(よっぱらい)
  const cvEl = renderer.domElement;
  cvEl.classList.remove('drunk'); void cvEl.offsetWidth; cvEl.classList.add('drunk');
  setTimeout(() => cvEl.classList.remove('drunk'), 4600);
  // もじ
  cryEl.classList.add('small');
  cryEl.textContent = 'あれ？これぜんぶ竹か？たべちゃおー';
  cryEl.classList.remove('cryAnim'); void cryEl.offsetWidth; cryEl.classList.add('cryAnim');
  // せいちょうの じょうげん: キングおじパンの ときだけ 超えて 超特大化(あとで もどる)
  if (panda.r >= PANDA_MAX_R - 0.05) {
    beerGiantT = 12; preBeerR = PANDA_MAX_R;
  } else {
    beerGiantT = 0; preBeerR = 0;   // ふつうは キングまで(たべた ぶん のこる)
  }
  // どうぶつ・ささ を ささ にして、じゅんばんに すいこみ(木は たいしょうがい)
  let count = 0;
  for (const it of items) {
    if (it.dead || it.suck) continue;
    if (it.kind === 'animal' || it.kind === 'bamboo') {
      scene.remove(it.obj);
      const b = makeBamboo();
      b.position.copy(it.obj.position); b.position.y = 0;
      scene.add(b);
      it.obj = b; it.kind = 'suckbamboo'; it.suck = true; it.knocked = false; it.ring = null;
      it.suckDelay = count * 0.22;   // ひとつずつ ゆっくり すいこむ
      count++;
    }
  }
  addScore(0, panda.pos.clone().add(new THREE.Vector3(0, panda.r + 3, 0)), count + 'こ たべちゃおー!');
}

// てきを ふきとばす(たいあたり・筍 きょうつう)
function knockAnimal(it) {
  it.knocked = true;
  if (it.ring) it.ring.visible = false;
  const away = it.obj.position.clone().sub(panda.pos); away.y = 0;
  if (away.lengthSq() < 0.01) away.set(1, 0, 0);
  away.normalize();
  it.vel.copy(away).multiplyScalar(25 + panda.r * 3);
  it.vy = 12 + Math.random() * 5;
  it.spin = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6);
  const pts = (it.tier + 1) * 30;
  addScore(pts, it.obj.position, '+' + pts + ' ドーン!');
  shake = 0.5; sKnock();
}

function updateLetterHUD() {
  const el = document.getElementById('letters');
  for (const sp of el.children) {
    const got = collected.includes(sp.dataset.l);
    sp.classList.toggle('got', got);
    sp.textContent = got ? sp.dataset.l : '';   // あつめて はじめて もじが みえる
  }
}

// もじばこ を くさはらに だす(4もじ から ランダム・ダブりも でる)
function spawnLetterBox() {
  const ch = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const ang = Math.random() * 6.283, R = 40;
  const px = panda.pos.x + Math.cos(ang) * R, pz = panda.pos.z + Math.sin(ang) * R;
  const tx = panda.pos.x + jit(elapsed * 3 + ch.charCodeAt(0), 12);
  const tz = panda.pos.z + jit(elapsed * 7 + 3, 12);
  const dir = new THREE.Vector3(tx - px, 0, tz - pz).normalize();
  const obj = makeLetterBox(ch);
  obj.position.set(px, 0, pz); scene.add(obj);
  items.push({ kind: 'letterbox', letter: ch, r: 1.3, obj, vel: dir.multiplyScalar(3 + Math.random() * 2), knocked: false, ph: Math.random() * 6.28 });
}

// ボス ぴょんすけ を だす
function spawnBoss() {
  if (boss) return;
  const ang = Math.random() * 6.283, R = 34;
  const obj = makePyonsuke();
  obj.scale.setScalar(3.4);
  obj.position.set(panda.pos.x + Math.cos(ang) * R, 0, panda.pos.z + Math.sin(ang) * R);
  scene.add(obj);
  const sh = new THREE.Mesh(blobShadowGeo,
    new THREE.MeshBasicMaterial({ color: 0x1e3c14, transparent: true, opacity: 0.28 }));
  sh.scale.setScalar(6.5); sh.position.y = 0.05; scene.add(sh);
  const hp = 10 + 5 * bossCount;   // 1たいめ10、2たいめ15、3たいめ20…
  bossCount++;
  boss = { obj, sh, hp, r: 6.5, flash: 0 };
  document.getElementById('bossbar').style.display = 'block';
  document.getElementById('bossHp').textContent = hp;
  document.getElementById('bossHpMax').textContent = hp;
  // とうじょう えんしゅつ: あかい フラッシュ + おおゆれ + ちょうせんじょう
  cryEl.classList.add('small');
  cryEl.textContent = 'ぴょんすけが ちょうせん してきたぞ！';
  cryEl.classList.remove('cryAnim'); void cryEl.offsetWidth; cryEl.classList.add('cryAnim');
  flashEl.style.background = '#e0402a';
  flashEl.style.transition = 'none'; flashEl.style.opacity = '0.6';
  requestAnimationFrame(() => { flashEl.style.transition = 'opacity 1s ease-out'; flashEl.style.opacity = '0'; });
  shake = 1.5; sBoss();
}

function defeatBoss() {
  const p = boss.obj.position.clone();
  for (let i = 0; i < 10; i++) {
    hitFx(p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 9, Math.random() * 9, (Math.random() - 0.5) * 9)), 0xffe23a);
  }
  scene.remove(boss.obj); scene.remove(boss.sh);
  boss = null;
  nextBossScore += 50000;
  document.getElementById('bossbar').style.display = 'none';
  score += 5000;
  addScore(0, p.clone().add(new THREE.Vector3(0, 7, 0)), 'ぴょんすけ げきは! +5000');
  cryEl.classList.add('small'); cryEl.textContent = 'ぴょんすけ げきは！';
  cryEl.classList.remove('cryAnim'); void cryEl.offsetWidth; cryEl.classList.add('cryAnim');
  sBomb(); shake = 1.0;
}

// 筍 を じどう はっしゃ(おじパンが むいている=すすんでいる ほうこうへ)
function fireTakenoko() {
  if (!hasWeapon || fireCd > 0) return;
  fireCd = 0.55;
  const dir = new THREE.Vector3(Math.sin(pandaYaw), 0, Math.cos(pandaYaw));
  if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
  dir.normalize();
  const obj = makeTakenoko();
  obj.position.copy(panda.pos); obj.position.y = panda.r * 0.6 + 0.6;
  obj.lookAt(obj.position.clone().add(dir));
  scene.add(obj);
  shots.push({ obj, vel: dir.clone().multiplyScalar(42), life: 2.3 });
  beep(720, 320, 0.1, 'square', 0.045);
}

function hitFx(pos, color) {
  const m = new THREE.Mesh(fxGeo, new THREE.MeshBasicMaterial({ color: color || 0xffe23a, transparent: true, opacity: 0.9 }));
  m.position.copy(pos); scene.add(m);
  fxList.push({ m, life: 0.35, max: 0.35 });
}

function updateBoss(dt, t) {
  if (!boss) return;
  const b = boss;
  // よくよう つき ついかけ(しゅうき ~4.5びょう で はやく/おそく)
  const mult = 0.35 + 1.2 * Math.pow(0.5 + 0.5 * Math.sin(t * 1.4), 2);
  _v3.copy(panda.pos).sub(b.obj.position); _v3.y = 0;
  const d = _v3.length();
  if (d > b.r * 0.5) {
    _v3.normalize();
    b.obj.position.addScaledVector(_v3, 6.0 * mult * dt);
    b.obj.rotation.y = Math.atan2(_v3.x, _v3.z);
  }
  b.obj.position.y = Math.abs(Math.sin(t * 3)) * 0.35;   // ぴょんぴょん
  b.sh.position.set(b.obj.position.x, 0.05, b.obj.position.z);
  if (b.flash > 0) { b.flash -= dt; b.obj.scale.setScalar(3.4 * (1 + Math.max(0, b.flash) * 0.5)); }
  else b.obj.scale.setScalar(3.4);
  if (state === 'play') {
    _v3.copy(b.obj.position).sub(panda.pos); _v3.y = 0;
    if (_v3.length() < (panda.r + b.r) * 0.55 && panda.r < b.r && invincible <= 0 && darumaT <= 0) {
      gameOver();
    }
  }
}

function updateShots(dt) {
  for (const s of shots) {
    s.obj.position.addScaledVector(s.vel, dt);
    s.obj.rotateZ(dt * 8);
    s.life -= dt;
    if (boss && s.obj.position.distanceTo(boss.obj.position) < boss.r * 0.75) {
      s.life = 0; boss.hp--; boss.flash = 0.2;
      hitFx(s.obj.position, 0xffe23a);
      beep(200, 90, 0.15, 'square', 0.09); shake = 0.3;
      document.getElementById('bossHp').textContent = Math.max(0, boss.hp);
      if (boss.hp <= 0) { defeatBoss(); }
      continue;
    }
    for (const it of items) {
      if (it.kind !== 'animal' || it.knocked || it.dead) continue;
      if (s.obj.position.distanceTo(it.obj.position) < it.r + 0.5) {
        s.life = 0; hitFx(s.obj.position, 0xff8030);
        if (it.ring && it.ring.visible) {
          it.ringHits = (it.ringHits || 0) + 1;
          if (it.ringHits >= 2) {
            it.tamed = true; it.ring.visible = false;   // 2かいで わっか はずれる → たいあたりOK
          } else {
            it.ring.material.color.setHex(0xff9020);    // 1かいめ: オレンジで「あと1かい」
          }
          beep(400, 200, 0.12, 'square', 0.06);
        } else {
          knockAnimal(it);
        }
        break;
      }
    }
  }
  for (const s of shots) {
    if (s.life <= 0 || s.obj.position.distanceTo(panda.pos) > 90) { scene.remove(s.obj); s.remove = true; }
  }
  shots = shots.filter(s => !s.remove);
}

function updateFx(dt) {
  for (const f of fxList) {
    f.life -= dt;
    const k = 1 - Math.max(0, f.life) / f.max;
    f.m.scale.setScalar(0.5 + k * 5);
    f.m.material.opacity = Math.max(0, f.life / f.max) * 0.9;
  }
  for (const f of fxList) if (f.life <= 0) scene.remove(f.m);
  fxList = fxList.filter(f => f.life > 0);
}

// おとうさぁーん!ボム: がめんを ひからせ、まわりの てきを いっそう
function bomb() {
  sBomb();
  shake = 1.3;
  // しろく フラッシュ
  flashEl.style.transition = 'none';
  flashEl.style.opacity = '0.95';
  requestAnimationFrame(() => {
    flashEl.style.transition = 'opacity 0.85s ease-out';
    flashEl.style.opacity = '0';
  });
  // 「おとうさぁーん!」の もじ
  cryEl.textContent = 'おとうさぁーん!';
  cryEl.classList.remove('small');
  flashEl.style.background = '#fff';   // ボムは しろ フラッシュ
  cryEl.classList.remove('cryAnim');
  void cryEl.offsetWidth;   // アニメーション さいせい
  cryEl.classList.add('cryAnim');
  // てきを ふきとばす(たおした ぶんの ポイントも はいる)
  let combo = 0, gain = 0;
  for (const it of items) {
    if (it.kind === 'animal' && !it.knocked) {
      it.knocked = true;
      if (it.ring) it.ring.visible = false;
      _v3.copy(it.obj.position).sub(panda.pos); _v3.y = 0;
      if (_v3.lengthSq() < 0.01) _v3.set(Math.random() - 0.5, 0, Math.random() - 0.5);
      _v3.normalize();
      it.vel.copy(_v3).multiplyScalar(42 + Math.random() * 22);
      it.vy = 17 + Math.random() * 9;
      it.spin = (Math.random() < 0.5 ? -1 : 1) * (9 + Math.random() * 8);
      gain += (it.tier + 1) * 30;
      combo++;
    }
  }
  score += gain;
  const head = panda.pos.clone().add(new THREE.Vector3(0, panda.r + 3, 0));
  if (combo > 0) addScore(0, head, combo + 'ひき ドカーン! +' + gain);
  else addScore(0, head, 'おとうさぁーん!');
  // ぴょんすけが いるときは ボスに 3ダメージ
  if (boss) {
    boss.hp -= 3;
    boss.flash = 0.3;
    hitFx(boss.obj.position, 0xffe23a);
    hitFx(boss.obj.position.clone().add(new THREE.Vector3(0, 4, 0)), 0xffe23a);
    document.getElementById('bossHp').textContent = Math.max(0, boss.hp);
    addScore(0, boss.obj.position.clone().add(new THREE.Vector3(0, 8, 0)), 'おとうさんパンチ! -3');
    if (boss.hp <= 0) defeatBoss();
  }
}

// ---------- スコア ひょうじ ----------
function addScore(pts, pos, txt) {
  score += pts;
  const el = document.createElement('div');
  el.className = 'ft';
  el.textContent = txt;
  floatsEl.appendChild(el);
  floats.push({ el, pos: pos.clone().add(new THREE.Vector3(0, 2, 0)), life: 0.9 });
}
const _v3 = new THREE.Vector3();
function updateFloats(dt) {
  for (const f of floats) {
    f.life -= dt;
    f.pos.y += 3 * dt;
    _v3.copy(f.pos).project(camera);
    f.el.style.left = ((_v3.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    f.el.style.top = ((-_v3.y * 0.5 + 0.5) * window.innerHeight) + 'px';
    f.el.style.opacity = Math.min(1, f.life * 2);
    if (f.life <= 0) f.el.remove();
  }
  floats = floats.filter(f => f.life > 0);
}

function gameOver() {
  if (testInvincible) return;   // テスト: ずっと むてき
  state = 'over';
  sOver();
  shake = 0.8;
  document.getElementById('pauseBtn').style.display = 'none';
  document.getElementById('letters').style.display = 'none';
  document.getElementById('bossbar').style.display = 'none';
  document.getElementById('fireBtn').style.display = 'none';
  document.getElementById('testPanel').style.display = 'none';
  const fs = Math.floor(score);
  lastScore = fs;
  let isBest = false;
  if (fs > best) { best = fs; isBest = true; }
  try { localStorage.setItem('ojipan-best-3d', String(best)); } catch (e) {}
  bestHudEl.textContent = best;
  setTimeout(() => {
    document.getElementById('overScore').textContent = fs;
    document.getElementById('bestOver').textContent = best;
    document.getElementById('newBest').textContent = isBest ? '🎉 しんきろく!' : '';
    document.getElementById('overScreen').classList.remove('hidden');
  }, 900);
}

// ---------- こうしん ----------
function update(dt, t) {
  if (state === 'play') {
    elapsed += dt;
    invincible = Math.max(0, invincible - dt);
    score += dt * 2;

    spawnTimer -= dt;
    const interval = Math.max(0.3, 1.1 - elapsed * 0.003 - pandaRank() * 0.05);
    if (spawnTimer <= 0) { spawn(); spawnTimer = interval; }

    // おとうさん(かくりつ ランダム・へいきん 60びょうに 1たい・どうじに 1たいまで・なんども でる)
    if (Math.random() < dt / 60 && !items.some(it => it.kind === 'otousan' && !it.dead)) {
      spawnOtousan();
    }
    // だるまおじパン(かくりつ ランダム・へいきん 100びょうに 1たい・どうじに 1たいまで)
    if (Math.random() < dt / 100 && !items.some(it => it.kind === 'daruma' && !it.dead)) {
      spawnDaruma();
    }
    // おじパンビール(かくりつ ランダム・へいきん 180びょうに 1たい・かなりレア)
    if (Math.random() < dt / 180 && !items.some(it => it.kind === 'beer' && !it.dead)) {
      spawnBeer();
    }
    darumaT = Math.max(0, darumaT - dt);
    // ビール 超特大化 → じかんで もとの おおきさに もどる
    if (beerGiantT > 0) {
      beerGiantT = Math.max(0, beerGiantT - dt);
    } else if (preBeerR > 0 && panda.r > preBeerR) {
      panda.r += (preBeerR - panda.r) * Math.min(1, dt * 1.2);
      if (panda.r - preBeerR < 0.03) {
        panda.r = preBeerR; preBeerR = 0;
        rankEl.textContent = RANK_NAMES[Math.min(RANK_NAMES.length - 1,
          Math.floor((panda.r - PANDA_START_R) / (PANDA_MAX_R - PANDA_START_R) * RANK_NAMES.length))];
      }
    }

    // おじパン いどう
    _v3.copy(panda.target).sub(panda.pos);
    _v3.y = 0;
    const d = _v3.length();
    pandaMoving = d > 0.3;
    if (pandaMoving) {
      const sp = Math.min(d * 4, 8 + panda.r * 0.8);
      _v3.normalize();
      panda.pos.addScaledVector(_v3, sp * dt);
      // すすむ ほうこうへ なめらかに ふりむく(おくへ あるけば せなかが みえる)
      const targetYaw = Math.atan2(_v3.x, _v3.z);
      let dy = targetYaw - pandaYaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      pandaYaw += dy * Math.min(1, dt * 10);
      walkT += dt * (6 + sp * 0.7);
    }
  } else if (state === 'over') {
    deadAnim += dt;
  }

  // おじパン びょうが
  pandaG.position.copy(panda.pos);
  pandaG.scale.setScalar(panda.r * 0.72);
  pandaG.rotation.y = pandaYaw;
  if (state === 'over') {
    // ばたっと たおれる
    pandaG.rotation.z = Math.min(deadAnim * 2.5, 1.45);
  } else {
    pandaG.rotation.z = 0;
  }
  // あしぶみ アニメーション(とまっている ときも ちいさく あしぶみ)
  const step = state === 'play'
    ? Math.sin(pandaMoving ? walkT : t * 4) * (pandaMoving ? 1 : 0.35)
    : 0;
  pandaRefs.legL.position.y = 0.18 + Math.max(0, step) * 0.16;
  pandaRefs.legR.position.y = 0.18 + Math.max(0, -step) * 0.16;
  pandaRefs.armL.rotation.x = step * 0.55;
  pandaRefs.armR.rotation.x = -step * 0.55;
  pandaG.position.y = Math.abs(step) * panda.r * 0.02;
  pandaShadow.position.set(panda.pos.x, 0.03, panda.pos.z);
  pandaShadow.scale.setScalar(panda.r * 0.75);

  // だるま へんしん ちゅうは だるますがたに いれかえ
  const useDaruma = darumaT > 0 && state === 'play';
  pandaG.visible = !useDaruma;
  darumaG.visible = useDaruma;
  if (useDaruma) {
    darumaG.position.set(panda.pos.x, pandaG.position.y, panda.pos.z);
    darumaG.scale.setScalar(panda.r * 0.72);
    darumaG.rotation.set(0, pandaYaw, Math.sin(walkT) * 0.09);
  }

  // アイテム
  const myRank = pandaRank();
  for (const it of items) {
    // ビールで ささになった もの: じゅんばんに おじパンに すいこまれて たべられる
    if (it.suck) {
      if (it.suckDelay > 0) {   // じゅんばん まちで ふわふわ うかぶ
        it.suckDelay -= dt;
        it.obj.position.y = 0.4 + Math.sin(t * 3 + it.ph) * 0.2;
        it.obj.rotation.y += dt * 1.5;
        continue;
      }
      const dx = panda.pos.x - it.obj.position.x, dz = panda.pos.z - it.obj.position.z;
      const dd = Math.hypot(dx, dz) || 0.001;
      if (dd < panda.r * 0.85 + 0.6) {
        it.dead = true;
        // たべた ぶんだけ せいちょう(じょうげん とっぱは キングの ときだけ)
        panda.r = Math.min(beerGiantT > 0 ? GIANT_MAX : PANDA_MAX_R, panda.r + 0.06);
        score += 50;
        sEat();
        rankEl.textContent = RANK_NAMES[Math.min(RANK_NAMES.length - 1,
          Math.floor((panda.r - PANDA_START_R) / (PANDA_MAX_R - PANDA_START_R) * RANK_NAMES.length))];
      } else {
        const sp = Math.max(7, dd * 2.2);   // ゆっくり すいよせ
        it.obj.position.x += dx / dd * sp * dt;
        it.obj.position.z += dz / dd * sp * dt;
        it.obj.position.y = 0.4 + Math.sin(t * 5 + it.ph) * 0.2;
        it.obj.rotation.y += dt * 5;
      }
      continue;
    }
    if (it.knocked) {
      if (it.kind === 'animal') {
        it.vy -= 30 * dt;
        it.obj.position.y += it.vy * dt;
        it.obj.position.addScaledVector(it.vel, dt);
        it.obj.rotation.z += it.spin * dt;
        it.obj.rotation.x += it.spin * 0.6 * dt;
        if (it.obj.position.y < -20) it.dead = true;
      } else {
        it.eatT -= dt;
        it.obj.scale.multiplyScalar(Math.max(0.0001, 1 - dt * 6));
        it.obj.position.y += 3 * dt;
        if (it.eatT <= 0) it.dead = true;
      }
      continue;
    }
    it.obj.position.addScaledVector(it.vel, dt);
    if (it.kind === 'animal') {
      // すすむ ほうこうを むく + ぴょこぴょこ
      it.obj.rotation.y = Math.atan2(it.vel.x, it.vel.z);
      it.obj.position.y = Math.abs(Math.sin(t * 5 + it.ph)) * it.r * 0.1;
      it.ring.visible = state === 'play' && it.tier >= myRank && !it.tamed;
      if (it.ring.visible) {
        const pulse = 1 + Math.sin(t * 6.6) * 0.08;
        it.ring.scale.setScalar(pulse / 1.05);
      }
    } else if (it.kind === 'otousan') {
      // じめんから ぽこっと せりあがって、ゆらゆら
      it.pop = Math.min(1, it.pop + dt * 2.4);
      it.obj.scale.setScalar(it.size * it.pop * (1 + Math.sin(t * 3) * 0.02));
      it.obj.rotation.y = Math.sin(t * 1.2) * 0.25;
    } else if (it.kind === 'daruma') {
      // すすむ ほうこうを むいて、だるまらしく ゆらゆら
      it.obj.rotation.y = Math.atan2(it.vel.x, it.vel.z);
      it.obj.position.y = Math.abs(Math.sin(t * 4 + it.ph)) * 0.15;
      it.obj.rotation.z = Math.sin(t * 3 + it.ph) * 0.13;
    } else if (it.kind === 'beer') {
      // かんが くるくる まわりながら ただよう
      it.obj.rotation.y += dt * 1.6;
      it.obj.position.y = Math.abs(Math.sin(t * 3 + it.ph)) * 0.2;
    } else if (it.kind === 'letterbox') {
      it.obj.rotation.y += dt * 1.2;
      it.obj.position.y = 0.2 + Math.abs(Math.sin(t * 3 + it.ph)) * 0.3;
    } else {
      it.obj.rotation.z = Math.sin(t * 2 + it.ph) * 0.05;
    }
    // とおくに いったら さようなら
    if (it.obj.position.distanceTo(panda.pos) > 70) it.dead = true;

    // あたりはんてい
    if (state === 'play') {
      _v3.copy(it.obj.position).sub(panda.pos);
      _v3.y = 0;
      if (_v3.length() < (panda.r + it.r) * 0.6) {
        if (it.kind === 'otousan') {
          it.dead = true;
          bomb();
        } else if (it.kind === 'beer') {
          it.dead = true;
          beerPending = true;   // ループの あとで はつどう(いてれーと ちゅうの ついか かいひ)
        } else if (it.kind === 'daruma') {
          it.dead = true;
          darumaT = 15;
          invincible = 15;
          shake = 0.4;
          sPower();
          addScore(0, it.obj.position, 'へんしん! 15びょう むてき!');
        } else if (it.kind === 'bamboo') {
          it.knocked = true;
          it.eatT = 0.25;
          const grow = 0.022 + 0.048 * (PANDA_MAX_R - panda.r) / (PANDA_MAX_R - PANDA_START_R);
          panda.r = Math.min(PANDA_MAX_R, panda.r + grow);
          addScore(10, it.obj.position, '+10 もぐもぐ!');
          sEat();
          const gi = Math.min(RANK_NAMES.length - 1,
            Math.floor((panda.r - PANDA_START_R) / (PANDA_MAX_R - PANDA_START_R) * RANK_NAMES.length));
          rankEl.textContent = RANK_NAMES[gi];
        } else if (it.kind === 'letterbox') {
          it.dead = true;
          if (collected.includes(it.letter)) {
            // ダブり → ボーナス +300
            addScore(300, it.obj.position, '「' + it.letter + '」ダブり +300!');
            beep(820, 1300, 0.16, 'square', 0.06);
          } else {
            collected.push(it.letter);
            updateLetterHUD();
            addScore(30, it.obj.position, '「' + it.letter + '」ゲット!');
            beep(600, 1000, 0.15, 'square', 0.06);
            if (collected.length >= LETTERS.length && !hasWeapon) {
              hasWeapon = true;
              addScore(0, panda.pos.clone().add(new THREE.Vector3(0, panda.r + 3, 0)), '筍 じどう はっしゃ かいきん!');
            }
          }
        } else if (panda.r >= it.r || darumaT > 0 || it.tamed) {
          // だるまへんしん中 / わっかを はずした てき は おおきくても たおせる
          knockAnimal(it);
        } else if (invincible <= 0) {
          gameOver();
        }
      }
    }
  }
  // ビール はつどう(ループの そとで・アイテムを あんぜんに ついか)
  if (beerPending) { beerPending = false; applyBeer(); }
  for (const it of items) {
    if (it.dead) scene.remove(it.obj);
  }
  items = items.filter(it => !it.dead);

  // もじばこ・ボスの スポーン、筍・ボス・エフェクトの こうしん
  if (state === 'play') {
    fireCd = Math.max(0, fireCd - dt);
    if (hasWeapon && fireCd <= 0) fireTakenoko();   // じどう はっしゃ
    if (Math.random() < dt / 60 && !items.some(it => it.kind === 'letterbox' && !it.dead)) spawnLetterBox();
    if (!boss && Math.floor(score) >= nextBossScore) spawnBoss();
  }
  updateBoss(dt, t);
  updateShots(dt);
  updateFx(dt);

  updateFloats(dt);
  scoreEl.textContent = Math.floor(score);

  // カメラ(おおきくなるほど ひいて うつす)
  const zoom = 1 + (panda.r - PANDA_START_R) / (PANDA_MAX_R - PANDA_START_R) * 1.2;
  _v3.set(panda.pos.x, 10 * zoom, panda.pos.z + 18.5 * zoom);
  camera.position.lerp(_v3, Math.min(1, dt * 3.5));
  shake = Math.max(0, shake - dt * 2);
  if (shake > 0) {
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
  }
  camera.lookAt(panda.pos.x, panda.r * 0.7, panda.pos.z);

  // たいよう と じめんは おじパンに ついてくる
  sun.position.set(panda.pos.x + 30, 55, panda.pos.z + 20);
  sun.target.position.copy(panda.pos);
  ground.position.set(panda.pos.x, 0, panda.pos.z);
  updateTiles();
}

// ---------- メインループ ----------
let last = performance.now();
let paused = false;
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!paused) update(dt, now / 1000);
  if (state === 'title') {
    titlePanda.rotation.y = (now / 1000) * 0.9;
    titleRenderer.render(titleScene, titleCam);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// ---------- そうさ ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pointTo(e) {
  ndc.set(
    (e.clientX / window.innerWidth) * 2 - 1,
    -((e.clientY - 80) / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const t = -raycaster.ray.origin.y / raycaster.ray.direction.y;
  if (t > 0) {
    panda.target.copy(raycaster.ray.origin).addScaledVector(raycaster.ray.direction, t);
  }
}
renderer.domElement.addEventListener('pointerdown', e => {
  initAudio();
  if (state !== 'play' || paused) return;
  pointTo(e);
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', e => {
  if (state !== 'play' || paused) return;
  if (e.pressure > 0 || e.buttons > 0) pointTo(e);
});

// いちじ ていし
const pauseBtn = document.getElementById('pauseBtn');
const pauseScreen = document.getElementById('pauseScreen');
pauseBtn.addEventListener('click', () => {
  if (state !== 'play') return;
  paused = true;
  pauseScreen.classList.remove('hidden');
});
document.getElementById('resumeBtn').addEventListener('click', () => {
  paused = false;
  pauseScreen.classList.add('hidden');
  last = performance.now();   // とまっていた ぶんの dt ジャンプを ふせぐ
});

function start() {
  initAudio();
  reset();
  state = 'play';
  paused = false;
  pauseScreen.classList.add('hidden');
  pauseBtn.style.display = 'block';
  document.getElementById('titleScreen').classList.add('hidden');
  document.getElementById('overScreen').classList.add('hidden');
  document.getElementById('letters').style.display = 'flex';
  updateLetterHUD();
  document.getElementById('fireBtn').style.display = 'none';   // 筍は じどう はっしゃ
  document.getElementById('testPanel').style.display = testMode ? 'flex' : 'none';
  document.getElementById('tInv').textContent = 'むてき: ' + (testInvincible ? 'ON' : 'OFF');
}
document.getElementById('startBtn').addEventListener('click', () => { testMode = false; testInvincible = false; start(); });
document.getElementById('retryBtn').addEventListener('click', start);
document.getElementById('testBtn').addEventListener('click', () => { testMode = true; start(); });

// テストモードは オーナーだけ: URLに #dev、または タイトルの クレジットを 5かい タップで かいじょ(たんまつに きおく)
const testBtnEl = document.getElementById('testBtn');
function revealTest() { testBtnEl.style.display = 'block'; }
// ふるい「ずっと ひょうじ」の きろくを けす(いつも みえる もんだいの たいさく)
try { localStorage.removeItem('ojipan-dev'); } catch (e) {}
// URLが ちょうど #dev / ?dev=1 の ときだけ ひょうじ(あいまい マッチ しない)
let _dp = null; try { _dp = new URLSearchParams(location.search); } catch (e) {}
if (location.hash === '#dev' || (_dp && _dp.get('dev') === '1')) revealTest();
// または クレジットを 5かい タップ → このセッションだけ ひょうじ(リロードで きえる)
let devTaps = 0, devTapTimer = null;
const creditEl = document.querySelector('.credit');
if (creditEl) creditEl.addEventListener('click', () => {
  devTaps++;
  clearTimeout(devTapTimer);
  devTapTimer = setTimeout(() => { devTaps = 0; }, 2000);
  if (devTaps >= 5) { revealTest(); devTaps = 0; }
});

// 筍 はっしゃ ボタン
document.getElementById('fireBtn').addEventListener('click', () => {
  if (state === 'play' && !paused) fireTakenoko();
});

// テストモード パネル
document.getElementById('testPanel').addEventListener('click', (e) => {
  const t = e.target && e.target.dataset ? e.target.dataset.t : null;
  if (!t || state !== 'play') return;
  if (t === 'score') score += 50000;
  else if (t === 'boss') spawnBoss();
  else if (t === 'letters') {
    collected = LETTERS.slice(); updateLetterHUD(); hasWeapon = true;
  }
  else if (t === 'letterbox') spawnLetterBox();
  else if (t === 'king') { panda.r = PANDA_MAX_R; rankEl.textContent = RANK_NAMES[RANK_NAMES.length - 1]; }
  else if (t === 'baby') { panda.r = PANDA_START_R; rankEl.textContent = RANK_NAMES[0]; }
  else if (t === 'invincible') {
    testInvincible = !testInvincible;
    document.getElementById('tInv').textContent = 'むてき: ' + (testInvincible ? 'ON' : 'OFF');
  }
  else if (t === 'beer') spawnBeer();
  else if (t === 'daruma') spawnDaruma();
  else if (t === 'otousan') spawnOtousan();
});

// ---------- スコア がぞう(いまの 3D おじパン + とくてん)を つくる ----------
// スクショよう オフスクリーン レンダラ(いまの おじパンモデルを まえむきで えがく)
let shotRenderer = null, shotScene = null, shotCam = null, shotPanda = null;
function renderPandaShot() {
  if (!shotRenderer) {
    shotRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    shotRenderer.setSize(440, 480, false);
    shotScene = new THREE.Scene();
    shotScene.add(new THREE.HemisphereLight(0xffffff, 0x88aa66, 1.7));
    const sun = new THREE.DirectionalLight(0xfff3d0, 2.1);
    sun.position.set(3, 5, 4); shotScene.add(sun);
    shotCam = new THREE.PerspectiveCamera(38, 440 / 480, 0.1, 50);
    shotCam.position.set(0, 1.55, 4.7);
    shotCam.lookAt(0, 0.95, 0);
    shotPanda = makePandaModel({});
    shotScene.add(shotPanda);
  }
  shotPanda.rotation.set(0, 0, 0);   // まえむき
  shotRenderer.render(shotScene, shotCam);
  return shotRenderer.domElement;
}
function makeScoreImage() {
  const cv = document.createElement('canvas');
  cv.width = 720; cv.height = 720;
  const c = cv.getContext('2d');
  c.fillStyle = '#e6f0d0'; c.fillRect(0, 0, 720, 720);
  c.strokeStyle = '#3a2f26'; c.lineWidth = 14; c.strokeRect(10, 10, 700, 700);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '84px serif';
  c.fillText('🎋', 80, 95); c.fillText('🎋', 640, 95);
  // いまの 3D おじパンを えがく
  try { c.drawImage(renderPandaShot(), 140, 70, 440, 480); } catch (e) {}
  c.font = '900 150px "Hiragino Maru Gothic ProN","Yu Gothic",sans-serif';
  c.lineWidth = 12; c.strokeStyle = '#fff';
  c.strokeText(lastScore + 'てん', 360, 625);
  c.fillStyle = '#e0575b';
  c.fillText(lastScore + 'てん', 360, 625);
  return cv;
}

// スコアを LINEなどで じまんする(スマホの きょうゆうメニュー・がぞうつき)
document.getElementById('shareBtn').addEventListener('click', async () => {
  const url = 'https://hugofukuhara.github.io/ojipan/';
  const text = 'どうだ！みろ この得点を！わたしを超えてみよ！';
  // ① とくてんいり がぞうを つけて きょうゆう(たいおう スマホ)
  try {
    const blob = await new Promise(res => makeScoreImage().toBlob(res, 'image/png'));
    if (blob && navigator.canShare) {
      const file = new File([blob], 'ojipan-score.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: text + '\n' + url });
        return;
      }
    }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  // ② がぞう ふたいおう → もじだけ きょうゆう
  if (navigator.share) {
    try { await navigator.share({ title: 'おじパン もぐもぐ だいさくせん', text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  // ③ どちらも だめ → LINEに ちょくせつ
  const line = 'https://line.me/R/msg/text/?' + encodeURIComponent(text + '\n' + url);
  window.open(line, '_blank');
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// タイトルがめんの おじパン(くるくる まわる 3D)
const titleCanvas = document.getElementById('titleCanvas');
const titleRenderer = new THREE.WebGLRenderer({
  canvas: titleCanvas, alpha: true, antialias: true,
});
titleRenderer.setSize(340, 380, false);
const titleScene = new THREE.Scene();
const titleCam = new THREE.PerspectiveCamera(40, 340 / 380, 0.1, 50);
titleCam.position.set(0, 1.7, 4.6);
titleCam.lookAt(0, 1.0, 0);
titleScene.add(new THREE.HemisphereLight(0xffffff, 0x88aa66, 1.7));
const titleSun = new THREE.DirectionalLight(0xfff3d0, 2.0);
titleSun.position.set(3, 5, 4);
titleScene.add(titleSun);
const titlePanda = makePandaModel({});
titleScene.add(titlePanda);
const titleBamboo = makeBamboo();
titleBamboo.scale.setScalar(0.55);
titleBamboo.position.set(1.2, 0, -0.5);
titleScene.add(titleBamboo);

reset();
requestAnimationFrame(loop);
