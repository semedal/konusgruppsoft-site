// Заглушка konusgruppsoft.ru: мультяшный RFID-инлей (карточка, пухлая медная катушка, чип),
// поле считывателя, которое «подсвечивает» код вокруг. Toon-шейдинг + контуры.
// three.js вендорен в vendor/three.js.
import * as THREE from './vendor/three.js';

const canvas = document.getElementById('scene');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const C = {
  bg: 0x18232e,
  ink: 0x120f0d,
  card: 0xf4e9d8,
  orange: 0xff9f45,
  chip: 0x2b2421,
  sky: 0x8fd3ff,
  shadow: 0x0d151c,
};

function main() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (err) {
    canvas.remove();
    document.getElementById('fallback').classList.add('show');
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(C.bg, 1);
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);

  // свет: один ключевой + мягкая заливка, чтобы toon-полосы были читаемыми
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 8, 5);
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xdfeeff, 0x2a1d14, 0.9));

  // ---------- toon-материалы ----------
  const gradient = new THREE.DataTexture(new Uint8Array([80, 165, 255]), 3, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap: gradient });
  const outline = new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.BackSide });
  const OUT = 0.03; // толщина контура

  // ---------- инлей ----------
  const inlay = new THREE.Group();
  inlay.rotation.y = -0.4;
  scene.add(inlay);

  // карточка
  const CARD_W = 4.4, CARD_H = 2.9, CARD_T = 0.16, BEVEL = 0.05;
  const cardGeo = new THREE.ExtrudeGeometry(roundedRect(CARD_W, CARD_H, 0.5), {
    depth: CARD_T, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 4,
  });
  cardGeo.center();
  const card = new THREE.Mesh(cardGeo, toon(C.card));
  card.rotation.x = -Math.PI / 2;
  inlay.add(card);
  const cardHull = new THREE.Mesh(cardGeo, outline);
  cardHull.rotation.x = -Math.PI / 2;
  const fullW = CARD_W + 2 * BEVEL, fullH = CARD_H + 2 * BEVEL, fullT = CARD_T + 2 * BEVEL;
  cardHull.scale.set((fullW + 2 * OUT) / fullW, (fullH + 2 * OUT) / fullH, (fullT + 2 * OUT) / fullT);
  inlay.add(cardHull);
  const TOP = fullT / 2; // верхняя плоскость карточки

  // катушка: 3 пухлых витка (суперэллипс с сужением)
  const TURNS = 3, PITCH = 0.30, HW = 1.72, HH = 1.08, ROUND = 6, STEPS = 200, R = 0.07;
  const pts = [];
  for (let i = 0; i <= TURNS * STEPS; i++) {
    const s = i / STEPS;
    const a = s * Math.PI * 2;
    const hw = HW - s * PITCH, hh = HH - s * PITCH;
    const c = Math.cos(a), sn = Math.sin(a);
    pts.push(new THREE.Vector3(
      hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / ROUND),
      TOP + R,
      hh * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / ROUND),
    ));
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const orange = toon(C.orange);
  inlay.add(new THREE.Mesh(new THREE.TubeGeometry(curve, TURNS * 220, R, 12, false), orange));
  inlay.add(new THREE.Mesh(new THREE.TubeGeometry(curve, TURNS * 220, R + OUT, 12, false), outline));
  // круглые концы провода
  const capGeo = new THREE.SphereGeometry(R, 16, 12);
  const capHullGeo = new THREE.SphereGeometry(R + OUT, 16, 12);
  for (const p of [pts[0], pts[pts.length - 1]]) {
    const cap = new THREE.Mesh(capGeo, orange); cap.position.copy(p); inlay.add(cap);
    const hull = new THREE.Mesh(capHullGeo, outline); hull.position.copy(p); inlay.add(hull);
  }

  // чип
  const inner = pts[pts.length - 1];
  const CHIP = 0.44, CHIP_T = 0.16;
  const chipGeo = new THREE.BoxGeometry(CHIP, CHIP_T, CHIP);
  const chip = new THREE.Mesh(chipGeo, toon(C.chip));
  chip.position.set(inner.x, TOP + CHIP_T / 2, inner.z);
  inlay.add(chip);
  const chipHull = new THREE.Mesh(chipGeo, outline);
  chipHull.position.copy(chip.position);
  chipHull.scale.set((CHIP + 2 * OUT) / CHIP, (CHIP_T + 2 * OUT) / CHIP_T, (CHIP + 2 * OUT) / CHIP);
  inlay.add(chipHull);

  // перемычка от чипа через витки наружу
  const bLen = (HW + 0.18) - inner.x, bT = 0.06, bW = 0.16;
  const bridgeGeo = new THREE.BoxGeometry(bLen, bT, bW);
  const bridge = new THREE.Mesh(bridgeGeo, orange);
  bridge.position.set(inner.x + bLen / 2, TOP + 2 * R + 0.04, inner.z);
  inlay.add(bridge);
  const bridgeHull = new THREE.Mesh(bridgeGeo, outline);
  bridgeHull.position.copy(bridge.position);
  bridgeHull.scale.set((bLen + 2 * OUT) / bLen, (bT + 2 * OUT) / bT, (bW + 2 * OUT) / bW);
  inlay.add(bridgeHull);

  // мягкая тень-«блин» под карточкой
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 64),
    new THREE.MeshBasicMaterial({ color: C.shadow, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.25, -0.55, 0.3);
  scene.add(shadow);

  // ---------- поле считывателя: жирные плоские кольца ----------
  const RINGS = 3, PERIOD = 3.4, EL_X = 1.25, EL_Z = 0.8;
  const ringGeo = new THREE.RingGeometry(0.955, 1.0, 120);
  const rings = [];
  for (let i = 0; i < RINGS; i++) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: C.sky, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
    }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = -TOP - 0.02;
    inlay.add(m);
    rings.push(m);
  }

  // ---------- глифы кода ----------
  const GLYPHS = '0123456789ABCDEF{}<>/;=[]()#$_*+-:%';
  const COLS = 8, ROWS = 5, CELL = 64;
  const atlas = document.createElement('canvas');
  atlas.width = COLS * CELL;
  atlas.height = ROWS * CELL;
  const ctx = atlas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.font = '900 44px "Arial Rounded MT Bold", "Helvetica Neue", Arial, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < GLYPHS.length; i++) {
    ctx.fillText(GLYPHS[i], (i % COLS) * CELL + CELL / 2, Math.floor(i / COLS) * CELL + CELL / 2 + 2);
  }
  const atlasTex = new THREE.CanvasTexture(atlas);
  atlasTex.minFilter = THREE.LinearFilter;

  const COUNT = 520;
  const pos = new Float32Array(COUNT * 3);
  const glyph = new Float32Array(COUNT);
  const seed = new Float32Array(COUNT);
  const size = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const r = 2.1 + Math.sqrt(Math.random()) * 3.6;
    const a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r * EL_X;
    pos[i * 3 + 1] = -0.6 + Math.random() * 1.8;
    pos[i * 3 + 2] = Math.sin(a) * r * EL_Z;
    glyph[i] = Math.floor(Math.random() * GLYPHS.length);
    seed[i] = Math.random();
    size[i] = 0.7 + Math.random() * 0.7;
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pgeo.setAttribute('glyph', new THREE.BufferAttribute(glyph, 1));
  pgeo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  pgeo.setAttribute('size', new THREE.BufferAttribute(size, 1));

  const pmat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPR: { value: renderer.getPixelRatio() },
      uAtlas: { value: atlasTex },
      uRings: { value: new THREE.Vector3(-10, -10, -10) },
      uRingA: { value: new THREE.Vector3(0, 0, 0) },
      uCream: { value: new THREE.Color(C.card) },
      uOrange: { value: new THREE.Color(C.orange) },
      uSky: { value: new THREE.Color(C.sky) },
      uEl: { value: new THREE.Vector2(EL_X, EL_Z) },
    },
    vertexShader: `
      uniform float uTime; uniform float uPR; uniform vec3 uRings; uniform vec3 uRingA; uniform vec2 uEl;
      attribute float glyph; attribute float seed; attribute float size;
      varying float vGlyph; varying float vLit; varying float vFade; varying float vHue;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * 0.7 + seed * 6.2831) * 0.07;
        float rr = length(vec2(p.x / uEl.x, p.z / uEl.y));
        float lit = 0.0;
        for (int i = 0; i < 3; i++) {
          float d = rr - uRings[i];
          lit += exp(-d * d / 0.09) * uRingA[i];
        }
        vLit = clamp(lit, 0.0, 1.0);
        vGlyph = glyph;
        vHue = step(0.78, seed);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        gl_PointSize = size * uPR * (165.0 / dist) * (1.0 + 0.55 * vLit);
        vFade = smoothstep(17.0, 7.0, dist) * (0.5 + 0.5 * seed);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uAtlas; uniform vec3 uCream; uniform vec3 uOrange; uniform vec3 uSky;
      varying float vGlyph; varying float vLit; varying float vFade; varying float vHue;
      void main() {
        float col = mod(vGlyph, 8.0);
        float row = floor(vGlyph / 8.0);
        vec2 uv = vec2((col + gl_PointCoord.x) / 8.0, 1.0 - (row + gl_PointCoord.y) / 5.0);
        float a = texture2D(uAtlas, uv).r;
        if (a < 0.08) discard;
        vec3 base = mix(uCream, uOrange, vHue);
        vec3 c = mix(base, uSky, vLit);
        float alpha = smoothstep(0.08, 0.5, a) * (0.14 + 0.86 * vLit) * vFade;
        gl_FragColor = vec4(c, alpha);
      }
    `,
  });
  const glyphs = new THREE.Points(pgeo, pmat);
  inlay.add(glyphs);

  // ---------- камера и параллакс ----------
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    target.x = (e.clientX / innerWidth) * 2 - 1;
    target.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    // расстояние подбираем так, чтобы инлей помещался по ширине
    const halfW = aspect < 1 ? 2.4 : 3.4;
    const dist = Math.max(8.8, halfW / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect));
    camera.position.set(0, dist * 0.46, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    pmat.uniforms.uPR.value = renderer.getPixelRatio();
  }
  addEventListener('resize', resize);
  resize();

  const t0 = performance.now();
  const ringR = pmat.uniforms.uRings.value;
  const ringA = pmat.uniforms.uRingA.value;

  function frame() {
    const t = reducedMotion ? 2.1 : (performance.now() - t0) / 1000;

    cur.x += (target.x - cur.x) * 0.05;
    cur.y += (target.y - cur.y) * 0.05;
    inlay.rotation.x = cur.y * 0.09;
    inlay.rotation.z = -cur.x * 0.11;
    glyphs.rotation.y = t * 0.02;

    // лёгкое парение карточки, тень дышит в противофазе
    const bob = Math.sin(t * 0.9) * 0.06;
    inlay.position.y = bob;
    shadow.scale.set(2.5 - bob * 1.5, 1.55 - bob, 1);
    shadow.material.opacity = 0.85 - bob * 1.2;

    for (let i = 0; i < RINGS; i++) {
      const tt = (t / PERIOD + i / RINGS) % 1;
      const e = 1 - Math.pow(1 - tt, 3);
      const r = 0.7 + e * 3.3;
      const m = rings[i];
      m.scale.set(r * EL_X, r * EL_Z, 1);
      m.material.opacity = Math.min(1, tt * 8) * Math.pow(1 - tt, 1.5) * 0.9;
      ringR.setComponent(i, r);
      ringA.setComponent(i, Math.pow(1 - tt, 1.3));
    }
    pmat.uniforms.uTime.value = t;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

main();
