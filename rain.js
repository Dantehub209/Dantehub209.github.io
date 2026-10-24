// Terminal rain: streams of glowing code glyphs falling in three layered columns behind the
// contact section. Plain canvas, no libraries. Pauses off screen; visitors who prefer
// reduced motion get a single still frame.
(function () {
  const canvas = document.getElementById("rainCanvas");
  const section = canvas && canvas.parentElement;
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");

  // EDIT: snippets from my own work; each column spells them out from top to bottom
  const GLYPHS = [
    "SELECT", "JOIN", "WHERE", "async", "await", "=>", "{}", "[]", "<>", "def", "fn",
    "KES", "200 OK", "M-Pesa", "RLS", "git push", "SQL", "JWT", "API", "0", "1", "01", "10",
  ];

  // Back to front: small, dim and slow, up to large, bright and fast
  const LAYERS = [
    { size: 12, speed: 3.5, alpha: 0.28, every: 1 },
    { size: 15, speed: 6, alpha: 0.55, every: 2 },
    { size: 19, speed: 9.5, alpha: 0.95, every: 3 },
  ];

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let columns = [];
  let width = 0;
  let height = 0;
  let colours = { body: "#2563eb", head: "#1e3a8a" };

  function readColours() {
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--accent").trim() || "#2563eb";
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    colours = { body: accent, head: dark ? "#dbeafe" : "#1e3a8a" };
  }

  function stream() {
    // A column's text: a random run of glyphs, separated by a gap
    let text = "";
    while (text.length < 60) text += GLYPHS[(Math.random() * GLYPHS.length) | 0] + " ";
    return text;
  }

  function newColumn(layer, x, scattered) {
    const rows = Math.ceil(height / layer.size);
    return {
      layer,
      x,
      text: stream(),
      trail: 6 + ((Math.random() * 14) | 0),
      speed: layer.speed * (0.75 + Math.random() * 0.5), // rows per second
      head: scattered ? Math.random() * (rows + 20) : -Math.random() * rows,
    };
  }

  function layout() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = section.clientWidth;
    height = section.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    columns = [];
    LAYERS.forEach((layer, i) => {
      // Fewer columns in the front layers keeps it airy; stagger each layer's grid
      const step = layer.size * 1.6 * layer.every;
      for (let x = (i * step) / 3; x < width; x += step) columns.push(newColumn(layer, x, true));
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (const col of columns) {
      const { layer } = col;
      ctx.font = `500 ${layer.size}px "JetBrains Mono", ui-monospace, monospace`;
      const head = Math.floor(col.head);
      for (let k = 0; k < col.trail; k++) {
        const row = head - k;
        if (row < 0) break;
        const y = row * layer.size;
        if (y > height + layer.size) continue;
        const ch = col.text[row % col.text.length];
        if (ch === " ") continue;
        // The leading glyph glows; the rest fade away up the trail
        ctx.globalAlpha = layer.alpha * (k === 0 ? 1 : 0.85 * (1 - k / col.trail));
        ctx.fillStyle = k === 0 ? colours.head : colours.body;
        ctx.shadowColor = colours.body;
        ctx.shadowBlur = k === 0 ? 8 : 0;
        ctx.fillText(ch, col.x, y);
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function step(dt) {
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      col.head += col.speed * dt;
      if ((col.head - col.trail) * col.layer.size > height) columns[i] = newColumn(col.layer, col.x, false);
    }
  }

  // Run at up to 30 frames a second, only while the section is on screen
  let running = false;
  let visible = false;
  let last = 0;
  function frame(now) {
    if (!running) return;
    if (now - last >= 33) {
      step(Math.min((now - last) / 1000, 0.1));
      draw();
      last = now;
    }
    requestAnimationFrame(frame);
  }

  function update() {
    const shouldRun = visible && !reducedMotion.matches && !document.hidden;
    if (shouldRun && !running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    } else if (!shouldRun) {
      running = false;
      draw(); // keep a still picture
    }
  }

  readColours();
  layout();
  draw();

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      update();
    }).observe(section);
  } else {
    visible = true;
    update();
  }
  document.addEventListener("visibilitychange", update);
  if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", update);

  // Follow the light/dark toggle and the OS setting
  new MutationObserver(() => { readColours(); draw(); }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  let lastWidth = section.clientWidth;
  let lastHeight = section.clientHeight;
  const onResize = () => {
    if (section.clientWidth === lastWidth && section.clientHeight === lastHeight) return;
    lastWidth = section.clientWidth;
    lastHeight = section.clientHeight;
    layout();
    draw();
  };
  if ("ResizeObserver" in window) new ResizeObserver(onResize).observe(section);
  else window.addEventListener("resize", onResize);
})();
