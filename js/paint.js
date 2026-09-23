/* ============================================================================
   ХУДОЖНИКИ. Вся графика процедурная: ни одной внешней картинки.
   Каждый стиль умеет:
     outer(ctx, r, node, t) — как объект выглядит снаружи (r = радиус в пикселях)
     field                  — как выглядит ЕГО ВНУТРЕННОСТЬ: базовый градиент
                              + уровни детали с РЕАЛЬНЫМ шагом в метрах
     shell                  — прозрачность оболочки (1 = непрозрачный: внутрь
                              не заглянуть, пока не подлетишь вплотную)
   ========================================================================== */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;

  /* ---------- мелкие помощники рисования ---------------------------------- */
  function hs(h, s, l, a) { return 'hsla(' + h + ',' + s + '%,' + l + '%,' + (a === undefined ? 1 : a) + ')'; }

  function rg(g, x, y, r, c0, c1, c2) {          // радиальный градиент
    var d = g.createRadialGradient(x, y, 0, x, y, Math.max(0.6, r));
    d.addColorStop(0, c0); d.addColorStop(c2 ? 0.55 : 1, c1);
    if (c2) d.addColorStop(1, c2);
    return d;
  }
  function lg(g, x0, y0, x1, y1, stops) {         // линейный градиент
    var d = g.createLinearGradient(x0, y0, x1, y1), i;
    for (i = 0; i < stops.length; i += 2) d.addColorStop(stops[i], stops[i + 1]);
    return d;
  }
  function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function ball(g, x, y, r, c0, c1) { g.fillStyle = rg(g, x - r * .35, y - r * .4, r * 1.35, c0, c1); circle(g, x, y, r); }

  // органичная «клякса»: замкнутый путь со случайными радиусами
  function blobPath(g, x, y, r, n, seed, wob) {
    var i, a, rr;
    g.beginPath();
    for (i = 0; i <= n; i++) {
      a = (i / n) * TAU;
      rr = r * (1 + wob * Math.sin(a * 3 + seed) * 0.5 + wob * Math.sin(a * 5 + seed * 2.3) * 0.5);
      if (i === 0) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
  }
  function blob(g, x, y, r, n, seed, wob, c0, c1) {
    g.fillStyle = rg(g, x - r * .3, y - r * .35, r * 1.5, c0, c1);
    blobPath(g, x, y, r, n, seed, wob); g.fill();
  }

  // волнистая линия (жгутик, нить, русло реки)
  function wavy(g, x0, y0, x1, y1, amp, waves, ph, w, col) {
    var i, n = 26, p, t, nx, ny, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    nx = -dy / L; ny = dx / L;
    g.beginPath();
    for (i = 0; i <= n; i++) {
      t = i / n;
      p = Math.sin(t * waves * TAU + ph) * amp * Math.sin(t * Math.PI);
      if (i === 0) g.moveTo(x0 + dx * t + nx * p, y0 + dy * t + ny * p);
      else g.lineTo(x0 + dx * t + nx * p, y0 + dy * t + ny * p);
    }
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.stroke();
  }

  function starShape(g, x, y, r, points, inner, seed) {
    var i, a, rr;
    g.beginPath();
    for (i = 0; i < points * 2; i++) {
      a = (i / (points * 2)) * TAU - Math.PI / 2;
      rr = (i % 2 ? inner : 1) * r * (1 + 0.12 * Math.sin(i * 3.1 + seed));
      if (i === 0) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
  }

  // силуэт по «нормализованному» пути: p(t) в квадрате [-1,1]
  function sil(g, r, pts, close) {
    var i, p;
    g.beginPath();
    for (i = 0; i < pts.length; i++) {
      p = pts[i];
      if (p === 'q' || p === 'c') continue;
      if (i === 0 || pts[i - 1] === 'm') g.moveTo(p[0] * r, p[1] * r);
      else if (pts[i - 1] === 'q') g.quadraticCurveTo(pts[i - 2][0] * r, pts[i - 2][1] * r, p[0] * r, p[1] * r);
      else if (pts[i - 1] === 'c') g.bezierCurveTo(pts[i - 3][0] * r, pts[i - 3][1] * r, pts[i - 2][0] * r, pts[i - 2][1] * r, p[0] * r, p[1] * r);
      else g.lineTo(p[0] * r, p[1] * r);
    }
    if (close !== false) g.closePath();
  }

  /* ---------- спрайты для текстур внутренностей ---------------------------
     Кэш маленьких канвасов: (вид, цвет, размер) -> готовый спрайт.
     Так поле внутренностей рисуется быстро (drawImage), а не тысячами
     градиентов на кадр.
     --------------------------------------------------------------------- */
  var SPR = {};
  var BUCKETS = [6, 9, 13, 19, 27, 38, 54, 76];
  function bucket(px) {
    for (var i = 0; i < BUCKETS.length; i++) if (px <= BUCKETS[i]) return BUCKETS[i];
    return BUCKETS[BUCKETS.length - 1];
  }
  function sprite(kind, color, px) {
    var b = bucket(px), key = kind + '|' + color + '|' + b, c = SPR[key];
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = b;
    var g = c.getContext('2d'), R = b / 2, i;
    g.translate(R, R);
    switch (kind) {
      case 'soft':
        g.fillStyle = rg(g, 0, 0, R, color, color, 'rgba(0,0,0,0)');
        circle(g, 0, 0, R); break;
      case 'hard':
        g.fillStyle = color; circle(g, 0, 0, R * 0.86); break;
      case 'rung':
        g.fillStyle = rg(g, 0, 0, R, color, color, 'rgba(0,0,0,0)');
        g.fillRect(-R, -R * 0.20, R * 2, R * 0.4);
        g.fillStyle = 'rgba(255,255,255,.85)';
        circle(g, -R * 0.8, 0, R * 0.3);
        circle(g, R * 0.8, 0, R * 0.3);
        break;
      case 'grain':
        g.fillStyle = color;
        g.fillRect(-R * 0.7, -R * 0.7, R * 1.4, R * 1.4); break;
      case 'ring':
        g.strokeStyle = color; g.lineWidth = Math.max(1, R * 0.22);
        g.beginPath(); g.arc(0, 0, R * 0.75, 0, TAU); g.stroke(); break;
      case 'star':
        g.fillStyle = rg(g, 0, 0, R, color, color, 'rgba(0,0,0,0)');
        circle(g, 0, 0, R);
        g.fillStyle = color;
        g.globalAlpha = 0.55;
        g.fillRect(-R * 0.75, -R * 0.045, R * 1.5, R * 0.09);
        g.fillRect(-R * 0.045, -R * 0.75, R * 0.09, R * 1.5);
        g.globalAlpha = 1;
        g.fillStyle = 'rgba(255,255,255,.95)';
        circle(g, 0, 0, R * 0.22);
        break;
      case 'bubble':
        g.fillStyle = rg(g, 0, 0, R, 'rgba(255,255,255,.10)', color, 'rgba(0,0,0,0)');
        circle(g, 0, 0, R * 0.92);
        g.strokeStyle = color; g.lineWidth = Math.max(1, R * 0.16);
        g.beginPath(); g.arc(0, 0, R * 0.82, 0, TAU); g.stroke(); break;
      case 'thread':
        g.strokeStyle = color; g.lineWidth = Math.max(1, R * 0.3); g.lineCap = 'round';
        g.beginPath(); g.moveTo(-R, 0); g.quadraticCurveTo(0, -R * 0.6, R, 0); g.stroke(); break;
      case 'blob':
        g.fillStyle = rg(g, -R * .2, -R * .25, R * 1.5, color, color, 'rgba(0,0,0,0)');
        blobPath(g, 0, 0, R * 0.95, 9, 1.7, 0.3); g.fill(); break;
      case 'poly':
        g.fillStyle = color;
        g.beginPath();
        for (i = 0; i < 7; i++) {
          var ang = (i / 7) * TAU, rr = R * (0.82 + 0.12 * Math.sin(i * 2.1));
          if (i === 0) g.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
          else g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
        }
        g.closePath(); g.fill(); break;
      case 'cross':
        g.fillStyle = rg(g, 0, 0, R, color, color, 'rgba(0,0,0,0)');
        circle(g, 0, 0, R * 0.55);
        g.strokeStyle = color; g.lineWidth = Math.max(1, R * 0.26);
        g.beginPath(); g.moveTo(-R, 0); g.lineTo(R, 0); g.moveTo(0, -R); g.lineTo(0, R); g.stroke(); break;
      case 'dust':
        g.fillStyle = color;
        for (i = 0; i < 3; i++) { circle(g, (i - 1) * R * 0.45, (i % 2 ? 1 : -1) * R * 0.2, R * 0.34); }
        break;
      default:
        g.fillStyle = color; circle(g, 0, 0, R * 0.8);
    }
    SPR[key] = c;
    return c;
  }
  function clearSpriteCache() { SPR = {}; }

  /* ============ ХУДОЖНИКИ: МИКРОМИР ====================================== */

  var P = {};

  P.quantumFoam = {
    shell: 0.9, clip: true, lum: 0.2,
    field: {
      base: ['#2a1b4d', '#0a0618'],
      levels: [
        { f: 0.24, k: 'ring', c: ['#8f6cff', '#5ad1ff', '#ff7ad9'], a: 0.75, sz: 0.9, j: 0.6 },
        { f: 0.08, k: 'soft', c: ['#3b2a6b', '#2a5b8a'], a: 0.5, sz: 0.8, j: 0.5 }
      ]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(120,90,255,.5)', 'rgba(30,10,70,.9)', 'rgba(0,0,0,0)');
      blobPath(g, 0, 0, r, 12, 3.1, 0.35); g.fill();
      g.strokeStyle = 'rgba(150,120,255,.45)'; g.lineWidth = Math.max(1, r * 0.05);
      for (var i = 0; i < 4; i++) {
        var a = i * 1.7 + t * 0.1;
        g.beginPath(); g.arc(0, 0, r * (0.35 + i * 0.18), a, a + 2.2); g.stroke();
      }
    }
  };

  P.virtualPair = {
    shell: 0.8, clip: false,
    field: null,
    outer: function (g, r, n, t) {
      var a = (n.ph || 0) + t * 0.6;
      g.strokeStyle = 'rgba(160,140,255,.85)'; g.lineWidth = Math.max(1, r * 0.12);
      g.beginPath(); g.arc(0, 0, r, a, a + Math.PI); g.stroke();
      g.beginPath(); g.arc(0, 0, r, a + Math.PI, a + TAU); g.stroke();
      g.fillStyle = '#cbb8ff';
      circle(g, Math.cos(a) * r, Math.sin(a) * r, r * 0.3);
      circle(g, -Math.cos(a) * r, -Math.sin(a) * r, r * 0.3);
    }
  };

  P.quark = {
    shell: 0.55, clip: false, lum: 0.35,
    field: {
      base: ['#ff5f8f', '#2a0a1a'],
      levels: [
        { f: 0.30, k: 'soft', c: ['#ff8ab0', '#ffd36e'], a: 0.6, sz: 0.7, j: 0.5 },
        { f: 0.10, k: 'thread', c: ['#ffcf6e', '#8affd1'], a: 0.5, sz: 1.0, j: 0.6 }
      ]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, -r * .2, -r * .2, r * 1.5, '#ffd9e6', '#ff3d7f', 'rgba(255,60,130,0)');
      circle(g, 0, 0, r * 0.95);
      g.fillStyle = 'rgba(255,255,255,.75)';
      circle(g, -r * 0.25, -r * 0.3, r * 0.22);
      g.strokeStyle = 'rgba(255,220,140,.8)'; g.lineWidth = Math.max(1, r * 0.09);
      var a = t * 0.9 + (n.ph || 0);
      g.beginPath(); g.ellipse(0, 0, r * 1.25, r * 0.42, a, 0, TAU); g.stroke();
    }
  };

  P.gluonLoop = {
    shell: 0.7, clip: false,
    outer: function (g, r, n, t) {
      var a = (n.ph || 0) + t * 1.1;
      g.strokeStyle = 'rgba(120,255,220,.8)'; g.lineWidth = Math.max(1, r * 0.16);
      g.beginPath(); g.ellipse(0, 0, r, r * 0.55, a, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(200,255,240,.9)';
      circle(g, Math.cos(a) * r, Math.sin(a) * r * 0.55, r * 0.22);
    }
  };

  P.proton = {
    shell: 0.42, clip: true, lum: 0.25,
    field: {
      base: ['#ff9a4d', '#2a1000'],
      levels: [
        { f: 0.20, k: 'soft', c: ['#ffd08a', '#ff7a3d'], a: 0.55, sz: 0.8, j: 0.55 },
        { f: 0.09, k: 'thread', c: ['#ffe6a8', '#7affd8'], a: 0.45, sz: 1.0, j: 0.6 }
      ]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, -r * .25, -r * .3, r * 1.6, '#ffe9c4', '#ff8a2b', 'rgba(255,120,20,0)');
      blobPath(g, 0, 0, r * 0.98, 14, 2.2, 0.12); g.fill();
      g.fillStyle = 'rgba(255,255,255,.5)';
      circle(g, -r * 0.3, -r * 0.35, r * 0.18);
    }
  };

  P.nucleon = {
    shell: 0.6, clip: true,
    outer: function (g, r, n, t) {
      var warm = (n.tint || 0) < 0.5;
      ball(g, 0, 0, r, warm ? '#ffe3c0' : '#cfd8ff', warm ? '#ff7b2e' : '#4a63d8');
    }
  };

  P.atomicNucleus = {
    shell: 0.35, clip: true, lum: 0.1,
    field: {
      base: ['#4a2a6a', '#120718'],
      levels: [{ f: 0.14, k: 'soft', c: ['#ff9a5c', '#7fa8ff'], a: 0.5, sz: 0.6, j: 0.6 }]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r * 1.2, 'rgba(255,200,150,.55)', 'rgba(90,60,160,.35)', 'rgba(0,0,0,0)');
      blobPath(g, 0, 0, r, 16, 1.3, 0.18); g.fill();
    }
  };

  P.orbital = {
    shell: 0.5, clip: false,
    outer: function (g, r, n, t) {
      var a = (n.ph || 0), tilt = a * 0.7;
      g.save(); g.rotate(tilt);
      g.strokeStyle = 'rgba(140,200,255,.55)'; g.lineWidth = Math.max(1, r * 0.06);
      g.beginPath(); g.ellipse(0, 0, r, r * 0.34, a, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(180,230,255,.35)';
      g.beginPath(); g.ellipse(0, 0, r, r * 0.34, a, 0, TAU); g.fill();
      g.restore();
    }
  };

  P.electronCloud = {
    shell: 0.22, clip: true, lum: 0.1,
    field: {
      base: ['#1b3a6b', '#04070f'],
      levels: [
        { f: 0.32, k: 'soft', c: ['#7fc4ff', '#a98bff'], a: 0.4, sz: 0.9, j: 0.5 },
        { f: 0.11, k: 'cross', c: ['#dff0ff'], a: 0.35, sz: 0.6, j: 0.8 }
      ]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(120,180,255,.28)', 'rgba(60,90,220,.12)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
    }
  };

  P.electron = {
    shell: 0.85, clip: false,
    outer: function (g, r, n, t) {
      var a = (n.ph || 0) + t * 2.2;
      g.fillStyle = rg(g, 0, 0, r * 2, 'rgba(180,220,255,.95)', 'rgba(90,150,255,.3)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r * 2);
      g.save(); g.rotate(a);
      g.strokeStyle = 'rgba(200,230,255,.7)'; g.lineWidth = Math.max(1, r * 0.25);
      g.beginPath(); g.moveTo(-r * 3, 0); g.lineTo(r * 3, 0); g.stroke();
      g.restore();
    }
  };

  P.atom = {
    shell: 0.30, clip: true, lum: 0.08,
    field: {
      base: ['#14243f', '#03050a'],
      levels: [
        { f: 0.35, k: 'soft', c: ['#6fb6ff', '#8f7bff'], a: 0.45, sz: 0.85, j: 0.55 },
        { f: 0.12, k: 'cross', c: ['#e8f4ff', '#bfe0ff'], a: 0.3, sz: 0.5, j: 0.85 }
      ]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(110,170,255,.3)', 'rgba(40,70,160,.16)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
      g.strokeStyle = 'rgba(150,200,255,.35)'; g.lineWidth = Math.max(1, r * 0.03);
      var i, a;
      for (i = 0; i < 3; i++) {
        a = i * 1.05 + t * 0.15;
        g.beginPath(); g.ellipse(0, 0, r * 0.95, r * 0.4, a, 0, TAU); g.stroke();
      }
    }
  };

  P.molecule = {
    shell: 0.30, clip: false, lum: 0.1,
    field: {
      base: ['#101c33', '#03050a'],
      levels: [{ f: 0.17, k: 'soft', c: ['#7fd0ff'], a: 0.4, sz: 0.7, j: 0.6 }]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(110,200,255,.25)', 'rgba(30,60,120,.14)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
      g.strokeStyle = 'rgba(180,220,255,.4)'; g.lineWidth = Math.max(1, r * 0.05);
      g.beginPath(); g.arc(0, 0, r * 0.75, 0, TAU); g.stroke();
    }
  };

  P.bond = {
    shell: 0.8, clip: false,
    outer: function (g, r, n, t) {
      g.strokeStyle = 'rgba(160,210,255,.55)'; g.lineWidth = Math.max(1, r * 0.35);
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(-r, 0); g.lineTo(r, 0); g.stroke();
    }
  };

  P.nucleotide = {
    shell: 0.42, clip: false, lum: 0.12,
    field: {
      base: ['#1a3a2a', '#04080a'],
      levels: [{ f: 0.16, k: 'soft', c: ['#8affc0', '#7fb0ff', '#ffd98a'], a: 0.4, sz: 0.7, j: 0.6 }]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(140,255,190,.3)', 'rgba(40,120,90,.16)', 'rgba(0,0,0,0)');
      blobPath(g, 0, 0, r * 0.95, 10, 2.4, 0.2); g.fill();
    }
  };

  P.basePair = {
    shell: 0.75, clip: false,
    outer: function (g, r, n, t) {
      var c1 = (n.tint || 0) < 0.5 ? '#ffd166' : '#6ee7ff';
      g.strokeStyle = c1; g.lineWidth = Math.max(1, r * 0.5); g.lineCap = 'round';
      g.beginPath(); g.moveTo(-r * 0.9, 0); g.lineTo(r * 0.9, 0); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.85)';
      circle(g, -r * 0.9, 0, r * 0.45); circle(g, r * 0.9, 0, r * 0.45);
    }
  };

  P.dna = {
    shell: 0.16, clip: false, lum: 0.05,
    field: {
      base: ['#123043', '#03070c'],
      levels: [
        { f: 0.30, k: 'rung', c: ['#ffd166', '#6ee7ff', '#ff8ab0'], a: 0.8, sz: 0.75, j: 0.12 },
        { f: 0.10, k: 'soft', c: ['#7fd8ff', '#a0ffd0'], a: 0.35, sz: 1.0, j: 0.6 }
      ]
    },
    outer: function (g, r, n, t) {
      // двойная спираль: две синусоиды + перекладины
      var i, N = 40, x, y, y2, a = (n.ph || 0) + t * 0.25, L = r * 1.9;
      g.save();
      g.strokeStyle = 'rgba(130,220,255,.9)'; g.lineWidth = Math.max(1.2, r * 0.16);
      g.beginPath();
      for (i = 0; i <= N; i++) { y = -L + (2 * L) * i / N; x = Math.sin(y / L * 4 + a) * r * 0.6; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
      g.strokeStyle = 'rgba(255,210,120,.9)';
      g.beginPath();
      for (i = 0; i <= N; i++) { y = -L + (2 * L) * i / N; x = -Math.sin(y / L * 4 + a) * r * 0.6; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = Math.max(1, r * 0.07);
      for (i = 0; i <= 12; i++) {
        y = -L + (2 * L) * i / 12; y2 = Math.sin(y / L * 4 + a) * r * 0.6;
        g.beginPath(); g.moveTo(y2, y); g.lineTo(-y2, y); g.stroke();
      }
      g.restore();
    }
  };

  P.protein = {
    shell: 0.5, clip: false, lum: 0.1,
    field: {
      base: ['#1d2f22', '#03060a'],
      levels: [{ f: 0.33, k: 'soft', c: ['#a8ff9e', '#ffd98a'], a: 0.4, sz: 0.7, j: 0.6 }]
    },
    outer: function (g, r, n, t) {
      var i, a, rr, seed = (n.ph || 0);
      g.strokeStyle = 'rgba(140,255,180,.75)'; g.lineWidth = Math.max(1, r * 0.28);
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      for (i = 0; i <= 22; i++) {
        a = i * 0.42 + seed;
        rr = r * (0.9 - i / 30) * (1 + 0.3 * Math.sin(i * 1.7 + seed));
        if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.stroke();
      g.fillStyle = 'rgba(200,255,220,.8)';
      circle(g, Math.cos(seed) * r * 0.3, Math.sin(seed) * r * 0.3, r * 0.2);
    }
  };

  P.nucleosome = {
    shell: 0.35, clip: false, lum: 0.08,
    field: {
      base: ['#2a2118', '#07060a'],
      levels: [{ f: 0.22, k: 'soft', c: ['#ffd9a0', '#8fd8ff'], a: 0.4, sz: 0.75, j: 0.6 }]
    },
    outer: function (g, r, n, t) {
      var a = (n.ph || 0) + t * 0.2;
      ball(g, 0, 0, r * 0.62, '#ffe6b0', '#c08a3a');
      g.strokeStyle = 'rgba(120,220,255,.9)'; g.lineWidth = Math.max(1, r * 0.13);
      g.beginPath();
      for (var i = 0; i <= 60; i++) {
        var ang = a + (i / 60) * TAU * 1.7, rr = r * (0.75 + 0.12 * Math.sin(i * 0.9));
        if (i) g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr * 0.8); else g.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr * 0.8);
      }
      g.stroke();
    }
  };

  P.histone = {
    shell: 0.7, clip: false,
    outer: function (g, r, n, t) { ball(g, 0, 0, r, '#ffe6b0', '#b07a2a'); }
  };

  P.chromatin = {
    shell: 0.30, clip: false, lum: 0.05,
    field: {
      base: ['#2a2438', '#06050a'],
      levels: [
        { f: 0.33, k: 'thread', c: ['#c9a0ff', '#ff9ecb'], a: 0.55, sz: 1.1, j: 0.6 },
        { f: 0.11, k: 'soft', c: ['#e0c0ff'], a: 0.3, sz: 0.5, j: 0.7 }
      ]
    },
    outer: function (g, r, n, t) {
      g.strokeStyle = 'rgba(200,150,255,.7)'; g.lineWidth = Math.max(1.4, r * 0.22); g.lineCap = 'round';
      g.beginPath();
      for (var i = 0; i <= 30; i++) {
        var a = i * 0.7 + (n.ph || 0), rr = r * 0.85 * (0.75 + 0.25 * Math.sin(i * 0.8 + t * 0.4));
        if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.75); else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.75);
      }
      g.stroke();
    }
  };

  P.chromatinLoops = {
    shell: 0.22, clip: true, lum: 0.05,
    field: {
      base: ['#241d3a', '#05040a'],
      levels: [
        { f: 0.40, k: 'thread', c: ['#b48cff', '#ffa0d0', '#8fd8ff'], a: 0.55, sz: 1.2, j: 0.65 },
        { f: 0.13, k: 'soft', c: ['#d0b0ff'], a: 0.3, sz: 0.5, j: 0.75 }
      ]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(150,110,255,.25)', 'rgba(60,30,120,.18)', 'rgba(0,0,0,0)');
      blobPath(g, 0, 0, r, 12, 1.1, 0.22); g.fill();
    }
  };

  P.cohesin = {
    shell: 0.7, clip: false,
    outer: function (g, r, n, t) {
      g.strokeStyle = 'rgba(255,220,150,.85)'; g.lineWidth = Math.max(1, r * 0.28);
      g.beginPath(); g.arc(0, 0, r * 0.8, 0.6, TAU - 0.6); g.stroke();
    }
  };

  P.nucleolus = {
    shell: 0.45, clip: true, lum: 0.1,
    field: {
      base: ['#3a2350', '#080510'],
      levels: [
        { f: 0.13, k: 'poly', c: ['#ffb0e0', '#c08fff'], a: 0.6, sz: 0.8, j: 0.6 },
        { f: 0.05, k: 'soft', c: ['#ffd0f0'], a: 0.3, sz: 0.5, j: 0.7 }
      ]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, -r * .2, -r * .2, r * 1.4, 'rgba(255,180,230,.6)', 'rgba(130,70,180,.5)', 'rgba(60,20,90,0)');
      blobPath(g, 0, 0, r * 0.95, 11, 2.7, 0.18); g.fill();
    }
  };

  P.ribosome = {
    shell: 0.8, clip: false,
    outer: function (g, r, n, t) {
      ball(g, -r * 0.25, 0, r * 0.62, '#e8d6ff', '#7a5aa8');
      ball(g, r * 0.3, r * 0.1, r * 0.38, '#d0b8ff', '#5a3a88');
    }
  };

  P.rnaStrand = {
    shell: 0.7, clip: false,
    outer: function (g, r, n, t) {
      wavy(g, -r * 2, 0, r * 2, 0, r * 0.5, 1.4, (n.ph || 0) + t * 0.5, Math.max(1, r * 0.3), 'rgba(255,190,240,.85)');
    }
  };

  P.cellNucleus = {
    shell: 0.42, clip: true, lum: 0.08,
    field: {
      base: ['#3a2a52', '#0a0714'],
      levels: [
        { f: 0.05, k: 'thread', c: ['#c9a0ff', '#8fd8ff'], a: 0.45, sz: 1.1, j: 0.65 },
        { f: 0.017, k: 'soft', c: ['#e0c8ff'], a: 0.28, sz: 0.5, j: 0.75 }
      ]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, -r * .3, -r * .3, r * 1.4, 'rgba(190,150,255,.5)', 'rgba(90,60,160,.45)', 'rgba(30,15,60,0)');
      circle(g, 0, 0, r * 0.96);
      g.strokeStyle = 'rgba(220,190,255,.5)'; g.lineWidth = Math.max(1, r * 0.06);
      g.beginPath(); g.arc(0, 0, r * 0.96, 0, TAU); g.stroke();
    }
  };

  P.nuclearPore = {
    shell: 0.75, clip: false,
    outer: function (g, r, n, t) {
      g.strokeStyle = 'rgba(255,230,180,.8)'; g.lineWidth = Math.max(1, r * 0.35);
      g.beginPath(); g.arc(0, 0, r * 0.8, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(255,200,140,.5)'; g.lineWidth = Math.max(1, r * 0.16);
      for (var i = 0; i < 8; i++) {
        var a = i / 8 * TAU;
        g.beginPath(); g.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke();
      }
    }
  };

  P.cell = {
    shell: 0.24, clip: false, lum: 0.06,
    field: {
      base: ['#123a3a', '#04090c'],
      levels: [
        { f: 0.05, k: 'soft', c: ['#8fffc0', '#c8ff8f', '#8fd8ff'], a: 0.4, sz: 0.6, j: 0.7 },
        { f: 0.018, k: 'hard', c: ['#e0ffe0'], a: 0.3, sz: 0.35, j: 0.8 }
      ]
    },
    outer: function (g, r, n, t) {
      var wob = 1 + 0.03 * Math.sin(t * 0.9 + (n.ph || 0));
      g.fillStyle = rg(g, -r * .3, -r * .3, r * 1.5, 'rgba(140,255,220,.30)', 'rgba(40,120,140,.26)', 'rgba(10,40,60,0)');
      blobPath(g, 0, 0, r * 0.97 * wob, 22, (n.ph || 0), 0.05); g.fill();
      g.strokeStyle = 'rgba(160,255,225,.6)'; g.lineWidth = Math.max(1, r * 0.045);
      blobPath(g, 0, 0, r * 0.97 * wob, 22, (n.ph || 0), 0.05); g.stroke();
    }
  };

  P.mitochondrion = {
    shell: 0.5, clip: false, lum: 0.08,
    field: {
      base: ['#3a1a1a', '#0a0505'],
      levels: [{ s: 2e-7, k: 'thread', c: ['#ffb08f'], a: 0.4, sz: 1.1, j: 0.6 }]
    },
    outer: function (g, r, n, t) {
      var a = (n.ph || 0) + t * 0.1, i;
      g.save(); g.rotate(a);
      g.fillStyle = rg(g, 0, 0, r, '#ffc8a8', '#c04a2a', 'rgba(160,40,20,0)');
      g.beginPath(); g.ellipse(0, 0, r * 1.7, r * 0.8, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,220,190,.55)'; g.lineWidth = Math.max(1, r * 0.08);
      g.beginPath(); g.ellipse(0, 0, r * 1.7, r * 0.8, 0, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(255,180,140,.6)';
      for (i = -3; i <= 3; i++) {
        g.beginPath();
        g.moveTo(i * r * 0.45, -r * 0.7);
        g.quadraticCurveTo(i * r * 0.45 + r * 0.4, 0, i * r * 0.45, r * 0.7);
        g.stroke();
      }
      g.restore();
    }
  };

  P.golgi = {
    shell: 0.55, clip: false,
    outer: function (g, r, n, t) {
      var i, k;
      for (k = 0; k < 4; k++) {
        g.strokeStyle = 'rgba(255,220,140,' + (0.75 - k * 0.12) + ')';
        g.lineWidth = Math.max(1, r * 0.16);
        g.beginPath();
        g.ellipse(0, k * r * 0.42 - r * 0.6, r * (1.15 - k * 0.16), r * 0.28, 0, Math.PI * 1.05, Math.PI * 1.95);
        g.stroke();
      }
      for (i = 0; i < 5; i++) {
        g.fillStyle = 'rgba(255,240,190,.8)';
        circle(g, (i - 2) * r * 0.5, r * 0.9, r * 0.12);
      }
    }
  };

  P.er = {
    shell: 0.5, clip: false,
    outer: function (g, r, n, t) {
      g.strokeStyle = 'rgba(150,220,255,.6)'; g.lineWidth = Math.max(1, r * 0.14);
      for (var k = 0; k < 3; k++) {
        g.beginPath();
        g.ellipse(0, 0, r * (1.3 - k * 0.35), r * (0.9 - k * 0.25), k * 0.6 + (n.ph || 0), 0, TAU);
        g.stroke();
      }
    }
  };

  P.vesicle = {
    shell: 0.6, clip: false,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, -r * .3, -r * .3, r * 1.3, 'rgba(200,255,255,.6)', 'rgba(80,160,190,.35)', 'rgba(0,40,60,0)');
      circle(g, 0, 0, r * 0.9);
      g.strokeStyle = 'rgba(220,255,255,.7)'; g.lineWidth = Math.max(1, r * 0.12);
      g.beginPath(); g.arc(0, 0, r * 0.9, 0, TAU); g.stroke();
    }
  };

  P.bacterium = {
    shell: 0.55, clip: false, lum: 0.08,
    field: {
      base: ['#1a3a2a', '#040a08'],
      levels: [{ s: 3e-8, k: 'soft', c: ['#b0ffcf'], a: 0.35, sz: 0.6, j: 0.7 }]
    },
    outer: function (g, r, n, t) {
      var a = (n.ph || 0) + t * 0.5, i;
      g.save(); g.rotate(a * 0.3);
      g.fillStyle = rg(g, -r * .4, -r * .3, r * 2, '#d8ffe8', '#3aa870', 'rgba(20,90,60,0)');
      g.beginPath(); g.ellipse(0, 0, r * 1.6, r * 0.85, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(220,255,235,.65)'; g.lineWidth = Math.max(1, r * 0.1);
      g.beginPath(); g.ellipse(0, 0, r * 1.6, r * 0.85, 0, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(200,255,220,.5)';
      for (i = 0; i < 5; i++) {
        wavy(g, (i - 2) * r * 0.5, 0, (i - 2) * r * 0.5, r * 2.2, r * 0.5, 1.6, a + i, Math.max(1, r * 0.14), 'rgba(200,255,220,.55)');
      }
      g.restore();
    }
  };

  P.epitheliumCell = { shell: 0.4, clip: false, outer: function (g, r, n, t) { P.cell.outer(g, r, n, t); } };
  P.epidermisCell = { shell: 0.45, clip: false, field: null, outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(255,220,190,.55)', 'rgba(190,150,120,.4)', 'rgba(120,80,60,0)');
      blobPath(g, 0, 0, r * 0.95, 13, (n.ph || 0), 0.12); g.fill();
      g.strokeStyle = 'rgba(255,235,220,.5)'; g.lineWidth = Math.max(1, r * 0.08);
      blobPath(g, 0, 0, r * 0.95, 13, (n.ph || 0), 0.12); g.stroke();
    } };

  P.macrophage = {
    shell: 0.5, clip: false, lum: 0.08,
    field: {
      base: ['#3a1520', '#0a0406'],
      levels: [{ s: 1e-7, k: 'soft', c: ['#ffb0c0'], a: 0.35, sz: 0.6, j: 0.75 }]
    },
    outer: function (g, r, n, t) {
      var wob = 0.16 + 0.06 * Math.sin(t * 1.4 + (n.ph || 0)), i;
      g.fillStyle = rg(g, 0, 0, r * 1.2, 'rgba(255,190,200,.5)', 'rgba(160,50,80,.4)', 'rgba(80,10,30,0)');
      blobPath(g, 0, 0, r * 0.9, 16, (n.ph || 0), wob); g.fill();
      for (i = 0; i < 6; i++) {
        var a = i * 1.05 + (n.ph || 0);
        g.beginPath();
        g.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
        g.quadraticCurveTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3, Math.cos(a + 0.4) * r * 1.1, Math.sin(a + 0.4) * r * 1.1);
        g.strokeStyle = 'rgba(255,180,190,.4)'; g.lineWidth = Math.max(1, r * 0.1); g.stroke();
      }
    }
  };

  P.fibroblast = {
    shell: 0.4, clip: false,
    outer: function (g, r, n, t) {
      g.save(); g.rotate((n.ph || 0));
      g.fillStyle = rg(g, 0, 0, r, 'rgba(255,220,180,.45)', 'rgba(160,120,80,.35)', 'rgba(80,60,30,0)');
      g.beginPath(); g.ellipse(0, 0, r * 1.7, r * 0.5, 0, 0, TAU); g.fill();
      g.restore();
    }
  };

  P.cellCluster = {
    shell: 0.20, clip: false, lum: 0.05,
    field: {
      base: ['#2a1a2a', '#0a0508'],
      levels: [
        { f: 0.17, k: 'bubble', c: ['rgba(255,190,210,.35)', 'rgba(255,220,180,.3)'], a: 0.55, sz: 0.75, j: 0.5 },
        { f: 0.06, k: 'soft', c: ['#ffd0c0'], a: 0.25, sz: 0.5, j: 0.7 }
      ]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(255,200,190,.22)', 'rgba(140,80,90,.2)', 'rgba(0,0,0,0)');
      blobPath(g, 0, 0, r, 18, 2.1, 0.12); g.fill();
    }
  };

  P.capillary = {
    shell: 0.55, clip: false, lum: 0.1,
    field: {
      base: ['#4a0f14', '#0d0303'],
      levels: [{ s: 2e-5, k: 'blob', c: ['#ff6a6a', '#ffd0a0'], a: 0.5, sz: 0.7, j: 0.6 }]
    },
    outer: function (g, r, n, t) {
      var a = (n.ph || 0) * 0.5, L = r * 2.4;
      g.save(); g.rotate(a);
      g.strokeStyle = 'rgba(255,120,120,.35)'; g.lineWidth = r * 0.9;
      g.beginPath(); g.moveTo(-L, 0); g.quadraticCurveTo(0, r * 0.6, L, 0); g.stroke();
      g.strokeStyle = 'rgba(255,190,190,.5)'; g.lineWidth = Math.max(1, r * 0.1);
      g.beginPath(); g.moveTo(-L, -r * 0.45); g.quadraticCurveTo(0, r * 0.15, L, -r * 0.45); g.stroke();
      g.beginPath(); g.moveTo(-L, r * 0.45); g.quadraticCurveTo(0, r * 1.05, L, r * 0.45); g.stroke();
      // клетки крови бегут по сосуду
      for (var i = 0; i < 5; i++) {
        var u = ((t * 0.18 + i / 5 + (n.ph || 0) * 0.1) % 1) * 2 - 1;
        g.fillStyle = 'rgba(255,80,90,.85)';
        circle(g, u * L, Math.sin(u * 1.6) * r * 0.2, r * 0.34);
      }
      g.restore();
    }
  };

  P.nerve = {
    shell: 0.5, clip: false,
    outer: function (g, r, n, t) {
      var i;
      g.strokeStyle = 'rgba(255,240,160,.75)'; g.lineWidth = Math.max(1, r * 0.22);
      g.beginPath(); g.moveTo(-r * 2, 0); g.lineTo(r * 2, 0); g.stroke();
      g.strokeStyle = 'rgba(255,220,120,.5)'; g.lineWidth = Math.max(1, r * 0.1);
      for (i = -3; i <= 3; i++) {
        g.beginPath(); g.moveTo(i * r * 0.6, 0); g.lineTo(i * r * 0.6 + r * 0.3, -r * 0.5 * Math.sign(i || 1)); g.stroke();
      }
      var p = (t * 0.6 + (n.ph || 0)) % 1;
      g.fillStyle = 'rgba(255,255,220,.9)';
      circle(g, (-1 + 2 * p) * r * 2, 0, r * 0.3);
    }
  };

  P.hairFollicle = {
    shell: 0.5, clip: false,
    outer: function (g, r, n, t) {
      g.strokeStyle = 'rgba(90,60,40,.9)'; g.lineWidth = Math.max(1, r * 0.3);
      wavy(g, 0, r * 2, 0, -r * 1.2, r * 0.2, 1.1, (n.ph || 0), Math.max(1, r * 0.3), 'rgba(80,55,35,.95)');
      g.fillStyle = rg(g, 0, r * 0.4, r, '#ffe0c0', '#a06840', 'rgba(80,40,20,0)');
      g.beginPath(); g.ellipse(0, r * 0.5, r * 0.7, r * 0.95, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,180,120,.9)';
      circle(g, 0, r * 1.15, r * 0.3);
    }
  };

  P.sweatGland = {
    shell: 0.5, clip: false,
    outer: function (g, r, n, t) {
      g.strokeStyle = 'rgba(200,230,255,.6)'; g.lineWidth = Math.max(1, r * 0.25);
      wavy(g, 0, -r * 1.6, 0, r * 0.6, r * 0.35, 1.6, (n.ph || 0), Math.max(1, r * 0.22), 'rgba(200,230,255,.6)');
      g.fillStyle = rg(g, 0, r * 0.6, r, 'rgba(220,245,255,.8)', 'rgba(120,170,210,.5)', 'rgba(0,0,0,0)');
      blobPath(g, 0, r * 0.8, r * 0.7, 10, 1.9, 0.2); g.fill();
    }
  };

  P.tissue = {
    shell: 0.17, clip: false, lum: 0.04,
    field: {
      base: ['#3a2020', '#0a0505'],
      levels: [
        { f: 0.15, k: 'bubble', c: ['rgba(255,200,180,.4)', 'rgba(255,170,170,.35)'], a: 0.6, sz: 0.8, j: 0.45 },
        { f: 0.05, k: 'soft', c: ['#ffb0a0', '#e08fa0'], a: 0.28, sz: 0.5, j: 0.7 }
      ]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(255,190,180,.22)', 'rgba(150,80,90,.2)', 'rgba(0,0,0,0)');
      blobPath(g, 0, 0, r, 20, 1.4, 0.1); g.fill();
    }
  };

  P.skin = {
    shell: 0.20, clip: false, lum: 0.05,
    field: {
      base: ['#5a3a2a', '#120806'],
      levels: [
        { f: 0.17, k: 'poly', c: ['rgba(255,220,190,.5)', 'rgba(230,180,150,.45)'], a: 0.6, sz: 0.85, j: 0.3 },
        { f: 0.055, k: 'grain', c: ['rgba(255,235,210,.3)'], a: 0.35, sz: 0.4, j: 0.8 }
      ]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, -r * .2, -r * .3, r * 1.4, 'rgba(255,210,180,.5)', 'rgba(170,110,80,.45)', 'rgba(90,50,30,0)');
      blobPath(g, 0, 0, r, 16, 2.6, 0.08); g.fill();
      g.strokeStyle = 'rgba(255,225,200,.35)'; g.lineWidth = Math.max(1, r * 0.05);
      blobPath(g, 0, 0, r, 16, 2.6, 0.08); g.stroke();
    }
  };

  P.dustMite = {
    shell: 0.6, clip: false,
    outer: function (g, r, n, t) {
      var i, a;
      g.fillStyle = rg(g, 0, 0, r * 1.3, 'rgba(255,240,220,.9)', 'rgba(190,150,110,.7)', 'rgba(80,60,30,0)');
      blobPath(g, 0, 0, r * 0.85, 14, 3.3, 0.12); g.fill();
      g.strokeStyle = 'rgba(240,220,190,.8)'; g.lineWidth = Math.max(1, r * 0.1);
      for (i = 0; i < 8; i++) {
        a = (i < 4 ? 0.5 : 2.2) + (i % 4) * 0.45 + Math.sin(t * 2 + i) * 0.12;
        g.beginPath(); g.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
        g.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5); g.stroke();
      }
    }
  };

  P.fingerprint = {
    shell: 0.22, clip: true, lum: 0.05,
    field: {
      base: ['#6a4436', '#140a08'],
      levels: [
        { f: 0.17, k: 'thread', c: ['rgba(255,225,200,.65)', 'rgba(255,190,160,.5)'], a: 0.75, sz: 1.3, j: 0.25 },
        { f: 0.055, k: 'soft', c: ['rgba(255,235,215,.35)'], a: 0.4, sz: 0.6, j: 0.6 }
      ]
    },
    outer: function (g, r, n, t) {
      var i;
      g.fillStyle = rg(g, -r * .2, -r * .3, r * 1.4, 'rgba(255,215,185,.6)', 'rgba(180,120,90,.5)', 'rgba(90,50,30,0)');
      circle(g, 0, 0, r);
      g.strokeStyle = 'rgba(255,230,205,.55)'; g.lineWidth = Math.max(1, r * 0.07);
      for (i = 0; i < 6; i++) {
        g.beginPath();
        g.ellipse(0, 0, r * (0.25 + i * 0.13), r * (0.18 + i * 0.13), 0.4 + (n.ph || 0) * 0.1, 0, TAU);
        g.stroke();
      }
    }
  };

  P.pore = {
    shell: 0.7, clip: false,
    outer: function (g, r, n, t) {
      g.fillStyle = 'rgba(60,30,20,.85)';
      circle(g, 0, 0, r * 0.8);
      g.strokeStyle = 'rgba(255,220,190,.7)'; g.lineWidth = Math.max(1, r * 0.2);
      g.beginPath(); g.arc(0, 0, r * 0.8, 0, TAU); g.stroke();
    }
  };

  P.finger = {
    shell: 0.30, clip: false, lum: 0.05,
    field: {
      base: ['#5a3428', '#120806'],
      levels: [
        { f: 0.18, k: 'poly', c: ['rgba(255,220,190,.45)'], a: 0.5, sz: 0.9, j: 0.35 },
        { f: 0.06, k: 'grain', c: ['rgba(255,235,215,.3)'], a: 0.3, sz: 0.4, j: 0.8 }
      ]
    },
    outer: function (g, r, n, t) {
      g.save(); g.rotate(-0.25);
      g.fillStyle = rg(g, 0, 0, r * 1.6, 'rgba(255,214,186,.65)', 'rgba(178,116,88,.55)', 'rgba(90,50,30,0)');
      g.beginPath();
      if (g.roundRect) { g.roundRect(-r * 0.42, -r * 1.9, r * 0.84, r * 3.6, r * 0.4); }
      else { g.rect(-r * 0.42, -r * 1.9, r * 0.84, r * 3.6); }
      g.fill();
      g.strokeStyle = 'rgba(255,230,210,.4)'; g.lineWidth = Math.max(1, r * 0.04);
      g.stroke();
      g.restore();
    }
  };

  P.bone = {
    shell: 0.85, clip: false,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r * 1.2, '#fffbf0', '#cfc3a8', '#6a6250');
      g.beginPath(); g.ellipse(0, 0, r * 0.35, r * 1.5, (n.ph || 0) * 0.2, 0, TAU); g.fill();
      circle(g, 0, -r * 1.5, r * 0.5); circle(g, 0, r * 1.5, r * 0.5);
      g.fillStyle = 'rgba(255,255,255,.3)';
      circle(g, -r * 0.1, -r * 0.6, r * 0.12);
    }
  };

  P.muscle = {
    shell: 0.5, clip: false,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r * 1.3, 'rgba(255,140,130,.75)', 'rgba(150,40,50,.65)', 'rgba(70,10,20,0)');
      g.beginPath(); g.ellipse(0, 0, r * 1.6, r * 0.6, (n.ph || 0) * 0.5, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,190,180,.4)'; g.lineWidth = Math.max(1, r * 0.06);
      for (var i = -2; i <= 2; i++) {
        g.beginPath(); g.moveTo(-r * 1.4, i * r * 0.2); g.lineTo(r * 1.4, i * r * 0.2); g.stroke();
      }
    }
  };

  /* ---------- человек и его внутренности ---------------------------------- */
  P.human = {
    shell: 0.62, clip: false, lum: 0.04,
    field: {
      base: ['#3a1a1e', '#0a0406'],
      levels: [
        { s: 1.2e-5, k: 'bubble', c: ['rgba(255,190,180,.35)'], a: 0.5, sz: 0.8, j: 0.5 },
        { s: 5e-6, k: 'soft', c: ['rgba(255,150,150,.35)'], a: 0.3, sz: 0.5, j: 0.75 }
      ]
    },
    // фигура 1,75 м: узел имеет радиус 0,5 м, значит рост = 3,5 r
    outer: function (g, r, n, t) {
      var S = 3.5 * r;                       // рост
      var top = -S / 2, hip = S * 0.06, foot = S / 2;
      var tint = n.tint === undefined ? 0.6 : n.tint;
      var skin = hs(28, 46 + tint * 10, 66, 0.95), shirt = hs(206 - tint * 40, 46, 58, 0.95),
          pants = hs(216 - tint * 24, 26, 34, 0.96);
      var headR = S * 0.072, shoulder = top + S * 0.20, chest = top + S * 0.29;
      var sway = Math.sin(t * 0.7 + (n.ph || 0)) * 0.012 * S;
      g.save(); g.translate(sway, 0);
      // ноги
      g.fillStyle = pants;
      g.beginPath();
      g.moveTo(-S * 0.075, hip); g.lineTo(-S * 0.02, hip); g.lineTo(-S * 0.02 + S * 0.01, foot);
      g.lineTo(-S * 0.085, foot); g.closePath(); g.fill();
      g.beginPath();
      g.moveTo(S * 0.075, hip); g.lineTo(S * 0.02, hip); g.lineTo(S * 0.02 - S * 0.01, foot);
      g.lineTo(S * 0.085, foot); g.closePath(); g.fill();
      // корпус
      g.fillStyle = shirt;
      g.beginPath();
      g.moveTo(-S * 0.105, shoulder); g.lineTo(S * 0.105, shoulder);
      g.quadraticCurveTo(S * 0.12, chest, S * 0.085, hip + S * 0.02);
      g.lineTo(-S * 0.085, hip + S * 0.02);
      g.quadraticCurveTo(-S * 0.12, chest, -S * 0.105, shoulder);
      g.closePath(); g.fill();
      // руки
      g.strokeStyle = shirt; g.lineWidth = S * 0.055; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-S * 0.095, shoulder + S * 0.01); g.quadraticCurveTo(-S * 0.15, chest + S * 0.1, -S * 0.115, hip + S * 0.06); g.stroke();
      g.beginPath(); g.moveTo(S * 0.095, shoulder + S * 0.01); g.quadraticCurveTo(S * 0.15, chest + S * 0.1, S * 0.115, hip + S * 0.06); g.stroke();
      // кисти
      g.fillStyle = skin;
      circle(g, -S * 0.115, hip + S * 0.07, S * 0.028);
      circle(g, S * 0.115, hip + S * 0.07, S * 0.028);
      // шея и голова
      g.fillStyle = skin;
      g.fillRect(-S * 0.022, shoulder - S * 0.05, S * 0.044, S * 0.05);
      circle(g, 0, shoulder - S * 0.055 - headR, headR);
      // волосы
      g.fillStyle = hs(28, 30, 18 + tint * 14, 0.95);
      g.beginPath(); g.arc(0, shoulder - S * 0.055 - headR, headR, Math.PI * 1.05, Math.PI * 1.95); g.fill();
      // подсветка
      g.fillStyle = 'rgba(255,255,255,.14)';
      g.beginPath(); g.ellipse(-S * 0.03, chest, S * 0.03, S * 0.1, 0.2, 0, TAU); g.fill();
      // контур: фигура читается даже на тёмном фоне
      g.strokeStyle = 'rgba(255,246,232,.55)';
      g.lineWidth = Math.max(1, S * 0.012);
      g.beginPath();
      g.moveTo(-S * 0.105, shoulder); g.lineTo(S * 0.105, shoulder);
      g.quadraticCurveTo(S * 0.12, chest, S * 0.085, hip + S * 0.02);
      g.lineTo(-S * 0.085, hip + S * 0.02);
      g.quadraticCurveTo(-S * 0.12, chest, -S * 0.105, shoulder);
      g.closePath(); g.stroke();
      g.beginPath(); g.arc(0, shoulder - S * 0.055 - headR, headR, 0, TAU); g.stroke();
      g.restore();
    }
  };

  P.heart = {
    shell: 0.75, clip: false,
    outer: function (g, r, n, t) {
      var beat = 1 + 0.10 * Math.sin(t * 5.2) + 0.05 * Math.sin(t * 10.4);
      var s = r * beat;
      g.save();
      g.fillStyle = rg(g, -s * .3, -s * .3, s * 1.8, '#ff9a9a', '#c01f3a', 'rgba(120,10,30,0)');
      blobPath(g, 0, 0, s, 14, 1.1, 0.24); g.fill();
      g.strokeStyle = 'rgba(255,180,180,.6)'; g.lineWidth = Math.max(1, s * 0.12);
      blobPath(g, 0, 0, s, 14, 1.1, 0.24); g.stroke();
      g.fillStyle = 'rgba(180,30,60,.6)';
      g.beginPath(); g.ellipse(s * 0.35, -s * 0.2, s * 0.3, s * 0.16, 0.6, 0, TAU); g.fill();
      g.restore();
    }
  };

  P.lung = {
    shell: 0.55, clip: false,
    outer: function (g, r, n, t) {
      var br = 1 + 0.03 * Math.sin(t * 1.1 + (n.ph || 0));
      g.save(); g.scale(1, br);
      g.fillStyle = rg(g, 0, 0, r * 1.3, 'rgba(255,190,200,.7)', 'rgba(190,90,120,.55)', 'rgba(90,30,60,0)');
      blobPath(g, 0, 0, r, 12, 2.2, 0.16); g.fill();
      g.strokeStyle = 'rgba(255,220,230,.35)'; g.lineWidth = Math.max(1, r * 0.06);
      blobPath(g, 0, 0, r, 12, 2.2, 0.16); g.stroke();
      g.restore();
    }
  };

  P.brain = {
    shell: 0.7, clip: false,
    outer: function (g, r, n, t) {
      var i;
      g.fillStyle = rg(g, 0, 0, r * 1.3, 'rgba(255,200,190,.85)', 'rgba(190,120,130,.7)', 'rgba(90,40,60,0)');
      blobPath(g, 0, 0, r, 16, 3.7, 0.18); g.fill();
      g.strokeStyle = 'rgba(255,235,230,.3)'; g.lineWidth = Math.max(1, r * 0.09);
      for (i = 0; i < 5; i++) {
        g.beginPath();
        g.arc((i - 2) * r * 0.34, -r * 0.1 + (i % 2) * r * 0.3, r * 0.36, 0, TAU);
        g.stroke();
      }
      // вспышки нейронной активности
      for (i = 0; i < 3; i++) {
        var a = t * 1.3 + i * 2.1 + (n.ph || 0);
        g.fillStyle = 'rgba(180,230,255,' + (0.35 + 0.35 * Math.sin(a)) + ')';
        circle(g, Math.cos(a) * r * 0.6, Math.sin(a * 0.7) * r * 0.4, r * 0.1);
      }
    }
  };

  /* ---------- животные ---------------------------------------------------- */
  P.cat = {
    shell: 0.85, clip: false,
    outer: function (g, r, n, t) {
      var body = hs(30 + (n.tint || 0) * 20, 30, 42, 0.95), i;
      var tail = Math.sin(t * 1.1 + (n.ph || 0)) * 0.5;
      g.strokeStyle = body; g.lineWidth = r * 0.16; g.lineCap = 'round';
      g.beginPath(); g.moveTo(r * 0.7, r * 0.1);
      g.quadraticCurveTo(r * 1.3, -r * 0.2 + tail * r * 0.6, r * 1.1, -r * 0.8 + tail * r * 0.8); g.stroke();
      g.fillStyle = body;
      g.beginPath(); g.ellipse(-r * 0.15, 0, r * 0.85, r * 0.42, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.08)';
      g.beginPath(); g.ellipse(-r * 0.35, -r * 0.1, r * 0.5, r * 0.2, 0, 0, TAU); g.fill();
      g.fillStyle = body;
      g.beginPath(); g.arc(-r * 0.85, -r * 0.32, r * 0.34, 0, TAU); g.fill();
      g.beginPath();
      g.moveTo(-r * 1.05, -r * 0.5); g.lineTo(-r * 1.2, -r * 0.85); g.lineTo(-r * 0.85, -r * 0.6); g.closePath(); g.fill();
      g.beginPath();
      g.moveTo(-r * 0.72, -r * 0.55); g.lineTo(-r * 0.62, -r * 0.9); g.lineTo(-r * 0.5, -r * 0.58); g.closePath(); g.fill();
      g.fillStyle = 'rgba(180,255,190,.9)';
      circle(g, -r * 0.95, -r * 0.36, r * 0.06); circle(g, -r * 0.78, -r * 0.36, r * 0.06);
      for (i = 0; i < 4; i++) {
        g.strokeStyle = body; g.lineWidth = r * 0.1;
        g.beginPath(); g.moveTo(-r * 0.6 + i * r * 0.45, r * 0.3); g.lineTo(-r * 0.6 + i * r * 0.45, r * 0.72); g.stroke();
      }
    }
  };

  P.dog = {
    shell: 0.88, clip: false,
    outer: function (g, r, n, t) {
      var body = hs(28 + (n.tint || 0) * 16, 34, 46, 0.95), i;
      var wag = Math.sin(t * 6 + (n.ph || 0)) * 0.4;
      g.strokeStyle = body; g.lineWidth = r * 0.17; g.lineCap = 'round';
      g.beginPath(); g.moveTo(r * 0.75, r * 0.05);
      g.quadraticCurveTo(r * 1.15, -r * 0.3, r * 1.0 + wag * r * 0.3, -r * 0.6); g.stroke();
      g.fillStyle = body;
      g.beginPath(); g.ellipse(0, 0, r * 0.95, r * 0.44, 0, 0, TAU); g.fill();
      g.beginPath(); g.arc(-r * 0.85, -r * 0.3, r * 0.36, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(-r * 1.12, -r * 0.14, r * 0.24, r * 0.16, 0.25, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(-r * 0.78, -r * 0.6, r * 0.14, r * 0.26, 0.3, 0, TAU); g.fill();
      g.fillStyle = 'rgba(20,10,5,.9)';
      circle(g, -r * 1.25, -r * 0.16, r * 0.05);
      for (i = 0; i < 4; i++) {
        g.strokeStyle = body; g.lineWidth = r * 0.11;
        g.beginPath(); g.moveTo(-r * 0.65 + i * r * 0.5, r * 0.32); g.lineTo(-r * 0.65 + i * r * 0.5, r * 0.78); g.stroke();
      }
    }
  };

  P.bird = {
    shell: 0.9, clip: false,
    outer: function (g, r, n, t) {
      var flap = Math.sin(t * 7 + (n.ph || 0)) * 0.9;
      g.save(); g.rotate(0.1 * Math.sin(t * 0.9 + (n.ph || 0)));
      g.fillStyle = 'rgba(30,26,24,.92)';
      g.beginPath(); g.ellipse(0, 0, r * 0.5, r * 0.26, 0, 0, TAU); g.fill();
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(-r * 0.6, -r * 0.9 * flap - r * 0.2, -r * 1.5, -r * 0.5 * flap);
      g.quadraticCurveTo(-r * 0.6, r * 0.2 * flap, 0, 0);
      g.fill();
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(r * 0.6, -r * 0.9 * flap - r * 0.2, r * 1.5, -r * 0.5 * flap);
      g.quadraticCurveTo(r * 0.6, r * 0.2 * flap, 0, 0);
      g.fill();
      g.beginPath(); g.arc(-r * 0.5, -r * 0.1, r * 0.2, 0, TAU); g.fill();
      g.fillStyle = 'rgba(220,170,60,.9)';
      g.beginPath(); g.moveTo(-r * 0.68, -r * 0.1); g.lineTo(-r * 0.85, -r * 0.04); g.lineTo(-r * 0.68, 0); g.closePath(); g.fill();
      g.restore();
    }
  };

  P.fly = {
    shell: 0.8, clip: false,
    outer: function (g, r, n, t) {
      var f = Math.abs(Math.sin(t * 22 + (n.ph || 0)));
      g.fillStyle = 'rgba(200,225,255,.45)';
      g.beginPath(); g.ellipse(-r * 0.5, -r * 0.5, r * 0.8, r * 0.3 * (0.4 + f), -0.5, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(r * 0.5, -r * 0.5, r * 0.8, r * 0.3 * (0.4 + f), 0.5, 0, TAU); g.fill();
      g.fillStyle = 'rgba(30,34,40,.95)';
      g.beginPath(); g.ellipse(0, 0, r * 0.75, r * 0.45, 0, 0, TAU); g.fill();
      g.beginPath(); g.arc(-r * 0.62, -r * 0.1, r * 0.3, 0, TAU); g.fill();
      g.fillStyle = 'rgba(160,40,50,.9)';
      circle(g, -r * 0.85, -r * 0.15, r * 0.14); circle(g, -r * 0.85, -r * 0.15, r * 0.14);
    }
  };

  P.mosquito = {
    shell: 0.8, clip: false,
    outer: function (g, r, n, t) {
      var f = Math.abs(Math.sin(t * 30 + (n.ph || 0)));
      g.fillStyle = 'rgba(220,235,255,.4)';
      g.beginPath(); g.ellipse(0, -r * 0.35, r * 0.55, r * 0.22 * (0.4 + f), 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(40,36,32,.95)';
      g.beginPath(); g.ellipse(0, 0, r * 0.3, r * 0.7, 0, 0, TAU); g.fill();
      circle(g, 0, -r * 0.85, r * 0.22);
      g.strokeStyle = 'rgba(40,36,32,.9)'; g.lineWidth = Math.max(1, r * 0.09);
      g.beginPath(); g.moveTo(0, -r * 1.05); g.lineTo(0, -r * 1.8); g.stroke();
      g.beginPath(); g.moveTo(-r * 0.2, r * 0.6); g.lineTo(-r * 0.9, r * 1.4); g.stroke();
      g.beginPath(); g.moveTo(r * 0.2, r * 0.6); g.lineTo(r * 0.9, r * 1.4); g.stroke();
    }
  };

  P.butterfly = {
    shell: 0.8, clip: false,
    outer: function (g, r, n, t) {
      var f = Math.sin(t * 3 + (n.ph || 0)) * 0.5 + 0.5;
      var hue = (n.tint || 0) * 360;
      g.save();
      [1, -1].forEach(function (s) {
        g.save(); g.scale(s, 1);
        g.fillStyle = hs(hue, 70, 55, 0.9);
        g.beginPath();
        g.ellipse(r * 0.55, -r * 0.35, r * 0.62 * (0.35 + f * 0.65), r * 0.5, -0.3, 0, TAU); g.fill();
        g.beginPath();
        g.ellipse(r * 0.45, r * 0.45, r * 0.45 * (0.35 + f * 0.65), r * 0.38, 0.3, 0, TAU); g.fill();
        g.fillStyle = hs(hue, 70, 30, 0.9);
        circle(g, r * 0.6, -r * 0.4, r * 0.1);
        g.restore();
      });
      g.fillStyle = 'rgba(30,26,24,.95)';
      g.beginPath(); g.ellipse(0, 0, r * 0.09, r * 0.55, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(30,26,24,.95)'; g.lineWidth = Math.max(1, r * 0.05);
      g.beginPath(); g.moveTo(0, -r * 0.5); g.lineTo(-r * 0.25, -r * 0.85); g.stroke();
      g.beginPath(); g.moveTo(0, -r * 0.5); g.lineTo(r * 0.25, -r * 0.85); g.stroke();
      g.restore();
    }
  };

  P.flower = {
    shell: 0.8, clip: false,
    outer: function (g, r, n, t) {
      var hue = (n.tint || 0) * 320, i, a;
      g.strokeStyle = 'rgba(70,140,60,.9)'; g.lineWidth = Math.max(1, r * 0.14);
      g.beginPath(); g.moveTo(0, r * 1.6); g.quadraticCurveTo(r * 0.2, r * 0.6, 0, 0); g.stroke();
      g.strokeStyle = 'rgba(80,160,70,.85)';
      g.beginPath(); g.moveTo(0, r * 1.0); g.quadraticCurveTo(-r * 0.6, r * 0.75, -r * 0.75, r * 0.95);
      g.quadraticCurveTo(-r * 0.3, r * 1.15, 0, r * 1.0); g.stroke();
      for (i = 0; i < 6; i++) {
        a = i / 6 * TAU + Math.sin(t * 0.8 + (n.ph || 0)) * 0.05;
        g.fillStyle = hs(hue, 75, 62, 0.95);
        g.beginPath();
        g.ellipse(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5 - r * 0.1, r * 0.42, r * 0.26, a, 0, TAU);
        g.fill();
      }
      g.fillStyle = 'rgba(255,215,90,.95)';
      circle(g, 0, -r * 0.1, r * 0.28);
    }
  };

  P.tree = {
    shell: 0.82, clip: false,
    outer: function (g, r, n, t) {
      var sway = Math.sin(t * 0.6 + (n.ph || 0)) * r * 0.04, i, a, rr;
      g.save(); g.translate(sway, 0);
      g.strokeStyle = 'rgba(78,54,36,.95)'; g.lineWidth = Math.max(1, r * 0.16); g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, r * 1.5); g.lineTo(0, -r * 0.2); g.stroke();
      g.lineWidth = Math.max(1, r * 0.09);
      for (i = 0; i < 3; i++) {
        a = -1.9 + i * 1.1;
        g.beginPath(); g.moveTo(0, r * 0.4); g.lineTo(Math.cos(a) * r * 0.7, -r * 0.3 + Math.sin(a) * r * 0.5); g.stroke();
      }
      for (i = 0; i < 9; i++) {
        a = i / 9 * TAU + (n.ph || 0);
        rr = r * (0.45 + 0.35 * ((i * 7) % 5) / 5);
        g.fillStyle = 'rgba(' + (40 + (i * 13) % 40) + ',' + (110 + (i * 17) % 60) + ',' + (50 + (i * 11) % 30) + ',.9)';
        g.beginPath();
        g.ellipse(Math.cos(a) * rr * 0.9, -r * 0.6 + Math.sin(a) * rr * 0.6, rr * 0.62, rr * 0.5, 0, 0, TAU);
        g.fill();
      }
      g.restore();
    }
  };

  P.plant = {
    shell: 0.8, clip: false,
    outer: function (g, r, n, t) {
      var i, a;
      g.strokeStyle = 'rgba(60,130,60,.9)'; g.lineWidth = Math.max(1, r * 0.07);
      for (i = 0; i < 7; i++) {
        a = -1.4 + i * 0.45 + Math.sin(t * 0.5 + i) * 0.05;
        g.beginPath(); g.moveTo(0, r * 0.9);
        g.quadraticCurveTo(Math.cos(a) * r * 0.8, r * 0.2, Math.cos(a) * r * 1.1, -r * 0.6);
        g.stroke();
        g.fillStyle = 'rgba(70,150,70,.85)';
        g.beginPath();
        g.ellipse(Math.cos(a) * r * 1.1, -r * 0.6, r * 0.22, r * 0.1, a + 0.6, 0, TAU);
        g.fill();
      }
      g.fillStyle = 'rgba(150,90,50,.9)';
      g.beginPath(); g.moveTo(-r * 0.5, r * 0.9); g.lineTo(r * 0.5, r * 0.9);
      g.lineTo(r * 0.35, r * 1.3); g.lineTo(-r * 0.35, r * 1.3); g.closePath(); g.fill();
    }
  };

  /* ---------- быт, техника ------------------------------------------------ */
  P.room = {
    shell: 1, clip: false, lum: -0.05,
    field: {
      base: ['#4a3a2e', '#160f0c'],
      levels: [
        { f: 0.30, k: 'soft', c: ['rgba(255,225,180,.35)'], a: 0.35, sz: 0.9, j: 0.4 },
        { f: 0.10, k: 'grain', c: ['rgba(255,240,220,.18)'], a: 0.25, sz: 0.5, j: 0.8 }
      ]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = lg(g, 0, -r, 0, r, [0, '#6a5540', 0.55, '#3a2c22', 1, '#241a14']);
      g.fillRect(-r, -r, r * 2, r * 2);
      g.strokeStyle = 'rgba(255,230,190,.25)'; g.lineWidth = Math.max(1, r * 0.02);
      g.beginPath(); g.moveTo(-r, r * 0.55); g.lineTo(r, r * 0.55); g.stroke();
      g.beginPath(); g.moveTo(-r * 0.1, -r); g.lineTo(-r * 0.1, r); g.stroke();
    }
  };

  P.table = {
    shell: 0.9, clip: false,
    outer: function (g, r, n, t) {
      g.fillStyle = 'rgba(120,80,50,.95)';
      g.fillRect(-r * 1.4, -r * 0.5, r * 2.8, r * 0.16);
      g.fillRect(-r * 1.25, -r * 0.35, r * 0.12, r * 1.2);
      g.fillRect(r * 1.13, -r * 0.35, r * 0.12, r * 1.2);
      g.fillStyle = 'rgba(255,230,200,.12)';
      g.fillRect(-r * 1.4, -r * 0.5, r * 2.8, r * 0.05);
    }
  };

  P.chair = {
    shell: 0.9, clip: false,
    outer: function (g, r, n, t) {
      g.fillStyle = 'rgba(90,70,60,.95)';
      g.fillRect(-r * 0.5, -r * 0.1, r, r * 0.14);
      g.fillRect(-r * 0.5, -r * 1.0, r * 0.12, r * 0.9);
      g.fillRect(-r * 0.45, r * 0.04, r * 0.09, r * 0.7);
      g.fillRect(r * 0.36, r * 0.04, r * 0.09, r * 0.7);
    }
  };

  P.lamp = {
    shell: 0.75, clip: false,
    outer: function (g, r, n, t) {
      g.fillStyle = 'rgba(255,235,180,.9)';
      g.beginPath(); g.moveTo(-r * 0.6, 0); g.lineTo(r * 0.6, 0); g.lineTo(r * 0.3, -r * 0.7); g.lineTo(-r * 0.3, -r * 0.7); g.closePath(); g.fill();
      g.fillStyle = rg(g, 0, 0, r * 3, 'rgba(255,230,160,.35)', 'rgba(255,200,120,.06)', 'rgba(0,0,0,0)');
      g.beginPath(); g.moveTo(-r * 2.6, r * 2.6); g.lineTo(r * 2.6, r * 2.6); g.lineTo(r * 1.2, 0); g.lineTo(-r * 1.2, 0); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(200,190,170,.9)'; g.lineWidth = Math.max(1, r * 0.12);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, r * 0.9); g.stroke();
    }
  };

  P.bookshelf = {
    shell: 0.9, clip: false,
    outer: function (g, r, n, t) {
      var i;
      g.fillStyle = 'rgba(90,60,40,.95)';
      g.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4);
      for (i = 0; i < 3; i++) {
        g.fillStyle = 'rgba(40,26,18,.95)';
        g.fillRect(-r * 1.1, -r * 1.1 + i * r * 0.8, r * 2.2, r * 0.62);
        var k, w;
        for (k = 0; k < 9; k++) {
          w = r * (0.08 + ((k * 7 + i * 3) % 5) * 0.02);
          g.fillStyle = 'rgba(' + (60 + (k * 37 + i * 61) % 150) + ',' + (50 + (k * 17) % 90) + ',' + (60 + (k * 29) % 100) + ',.95)';
          g.fillRect(-r * 1.02 + k * r * 0.23, -r * 1.05 + i * r * 0.8 + r * 0.08, w, r * 0.5);
        }
      }
    }
  };

  P.cup = {
    shell: 0.7, clip: false,
    outer: function (g, r, n, t) {
      g.fillStyle = 'rgba(240,240,245,.92)';
      g.beginPath(); g.moveTo(-r * 0.6, -r * 0.5); g.lineTo(r * 0.6, -r * 0.5);
      g.lineTo(r * 0.45, r * 0.7); g.lineTo(-r * 0.45, r * 0.7); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(240,240,245,.92)'; g.lineWidth = Math.max(1, r * 0.12);
      g.beginPath(); g.arc(r * 0.62, r * 0.05, r * 0.3, -1.2, 1.2); g.stroke();
      g.fillStyle = 'rgba(90,60,40,.9)';
      g.beginPath(); g.ellipse(0, -r * 0.5, r * 0.6, r * 0.16, 0, 0, TAU); g.fill();
      if (r > 8) {
        g.fillStyle = 'rgba(255,255,255,.18)';
        for (var i = 0; i < 3; i++) {
          var p = ((t * 0.25 + i * 0.33) % 1);
          g.beginPath(); g.arc(Math.sin(p * 6 + i) * r * 0.15, -r * 0.6 - p * r * 1.2, r * 0.1 * (1 - p * 0.5), 0, TAU); g.fill();
        }
      }
    }
  };

  P.house = {
    shell: 0.92, clip: false,
    outer: function (g, r, n, t) {
      var lit = 0.6 + 0.4 * Math.sin(t * 0.6 + (n.ph || 0));
      g.fillStyle = 'rgba(120,105,95,.95)';
      g.fillRect(-r * 0.8, -r * 0.15, r * 1.6, r * 1.05);
      g.fillStyle = 'rgba(110,50,45,.95)';
      g.beginPath(); g.moveTo(-r * 1.0, -r * 0.15); g.lineTo(0, -r * 0.95); g.lineTo(r * 1.0, -r * 0.15); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,214,140,' + (0.5 + lit * 0.5) + ')';
      g.fillRect(-r * 0.55, r * 0.05, r * 0.32, r * 0.32);
      g.fillRect(r * 0.22, r * 0.05, r * 0.32, r * 0.32);
      g.fillStyle = 'rgba(70,50,40,.95)';
      g.fillRect(-r * 0.12, r * 0.42, r * 0.26, r * 0.48);
    }
  };

  P.building = {
    shell: 0.94, clip: false,
    outer: function (g, r, n, t) {
      var w = r * (1.1 + 0.5 * (n.sz || 1)), h = r * (1.6 + 2.4 * (n.sz || 1));
      var x = -w / 2, y = r - h;
      g.fillStyle = 'rgba(60,66,80,.96)';
      g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,235,180,.75)';
      var cols = Math.max(2, Math.round(w / (r * 0.28))), rows = Math.max(3, Math.round(h / (r * 0.36))), i, k;
      var seed = ((n.ph || 0) * 100) | 0;
      for (i = 0; i < cols; i++) {
        for (k = 0; k < rows; k++) {
          if (((i * 7 + k * 13 + seed) % 5) < 2) continue;
          g.globalAlpha = 0.35 + 0.55 * (((i * 3 + k * 5 + seed) % 7) / 7);
          g.fillRect(x + w * (i + 0.28) / cols, y + h * (k + 0.3) / rows, w / cols * 0.44, h / rows * 0.4);
        }
      }
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,.08)';
      g.fillRect(x, y, w * 0.25, h);
    }
  };

  P.crane = {
    shell: 0.9, clip: false,
    outer: function (g, r, n, t) {
      var a = 0.3 * Math.sin(t * 0.3 + (n.ph || 0));
      g.strokeStyle = 'rgba(230,180,60,.95)'; g.lineWidth = Math.max(1, r * 0.09);
      g.beginPath(); g.moveTo(0, r * 1.6); g.lineTo(0, -r * 0.6); g.stroke();
      g.save(); g.translate(0, -r * 0.6); g.rotate(a);
      g.beginPath(); g.moveTo(-r * 1.6, 0); g.lineTo(r * 1.1, 0); g.stroke();
      g.beginPath(); g.moveTo(r * 0.9, 0); g.lineTo(r * 0.9, r * 0.5); g.stroke();
      g.beginPath(); g.moveTo(-r * 0.3, -r * 0.5); g.lineTo(r * 0.9, 0); g.stroke();
      g.restore();
    }
  };

  P.car = {
    shell: 0.9, clip: false,
    outer: function (g, r, n, t) {
      var hue = (n.tint || 0) * 360, x = -r * 1.5, w = r * 3, y = -r * 0.3, h = r * 0.6;
      g.fillStyle = 'rgba(20,20,24,.6)';
      g.beginPath(); g.ellipse(0, y + h, w * 0.5, r * 0.14, 0, 0, TAU); g.fill();
      g.fillStyle = hs(hue, 55, 48, 0.95);
      g.beginPath();
      g.moveTo(x, y + h); g.lineTo(x + w * 0.06, y); g.lineTo(x + w * 0.94, y);
      g.lineTo(x + w, y + h); g.closePath(); g.fill();
      g.fillStyle = hs(hue, 55, 62, 0.9);
      g.beginPath();
      g.moveTo(x + w * 0.22, y); g.lineTo(x + w * 0.34, y - h * 0.62);
      g.lineTo(x + w * 0.72, y - h * 0.62); g.lineTo(x + w * 0.82, y); g.closePath(); g.fill();
      g.fillStyle = 'rgba(180,220,255,.55)';
      g.beginPath();
      g.moveTo(x + w * 0.26, y - h * 0.06); g.lineTo(x + w * 0.36, y - h * 0.55);
      g.lineTo(x + w * 0.7, y - h * 0.55); g.lineTo(x + w * 0.78, y - h * 0.06); g.closePath(); g.fill();
      g.fillStyle = 'rgba(20,20,24,.95)';
      circle(g, x + w * 0.24, y + h, r * 0.22); circle(g, x + w * 0.76, y + h, r * 0.22);
      g.fillStyle = 'rgba(255,245,200,.95)';
      circle(g, x + w * 0.97, y + h * 0.55, r * 0.1);
    }
  };

  P.bicycle = {
    shell: 0.85, clip: false,
    outer: function (g, r, n, t) {
      var spin = t * 1.6;
      g.strokeStyle = 'rgba(230,235,245,.9)'; g.lineWidth = Math.max(1, r * 0.07);
      circle(g, -r * 0.8, r * 0.35, r * 0.5); g.stroke();
      circle(g, r * 0.8, r * 0.35, r * 0.5); g.stroke();
      g.beginPath();
      g.moveTo(-r * 0.8, r * 0.35); g.lineTo(-r * 0.1, r * 0.35); g.lineTo(r * 0.2, -r * 0.4);
      g.lineTo(-r * 0.4, -r * 0.4); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(r * 0.2, -r * 0.4); g.lineTo(r * 0.8, r * 0.35); g.stroke();
      g.beginPath(); g.moveTo(r * 0.2, -r * 0.4); g.lineTo(r * 0.55, -r * 0.75); g.stroke();
      g.strokeStyle = 'rgba(255,220,120,.9)';
      for (var i = 0; i < 6; i++) {
        var a = spin + i / 6 * TAU;
        g.beginPath(); g.moveTo(r * 0.5, -r * 0.05 + Math.cos(a) * r * 0.06); g.lineTo(r * 0.5 + Math.sin(a) * r * 0.5 * 0.3, -r * 0.05 + Math.cos(a) * r * 0.3); g.stroke();
      }
    }
  };

  P.plane = {
    shell: 0.85, clip: false,
    outer: function (g, r, n, t) {
      var tilt = Math.sin(t * 0.4 + (n.ph || 0)) * 0.2;
      g.save(); g.rotate(tilt);
      g.fillStyle = 'rgba(235,240,250,.95)';
      g.beginPath(); g.ellipse(0, 0, r * 1.3, r * 0.22, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(-r * 0.1, 0); g.lineTo(r * 0.3, -r * 1.1); g.lineTo(r * 0.55, -r * 1.1); g.lineTo(r * 0.35, 0); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-r * 0.1, 0); g.lineTo(r * 0.3, r * 1.1); g.lineTo(r * 0.55, r * 1.1); g.lineTo(r * 0.35, 0); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-r * 1.15, 0); g.lineTo(-r * 0.9, -r * 0.5); g.lineTo(-r * 0.65, -r * 0.5); g.lineTo(-r * 0.8, 0); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(0, 0, r * 1.3, r * 0.22, 0, 0, TAU); g.fill();
      if (r > 6) {
        g.fillStyle = 'rgba(255,255,255,.22)';
        g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = Math.max(1, r * 0.14);
        for (var i = 0; i < 2; i++) {
          g.beginPath();
          var o = i * r * 0.6;
          g.moveTo(-r * 1.3 - o, 0); g.lineTo(-r * 3.4 - o, 0); g.stroke();
        }
      }
      g.restore();
    }
  };

  P.station = {
    shell: 0.85, clip: false,
    outer: function (g, r, n, t) {
      g.save(); g.rotate(t * 0.25 + (n.ph || 0));
      g.fillStyle = 'rgba(220,230,245,.95)';
      g.fillRect(-r * 1.2, -r * 0.16, r * 2.4, r * 0.32);
      g.fillStyle = 'rgba(40,80,160,.85)';
      g.fillRect(-r * 1.4, -r * 0.5, r * 0.7, r * 1.0);
      g.fillRect(r * 0.7, -r * 0.5, r * 0.7, r * 1.0);
      g.fillStyle = 'rgba(240,245,255,.9)';
      circle(g, 0, 0, r * 0.22);
      g.restore();
    }
  };

  P.satellite = {
    shell: 0.85, clip: false,
    outer: function (g, r, n, t, alt) {
      g.save(); g.rotate((n.ph || 0) + t * 0.5 * (alt ? -1 : 1));
      g.fillStyle = 'rgba(215,225,240,.95)';
      g.fillRect(-r * 0.34, -r * 0.34, r * 0.68, r * 0.68);
      g.fillStyle = 'rgba(40,90,190,.8)';
      g.fillRect(-r * 1.5, -r * 0.45, r * 1.05, r * 0.9);
      g.fillRect(r * 0.45, -r * 0.45, r * 1.05, r * 0.9);
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = Math.max(1, r * 0.06);
      g.beginPath(); g.moveTo(-r * 1.5, 0); g.lineTo(r * 1.5, 0); g.stroke();
      g.restore();
    }
  };

  P.voyager = {
    shell: 0.85, clip: false,
    outer: function (g, r, n, t) {
      g.save(); g.rotate((n.ph || 0) * 0.4);
      g.fillStyle = 'rgba(255,240,200,.9)';
      circle(g, 0, 0, r * 0.5);
      g.fillStyle = 'rgba(200,205,220,.9)';
      circle(g, -r * 0.05, r * 0.5, r * 0.45);
      g.strokeStyle = 'rgba(200,210,230,.6)'; g.lineWidth = Math.max(1, r * 0.08);
      g.beginPath(); g.moveTo(-r * 1.5, -r * 0.3); g.lineTo(-r * 0.4, -r * 0.1); g.stroke();
      g.beginPath(); g.moveTo(r * 1.5, -r * 0.3); g.lineTo(r * 0.4, -r * 0.1); g.stroke();
      g.restore();
    }
  };

  P.mountain = {
    shell: 0.95, clip: false,
    outer: function (g, r, n, t) {
      var h = r * (0.9 + 1.1 * (n.sz || 1));
      g.fillStyle = 'rgba(96,104,116,.97)';
      g.beginPath(); g.moveTo(-r * 1.6, r * 0.8); g.lineTo(-r * 0.15, r * 0.8 - h); g.lineTo(r * 1.6, r * 0.8); g.closePath(); g.fill();
      g.fillStyle = 'rgba(240,248,255,.95)';
      g.beginPath(); g.moveTo(-r * 0.15, r * 0.8 - h);
      g.lineTo(-r * 0.15 - r * 0.34, r * 0.8 - h * 0.68);
      g.lineTo(-r * 0.15 - r * 0.12, r * 0.8 - h * 0.76);
      g.lineTo(-r * 0.15 + r * 0.14, r * 0.8 - h * 0.66);
      g.lineTo(-r * 0.15 + r * 0.36, r * 0.8 - h * 0.72);
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(70,78,90,.6)';
      g.beginPath(); g.moveTo(-r * 0.15, r * 0.8 - h); g.lineTo(r * 1.6, r * 0.8); g.lineTo(r * 0.2, r * 0.8); g.closePath(); g.fill();
    }
  };

  P.volcano = {
    shell: 0.95, clip: false,
    outer: function (g, r, n, t) {
      g.fillStyle = 'rgba(80,70,70,.97)';
      g.beginPath(); g.moveTo(-r * 1.5, r * 0.8); g.lineTo(-r * 0.35, r * 0.8 - r * 1.5);
      g.lineTo(r * 0.35, r * 0.8 - r * 1.5); g.lineTo(r * 1.5, r * 0.8); g.closePath(); g.fill();
      var glow = 0.5 + 0.5 * Math.sin(t * 0.7 + (n.ph || 0));
      g.fillStyle = 'rgba(255,120,40,' + (0.5 + glow * 0.5) + ')';
      g.beginPath(); g.moveTo(-r * 0.35, r * 0.8 - r * 1.5); g.lineTo(r * 0.35, r * 0.8 - r * 1.5);
      g.lineTo(r * 0.12, r * 0.8 - r * 1.42); g.lineTo(-r * 0.12, r * 0.8 - r * 1.42); g.closePath(); g.fill();
      g.fillStyle = rg(g, 0, r * 0.8 - r * 1.6, r * 1.6, 'rgba(255,140,60,.5)', 'rgba(255,80,20,0)');
      circle(g, 0, r * 0.8 - r * 1.55, r * 1.6);
    }
  };

  P.forest = {
    shell: 0.94, clip: false,
    outer: function (g, r, n, t) {
      var i, a, rr;
      g.fillStyle = 'rgba(40,64,38,.95)';
      blobPath(g, 0, r * 0.25, r * 1.6, 18, 1.2, 0.16); g.fill();
      for (i = 0; i < 46; i++) {
        a = i * 2.399 + (n.ph || 0);
        rr = Math.pow(((i * 37) % 100) / 100, 0.6) * r * 1.25;
        g.fillStyle = 'rgba(' + (28 + (i * 11) % 34) + ',' + (78 + (i * 19) % 62) + ',' + (36 + (i * 7) % 32) + ',.92)';
        g.beginPath();
        g.ellipse(Math.cos(a) * rr, r * 0.25 + Math.sin(a) * rr * 0.7, r * 0.075, r * 0.095, 0, 0, TAU);
        g.fill();
      }
    }
  };

  P.lake = {
    shell: 0.7, clip: false,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, '#7fd4ff', '#1a4a80', 'rgba(10,40,80,0)');
      blobPath(g, 0, 0, r, 18, 2.8, 0.14); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = Math.max(1, r * 0.06);
      for (var i = 0; i < 3; i++) {
        var y = r * (0.3 - i * 0.3) + Math.sin(t * 0.8 + i) * r * 0.03;
        g.beginPath(); g.moveTo(-r * 0.7, y); g.quadraticCurveTo(0, y + r * 0.12, r * 0.7, y); g.stroke();
      }
    }
  };

  P.island = {
    shell: 0.9, clip: false,
    outer: function (g, r, n, t) {
      g.fillStyle = 'rgba(30,80,130,.9)';
      blobPath(g, 0, 0, r * 1.5, 20, 1.9, 0.18); g.fill();
      g.fillStyle = 'rgba(214,196,140,.95)';
      blobPath(g, 0, r * 0.1, r * 0.9, 12, 3.4, 0.2); g.fill();
      g.fillStyle = 'rgba(60,120,60,.9)';
      blobPath(g, -r * 0.1, r * 0.05, r * 0.6, 10, 1.4, 0.2); g.fill();
    }
  };

  P.desert = {
    shell: 0.95, clip: false,
    outer: function (g, r, n, t) {
      g.fillStyle = 'rgba(216,180,120,.97)';
      blobPath(g, 0, r * 0.2, r * 1.5, 16, 2.2, 0.2); g.fill();
      g.strokeStyle = 'rgba(180,140,90,.6)'; g.lineWidth = Math.max(1, r * 0.06);
      for (var i = 0; i < 5; i++) {
        g.beginPath();
        g.moveTo(-r * 1.4, r * (0.1 + i * 0.24));
        g.quadraticCurveTo(0, r * (0.1 + i * 0.24) - r * 0.2, r * 1.4, r * (0.1 + i * 0.24));
        g.stroke();
      }
    }
  };

  /* ---------- планеты ----------------------------------------------------- */
  function planet(opt) {
    return {
      shell: 1, clip: true, lum: opt.lum || 0,
      field: opt.field,
      outer: function (g, r, n, t) {
        var i, a, seed = (n.ph || 0);
        // атмосферный ореол
        if (opt.atmo) {
          g.fillStyle = rg(g, 0, 0, r * 1.5, opt.atmo, 'rgba(0,0,0,0)');
          circle(g, 0, 0, r * 1.5);
        }
        g.save();
        g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip();
        g.fillStyle = rg(g, -r * .35, -r * .4, r * 1.9, opt.c[0], opt.c[1], opt.c[2] || opt.c[1]);
        g.fillRect(-r * 1.6, -r * 1.6, r * 3.2, r * 3.2);
        if (opt.bands) {
          for (i = 0; i < opt.bands.length; i++) {
            g.fillStyle = opt.bands[i][1];
            g.beginPath();
            g.ellipse(0, opt.bands[i][0] * r, r * 1.4, r * (0.05 + (i % 3) * 0.035), 0, 0, TAU);
            g.fill();
          }
        }
        if (opt.spot) {
          g.fillStyle = opt.spot[3] || 'rgba(200,90,60,.75)';
          g.beginPath(); g.ellipse(opt.spot[0] * r, opt.spot[1] * r, r * opt.spot[2], r * opt.spot[2] * 0.6, 0, 0, TAU); g.fill();
        }
        if (opt.continents) {
          for (i = 0; i < 7; i++) {
            a = i * 2.1 + seed;
            g.fillStyle = i % 2 ? 'rgba(70,120,60,.9)' : 'rgba(110,150,70,.85)';
            blobPath(g, Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.45, r * (0.22 + 0.18 * ((i * 7) % 5) / 5), 10, a, 0.3);
            g.fill();
          }
          for (i = 0; i < 9; i++) {
            a = i * 1.7 + seed * 1.7;
            g.fillStyle = 'rgba(255,255,255,.55)';
            blobPath(g, Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.6, r * (0.12 + 0.12 * ((i * 5) % 4) / 4), 8, a * 2, 0.35);
            g.fill();
          }
          // полярные шапки
          g.fillStyle = 'rgba(255,255,255,.85)';
          g.beginPath(); g.ellipse(0, -r, r * 0.55, r * 0.3, 0, 0, TAU); g.fill();
          g.beginPath(); g.ellipse(0, r, r * 0.5, r * 0.26, 0, 0, TAU); g.fill();
        }
        if (opt.night) {
          g.fillStyle = 'rgba(0,0,0,.55)';
          g.beginPath(); g.ellipse(r * 0.75, r * 0.2, r * 1.1, r * 1.3, 0.3, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,220,140,.85)';
          for (i = 0; i < 22 && r > 40; i++) {
            a = ((i * 37 + seed * 100) | 0) % 100 / 100;
            var b = ((i * 53) | 0) % 100 / 100;
            circle(g, (a - 0.5) * r * 1.2 + r * 0.4, (b - 0.5) * r * 1.4, r * 0.02);
          }
        }
        if (opt.craters) {
          for (i = 0; i < 16; i++) {
            a = ((i * 41) | 0) % 100 / 100 * TAU;
            var rr = Math.sqrt(((i * 29) | 0) % 100 / 100) * r * 0.9;
            var cr = r * (0.05 + 0.07 * ((i * 17) % 5) / 5);
            g.fillStyle = 'rgba(0,0,0,.16)';
            circle(g, Math.cos(a) * rr, Math.sin(a) * rr, cr);
            g.fillStyle = 'rgba(255,255,255,.12)';
            circle(g, Math.cos(a) * rr - cr * 0.25, Math.sin(a) * rr - cr * 0.25, cr * 0.7);
          }
        }
        // терминатор: объём
        g.fillStyle = rg(g, -r * .5, -r * .5, r * 1.7, 'rgba(255,255,255,.22)', 'rgba(0,0,0,0)', 'rgba(0,0,0,.72)');
        g.fillRect(-r * 1.6, -r * 1.6, r * 3.2, r * 3.2);
        g.restore();
        if (opt.rings) {
          g.save(); g.rotate(opt.tilt || 0.28);
          for (i = 0; i < opt.rings.length; i++) {
            g.strokeStyle = opt.rings[i][1];
            g.lineWidth = Math.max(1, r * opt.rings[i][0]);
            g.beginPath(); g.ellipse(0, 0, r * opt.rings[i][2], r * opt.rings[i][2] * 0.32, 0, 0, TAU); g.stroke();
          }
          g.restore();
        }
      }
    };
  }

  var F = {
    rock: {
      base: ['#3a3630', '#0c0a08'],
      levels: [
        { f: 0.17, k: 'poly', c: ['rgba(140,132,120,.5)', 'rgba(90,84,76,.5)'], a: 0.6, sz: 0.9, j: 0.5 },
        { f: 0.06, k: 'grain', c: ['rgba(200,190,180,.35)'], a: 0.35, sz: 0.5, j: 0.8 }
      ]
    },
    gasGiant: {
      base: ['#8a6a4a', '#2a1c12'],
      levels: [{ f: 0.24, k: 'soft', c: ['rgba(255,230,180,.4)'], a: 0.4, sz: 0.9, j: 0.4 }]
    },
    starPlasma: {
      base: ['#ffcc66', '#ff6a00'],
      levels: [
        { f: 0.13, k: 'blob', c: ['rgba(255,240,190,.55)', 'rgba(255,140,40,.5)'], a: 0.7, sz: 0.9, j: 0.4 },
        { f: 0.05, k: 'soft', c: ['rgba(255,255,220,.4)'], a: 0.4, sz: 0.5, j: 0.7 }
      ]
    },
    cloud: {
      base: ['#8898b0', '#2a3448'],
      levels: [{ f: 0.30, k: 'soft', c: ['rgba(255,255,255,.35)'], a: 0.4, sz: 1.0, j: 0.5 }]
    },
    starfield: {
      base: ['#04060f', '#010105'],
      levels: [
        { f: 0.075, k: 'star', c: ['#ffffff', '#cfe4ff', '#ffe6c0'], a: 0.85, sz: 0.5, j: 0.75 },
        { f: 0.032, k: 'soft', c: ['rgba(255,255,255,.5)'], a: 0.4, sz: 0.4, j: 0.8 }
      ]
    },
    galaxyDust: {
      base: ['#0a0a18', '#02020a'],
      levels: [
        { f: 0.09, k: 'star', c: ['#ffffff', '#ffd8a8', '#a8c8ff'], a: 0.8, sz: 0.55, j: 0.8 },
        { f: 0.04, k: 'soft', c: ['rgba(255,220,180,.35)', 'rgba(160,180,255,.3)'], a: 0.35, sz: 0.6, j: 0.75 }
      ]
    },
    nebular: {
      base: ['#180a20', '#050308'],
      levels: [
        { f: 0.22, k: 'soft', c: ['rgba(255,140,200,.4)', 'rgba(140,140,255,.4)', 'rgba(180,255,220,.3)'], a: 0.55, sz: 1.2, j: 0.6 },
        { f: 0.09, k: 'star', c: ['#ffffff', '#cfe4ff'], a: 0.6, sz: 0.4, j: 0.85 }
      ]
    },
    cosmicWeb: {
      base: ['#06060e', '#010103'],
      levels: [
        { f: 0.17, k: 'soft', c: ['rgba(180,200,255,.35)', 'rgba(255,200,160,.3)', 'rgba(140,180,255,.3)'], a: 0.5, sz: 1.3, j: 0.65 },
        { f: 0.07, k: 'star', c: ['#ffffff', '#ffd8b0', '#b0d0ff'], a: 0.55, sz: 0.4, j: 0.85 }
      ]
    },
    quantum: {
      base: ['#221046', '#05030c'],
      levels: [
        { f: 0.16, k: 'ring', c: ['rgba(160,130,255,.8)', 'rgba(110,220,255,.7)'], a: 0.7, sz: 1.0, j: 0.6 },
        { f: 0.06, k: 'soft', c: ['rgba(200,180,255,.35)'], a: 0.35, sz: 0.7, j: 0.75 }
      ]
    },
    aurora: {
      base: ['#04120a', '#01040a'],
      levels: [
        { f: 0.18, k: 'thread', c: ['rgba(120,255,180,.5)', 'rgba(120,200,255,.4)'], a: 0.5, sz: 1.4, j: 0.6 },
        { f: 0.07, k: 'soft', c: ['rgba(180,255,220,.3)'], a: 0.3, sz: 0.6, j: 0.8 }
      ]
    },
    ground: {
      base: ['#3c4a2a', '#141a12'],
      levels: [
        { f: 0.15, k: 'blob', c: ['rgba(120,160,90,.5)', 'rgba(90,120,70,.5)'], a: 0.55, sz: 1.0, j: 0.5 },
        { f: 0.05, k: 'grain', c: ['rgba(180,200,140,.25)'], a: 0.3, sz: 0.4, j: 0.85 }
      ]
    },
    orbital: {
      base: ['#0a1830', '#03060e'],
      levels: [
        { f: 0.17, k: 'soft', c: ['rgba(255,255,255,.35)'], a: 0.4, sz: 1.1, j: 0.5 },
        { f: 0.06, k: 'grain', c: ['rgba(200,230,255,.3)'], a: 0.3, sz: 0.5, j: 0.8 }
      ]
    }
  };

  // «мягкие» поля для мягких объектов: подмешиваем базовый цвет оболочки
  function plate(outer, field) { return { shell: outer[0], clip: outer[1], lum: outer[2], field: field, outer: outer[3] }; }

  /* ---------- конкретные стили ------------------------------------------- */
  var STYLES = {};
  function def(name, s) { STYLES[name] = s; }

  def('earth', planet({
    c: ['#8fd8ff', '#1a5fa8', '#06203f'], atmo: 'rgba(120,190,255,.35)',
    continents: true, night: true, field: F.orbital
  }));
  def('moon', planet({ c: ['#f2f0ea', '#9a958c', '#3a3630'], craters: true, field: F.rock }));
  def('mars', planet({ c: ['#ffb98a', '#b04a2a', '#3a1408'], craters: true, atmo: 'rgba(255,140,90,.18)', field: F.rock }));
  def('venus', planet({ c: ['#fff0c0', '#d8a44a', '#5a3a10'], bands: [[-0.3, 'rgba(255,230,180,.5)'], [0.1, 'rgba(255,220,150,.45)'], [0.45, 'rgba(255,240,200,.4)']], field: F.cloud }));
  def('mercury', planet({ c: ['#dcd8d0', '#8a857c', '#302c28'], craters: true, field: F.rock }));
  def('jupiter', planet({
    c: ['#ffe6c0', '#c08a58', '#5a3a20'],
    bands: [[-0.55, 'rgba(240,220,190,.65)'], [-0.32, 'rgba(190,140,100,.6)'], [-0.1, 'rgba(255,240,215,.7)'],
            [0.12, 'rgba(200,150,110,.6)'], [0.35, 'rgba(245,225,195,.65)'], [0.6, 'rgba(180,130,95,.6)']],
    spot: [0.42, 0.16, 0.2, 'rgba(210,90,60,.8)'], field: F.gasGiant
  }));
  def('saturn', planet({
    c: ['#ffeec8', '#d0a86a', '#6a4a28'],
    bands: [[-0.5, 'rgba(245,225,190,.55)'], [-0.15, 'rgba(220,190,150,.5)'], [0.25, 'rgba(245,230,200,.5)']],
    rings: [[0.16, 'rgba(240,220,180,.55)', 1.9], [0.22, 'rgba(220,200,160,.35)', 2.3], [0.1, 'rgba(255,240,210,.5)', 2.6]],
    tilt: 0.34, field: F.gasGiant
  }));
  def('uranus', planet({ c: ['#d8ffff', '#5ac8d8', '#124a5a'], bands: [[-0.2, 'rgba(200,250,255,.35)']], field: F.gasGiant }));
  def('neptune', planet({ c: ['#9fc4ff', '#2a52c0', '#0a1a4a'], bands: [[0.2, 'rgba(160,190,255,.35)']], spot: [-0.3, 0.1, 0.16, 'rgba(20,30,80,.7)'], field: F.gasGiant }));
  def('pluto', planet({ c: ['#fff0dc', '#b08a6a', '#3a2a1a'], craters: true, field: F.rock }));
  def('charon', planet({ c: ['#e8e4dc', '#8a8478', '#2a2620'], craters: true, field: F.rock }));
  def('titan', planet({ c: ['#ffe0a0', '#c07a30', '#3a2008'], field: F.cloud }));
  def('io', planet({ c: ['#fff2a0', '#d0a020', '#4a3200'], craters: true, field: F.rock }));
  def('europa', planet({ c: ['#ffffff', '#c8d8e8', '#4a5a70'], craters: false, field: F.rock }));
  def('ganymede', planet({ c: ['#e0dcd0', '#8a8070', '#2a2620'], craters: true, field: F.rock }));
  def('callisto', planet({ c: ['#c8c0b0', '#6a6258', '#201c18'], craters: true, field: F.rock }));
  def('enceladus', planet({ c: ['#ffffff', '#d8e8f0', '#4a5a68'], craters: true, field: F.rock }));
  def('triton', planet({ c: ['#f0f8ff', '#a8c0d0', '#2a3a48'], craters: true, field: F.rock }));
  def('eros', null);

  def('sun', {
    shell: 0.55, clip: true, lum: 0.25, field: F.starPlasma,
    outer: function (g, r, n, t) {
      var i, seed = (n.ph || 0);
      g.fillStyle = rg(g, 0, 0, r * 2.4, 'rgba(255,240,180,.55)', 'rgba(255,150,40,.22)', 'rgba(255,90,0,0)');
      circle(g, 0, 0, r * 2.4);
      g.fillStyle = rg(g, -r * .2, -r * .25, r * 1.4, '#fffdf0', '#ffd24a', 'rgba(255,150,20,0)');
      circle(g, 0, 0, r);
      for (i = 0; i < 26; i++) {
        var a = ((i * 41 + seed * 90) | 0) % 100 / 100 * TAU, rr = Math.sqrt(((i * 29) | 0) % 100 / 100) * r * 0.95;
        g.fillStyle = 'rgba(255,180,60,.28)';
        blobPath(g, Math.cos(a) * rr, Math.sin(a) * rr, r * 0.07, 8, i, 0.4); g.fill();
      }
      for (i = 0; i < 3; i++) {
        var aa = seed + i * 2.1 + t * 0.12;
        g.strokeStyle = 'rgba(255,200,120,.5)'; g.lineWidth = Math.max(1, r * 0.06);
        g.beginPath();
        g.arc(0, 0, r * (1.05 + i * 0.08), aa, aa + 1.5);
        g.stroke();
      }
    }
  });

  def('sunspot', {
    shell: 0.8, clip: false,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r * 1.4, 'rgba(60,20,0,.9)', 'rgba(120,40,0,.7)', 'rgba(255,150,40,0)');
      circle(g, 0, 0, r * 1.3);
      g.fillStyle = 'rgba(20,8,0,.95)';
      blobPath(g, 0, 0, r * 0.7, 10, (n.ph || 0), 0.25); g.fill();
    }
  });

  def('prominence', {
    shell: 0.6, clip: false,
    outer: function (g, r, n, t) {
      var a = (n.ph || 0) + t * 0.2;
      g.strokeStyle = rg(g, 0, -r, r * 2, 'rgba(255,220,160,.9)', 'rgba(255,90,40,.35)', 'rgba(255,60,0,0)');
      g.lineWidth = Math.max(1, r * 0.5); g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-r * 1.1, r * 0.6);
      g.bezierCurveTo(-r * 0.9, -r * 1.6 * (0.7 + 0.3 * Math.sin(a)), r * 0.9, -r * 1.6 * (0.7 + 0.3 * Math.sin(a)), r * 1.1, r * 0.6);
      g.stroke();
      g.strokeStyle = 'rgba(255,255,220,.55)'; g.lineWidth = Math.max(1, r * 0.16);
      g.beginPath();
      g.moveTo(-r * 1.1, r * 0.6);
      g.bezierCurveTo(-r * 0.9, -r * 1.6 * (0.7 + 0.3 * Math.sin(a)), r * 0.9, -r * 1.6 * (0.7 + 0.3 * Math.sin(a)), r * 1.1, r * 0.6);
      g.stroke();
    }
  });

  def('flare', {
    shell: 0.7, clip: false,
    outer: function (g, r, n, t) {
      var a = (n.ph || 0) + t * 1.4;
      g.fillStyle = rg(g, 0, 0, r * 2.2, 'rgba(255,255,210,.9)', 'rgba(255,160,60,.35)', 'rgba(255,80,0,0)');
      circle(g, 0, 0, r * 2.2);
      g.strokeStyle = 'rgba(255,240,180,.9)'; g.lineWidth = Math.max(1, r * 0.18);
      for (var i = 0; i < 4; i++) {
        var ang = -0.6 + i * 0.4 + Math.sin(a) * 0.1;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(ang) * r * 2, Math.sin(ang) * r * 2); g.stroke();
      }
    }
  });

  def('prominenceField', {
    shell: 0.3, clip: true, lum: 0.12, field: F.starPlasma,
    outer: function (g, r, n, t) {
      var i;
      g.fillStyle = rg(g, 0, 0, r, 'rgba(255,200,120,.35)', 'rgba(255,90,30,.25)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
      for (i = 0; i < 7; i++) {
        var a = (n.ph || 0) + i * 0.9;
        g.strokeStyle = 'rgba(255,190,120,.5)'; g.lineWidth = Math.max(1, r * 0.05);
        g.beginPath();
        g.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.4, a, a + 2.4);
        g.stroke();
      }
    }
  });

  def('corona', {
    shell: 0.10, clip: true, lum: 0.15, field: F.starPlasma,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(255,240,200,.20)', 'rgba(255,160,80,.12)', 'rgba(255,120,40,0)');
      circle(g, 0, 0, r);
      for (var i = 0; i < 10; i++) {
        var a = (n.ph || 0) + i * 0.7 + t * 0.05;
        g.strokeStyle = 'rgba(255,225,170,.35)'; g.lineWidth = Math.max(1, r * 0.012);
        g.beginPath();
        g.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
        g.lineTo(Math.cos(a + 0.4) * r * 0.95, Math.sin(a + 0.4) * r * 0.95);
        g.stroke();
      }
    }
  });

  def('solarWind', {
    shell: 0.5, clip: false,
    outer: function (g, r, n, t) {
      var p = ((t * 0.35 + (n.ph || 0)) % 1), i;
      g.strokeStyle = 'rgba(255,230,170,' + (0.5 * (1 - p)) + ')';
      g.lineWidth = Math.max(1, r * 0.2);
      for (i = 0; i < 3; i++) {
        var y = (i - 1) * r * 0.6;
        g.beginPath(); g.moveTo(-r * 2, y); g.lineTo(-r * 2 + 4 * r * p, y); g.stroke();
      }
    }
  });

  def('comet', {
    shell: 0.7, clip: false,
    outer: function (g, r, n, t) {
      var a = (n.ph || 0);
      g.save(); g.rotate(a);
      g.fillStyle = rg(g, 0, 0, r * 3.5, 'rgba(180,230,255,.35)', 'rgba(120,180,255,.12)', 'rgba(80,140,255,0)');
      g.beginPath(); g.moveTo(r * 3.5, 0); g.lineTo(-r * 0.6, -r * 0.7); g.lineTo(-r * 0.6, r * 0.7); g.closePath(); g.fill();
      g.fillStyle = rg(g, -r * .2, -r * .2, r * 1.4, '#ffffff', '#a8d8ff', 'rgba(120,180,255,0)');
      circle(g, 0, 0, r * 0.9);
      g.restore();
    }
  });

  def('asteroid', {
    shell: 0.97, clip: true, field: F.rock,
    outer: function (g, r, n, t) {
      var seed = (n.ph || 0);
      g.fillStyle = rg(g, -r * .3, -r * .35, r * 1.6, '#c8c0b0', '#6a6258', '#201c18');
      blobPath(g, 0, 0, r, 11, seed, 0.28); g.fill();
      g.fillStyle = 'rgba(0,0,0,.3)';
      for (var i = 0; i < 4; i++) {
        var a = seed + i * 1.6;
        blobPath(g, Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4, r * 0.18, 7, a, 0.35); g.fill();
      }
    }
  });

  def('kbo', { shell: 0.95, clip: true, field: F.rock, outer: STYLES.asteroid ? STYLES.asteroid.outer : null });
  def('ceres', planet({ c: ['#e0dcd4', '#8a857c', '#2a2824'], craters: true, field: F.rock }));
  def('vesta', planet({ c: ['#d8d0c0', '#7a7268', '#26221c'], craters: true, field: F.rock }));
  def('phobos', planet({ c: ['#b0a89c', '#60584e', '#1a1612'], craters: true, field: F.rock }));
  def('eris', planet({ c: ['#ffffff', '#b8c8d8', '#38485a'], craters: true, field: F.rock }));
  def('sedna', planet({ c: ['#ffd8b0', '#c06040', '#3a1408'], craters: true, field: F.rock }));

  def('halley', {
    shell: 0.6, clip: false,
    outer: function (g, r, n, t) {
      g.save(); g.rotate((n.ph || 0) + t * 0.05);
      g.fillStyle = rg(g, 0, 0, r * 4, 'rgba(200,240,255,.28)', 'rgba(150,200,255,.08)', 'rgba(120,180,255,0)');
      g.beginPath(); g.moveTo(r * 4, 0); g.lineTo(-r * 0.4, -r * 0.9); g.lineTo(-r * 0.4, r * 0.9); g.closePath(); g.fill();
      g.fillStyle = 'rgba(230,240,255,.95)';
      blobPath(g, 0, 0, r * 0.6, 9, 2.2, 0.3); g.fill();
      g.restore();
    }
  });

  /* ---------- звёзды и галактики ------------------------------------------ */
  function starPainter(o) {
    return {
      shell: 1, clip: false, lum: 0.1, field: F.starPlasma,
      outer: function (g, r, n, t) {
        var pulse = 1 + (o.variable ? 0.12 * Math.sin(t * 3 + (n.ph || 0)) : 0);
        var rr = r * pulse;
        g.fillStyle = rg(g, 0, 0, rr * (o.glow || 4), o.c0, o.c1, 'rgba(0,0,0,0)');
        circle(g, 0, 0, rr * (o.glow || 4));
        g.fillStyle = rg(g, 0, 0, rr * 1.2, '#ffffff', o.c0, o.c1);
        circle(g, 0, 0, rr);
        g.strokeStyle = o.c0; g.lineWidth = Math.max(0.7, rr * 0.14);
        g.globalAlpha = 0.75;
        g.beginPath(); g.moveTo(-rr * 2.6, 0); g.lineTo(rr * 2.6, 0); g.stroke();
        g.beginPath(); g.moveTo(0, -rr * 2.6); g.lineTo(0, rr * 2.6); g.stroke();
        g.globalAlpha = 1;
      }
    };
  }
  def('star', starPainter({ c0: '#fff6e0', c1: 'rgba(255,190,110,.28)', glow: 4, variable: true }));
  def('proxima', starPainter({ c0: '#ffb08a', c1: 'rgba(255,90,60,.3)', glow: 3.4, variable: true }));
  def('starA', starPainter({ c0: '#fff8e8', c1: 'rgba(255,210,140,.28)', glow: 4.2 }));
  def('barnard', starPainter({ c0: '#ff9a7a', c1: 'rgba(220,70,50,.28)', glow: 3.2, variable: true }));
  def('sirius', starPainter({ c0: '#eaf2ff', c1: 'rgba(150,190,255,.32)', glow: 5 }));
  def('vega', starPainter({ c0: '#f0f4ff', c1: 'rgba(170,200,255,.3)', glow: 4.6, variable: true }));
  def('altair', starPainter({ c0: '#ffffff', c1: 'rgba(200,220,255,.28)', glow: 4 }));
  def('pulsar', {
    shell: 1, clip: false, field: F.starPlasma,
    outer: function (g, r, n, t) {
      var beam = (Math.sin(t * 2 + (n.ph || 0)) * 0.5 + 0.5);
      g.save();
      g.fillStyle = rg(g, 0, 0, r * 3, 'rgba(200,220,255,.9)', 'rgba(120,160,255,.2)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r * 1.1);
      g.rotate(t * 1.4 + (n.ph || 0));
      g.fillStyle = 'rgba(140,180,255,' + (0.25 + 0.4 * beam) + ')';
      g.beginPath(); g.moveTo(-r * 0.2, 0); g.lineTo(-r * 7, -r * 1.2); g.lineTo(-r * 7, r * 1.2); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(r * 0.2, 0); g.lineTo(r * 7, -r * 1.2); g.lineTo(r * 7, r * 1.2); g.closePath(); g.fill();
      g.restore();
    }
  });

  def('supernovaRemnant', {
    shell: 0.35, clip: true, field: F.nebular,
    outer: function (g, r, n, t) {
      var i;
      g.strokeStyle = 'rgba(200,220,255,.5)'; g.lineWidth = Math.max(1, r * 0.06);
      for (i = 0; i < 3; i++) {
        g.beginPath(); g.arc(0, 0, r * (0.7 + i * 0.12), 0, TAU); g.stroke();
      }
      g.fillStyle = rg(g, 0, 0, r, 'rgba(255,160,200,.3)', 'rgba(120,160,255,.2)', 'rgba(0,0,0,0)');
      blobPath(g, 0, 0, r * 0.85, 18, 1.5, 0.22); g.fill();
      g.fillStyle = 'rgba(255,255,255,.9)';
      circle(g, 0, 0, r * 0.09);
    }
  });

  def('nebula', {
    shell: 0.30, clip: true, field: F.nebular,
    outer: function (g, r, n, t) {
      var i, a, seed = (n.ph || 0);
      for (i = 0; i < 7; i++) {
        a = i * 1.3 + seed;
        g.fillStyle = ['rgba(255,120,190,.22)', 'rgba(120,140,255,.2)', 'rgba(140,255,220,.16)'][i % 3];
        blobPath(g, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.4, r * (0.4 + 0.2 * ((i * 5) % 3)), 12, a, 0.35);
        g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,.75)';
      for (i = 0; i < 5; i++) {
        a = i * 2.3 + seed;
        circle(g, Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.6, r * 0.05);
      }
    }
  });

  var cloudStyle = function (cols) {
    return {
      shell: 0.45, clip: true, field: { base: cols.base, levels: [{ f: 0.22, k: 'soft', c: [cols.c], a: 0.45, sz: 1.1, j: 0.6 }] },
      outer: function (g, r, n, t) {
        var i, a, seed = (n.ph || 0);
        for (i = 0; i < 6; i++) {
          a = i * 1.7 + seed;
          g.fillStyle = cols.cloud + (0.16 + 0.06 * (i % 3)) + ')';
          blobPath(g, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.4, r * (0.45 + 0.2 * ((i * 7) % 4) / 4), 12, a, 0.4);
          g.fill();
        }
      }
    };
  };
  def('orionNebula', cloudStyle({ base: ['#2a0a1e', '#06030a'], c: 'rgba(255,140,200,.5)', cloud: 'rgba(255,150,200,' }));
  def('rhoOph', cloudStyle({ base: ['#1a1206', '#05040a'], c: 'rgba(255,200,140,.5)', cloud: 'rgba(255,210,150,' }));
  def('eagleNebula', cloudStyle({ base: ['#0a1a2a', '#03060a'], c: 'rgba(140,220,255,.5)', cloud: 'rgba(150,230,255,' }));
  def('hiiRegion', cloudStyle({ base: ['#2a0a20', '#06030c'], c: 'rgba(255,120,190,.45)', cloud: 'rgba(255,130,200,' }));
  def('nebulaCloud', cloudStyle({ base: ['#120a20', '#04030a'], c: 'rgba(180,140,255,.45)', cloud: 'rgba(190,150,255,' }));
  def('interstellarCloud', cloudStyle({ base: ['#0a1020', '#02040a'], c: 'rgba(160,190,255,.4)', cloud: 'rgba(170,200,255,' }));

  def('starCluster', {
    shell: 0.05, clip: true, field: F.starfield,
    outer: function (g, r, n, t) {
      var i, a, rr, seed = (n.ph || 0);
      for (i = 0; i < 26; i++) {
        a = seed + i * 2.4; rr = Math.sqrt(((i * 37) % 100) / 100) * r;
        g.fillStyle = i % 3 ? 'rgba(255,255,255,.9)' : 'rgba(180,210,255,.9)';
        circle(g, Math.cos(a) * rr, Math.sin(a) * rr, Math.max(0.4, r * 0.03));
      }
      g.fillStyle = rg(g, 0, 0, r, 'rgba(150,180,255,.16)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
    }
  });
  def('openCluster', {
    shell: 0.05, clip: true, field: F.starfield,
    outer: function (g, r, n, t) {
      var i, a, rr, seed = (n.ph || 0);
      for (i = 0; i < 14; i++) {
        a = seed * 1.7 + i * 1.9; rr = Math.sqrt(((i * 53) % 100) / 100) * r * 0.95;
        g.fillStyle = i % 4 ? 'rgba(220,235,255,.95)' : 'rgba(255,220,180,.95)';
        circle(g, Math.cos(a) * rr, Math.sin(a) * rr, Math.max(0.5, r * 0.055));
      }
      g.fillStyle = rg(g, 0, 0, r * 1.2, 'rgba(140,180,255,.14)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r * 1.2);
    }
  });
  def('globularCluster', {
    shell: 0.08, clip: true, field: F.starfield,
    outer: function (g, r, n, t) {
      var i, a, rr, seed = (n.ph || 0);
      g.fillStyle = rg(g, 0, 0, r * 1.2, 'rgba(255,230,190,.35)', 'rgba(255,200,140,.1)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r * 1.2);
      for (i = 0; i < 60; i++) {
        a = seed + i * 2.399; rr = Math.pow(((i * 37) % 100) / 100, 0.6) * r;
        g.fillStyle = 'rgba(255,240,210,' + (0.9 - rr / r * 0.5) + ')';
        circle(g, Math.cos(a) * rr, Math.sin(a) * rr, Math.max(0.35, r * 0.03 * (1.2 - rr / r)));
      }
    }
  });

  function galaxyPainter(o) {
    return {
      shell: o.shell === undefined ? 0.25 : o.shell, clip: true, lum: 0.08,
      field: o.field || F.galaxyDust,
      outer: function (g, r, n, t) {
        var i, a, rr, seed = (n.ph || 0), arms = o.arms || 2, tiltY = o.tilt === undefined ? 0.42 : o.tilt;
        g.save();
        g.scale(1, tiltY);
        // диск
        g.fillStyle = rg(g, 0, 0, r, o.disk0 || 'rgba(255,240,210,.5)', o.disk1 || 'rgba(120,150,255,.22)', 'rgba(0,0,0,0)');
        circle(g, 0, 0, r * 1.25);
        // спиральные рукава
        for (i = 0; i < 90 * (r > 30 ? 1 : 0.4); i++) {
          var arm = i % arms;
          var u = ((i * 13) % 100) / 100;
          a = u * 2.6 + arm * (TAU / arms) + seed;
          rr = (0.18 + u * 0.95) * r;
          var alpha = 0.5 * (1 - u * 0.6);
          g.fillStyle = o.warm ? 'rgba(255,225,180,' + alpha + ')' : 'rgba(200,220,255,' + alpha + ')';
          circle(g, Math.cos(a) * rr, Math.sin(a) * rr, Math.max(0.4, r * 0.022 * (1 - u * 0.4)));
        }
        // ядро
        g.fillStyle = rg(g, 0, 0, r * 0.4, 'rgba(255,250,220,.95)', 'rgba(255,200,120,.4)', 'rgba(255,160,60,0)');
        circle(g, 0, 0, r * 0.4);
        if (o.bar) {
          g.fillStyle = 'rgba(255,235,200,.4)';
          g.beginPath(); g.ellipse(0, 0, r * 0.55, r * 0.16, 0, 0, TAU); g.fill();
        }
        // пыль
        if (o.dust && r > 40) {
          for (i = 0; i < 22; i++) {
            var uu = ((i * 29) % 100) / 100;
            a = uu * 2.8 + (i % arms) * (TAU / arms) + seed + 0.35;
            rr = (0.25 + uu * 0.9) * r;
            g.fillStyle = 'rgba(30,20,30,.35)';
            blobPath(g, Math.cos(a) * rr, Math.sin(a) * rr, r * 0.05, 8, i, 0.4); g.fill();
          }
        }
        g.restore();
        if (o.halo) {
          g.fillStyle = rg(g, 0, 0, r * 1.6, 'rgba(255,240,220,.18)', 'rgba(0,0,0,0)');
          circle(g, 0, 0, r * 1.6);
        }
      }
    };
  }
  def('galaxy', galaxyPainter({ arms: 2 }));
  def('spiralGalaxy', galaxyPainter({ arms: 2, tilt: 0.6 }));
  def('andromeda', galaxyPainter({ arms: 2, tilt: 0.3, warm: 0, halo: true }));
  def('triangulum', galaxyPainter({ arms: 2, tilt: 0.5, arms3: 1 }));
  def('sombrero', galaxyPainter({ arms: 1, tilt: 0.12, dust: true, disk0: 'rgba(255,240,220,.6)' }));
  def('m87', {
    shell: 0.3, clip: true, field: F.starfield,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(255,245,220,.75)', 'rgba(255,220,170,.3)', 'rgba(255,200,140,0)');
      circle(g, 0, 0, r);
      g.fillStyle = rg(g, 0, 0, r * 0.35, 'rgba(255,255,240,.95)', 'rgba(255,230,180,0)');
      circle(g, 0, 0, r * 0.35);
      g.save(); g.rotate(-0.7 + t * 0.02);
      g.fillStyle = 'rgba(180,220,255,.4)';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(r * 1.9, -r * 0.16); g.lineTo(r * 1.9, r * 0.16); g.closePath(); g.fill();
      g.restore();
    }
  });
  def('ellipticalGalaxy', {
    shell: 0.28, clip: true, field: F.starfield,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(255,246,225,.75)', 'rgba(255,220,175,.32)', 'rgba(255,190,140,0)');
      g.save(); g.scale(1, 0.78); circle(g, 0, 0, r); g.restore();
      g.fillStyle = rg(g, 0, 0, r * 0.34, 'rgba(255,252,240,.95)', 'rgba(255,235,200,.4)', 'rgba(255,220,170,0)');
      g.save(); g.scale(1, 0.78); circle(g, 0, 0, r * 0.34); g.restore();
    }
  });
  def('dwarfGalaxy', {
    shell: 0.25, clip: true, field: F.starfield,
    outer: function (g, r, n, t) {
      var i, a, seed = (n.ph || 0);
      g.fillStyle = rg(g, 0, 0, r, 'rgba(210,230,255,.35)', 'rgba(160,190,255,.12)', 'rgba(0,0,0,0)');
      blobPath(g, 0, 0, r * 0.9, 14, seed, 0.3); g.fill();
      for (i = 0; i < 12; i++) {
        a = seed + i * 2.1;
        g.fillStyle = 'rgba(255,255,255,.7)';
        circle(g, Math.cos(a) * r * 0.6 * ((i % 3) / 3 + 0.3), Math.sin(a) * r * 0.6 * ((i % 3) / 3 + 0.3), Math.max(0.3, r * 0.04));
      }
    }
  });
  def('lmc', { shell: 0.22, clip: true, field: F.starfield, outer: function (g, r, n, t) { STYLES.dwarfGalaxy.outer(g, r, n, t); g.fillStyle = rg(g, 0, 0, r * 0.5, 'rgba(255,170,200,.35)', 'rgba(0,0,0,0)'); blobPath(g, r * 0.2, 0, r * 0.4, 10, 1.4, 0.3); g.fill(); } });
  def('smc', { shell: 0.22, clip: true, field: F.starfield, outer: function (g, r, n, t) { STYLES.dwarfGalaxy.outer(g, r, n, t); } });

  def('milkyWay', galaxyPainter({ arms: 2, tilt: 0.3, dust: true, bar: true, halo: true, disk0: 'rgba(255,245,225,.55)', shell: 0.2 }));

  def('galacticCenter', {
    shell: 0.35, clip: true, field: F.galaxyDust,
    outer: function (g, r, n, t) {
      var i, a;
      g.fillStyle = rg(g, 0, 0, r * 1.4, 'rgba(255,250,225,.9)', 'rgba(255,205,140,.35)', 'rgba(255,160,60,0)');
      circle(g, 0, 0, r * 1.4);
      // аккреционный диск чёрной дыры + струи
      g.save(); g.scale(1, 0.18); g.rotate(t * 0.05);
      g.strokeStyle = 'rgba(255,190,120,.7)'; g.lineWidth = Math.max(1, r * 0.14);
      g.beginPath(); g.arc(0, 0, r * 0.55, 0, TAU); g.stroke();
      g.restore();
      g.fillStyle = 'rgba(10,5,15,.95)';
      circle(g, 0, 0, r * 0.2);
      g.fillStyle = 'rgba(200,230,255,.45)';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-r * 0.5, -r * 2.4); g.lineTo(r * 0.5, -r * 2.4); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-r * 0.5, r * 2.4); g.lineTo(r * 0.5, r * 2.4); g.closePath(); g.fill();
    }
  });

  def('bar', {
    shell: 0.3, clip: true, field: F.galaxyDust,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(255,240,210,.7)', 'rgba(255,210,150,.25)', 'rgba(0,0,0,0)');
      g.beginPath(); g.ellipse(0, 0, r, r * 0.22, (n.ph || 0) * 0.1, 0, TAU); g.fill();
    }
  });

  def('sunMarker', {
    shell: 1, clip: false,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r * 3, 'rgba(255,255,220,.95)', 'rgba(255,200,90,.25)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r * 1.2);
      g.fillStyle = '#fffde0';
      circle(g, 0, 0, r * 0.5);
      var blink = 0.5 + 0.5 * Math.sin(t * 2);
      g.strokeStyle = 'rgba(255,240,150,' + (0.4 + 0.5 * blink) + ')';
      g.lineWidth = Math.max(1, r * 0.35);
      g.beginPath(); g.arc(0, 0, r * 2.6, 0, TAU); g.stroke();
    }
  });

  /* ---------- скопления и крупномасштабная структура ---------------------- */
  function clusterPainter(o) {
    return {
      shell: 0.08, clip: true,
      field: o.field || F.cosmicWeb,
      outer: function (g, r, n, t) {
        var i, a, rr, seed = (n.ph || 0), K = o.n || 26;
        for (i = 0; i < K; i++) {
          a = seed * 1.3 + i * 2.399;
          rr = Math.pow(((i * 37) % 100) / 100, o.pow || 0.55) * r * 0.92;
          var s = r * (o.sz || 0.07) * (0.5 + ((i * 17) % 10) / 10);
          if (o.mote === 'galaxy') {
            g.fillStyle = i % 3 ? 'rgba(255,245,225,.85)' : 'rgba(200,220,255,.8)';
            g.save(); g.translate(Math.cos(a) * rr, Math.sin(a) * rr); g.scale(1, 0.5); g.rotate(a);
            circle(g, 0, 0, s * 1.4); g.restore();
          } else {
            g.fillStyle = 'rgba(255,255,255,.9)';
            circle(g, Math.cos(a) * rr, Math.sin(a) * rr, Math.max(0.3, s));
          }
        }
        g.fillStyle = rg(g, 0, 0, r, o.glow || 'rgba(255,230,200,.14)', 'rgba(0,0,0,0)');
        circle(g, 0, 0, r);
      }
    };
  }
  def('galaxyCluster', clusterPainter({ n: 30, mote: 'galaxy', sz: 0.09 }));
  def('virgo', clusterPainter({ n: 44, mote: 'galaxy', sz: 0.08, glow: 'rgba(255,235,205,.16)' }));
  def('localGroup', clusterPainter({ n: 12, mote: 'galaxy', sz: 0.14 }));
  def('laniakea', clusterPainter({ n: 40, mote: 'galaxy', sz: 0.1 }));
  def('dwarfCluster', clusterPainter({ n: 18, mote: 'galaxy', sz: 0.1 }));
  def('galacticHalo', clusterPainter({ n: 34, mote: 'star', sz: 0.05, pow: 0.5 }));
  def('greatAttractor', {
    shell: 0.15, clip: true, field: F.cosmicWeb,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(255,200,150,.35)', 'rgba(255,120,80,.15)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
      STYLES.galaxyCluster.outer(g, r * 0.8, n, t);
    }
  });
  def('normaCluster', clusterPainter({ n: 22, mote: 'galaxy', sz: 0.1 }));
  def('hydraCluster', clusterPainter({ n: 22, mote: 'galaxy', sz: 0.1 }));
  def('greatWall', {
    shell: 0.1, clip: true, field: F.cosmicWeb,
    outer: function (g, r, n, t) {
      STYLES.galaxyCluster.outer(g, r, n, t);
      g.fillStyle = 'rgba(180,200,255,.08)';
      g.save(); g.rotate((n.ph || 0) * 0.3); g.fillRect(-r, -r * 0.18, r * 2, r * 0.36); g.restore();
    }
  });
  def('filament', {
    shell: 0.12, clip: true, field: F.cosmicWeb,
    outer: function (g, r, n, t) {
      if (r < 7) {
        g.fillStyle = rg(g, 0, 0, r * 1.6, 'rgba(190,205,255,.5)', 'rgba(120,140,220,.15)', 'rgba(0,0,0,0)');
        circle(g, 0, 0, r * 1.6);
        return;
      }
      var i, a = (n.ph || 0) * 0.7;
      g.save(); g.rotate(a);
      g.strokeStyle = 'rgba(170,190,255,.35)'; g.lineWidth = Math.max(1, r * 0.3);
      g.beginPath(); g.moveTo(-r, 0); g.quadraticCurveTo(0, r * 0.4, r, 0); g.stroke();
      for (i = 0; i < 12; i++) {
        var u = i / 11 * 2 - 1;
        g.fillStyle = 'rgba(255,245,225,.8)';
        circle(g, u * r, Math.sin(u * 1.6) * r * 0.2, Math.max(0.3, r * 0.05));
      }
      g.restore();
    }
  });
  def('void', {
    shell: 0.05, clip: true, field: { base: ['#02030a', '#010104'], levels: [] },
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(4,6,16,.9)', 'rgba(2,3,8,.6)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
    }
  });
  def('universe', {
    shell: 0.06, clip: true, field: F.cosmicWeb,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(120,150,255,.12)', 'rgba(255,180,120,.08)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
      STYLES.galaxyCluster.outer(g, r * 0.95, n, t);
    }
  });
  def('cmb', {
    shell: 0.35, clip: true,
    field: {
      base: ['#2a1a3a', '#0a0512'],
      levels: [
        { f: 0.22, k: 'soft', c: ['rgba(255,180,120,.35)', 'rgba(120,180,255,.35)', 'rgba(255,120,180,.3)'], a: 0.5, sz: 1.4, j: 0.6 },
        { f: 0.08, k: 'soft', c: ['rgba(255,220,180,.25)'], a: 0.3, sz: 0.8, j: 0.8 }
      ]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(255,200,150,.18)', 'rgba(150,120,255,.14)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
      g.strokeStyle = 'rgba(255,220,180,.35)'; g.lineWidth = Math.max(1, r * 0.02);
      g.beginPath(); g.arc(0, 0, r * 0.99, 0, TAU); g.stroke();
    }
  });
  def('quasar', {
    shell: 0.6, clip: false, field: F.starfield,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r * 5, 'rgba(230,240,255,.55)', 'rgba(150,180,255,.15)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r * 5);
      g.save(); g.rotate((n.ph || 0));
      g.fillStyle = 'rgba(200,225,255,.5)';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-r * 6, -r * 0.7); g.lineTo(-r * 6, r * 0.7); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(0, 0); g.lineTo(r * 6, -r * 0.7); g.lineTo(r * 6, r * 0.7); g.closePath(); g.fill();
      g.restore();
      g.fillStyle = '#ffffff';
      circle(g, 0, 0, r * 0.7);
    }
  });

  /* ---------- планета изнутри, атмосфера, города, страны ---------------- */
  def('continent', {
    shell: 0.9, clip: true, field: F.ground,
    outer: function (g, r, n, t) {
      g.fillStyle = 'rgba(60,110,70,.95)';
      blobPath(g, 0, 0, r, 18, (n.ph || 0), 0.22); g.fill();
      g.fillStyle = 'rgba(120,140,80,.6)';
      blobPath(g, r * 0.2, r * 0.1, r * 0.5, 12, 1.4, 0.3); g.fill();
      g.fillStyle = 'rgba(220,200,150,.5)';
      blobPath(g, -r * 0.3, -r * 0.2, r * 0.28, 10, 2.9, 0.35); g.fill();
    }
  });
  def('cityLights', {
    shell: 0.85, clip: false,
    outer: function (g, r, n, t) {
      var i, a, rr, seed = (n.ph || 0);
      g.fillStyle = rg(g, 0, 0, r, 'rgba(255,200,120,.22)', 'rgba(255,170,80,.06)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
      for (i = 0; i < 40; i++) {
        a = seed + i * 2.399; rr = Math.sqrt(((i * 37) % 100) / 100) * r * 0.9;
        var tw = 0.6 + 0.4 * Math.sin(t * 2 + i);
        g.fillStyle = 'rgba(255,225,150,' + (0.4 + 0.5 * tw) + ')';
        circle(g, Math.cos(a) * rr, Math.sin(a) * rr, Math.max(0.3, r * 0.018));
      }
    }
  });
  def('aurora', {
    shell: 0.5, clip: true, field: F.aurora,
    outer: function (g, r, n, t) {
      var i;
      for (i = 0; i < 3; i++) {
        var ph = (n.ph || 0) + i * 1.2 + t * 0.3;
        g.strokeStyle = 'rgba(120,255,190,' + (0.35 - i * 0.08) + ')';
        g.lineWidth = Math.max(1, r * 0.18);
        g.beginPath();
        g.ellipse(0, 0, r * (0.6 + i * 0.2), r * (0.3 + i * 0.12), 0.2, ph, ph + 2.6);
        g.stroke();
      }
    }
  });
  def('hurricane', {
    shell: 0.55, clip: true, field: F.cloud,
    outer: function (g, r, n, t) {
      var i, a, rr, seed = (n.ph || 0), rot = t * 0.22 + seed;
      g.fillStyle = rg(g, 0, 0, r, 'rgba(240,248,255,.35)', 'rgba(120,150,190,.25)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
      for (i = 0; i < 46; i++) {
        var u = ((i * 13) % 100) / 100;
        a = u * 3.4 + rot + (i % 3) * 2.094;
        rr = (0.08 + u * 0.92) * r;
        g.fillStyle = 'rgba(255,255,255,' + (0.35 - u * 0.2) + ')';
        blobPath(g, Math.cos(a) * rr, Math.sin(a) * rr, r * (0.12 - u * 0.05), 8, i, 0.4);
        g.fill();
      }
      g.fillStyle = 'rgba(20,30,50,.55)';
      circle(g, 0, 0, r * 0.07);
    }
  });
  def('hurricaneSmall', { shell: 0.6, clip: true, field: F.cloud, outer: STYLES.hurricane.outer });
  def('storm', {
    shell: 0.5, clip: false, field: F.cloud,
    outer: function (g, r, n, t) {
      var flash = Math.sin(t * 7 + (n.ph || 0)) > 0.94 ? 1 : 0;
      blob(g, 0, 0, r, 12, (n.ph || 0), 0.3, 'rgba(255,255,255,.5)', 'rgba(120,140,170,.4)');
      if (flash) { g.fillStyle = 'rgba(255,255,180,.8)'; g.fillRect(-r * 0.06, 0, r * 0.12, r * 0.9); }
    }
  });
  def('cloud', {
    shell: 0.5, clip: true, field: F.cloud,
    outer: function (g, r, n, t) {
      var i, a, seed = (n.ph || 0);
      for (i = 0; i < 5; i++) {
        a = i * 1.4 + seed;
        g.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.1 * (i % 3)) + ')';
        blobPath(g, Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.25, r * (0.45 + 0.2 * ((i * 5) % 3) / 3), 10, a, 0.35);
        g.fill();
      }
    }
  });
  def('cloudLayer', {
    shell: 0.45, clip: true, field: F.cloud,
    outer: function (g, r, n, t) {
      var i, a, seed = (n.ph || 0);
      for (i = 0; i < 8; i++) {
        a = i * 1.7 + seed;
        g.fillStyle = 'rgba(255,255,255,.3)';
        blobPath(g, Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.5, r * (0.5 + 0.3 * ((i * 7) % 4) / 4), 12, a, 0.4);
        g.fill();
      }
      g.fillStyle = 'rgba(120,150,190,.2)';
      blobPath(g, 0, 0, r * 0.95, 16, 1.2, 0.2); g.fill();
    }
  });
  def('solarSystem', {
    shell: 0.05, clip: true, field: F.starfield,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(120,140,255,.07)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
    }
  });
  def('innerSystem', { shell: 0.05, clip: true, field: F.starfield, outer: STYLES.solarSystem.outer });
  def('outerSystem', { shell: 0.05, clip: true, field: F.starfield, outer: STYLES.solarSystem.outer });
  def('asteroidBelt', {
    shell: 0.06, clip: true, field: F.starfield,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r * 0.9, 'rgba(160,140,110,.22)', 'rgba(120,110,90,.08)', 'rgba(0,0,0,0)');
      g.save(); g.scale(1, 0.45); circle(g, 0, 0, r * 0.9); g.restore();
    }
  });
  def('kuiper', {
    shell: 0.06, clip: true, field: F.starfield,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(150,190,255,.16)', 'rgba(110,150,255,.06)', 'rgba(0,0,0,0)');
      g.save(); g.scale(1, 0.5); circle(g, 0, 0, r); g.restore();
    }
  });
  def('heliopause', {
    shell: 0.08, clip: true, field: F.starfield,
    outer: function (g, r, n, t) {
      g.strokeStyle = 'rgba(255,220,160,.35)'; g.lineWidth = Math.max(1, r * 0.02);
      for (var i = 0; i < 3; i++) {
        g.beginPath(); g.ellipse(0, 0, r * (0.9 - i * 0.08), r * (0.62 - i * 0.06), 0, 0, TAU); g.stroke();
      }
      g.fillStyle = rg(g, 0, 0, r, 'rgba(255,220,170,.14)', 'rgba(140,170,255,.08)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
    }
  });
  def('oort', {
    shell: 0.10, clip: true, field: F.starfield,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(200,220,255,.14)', 'rgba(140,170,255,.06)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
      g.strokeStyle = 'rgba(180,210,255,.2)'; g.lineWidth = Math.max(1, r * 0.015);
      g.beginPath(); g.arc(0, 0, r * 0.96, 0, TAU); g.stroke();
    }
  });
  def('oortInner', { shell: 0.1, clip: true, field: F.starfield, outer: STYLES.oort.outer });
  def('oortOuter', { shell: 0.1, clip: true, field: F.starfield, outer: STYLES.oort.outer });
  def('cislunar', { shell: 0.04, clip: true, field: F.starfield, outer: STYLES.solarSystem.outer });
  def('earthMoon', { shell: 0.05, clip: true, field: F.starfield, outer: STYLES.solarSystem.outer });
  def('magnetosphere', {
    shell: 0.10, clip: true, field: F.aurora,
    outer: function (g, r, n, t) {
      var i, a;
      g.fillStyle = rg(g, 0, 0, r, 'rgba(120,160,255,.10)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
      g.strokeStyle = 'rgba(140,180,255,.35)'; g.lineWidth = Math.max(1, r * 0.015);
      for (i = -3; i <= 3; i++) {
        g.beginPath();
        g.ellipse(0, 0, r * (0.3 + Math.abs(i) * 0.16), r * (0.55 + Math.abs(i) * 0.16), 0, 0, TAU);
        g.stroke();
      }
      // хвост магнитосферы
      g.fillStyle = 'rgba(120,150,255,.10)';
      g.beginPath(); g.moveTo(r * 0.6, -r * 0.7); g.lineTo(r * 3, -r * 0.4); g.lineTo(r * 3, r * 0.4); g.lineTo(r * 0.6, r * 0.7); g.closePath(); g.fill();
    }
  });
  def('nearestStars', { shell: 0.03, clip: true, field: F.starfield, outer: STYLES.solarSystem.outer });
  def('localStars', { shell: 0.03, clip: true, field: F.starfield, outer: STYLES.solarSystem.outer });
  def('localBubble', {
    shell: 0.07, clip: true, field: F.starfield,
    outer: function (g, r, n, t) {
      g.strokeStyle = 'rgba(255,190,140,.28)'; g.lineWidth = Math.max(1, r * 0.012);
      for (var i = 0; i < 3; i++) {
        g.beginPath(); g.arc(0, 0, r * (0.98 - i * 0.05), 0, TAU); g.stroke();
      }
      g.fillStyle = rg(g, 0, 0, r, 'rgba(255,180,130,.07)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
    }
  });
  def('gouldBelt', {
    shell: 0.06, clip: true, field: F.starfield,
    outer: function (g, r, n, t) {
      g.save(); g.rotate(0.5);
      g.strokeStyle = 'rgba(160,200,255,.22)'; g.lineWidth = Math.max(1, r * 0.1);
      g.beginPath(); g.ellipse(0, 0, r, r * 0.42, 0, 0, TAU); g.stroke();
      g.restore();
      g.fillStyle = rg(g, 0, 0, r, 'rgba(140,180,255,.07)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
    }
  });
  def('orionArm', {
    shell: 0.06, clip: true, field: F.galaxyDust,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(160,190,255,.12)', 'rgba(255,180,150,.06)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
      g.strokeStyle = 'rgba(170,200,255,.12)'; g.lineWidth = Math.max(1, r * 0.3);
      g.beginPath(); g.moveTo(-r, -r * 0.4); g.quadraticCurveTo(0, r * 0.2, r, -r * 0.25); g.stroke();
    }
  });
  def('galacticArea', { shell: 0.05, clip: true, field: F.galaxyDust, outer: STYLES.orionArm.outer });
  def('greatWalls', {
    shell: 0.05, clip: true, field: F.cosmicWeb,
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, 0, 0, r, 'rgba(140,170,255,.08)', 'rgba(0,0,0,0)');
      circle(g, 0, 0, r);
      STYLES.galaxyCluster.outer(g, r, n, t);
    }
  });

  /* ---------- города, страны, поверхность Земли -------------------------- */
  def('country', {
    shell: 0.9, clip: true, field: F.ground,
    outer: function (g, r, n, t) {
      var i, a;
      g.fillStyle = 'rgba(52,92,74,.95)';
      blobPath(g, 0, 0, r, 20, (n.ph || 0), 0.2); g.fill();
      g.fillStyle = 'rgba(190,170,120,.85)';
      blobPath(g, r * 0.15, -r * 0.1, r * 0.45, 12, 1.1, 0.3); g.fill();
      g.strokeStyle = 'rgba(120,180,220,.7)'; g.lineWidth = Math.max(1, r * 0.05);
      wavy(g, -r * 0.9, r * 0.2, r * 0.9, r * 0.5, r * 0.12, 1.2, (n.ph || 0), Math.max(1, r * 0.05), 'rgba(120,180,220,.7)');
      for (i = 0; i < 8; i++) {
        a = i * 2.1 + (n.ph || 0);
        g.fillStyle = 'rgba(255,210,140,.75)';
        circle(g, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.45, Math.max(0.4, r * 0.02));
      }
    }
  });
  def('region', {
    shell: 0.9, clip: true, field: F.ground,
    outer: function (g, r, n, t) {
      var i, a;
      g.fillStyle = 'rgba(58,96,70,.95)';
      blobPath(g, 0, 0, r, 20, (n.ph || 0), 0.22); g.fill();
      for (i = 0; i < 5; i++) {
        a = i * 1.5 + (n.ph || 0);
        g.fillStyle = 'rgba(110,110,118,.9)';
        g.beginPath();
        g.moveTo(Math.cos(a) * r * 0.7 - r * 0.2, Math.sin(a) * r * 0.7 + r * 0.16);
        g.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7 - r * 0.3);
        g.lineTo(Math.cos(a) * r * 0.7 + r * 0.2, Math.sin(a) * r * 0.7 + r * 0.16);
        g.closePath(); g.fill();
      }
    }
  });
  def('city', {
    shell: 0.85, clip: true, field: F.ground,
    outer: function (g, r, n, t) {
      var i, a, rr, seed = (n.ph || 0);
      g.fillStyle = 'rgba(44,52,64,.95)';
      blobPath(g, 0, 0, r, 18, seed, 0.18); g.fill();
      g.strokeStyle = 'rgba(255,214,150,.5)'; g.lineWidth = Math.max(1, r * 0.02);
      for (i = 0; i < 10; i++) {
        a = i / 10 * TAU + seed;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke();
      }
      g.strokeStyle = 'rgba(120,180,255,.5)'; g.lineWidth = Math.max(1, r * 0.08);
      g.beginPath(); g.moveTo(-r, r * 0.2); g.quadraticCurveTo(0, -r * 0.3, r, r * 0.1); g.stroke();
      for (i = 0; i < 26; i++) {
        a = seed + i * 2.399; rr = Math.sqrt(((i * 37) % 100) / 100) * r * 0.85;
        g.fillStyle = 'rgba(255,220,150,.85)';
        circle(g, Math.cos(a) * rr, Math.sin(a) * rr, Math.max(0.3, r * 0.012));
      }
    }
  });
  def('block', {
    shell: 0.8, clip: true, field: F.ground,
    outer: function (g, r, n, t) {
      var i, a, seed = (n.ph || 0);
      g.fillStyle = 'rgba(52,60,70,.95)';
      g.fillRect(-r, -r, r * 2, r * 2);
      g.strokeStyle = 'rgba(255,214,150,.4)'; g.lineWidth = Math.max(1, r * 0.05);
      g.beginPath(); g.moveTo(-r, 0); g.lineTo(r, 0); g.stroke();
      g.beginPath(); g.moveTo(0, -r); g.lineTo(0, r); g.stroke();
      for (i = 0; i < 8; i++) {
        a = seed + i * 1.9;
        g.fillStyle = 'rgba(90,100,115,.95)';
        g.fillRect(Math.cos(a) * r * 0.6 - r * 0.16, Math.sin(a) * r * 0.6 - r * 0.16, r * 0.32, r * 0.32);
      }
    }
  });
  def('yard', {
    shell: 0.85, clip: true, field: F.ground,
    outer: function (g, r, n, t) {
      var i, a;
      g.fillStyle = 'rgba(58,104,64,.95)';
      g.fillRect(-r, -r, r * 2, r * 2);
      g.fillStyle = 'rgba(150,140,130,.8)';
      g.fillRect(-r, -r * 0.15, r * 2, r * 0.3);
      for (i = 0; i < 7; i++) {
        a = (n.ph || 0) + i * 1.7;
        g.fillStyle = 'rgba(40,90,50,.9)';
        circle(g, Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.55, r * 0.16);
      }
    }
  });
  def('harbor', {
    shell: 0.8, clip: false,
    outer: function (g, r, n, t) {
      g.fillStyle = 'rgba(30,70,110,.9)';
      blobPath(g, 0, 0, r * 1.2, 14, 1.1, 0.2); g.fill();
      g.fillStyle = 'rgba(80,80,88,.95)';
      g.fillRect(-r * 1.2, -r * 0.2, r * 2.4, r * 0.24);
      for (var i = 0; i < 4; i++) {
        g.fillStyle = 'rgba(230,230,240,.9)';
        g.fillRect(-r * 0.9 + i * r * 0.6, -r * 0.1, r * 0.4, r * 0.12);
      }
    }
  });
  def('stadium', {
    shell: 0.85, clip: false,
    outer: function (g, r, n, t) {
      g.strokeStyle = 'rgba(220,230,245,.9)'; g.lineWidth = Math.max(1, r * 0.24);
      g.beginPath(); g.ellipse(0, 0, r, r * 0.72, 0, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(70,140,80,.95)';
      g.beginPath(); g.ellipse(0, 0, r * 0.82, r * 0.55, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = Math.max(1, r * 0.04);
      g.beginPath(); g.ellipse(0, 0, r * 0.3, r * 0.2, 0, 0, TAU); g.stroke();
    }
  });
  def('bridge', {
    shell: 0.85, clip: false,
    outer: function (g, r, n, t) {
      g.fillStyle = 'rgba(200,205,215,.95)';
      g.fillRect(-r * 2, -r * 0.1, r * 4, r * 0.18);
      g.strokeStyle = 'rgba(200,205,215,.9)'; g.lineWidth = Math.max(1, r * 0.1);
      for (var i = -2; i <= 2; i++) {
        g.beginPath(); g.moveTo(i * r * 0.7, r * 0.08); g.lineTo(i * r * 0.7, r * 0.7); g.stroke();
      }
      g.strokeStyle = 'rgba(255,220,150,.8)';
      g.beginPath(); g.moveTo(-r * 2, -r * 0.35); g.quadraticCurveTo(0, -r * 0.9, r * 2, -r * 0.35); g.stroke();
    }
  });

  /* ---------- «живое»: кровь, нервы, микробы ----------------------------- */

  def('palm', {
    shell: 0.34, clip: false, lum: 0.05,
    field: {
      base: ['#5a3428', '#120806'],
      levels: [
        { s: 2.5e-4, k: 'poly', c: ['rgba(255,220,190,.45)'], a: 0.5, sz: 0.9, j: 0.35 },
        { s: 1e-4, k: 'grain', c: ['rgba(255,235,215,.3)'], a: 0.3, sz: 0.4, j: 0.8 }
      ]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = rg(g, -r * .2, -r * .3, r * 1.5, 'rgba(255,214,186,.7)', 'rgba(178,116,88,.6)', 'rgba(90,50,30,0)');
      g.beginPath();
      g.moveTo(-r * 0.75, -r * 0.55);
      g.quadraticCurveTo(0, -r * 0.85, r * 0.75, -r * 0.55);
      g.quadraticCurveTo(r * 0.95, r * 0.3, r * 0.45, r * 0.85);
      g.quadraticCurveTo(0, r * 1.1, -r * 0.45, r * 0.85);
      g.quadraticCurveTo(-r * 0.95, r * 0.3, -r * 0.75, -r * 0.55);
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,230,210,.35)'; g.lineWidth = Math.max(1, r * 0.035);
      for (var i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(-r * 0.6 + i * r * 0.6, -r * 0.5);
        g.quadraticCurveTo(-r * 0.5 + i * r * 0.6, 0, -r * 0.35 + i * r * 0.6, r * 0.8);
        g.stroke();
      }
    }
  });

  def('clouds', {
    shell: 0.35, clip: true,
    field: {
      base: ['#3a4a6a', '#0a0f1a'],
      levels: [
        { s: 1.2e5, k: 'soft', c: ['rgba(255,255,255,.45)'], a: 0.5, sz: 1.2, j: 0.5 },
        { s: 4e4, k: 'soft', c: ['rgba(255,255,255,.3)'], a: 0.3, sz: 0.7, j: 0.75 }
      ]
    },
    outer: function (g, r, n, t) {
      g.fillStyle = 'rgba(120,160,220,.12)';
      circle(g, 0, 0, r);
      STYLES.cloudLayer.outer(g, r, n, t);
    }
  });

  def('greatWall', clusterPainter({ n: 34, mote: 'galaxy', sz: 0.08 }));

  /* ---------- кадр целиком (для объектов-«сцен») ------------------------- */
  def('empty', { shell: 0.02, clip: false, field: null, outer: function () {} });

  /* ---------- мелкие узнаваемые детали внутри сцен ---------------------- */
  var EXTRA = {
    yard: [{ f: 0.020, k: 'soft', c: ['#ffd166', '#ff8ab0', '#fff6c0', '#8fd8ff'], a: 0.55, sz: 0.30, j: 0.9 }],
    forest: [{ f: 0.016, k: 'blob', c: ['rgba(60,120,60,.6)', 'rgba(40,90,50,.6)'], a: 0.5, sz: 0.7, j: 0.6 }],
    block: [{ f: 0.018, k: 'grain', c: ['rgba(255,220,150,.55)'], a: 0.5, sz: 0.35, j: 0.9 }],
    city: [{ f: 0.014, k: 'grain', c: ['rgba(255,214,140,.55)'], a: 0.5, sz: 0.35, j: 0.9 }],
    region: [{ f: 0.014, k: 'blob', c: ['rgba(70,120,60,.5)', 'rgba(120,150,80,.45)'], a: 0.45, sz: 0.8, j: 0.6 }],
    country: [{ f: 0.011, k: 'blob', c: ['rgba(70,120,60,.45)', 'rgba(190,170,120,.4)'], a: 0.45, sz: 0.9, j: 0.6 }],
    desert: [{ f: 0.02, k: 'thread', c: ['rgba(255,240,200,.35)'], a: 0.4, sz: 1.2, j: 0.5 }],
    clouds: [{ f: 0.02, k: 'soft', c: ['rgba(255,255,255,.5)'], a: 0.45, sz: 0.9, j: 0.6 }],
    room: [{ f: 0.030, k: 'grain', c: ['rgba(255,235,200,.22)'], a: 0.35, sz: 0.5, j: 0.85 }],
    tissue: [{ f: 0.02, k: 'blob', c: ['rgba(255,170,150,.5)', 'rgba(230,120,140,.45)'], a: 0.45, sz: 0.7, j: 0.7 }],
    skin: [{ f: 0.03, k: 'blob', c: ['rgba(255,200,170,.4)'], a: 0.4, sz: 0.7, j: 0.75 }],
    cell: [{ f: 0.014, k: 'soft', c: ['#c8ff8f', '#8fd8ff', '#ffd98a'], a: 0.45, sz: 0.5, j: 0.85 }],
    cellCluster: [{ f: 0.02, k: 'bubble', c: ['rgba(255,200,210,.4)'], a: 0.45, sz: 0.7, j: 0.7 }],
    blood: []
  };
  (function () {
    for (var k in EXTRA) {
      var st = P[k] || STYLES[k];
      if (!st || !st.field || !st.field.levels || st.field.__extra) continue;
      st.field.levels = st.field.levels.concat(EXTRA[k]);
      st.field.__extra = true;
    }
  })();

  /* ---------- регистрация: всё, что описано как P.*, попадает в реестр ------ */
  (function () {
    var k, n = 0;
    for (k in P) {
      if (!P[k] || STYLES[k]) continue;
      STYLES[k] = P[k];
      n++;
    }
    // у каждой записи должны быть свои outer/field
    for (k in STYLES) {
      if (!STYLES[k]) { delete STYLES[k]; continue; }
      if (!STYLES[k].outer) STYLES[k].outer = function () {};
      if (STYLES[k].shell === undefined) STYLES[k].shell = 1;
    }
    // «лестница» текстур: уровень, заданный в долях радиуса, размножаем на более
    // мелкие — тогда внутренность объекта фактурна на любом приближении
    for (k in STYLES) {
      var fld = STYLES[k].field, i, j, lv, ff, out;
      if (!fld || !fld.levels || !fld.levels.length) continue;
      if (fld.__ladder) continue;      // один и тот же набор текстур нельзя
      fld.__ladder = true;             // размножать дважды: он общий у многих стилей
      out = [];
      for (i = 0; i < fld.levels.length; i++) {
        lv = fld.levels[i];
        if (lv.f === undefined) { out.push(lv); continue; }
        ff = lv.f;
        for (j = 0; j < 3; j++) {
          out.push({
            f: ff, k: lv.k, c: lv.c, sz: lv.sz, j: lv.j,
            a: (lv.a === undefined ? 0.5 : lv.a) * (j === 0 ? 1 : Math.max(0.4, 0.92 - j * 0.22))
          });
          ff /= 3.4;
        }
      }
      fld.levels = out;
    }
  })();

  /* ---------- особые внутренности -------------------------------------- */
  // Земля изнутри — вид из космоса: океан, материки, облака
  if (STYLES.earth) {
    STYLES.earth.field = {
      base: ['#2f7fc4', '#0a2a52'],
      levels: [
        { f: 0.30, k: 'blob', c: ['rgba(72,124,64,.85)', 'rgba(122,152,86,.8)', 'rgba(198,178,126,.7)'], a: 0.85, sz: 0.95, j: 0.35 },
        { f: 0.10, k: 'soft', c: ['rgba(255,255,255,.55)'], a: 0.5, sz: 1.1, j: 0.6 }
      ]
    };
  }

  /* ---------- горизонт для «пейзажных» сцен -------------------------------- */
  var SKIES = {
    room: { at: .58, top0: '#2e231b', top1: '#54402f', bot0: '#6a4a30', bot1: '#241812', haze: 'rgba(255,220,170,.20)', planks: true, plankColor: 'rgba(255,220,170,.13)' },
    yard: { at: .50, top0: '#3a6ba8', top1: '#8fb6dd', bot0: '#4f7a3e', bot1: '#1e3a1c', haze: 'rgba(255,255,255,.22)' },
    block: { at: .48, top0: '#3a6ba8', top1: '#9dbede', bot0: '#4a5a5e', bot1: '#20282c', haze: 'rgba(255,255,255,.20)' },
    city: { at: .46, top0: '#2e5a94', top1: '#93b4d6', bot0: '#3c4a52', bot1: '#18202a', haze: 'rgba(255,255,255,.18)' },
    region: { at: .42, top0: '#2a5488', top1: '#a8c4dd', bot0: '#3e5a34', bot1: '#1a2a18', haze: 'rgba(255,255,255,.22)' },
    country: { at: .40, top0: '#24507f', top1: '#a6c2da', bot0: '#4a5c38', bot1: '#1c2a1c', haze: 'rgba(255,255,255,.20)' },
    clouds: { at: .60, top0: '#7ea6d0', top1: '#cfe0f0', bot0: '#e2eaf3', bot1: '#93a9be', haze: 'rgba(255,255,255,.35)' },
    forest: { at: .44, top0: '#2e5c3e', top1: '#7fa878', bot0: '#2c4a24', bot1: '#101c10', haze: 'rgba(220,255,220,.18)' },
    lake: { at: .48, top0: '#2a5488', top1: '#9fc0dc', bot0: '#2a5a86', bot1: '#0e2038', haze: 'rgba(255,255,255,.25)' },
    island: { at: .50, top0: '#2a5a90', top1: '#a8c8e0', bot0: '#2e6a9a', bot1: '#123048', haze: 'rgba(255,255,255,.25)' },
    desert: { at: .46, top0: '#3a6aa0', top1: '#c8d8e0', bot0: '#c8a468', bot1: '#6a4a28', haze: 'rgba(255,240,210,.28)' },
    harbor: { at: .44, top0: '#2a5488', top1: '#a0c0dc', bot0: '#27547c', bot1: '#0e2038', haze: 'rgba(255,255,255,.22)' }
  };
  (function () {
    for (var k in SKIES) if (STYLES[k]) STYLES[k].sky = SKIES[k];
  })();

  /* ---------- «далёкие светила»: минимальный видимый ореол ----------------- */
  (function () {
    var list = ('sun sunMarker star proxima starA barnard sirius vega altair pulsar quasar ' +
      'earth mars venus mercury jupiter saturn uranus neptune pluto moon io europa ganymede ' +
      'callisto titan enceladus triton charon eris sedna ceres vesta phobos ' +
      'comet halley kbo satellite station voyager ' +
      'galaxy spiralGalaxy andromeda triangulum sombrero m87 ellipticalGalaxy dwarfGalaxy ' +
      'lmc smc milkyWay localGroup virgo galacticCenter nebula orionNebula globularCluster ' +
      'starCluster openCluster').split(' ');
    for (var i = 0; i < list.length; i++) if (STYLES[list[i]]) STYLES[list[i]].min = 2.6;
  })();


  /* ---------- наборы орбит: рисуются в системе узла, в метрах -------------- */
  var ORB = {
    mercury: { r: 5.79e10, c: 'rgba(198,192,182,.85)' },
    venus: { r: 1.082e11, c: 'rgba(232,211,160,.85)' },
    earth: { r: 1.496e11, c: 'rgba(127,182,255,.9)' },
    mars: { r: 2.279e11, c: 'rgba(255,143,106,.85)' },
    belt: { r: 4.1e11, c: 'rgba(168,152,128,.5)' },
    jupiter: { r: 7.785e11, c: 'rgba(232,192,138,.85)' },
    saturn: { r: 1.4335e12, c: 'rgba(232,220,176,.85)' },
    uranus: { r: 2.8725e12, c: 'rgba(168,224,232,.85)' },
    neptune: { r: 4.4951e12, c: 'rgba(127,159,255,.85)' },
    kuiper: { r: 7.5e12, c: 'rgba(176,184,200,.5)' },
    heliopause: { r: 1.8e13, c: 'rgba(255,220,160,.5)' },
    oortIn: { r: 1.5e14, c: 'rgba(180,210,255,.35)' },
    oort: { r: 7.5e15, c: 'rgba(180,210,255,.3)' },
    moon: { r: 3.844e8, c: 'rgba(220,225,235,.8)' },
    geo: { r: 4.2164e7, c: 'rgba(255,225,160,.5)' }
  };
  var ORBITS = {
    inner: ['mercury', 'venus', 'earth', 'mars'],
    terran: ['mercury', 'venus', 'earth', 'mars'],
    belt: ['mars', 'belt', 'jupiter'],
    giant: ['belt', 'jupiter', 'saturn'],
    full: ['jupiter', 'saturn', 'uranus', 'neptune', 'kuiper'],
    outer: ['kuiper', 'heliopause', 'oortIn'],
    oort: ['oortIn', 'oort'],
    cislunar: ['moon'],
    geo: ['geo']
  };

  global.PAINT = {
    styles: STYLES,
    orbitTable: ORB,
    orbitSets: ORBITS,
    get: function (name) { return STYLES[name] || null; },
    sprite: sprite,
    clearSpriteCache: clearSpriteCache,
    helpers: { hs: hs, rg: rg, lg: lg, circle: circle, ball: ball, blob: blob, blobPath: blobPath, wavy: wavy, sil: sil, starShape: starShape }
  };
})(window);
