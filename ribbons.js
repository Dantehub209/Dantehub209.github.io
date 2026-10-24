// Skill ribbons: satin ribbons printed with my skills, twisting and waving in 3D.
// Three.js is loaded from a CDN only after the page has loaded, so it never slows the
// first paint. Without WebGL (or if the CDN is blocked) the CSS ribbon in the HTML stays.
// Visitors who prefer reduced motion get a single still frame.

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js";

// EDIT: one ribbon per line of skills
const RIBBONS = [
  ["React", "TypeScript", "JavaScript", "Tailwind CSS", "Flutter"],
  ["Python", "FastAPI", "Java", "Dart", "REST APIs", "JWT auth"],
  ["PostgreSQL", "Supabase", "Row-level security", "SQL migrations"],
  ["Git", "GitHub Actions", "Vercel", "Netlify", "Google Apps Script"],
];

const section = document.querySelector(".ribbons");
const canvas = document.getElementById("ribbonCanvas");

function whenIdle(fn) {
  const go = () => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 200));
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
}

if (section && canvas) whenIdle(() => start().catch(() => { /* keep the CSS ribbon */ }));

async function start() {
  const THREE = await import(THREE_URL);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  // Soft fill plus two key lights give the satin its moving highlights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9db8ff, 1.2);
  rim.position.set(-6, -3, 3);
  scene.add(rim);

  const group = new THREE.Group();
  scene.add(group);

  const SEGMENTS = window.innerWidth < 640 ? 140 : 260;
  const WIDTH = 0.62; // ribbon width in world units
  let length = 20;

  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]);

  const ribbons = RIBBONS.map((words, i) => {
    const geometry = new THREE.PlaneGeometry(1, 1, SEGMENTS, 1);
    // Front and back are printed separately so the words read the right way up on both
    // sides when the ribbon twists over
    const satin = { roughness: 0.32, metalness: 0.18 };
    const material = new THREE.MeshStandardMaterial({ ...satin, side: THREE.FrontSide });
    const backMaterial = new THREE.MeshStandardMaterial({ ...satin, side: THREE.BackSide });
    group.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, backMaterial));
    return {
      words,
      geometry,
      material,
      backMaterial,
      texture: null,
      backTexture: null,
      tileLength: 1, // world units covered by one copy of the text
      // Each ribbon gets its own rhythm so they weave rather than march in step
      y: (i - (RIBBONS.length - 1) / 2) * 0.95,
      phase: i * 1.7,
      amp: 0.38 + (i % 2) * 0.14,
      freq: 0.32 + i * 0.05,
      depth: 0.9 + (i % 3) * 0.3,
      twist: 0.18 + (i % 2) * 0.08,
      speed: (i % 2 ? -1 : 1) * (0.45 + i * 0.07),
    };
  });

  // Ribbon colours follow the site's light/dark theme
  function palette() {
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--accent").trim() || "#2563eb";
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    return dark
      ? [[accent, "#0b0b0d"], ["#f4f4f5", "#18181b"], ["#1e3a8a", "#f4f4f5"], ["#3f3f46", "#f4f4f5"]]
      : [[accent, "#ffffff"], ["#18181b", "#fafaf9"], ["#ffffff", "#1d4ed8"], ["#bfdbfe", "#1e3a8a"]];
  }

  function makeTexture(words, [bg, fg]) {
    const text = words.map((w) => w.toUpperCase()).join("   •   ") + "   •   ";
    const height = 128;
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    const font = '600 60px "JetBrains Mono", ui-monospace, monospace';
    ctx.font = font;
    c.width = Math.ceil(ctx.measureText(text).width);
    c.height = height;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, height);
    // Fine edge stitching, like a printed satin ribbon
    ctx.fillStyle = fg;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, 10, c.width, 3);
    ctx.fillRect(0, height - 13, c.width, 3);
    ctx.globalAlpha = 1;
    ctx.font = font;
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, height / 2 + 2);

    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return { texture, aspect: c.width / height };
  }

  function paint() {
    const colours = palette();
    ribbons.forEach((r, i) => {
      r.texture?.dispose();
      r.backTexture?.dispose();
      const { texture, aspect } = makeTexture(r.words, colours[i % colours.length]);
      // Seen from behind, the print is upside down: flip it vertically for the back face
      const back = texture.clone();
      back.wrapT = THREE.RepeatWrapping;
      back.repeat.y = -1;
      back.needsUpdate = true;
      r.texture = texture;
      r.backTexture = back;
      r.tileLength = WIDTH * aspect;
      r.material.map = texture;
      r.backMaterial.map = back;
      r.material.needsUpdate = true;
      r.backMaterial.needsUpdate = true;
    });
    fitTextures();
  }

  function fitTextures() {
    for (const r of ribbons) {
      if (!r.texture) continue;
      r.texture.repeat.x = length / r.tileLength;
      r.backTexture.repeat.x = length / r.tileLength;
    }
  }

  // Bend every ribbon: a wave along its length, a sway in depth, and a slow twist
  function shape(t) {
    for (const r of ribbons) {
      const pos = r.geometry.attributes.position;
      for (let row = 0; row < 2; row++) {
        const side = row === 0 ? 0.5 : -0.5;
        for (let col = 0; col <= SEGMENTS; col++) {
          const x = (col / SEGMENTS - 0.5) * length;
          const cy = r.y + r.amp * Math.sin(r.freq * x + t * 0.7 + r.phase);
          const cz = r.depth * Math.cos(r.freq * 0.8 * x - t * 0.5 + r.phase);
          const angle = r.twist * x + t * 0.6 + r.phase;
          pos.setXYZ(row * (SEGMENTS + 1) + col, x, cy + Math.cos(angle) * WIDTH * side, cz + Math.sin(angle) * WIDTH * side);
        }
      }
      pos.needsUpdate = true;
      r.geometry.computeVertexNormals();
    }
  }

  // Gentle tilt towards the pointer
  const tilt = { x: 0, y: 0 };
  section.addEventListener("pointermove", (e) => {
    const box = section.getBoundingClientRect();
    tilt.y = ((e.clientX - box.left) / box.width - 0.5) * 0.25;
    tilt.x = ((e.clientY - box.top) / box.height - 0.5) * 0.2;
  });
  section.addEventListener("pointerleave", () => { tilt.x = 0; tilt.y = 0; });

  function resize() {
    const w = section.clientWidth;
    const h = section.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const visibleWidth = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    length = visibleWidth * 1.35; // ends always off-screen
    fitTextures();
    if (!running) frame(performance.now());
  }

  let running = false;
  let visible = false;
  let last = performance.now();
  let clock = 4; // start mid-motion so the still frame looks woven, not flat

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (running) {
      clock += dt;
      for (const r of ribbons) {
        if (!r.texture) continue;
        r.texture.offset.x += (dt * r.speed) / r.tileLength;
        r.backTexture.offset.x = r.texture.offset.x;
      }
    }
    group.rotation.x += (tilt.x - group.rotation.x) * 0.05;
    group.rotation.y += (tilt.y - group.rotation.y) * 0.05;
    shape(clock);
    renderer.render(scene, camera);
    if (running) requestAnimationFrame(frame);
  }

  function update() {
    const shouldRun = visible && !reducedMotion.matches && !document.hidden;
    if (shouldRun && !running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    } else if (!shouldRun) {
      running = false;
      frame(performance.now()); // keep a still picture
    }
  }

  // Only animate while the ribbons are on screen
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    update();
  }).observe(section);
  document.addEventListener("visibilitychange", update);
  reducedMotion.addEventListener?.("change", update);

  // Repaint when the theme changes (toggle button or OS setting)
  new MutationObserver(() => { paint(); update(); }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { paint(); update(); });

  new ResizeObserver(resize).observe(section);

  paint();
  resize();
  section.classList.add("is-ready");
}
