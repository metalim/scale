(function () {
  "use strict";

  const U = window.ScaleUtil;
  const { clamp, lerp, smoothstep, formatMeters, formatExp, formatTimeRate, timeRate } = U;

  const canvas = document.getElementById("viewport");
  const ctx = canvas.getContext("2d", { alpha: false });
  const slider = document.getElementById("scale-slider");
  const nameEl = document.getElementById("object-name");
  const descEl = document.getElementById("object-desc");
  const sizeEl = document.getElementById("size-value");
  const expEl = document.getElementById("size-exp");
  const rateEl = document.getElementById("time-rate");
  const legendEl = document.getElementById("legend");
  const hintEl = document.getElementById("hint");
  const ticksEl = document.getElementById("ticks");
  const btnPause = document.getElementById("btn-pause");
  const btnTour = document.getElementById("btn-tour");

  const world = window.ScaleScene.createWorld();
  const path = [];
  (function walk(n) {
    path.push(n);
    const next = (n.children || []).find(function (c) {
      return !c.ox && !c.oy;
    });
    if (next) walk(next);
  })(world);

  const LOG_MIN = Math.log10(path[path.length - 1].size * 0.7);
  const LOG_MAX = Math.log10(world.size * 1.05);
  const HUMAN_LOG = Math.log10(1.75);

  let W = 1;
  let H = 1;
  let dpr = 1;
  let logView = HUMAN_LOG;
  let targetLog = HUMAN_LOG;
  let simTime = 0;
  let wall = 0;
  let paused = false;
  let touring = false;
  let tourDir = -1;
  let draggingSlider = false;
  let lastTs = 0;
  let hintT = 0;

  const BG = [
    [-18, [14, 4, 18]],
    [-14, [18, 8, 10]],
    [-10, [10, 14, 28]],
    [-6, [18, 12, 28]],
    [-4.5, [16, 40, 32]],
    [-2, [180, 130, 100]],
    [0.3, [150, 200, 220]],
    [2, [140, 195, 225]],
    [5, [90, 170, 210]],
    [7.2, [12, 40, 90]],
    [12, [8, 10, 20]],
    [21, [6, 5, 14]],
    [27, [4, 2, 8]],
  ];

  function bgColor(log) {
    if (log <= BG[0][0]) return rgb(BG[0][1]);
    if (log >= BG[BG.length - 1][0]) return rgb(BG[BG.length - 1][1]);
    for (let i = 0; i < BG.length - 1; i++) {
      if (log <= BG[i + 1][0]) {
        const t = (log - BG[i][0]) / (BG[i + 1][0] - BG[i][0]);
        const a = BG[i][1];
        const b = BG[i + 1][1];
        return rgb([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]);
      }
    }
    return "#07070c";
  }

  function rgb(c) {
    return "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")";
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = (W * dpr) | 0;
    canvas.height = (H * dpr) | 0;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
  }

  function logToSlider(L) {
    return ((L - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 1000;
  }

  function sliderToLog(v) {
    return LOG_MIN + (v / 1000) * (LOG_MAX - LOG_MIN);
  }

  function nearestFocus(viewMeters) {
    let best = path[0];
    let bestD = Infinity;
    const lv = Math.log10(viewMeters);
    for (const n of path) {
      const d = Math.abs(Math.log10(n.size) - lv);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  function drawTicks() {
    const marks = [-18, -15, -10, -6, 0, 3, 7, 11, 16, 21, 26];
    ticksEl.innerHTML = "";
    for (const m of marks) {
      if (m < LOG_MIN || m > LOG_MAX) continue;
      const x = ((m - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100;
      const el = document.createElement("span");
      el.style.left = x + "%";
      el.innerHTML = "<i>10" + expSup(m) + "</i>";
      ticksEl.appendChild(el);
    }
  }

  function expSup(n) {
    const map = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
    return String(n)
      .split("")
      .map(function (ch) {
        return map[ch] || ch;
      })
      .join("");
  }

  let lastLegend = "";

  function updateHud(viewMeters, rate) {
    const focus = nearestFocus(viewMeters);
    if (nameEl.textContent !== focus.name) nameEl.textContent = focus.name;
    if (descEl.textContent !== focus.desc) descEl.textContent = focus.desc;
    sizeEl.textContent = formatMeters(viewMeters);
    expEl.textContent = formatExp(viewMeters);
    rateEl.textContent = formatTimeRate(rate);

    const lv = Math.log10(viewMeters);
    const items = path
      .map(function (n) {
        return { n: n, d: Math.abs(Math.log10(n.size) - lv) };
      })
      .sort(function (a, b) {
        return a.d - b.d;
      })
      .slice(0, 5)
      .sort(function (a, b) {
        return b.n.size - a.n.size;
      });
    const key = items
      .map(function (it) {
        return it.n.id + (it.n === focus ? "*" : "");
      })
      .join("|");
    if (key !== lastLegend) {
      lastLegend = key;
      legendEl.innerHTML = items
        .map(function (it) {
          const hot = it.n === focus ? " hot" : "";
          return (
            '<button type="button" class="legend-item' +
            hot +
            '" data-log="' +
            Math.log10(it.n.size) +
            '">' +
            it.n.name +
            "</button>"
          );
        })
        .join("");
    }
  }

  function bracket(viewMeters) {
    const n = path.length;
    if (viewMeters >= path[0].size) return { lo: path[0], hi: null, t: 0 };
    if (viewMeters <= path[n - 1].size) return { lo: null, hi: path[n - 1], t: 1 };
    for (let i = 0; i < n - 1; i++) {
      if (viewMeters <= path[i].size && viewMeters >= path[i + 1].size) {
        const a = Math.log10(path[i].size);
        const b = Math.log10(path[i + 1].size);
        const v = Math.log10(viewMeters);
        return { lo: path[i], hi: path[i + 1], t: (a - v) / (a - b) };
      }
    }
    return { lo: path[0], hi: null, t: 0 };
  }

  function paintLayer(node, alpha, displayR, env) {
    if (!node || alpha < 0.02 || typeof node.draw !== "function") return;
    ctx.save();
    ctx.translate(W * 0.5, H * 0.52);
    ctx.globalAlpha = alpha;
    node.draw(ctx, displayR, env.t, env);
    ctx.restore();
  }

  function renderLayers(env, viewMeters) {
    const { lo, hi, t } = bracket(viewMeters);
    const displayR = Math.min(W, H) * 0.42;
    paintLayer(lo, 1 - t, displayR, env);
    paintLayer(hi, t, displayR, env);
  }

  function drawScaleBar(viewMeters) {
    const target = W * 0.18;
    const raw = viewMeters * (target / H);
    const exp = Math.pow(10, Math.floor(Math.log10(raw)));
    const nice = raw / exp < 3 ? exp : raw / exp < 7 ? 5 * exp : 10 * exp;
    const px = (nice / viewMeters) * H;
    const x = W - 36 - px;
    const y = 92;
    ctx.save();
    ctx.strokeStyle = "rgba(243,239,228,0.7)";
    ctx.fillStyle = "rgba(243,239,228,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + px, y);
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y + 5);
    ctx.moveTo(x + px, y - 5);
    ctx.lineTo(x + px, y + 5);
    ctx.stroke();
    ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(formatMeters(nice), x + px, y - 10);
    ctx.restore();
  }

  function frame(ts) {
    const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016;
    lastTs = ts;
    wall += dt;
    hintT += dt;
    if (hintT > 6 && hintEl && !hintEl.classList.contains("fade")) hintEl.classList.add("fade");

    if (touring) {
      targetLog += tourDir * dt * 0.42;
      if (targetLog <= LOG_MIN) {
        targetLog = LOG_MIN;
        tourDir = 1;
      } else if (targetLog >= LOG_MAX) {
        targetLog = LOG_MAX;
        tourDir = -1;
      }
    }

    logView += (targetLog - logView) * (1 - Math.exp(-dt * 7.5));
    logView = clamp(logView, LOG_MIN, LOG_MAX);
    targetLog = clamp(targetLog, LOG_MIN, LOG_MAX);

    const viewMeters = Math.pow(10, logView);
    const rate = paused ? 0 : timeRate(logView);
    if (!paused) simTime += dt * rate;

    if (!draggingSlider) slider.value = String(logToSlider(targetLog));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bgColor(logView);
    ctx.fillRect(0, 0, W, H);

    try {
      const env = { t: simTime, rate: rate, wall: wall, viewLog: logView, W: W, H: H };
      renderLayers(env, viewMeters);

      drawScaleBar(viewMeters);
    } catch (err) {
      console.error(err);
    }
    updateHud(viewMeters, paused ? timeRate(logView) : rate);

    requestAnimationFrame(frame);
  }

  function zoomBy(dLog) {
    touring = false;
    btnTour.classList.remove("active");
    targetLog = clamp(targetLog + dLog, LOG_MIN, LOG_MAX);
  }

  canvas.addEventListener(
    "wheel",
    function (e) {
      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 : -1;
      const mag = Math.min(0.35, Math.abs(e.deltaY) * 0.0016);
      zoomBy(dir * mag);
    },
    { passive: false }
  );

  let pinch0 = 0;
  canvas.addEventListener("touchstart", function (e) {
    if (e.touches.length === 2) {
      pinch0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  });
  canvas.addEventListener(
    "touchmove",
    function (e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (pinch0 > 0) zoomBy(-Math.log10(d / pinch0) * 1.2);
        pinch0 = d;
      }
    },
    { passive: false }
  );

  slider.addEventListener("pointerdown", function () {
    draggingSlider = true;
    touring = false;
    btnTour.classList.remove("active");
  });
  window.addEventListener("pointerup", function () {
    draggingSlider = false;
  });
  slider.addEventListener("input", function () {
    targetLog = sliderToLog(Number(slider.value));
    logView = lerp(logView, targetLog, 0.35);
  });

  document.getElementById("btn-minus").addEventListener("click", function () {
    zoomBy(0.35);
  });
  document.getElementById("btn-plus").addEventListener("click", function () {
    zoomBy(-0.35);
  });
  document.getElementById("btn-human").addEventListener("click", function () {
    touring = false;
    btnTour.classList.remove("active");
    targetLog = HUMAN_LOG;
  });
  btnPause.addEventListener("click", function () {
    paused = !paused;
    btnPause.classList.toggle("active", paused);
    btnPause.textContent = paused ? "▶" : "II";
  });
  btnTour.addEventListener("click", function () {
    touring = !touring;
    btnTour.classList.toggle("active", touring);
    if (touring) tourDir = targetLog > (LOG_MIN + LOG_MAX) * 0.5 ? -1 : 1;
  });

  window.addEventListener("keydown", function (e) {
    if (e.key === "+" || e.key === "=") zoomBy(-0.25);
    else if (e.key === "-" || e.key === "_") zoomBy(0.25);
    else if (e.key === " ") {
      e.preventDefault();
      btnPause.click();
    } else if (e.key === "t" || e.key === "T") btnTour.click();
    else if (e.key === "0") {
      touring = false;
      targetLog = HUMAN_LOG;
    } else if (e.key === "ArrowUp") zoomBy(-0.18);
    else if (e.key === "ArrowDown") zoomBy(0.18);
  });

  legendEl.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-log]");
    if (!btn) return;
    touring = false;
    btnTour.classList.remove("active");
    targetLog = Number(btn.getAttribute("data-log"));
  });
  resize();
  drawTicks();
  slider.value = String(logToSlider(HUMAN_LOG));
  requestAnimationFrame(frame);
})();
