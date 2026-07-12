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
  // 「大」の じの はなすじ
  part(g, P_INK, 0, 1.31, 0.29, 0.07, 0.24, 0.05);
  part(g, P_INK, -0.09, 1.2, 0.29, 0.07, 0.2, 0.05, 0, 0, 0.55);
  part(g, P_INK, 0.09, 1.2, 0.29, 0.07, 0.2, 0.05, 0, 0, -0.55);
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
let items = [];
let floats = [];
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
  state = 'over';
  sOver();
  shake = 0.8;
  const fs = Math.floor(score);
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

  // アイテム
  const myRank = pandaRank();
  for (const it of items) {
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
      it.ring.visible = state === 'play' && it.tier >= myRank;
      if (it.ring.visible) {
        const pulse = 1 + Math.sin(t * 6.6) * 0.08;
        it.ring.scale.setScalar(pulse / 1.05);
      }
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
        if (it.kind === 'bamboo') {
          it.knocked = true;
          it.eatT = 0.25;
          const grow = 0.022 + 0.048 * (PANDA_MAX_R - panda.r) / (PANDA_MAX_R - PANDA_START_R);
          panda.r = Math.min(PANDA_MAX_R, panda.r + grow);
          addScore(10, it.obj.position, '+10 もぐもぐ!');
          sEat();
          const gi = Math.min(RANK_NAMES.length - 1,
            Math.floor((panda.r - PANDA_START_R) / (PANDA_MAX_R - PANDA_START_R) * RANK_NAMES.length));
          rankEl.textContent = RANK_NAMES[gi];
        } else if (panda.r >= it.r) {
          it.knocked = true;
          it.ring.visible = false;
          const away = _v3.clone().normalize();
          it.vel.copy(away).multiplyScalar(25 + panda.r * 3);
          it.vy = 12 + Math.random() * 5;
          it.spin = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6);
          const pts = (it.tier + 1) * 30;
          addScore(pts, it.obj.position, '+' + pts + ' ドーン!');
          shake = 0.5;
          sKnock();
        } else if (invincible <= 0) {
          gameOver();
        }
      }
    }
  }
  for (const it of items) {
    if (it.dead) scene.remove(it.obj);
  }
  items = items.filter(it => !it.dead);

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
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt, now / 1000);
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
  if (state !== 'play') return;
  pointTo(e);
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', e => {
  if (state !== 'play') return;
  if (e.pressure > 0 || e.buttons > 0) pointTo(e);
});

function start() {
  initAudio();
  reset();
  state = 'play';
  document.getElementById('titleScreen').classList.add('hidden');
  document.getElementById('overScreen').classList.add('hidden');
}
document.getElementById('startBtn').addEventListener('click', start);
document.getElementById('retryBtn').addEventListener('click', start);

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
