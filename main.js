// Заглушка konusgruppsoft.ru: мультяшная RFID-метка в стиле логотипа ЛАРПИТ (карточка, спираль, чип),
// поле считывателя, которое «подсвечивает» код вокруг. Toon-шейдинг + контуры.
// three.js вендорен в vendor/three.js.
import * as THREE from './vendor/three.js';

const canvas = document.getElementById('scene');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Ракурс: высота камеры над плоскостью метки (градусы) и поворот метки вокруг вертикали (радианы)
const VIEW = { elevation: 55, yaw: -0.28 };

const C = {
  bg: 0x18232e,
  ink: 0x0c0b0a,
  card: 0xf5b800,   // жёлтый ЛАРПИТ
  band: 0x2a2623,
  cream: 0xf4e9d8,
  glow: 0xffd84d,
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
  inlay.rotation.y = VIEW.yaw;
  scene.add(inlay);

  // карточка
  const CARD_W = 3.6, CARD_H = 3.6, CARD_T = 0.16, BEVEL = 0.05;
  const cardGeo = new THREE.ExtrudeGeometry(roundedRect(CARD_W, CARD_H, 0.42), {
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

  // катушка по мотивам логотипа ЛАРПИТ: квадратная спираль со срезанным правым верхним углом,
  // плоская полоса с острыми углами. Координаты логотипа: x вправо, y вверх (в мире y → −z).
  const S = 1.36, P = 0.38, BAND_W = 0.19, BAND_T = 0.09, CHAMFER = 0.55, CHIP = 0.5, CHIP_T = 0.2;
  const path = spiralPath(S, P, CHAMFER, CHIP / 2);

  const ink = toon(C.band);
  const band = new THREE.Mesh(extrudeBand(path, BAND_W / 2, 0, BAND_T), ink);
  band.rotation.x = -Math.PI / 2;
  band.position.y = TOP;
  inlay.add(band);
  const bandHull = new THREE.Mesh(extrudeBand(path, BAND_W / 2 + OUT, OUT, BAND_T + OUT), outline);
  bandHull.rotation.x = -Math.PI / 2;
  bandHull.position.y = TOP - 0.001;
  inlay.add(bandHull);

  // чип в центре спирали (как заполненный квадрат в логотипе)
  const chipGeo = new THREE.BoxGeometry(CHIP, CHIP_T, CHIP);
  const chip = new THREE.Mesh(chipGeo, ink);
  chip.position.set(0, TOP + CHIP_T / 2, 0);
  inlay.add(chip);
  const chipHull = new THREE.Mesh(chipGeo, outline);
  chipHull.position.copy(chip.position);
  chipHull.scale.set((CHIP + 2 * OUT) / CHIP, (CHIP_T + 2 * OUT) / CHIP_T, (CHIP + 2 * OUT) / CHIP);
  inlay.add(chipHull);
  const die = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.22), toon(C.card));
  die.position.set(0, TOP + CHIP_T + 0.0125, 0);
  inlay.add(die);

  // мягкая тень-«блин» под карточкой
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 64),
    new THREE.MeshBasicMaterial({ color: C.shadow, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.2, -0.55, 0.25);
  scene.add(shadow);

  // ---------- поле считывателя: жирные плоские кольца ----------
  const RINGS = 3, PERIOD = 3.4, EL_X = 1.0, EL_Z = 1.0;
  const ringGeo = new THREE.RingGeometry(0.955, 1.0, 120);
  const rings = [];
  for (let i = 0; i < RINGS; i++) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: C.glow, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
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
    const r = 1.9 + Math.sqrt(Math.random()) * 3.6;
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
      uCream: { value: new THREE.Color(C.cream) },
      uOrange: { value: new THREE.Color(C.card) },
      uSky: { value: new THREE.Color(C.glow) },
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
        gl_PointSize = size * uPR * (210.0 / dist) * (1.0 + 0.55 * vLit);
        vFade = smoothstep(24.0, 12.0, dist) * (0.5 + 0.5 * seed);
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
    // на десктопе метка занимает ~45% высоты, на телефоне ~80% ширины
    const halfW = aspect < 1 ? 3.2 : 2.3;
    const dist = Math.max(14, halfW / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect));
    const el = THREE.MathUtils.degToRad(VIEW.elevation);
    camera.position.set(0, dist * Math.sin(el), dist * Math.cos(el));
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
    shadow.scale.set(2.15 - bob * 1.5, 2.15 - bob * 1.5, 1);
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

// Точки спирали: внешний конец на срезе справа сверху, три витка внутрь, вход в чип.
// Срезы всех витков лежат на параллельных диагоналях x + y = D с шагом P по нормали.
function spiralPath(S, P, CH, chipHalf) {
  const D = (k) => 2 * S - CH - k * P * Math.SQRT2;
  const pts = [];
  const loops = 3;
  for (let k = 0; k < loops; k++) {
    const e = S - k * P;           // полуразмер витка k
    const xr = k === 0 ? S : e + P; // правая сторона, с которой заходим на срез
    pts.push([xr, D(k) - xr]);      // начало среза
    pts.push([D(k) - e, e]);        // конец среза на верхней стороне
    pts.push([-e, e]);
    pts.push([-e, -e]);
    pts.push([e, -e]);
  }
  const e = S - (loops - 1) * P;
  pts.push([e, 0]);
  pts.push([chipHalf - 0.02, 0]);
  return pts;
}

// Полоса вдоль ломаной (острые стыки, торцы можно удлинить) → ExtrudeGeometry.
function extrudeBand(pts, h, ext, depth) {
  const n = pts.length;
  const dir = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1];
    const l = Math.hypot(dx, dy);
    dir.push([dx / l, dy / l]);
  }
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    let px = pts[i][0], py = pts[i][1], mx, my, len;
    if (i === 0 || i === n - 1) {
      const d = dir[i === 0 ? 0 : n - 2];
      const sgn = i === 0 ? -1 : 1;
      px += d[0] * ext * sgn; py += d[1] * ext * sgn;
      mx = -d[1]; my = d[0]; len = h;
    } else {
      const a = dir[i - 1], b = dir[i];
      mx = -a[1] - b[1]; my = a[0] + b[0];
      const ml = Math.hypot(mx, my);
      mx /= ml; my /= ml;
      len = h / (mx * -b[1] + my * b[0]);
    }
    left.push(new THREE.Vector2(px + mx * len, py + my * len));
    right.push(new THREE.Vector2(px - mx * len, py - my * len));
  }
  const shape = new THREE.Shape([...left, ...right.reverse()]);
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
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
