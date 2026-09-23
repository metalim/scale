/* ============================================================================
   ДВИЖОК. Один мир, одна камера, одна непрерывная логарифмическая шкала.

   Главная идея: у каждого объекта есть реальный радиус в метрах. Экранный
   радиус объекта = 10^(logR - z) * half, где z — логарифм масштаба кадра.
   Положение = сумма смещений по цепочке вложенности, каждое в радиусах своего
   родителя. Ничего не «создаётся» и не «уничтожается»: при любом z рисуются
   все объекты, которые больше долей пикселя. Камера лишь меняет z.

   Камера всегда внутри самого глубокого объекта, чей радиус больше кадра
   (контейнер). Когда z проходит радиус следующего объекта — контейнером
   становится он, и это происходит ровно в тот момент, когда его диск в
   точности закрывает экран: перехода не видно.
   ========================================================================== */
(function () {
  'use strict';
  window.addEventListener('error', function (e) { window.__err = (e.message || '') + ' @' + (e.lineno || ''); });

  var W = window.WORLD, PAINT = window.PAINT;
  if (!W || !PAINT) { console.error('нет WORLD или PAINT'); return; }

  var TAU = Math.PI * 2;
  var canvas = document.getElementById('stage');
  var ctx = canvas.getContext('2d', { alpha: false });
  var dpr = 1, VW = 0, VH = 0, half = 0;

  function smoothstep(a, b, x) { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hash(i, j, s) {
    var h = (i * 374761393 + j * 668265263 + s * 2246822519) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  }

  /* ======================= построение мира ============================== */
  var ALL = [];            // все узлы подряд
  var SPINE = [];          // «позвоночник» путешествия (по возрастанию размера)
  var ROOT = null;

  function build(spec, parent, spineIdx) {
    var n = {
      id: spec.id, name: spec.name || '', desc: spec.desc || '',
      styleName: spec.style, style: PAINT.get(spec.style) || null,
      logR: spec.logR, R: Math.pow(10, spec.logR),
      rel: spec.rel || [0, 0, 0],
      ph: spec.ph || 0, sz: spec.sz === undefined ? 1 : spec.sz,
      tint: spec.tint === undefined ? 0.5 : spec.tint,
      hero: !!spec.hero, alive: !!spec.alive, label: spec.label !== false,
      orbits: spec.orbits || null,
      parent: parent, kids: [], depth: parent ? parent.depth + 1 : 0,
      spineIdx: spineIdx === undefined ? -1 : spineIdx,
      seed: 0
    };
    // оттенок глубины: ближе к камере — чуть крупнее и ярче
    n.scaleZ = 1 + clamp((n.rel[2] || 0), -0.6, 0.6) * 0.14;
    n.zr = n.logR + Math.log10(n.scaleZ);
    n.seed = (Math.abs(Math.sin(n.logR * 12.9898 + (parent ? parent.logR * 78.233 : 0)) * 43758.5453) * 1000) | 0;
    if (!n.style) n.style = PAINT.get('empty');
    ALL.push(n);

    var kids = (spec.kids || []).slice();
    var i, k;
    for (i = 0; i < kids.length; i++) {
      k = kids[i];
      // объект не может быть больше своего вместилища
      if (k.logR >= n.logR - 0.04) k.logR = n.logR - 0.08;
      // мелкие объекты держатся ближе к центру: тогда при спуске в объект
      // в кадре всё время остаётся что-то живое и узнаваемое
      var d = n.logR - k.logR;
      var f1 = clamp(1 - 0.75 * d, 0.06, 1);
      k.rel[0] *= f1; k.rel[1] *= f1;
      var rr2 = Math.hypot(k.rel[0], k.rel[1]);
      if (rr2 > 0.42) { var kk2 = 0.42 / rr2; k.rel[0] *= kk2; k.rel[1] *= kk2; }
      var child = build(k, n, -1);
      n.kids.push(child);
    }
    // дальние — раньше (алгоритм художника)
    n.kids.sort(function (a, b) { return (b.rel[2] || 0) - (a.rel[2] || 0); });
    return n;
  }

  // Строим цепочку от большого к малому: каждый следующий (меньший) объект —
  // ребёнок предыдущего (большего). rel — положение внутри большего объекта.
  (function initWorld() {
    var i, sp, n, parent = null;
    for (i = W.spine.length - 1; i >= 0; i--) {
      sp = W.spine[i];
      sp.rel = sp.rel || [0, 0, 0];
      n = build(sp, parent, i);
      if (parent) parent.kids.push(n);      // вложенность: меньший внутри большего
      SPINE[i] = n;
      parent = n;
    }
    // порядок отрисовки: дальние раньше
    for (i = 0; i < SPINE.length; i++) {
      SPINE[i].kids.sort(function (a, b) { return (b.rel[2] || 0) - (a.rel[2] || 0); });
    }
    ROOT = SPINE[SPINE.length - 1];       // наблюдаемая Вселенная — корень мира
  })();

  // обратные ссылки: дети «позвоночника» знают свой индекс
  (function markSpineKids() {
    var i, j;
    for (i = 0; i < SPINE.length; i++) {
      for (j = 0; j < SPINE[i].kids.length; j++) {
        if (SPINE[i].kids[j].id === SPINE[i].id) continue;
      }
    }
  })();

  var ZMIN = W.zMin, ZMAX = W.zMax;

  /* ======================= камера ======================================= */
  var state = {
    z: 0,                 // log10(метров на радиус half)
    dir: 1,               // +1 — к Вселенной, -1 — к кварку
    auto: true,
    speed: 0.30,          // декад в секунду
    look: [0, 0, 0],      // точка взгляда в системе контейнера (в его радиусах)
    pan: [0, 0],          // ручной сдвиг
    tween: null,          // цель перемещения
    quality: 250,         // бюджет деталей на уровень
    labels: true,
    frame: 0
  };

  // контейнер — самый маленький объект, который больше кадра:
  // камера всегда внутри него, а всё, что меньше, видно как предметы внутри
  function containerAt(z) {
    for (var i = 0; i < SPINE.length; i++) if (SPINE[i].zr > z) return SPINE[i];
    return SPINE[SPINE.length - 1];
  }
  // следующий меньший узел позвоночника
  function nextSmaller(c) { return c.spineIdx > 0 ? SPINE[c.spineIdx - 1] : null; }
  function pxPerMeter(z) { return Math.pow(10, -z) * half; }
  function rPxOf(n, z) { return Math.pow(10, Math.min(300, n.zr - z)) * half; }

  // положение центра узла в системе контейнера (в радиусах контейнера)
  function posInC(node, C) {
    if (node === C) return [0, 0];
    var x = 0, y = 0, n = node, guard = 0;
    while (n && n !== C && n.parent && guard++ < 200) {
      var k = Math.pow(10, Math.min(0, n.parent.logR - C.logR));
      x += n.rel[0] * k; y += n.rel[1] * k;
      n = n.parent;
    }
    return [x, y];
  }
  // центр предка (или потомка) C в системе C
  function centerOf(other, C) {
    if (other === C) return [0, 0];
    if (other.depth < C.depth) {            // предок: берём с обратным знаком
      var p = posInC(C, other);
      var k = Math.pow(10, Math.min(300, other.logR - C.logR));
      return [-p[0] * k, -p[1] * k];
    }
    return posInC(other, C);
  }

  /* ======================= отрисовка ==================================== */
  var stats = { alive: 0, drawn: 0, labels: [] };

  function project(n, C, z, lookPx) {
    var p = posInC(n, C);
    var k = rPxOf(C, z);
    var x = VW / 2 + p[0] * k - lookPx[0], y = VH / 2 + p[1] * k - lookPx[1];
    var lim = 4e6;
    if (x > lim) x = lim; else if (x < -lim) x = -lim;
    if (y > lim) y = lim; else if (y < -lim) y = -lim;
    return [x, y];
  }

  // база внутренности: мягкий градиент. Для гигантских объектов — почти плоская
  // заливка: больших промежуточных поверхностей не создаём (иначе браузер падает)
  function fieldBase(f, cx, cy, r) {
    var RR = Math.hypot(VW, VH), dx = VW / 2 - cx, dy = VH / 2 - cy, L = Math.hypot(dx, dy);
    if (r < RR * 1.6 && isFinite(r)) {
      ctx.fillStyle = PAINT.helpers.rg(ctx, cx, cy, Math.max(1, r), f.base[0], f.base[1], f.base[2] || f.base[1]);
    } else if (!isFinite(dx) || !isFinite(dy) || !isFinite(L) || L < 1) {
      ctx.fillStyle = f.base[1];
    } else {
      var kk = Math.min(1, RR * 1.1 / L);
      ctx.fillStyle = PAINT.helpers.lg(ctx, VW / 2, VH / 2, VW / 2 + dx * kk, VH / 2 + dy * kk,
        [0, f.base[0], 1, f.base[1]]);
    }
    ctx.fillRect(0, 0, VW, VH);
  }

  // уровни детализации внутренностей: активных не больше двух на узел,
  // общий бюджет деталей на кадр — чтобы кадр оставался дешёвым
  var act = [], fieldBudget = 0;
  function drawFieldLevels(node, cx, cy, r, alpha, time) {
    var st = node.style;
    if (!st || !st.field || alpha < 0.015 || r < 14) return;
    if (fieldBudget > 7) return;
    fieldBudget++;
    var f = st.field, i, lv, sLocal, sPx, fade;
    act.length = 0;
    for (i = 0; i < f.levels.length; i++) {
      lv = f.levels[i];
      sLocal = lv.f !== undefined ? lv.f : lv.s / node.R;
      sPx = sLocal * r;
      if (!(sPx > 1.05) || sPx > 400) continue;
      fade = smoothstep(1.05, 2.6, sPx) * (1 - smoothstep(30, 64, sPx));
      if (fade < 0.02) continue;
      act.push([fade, lv, sLocal, sPx]);
    }
    if (!act.length) return;
    if (act.length > 2) {
      act.sort(function (a, b) { return b[0] - a[0]; });
      act.length = 2;
    }
    var cap = Math.max(55, Math.round(state.quality / act.length));
    for (i = 0; i < act.length; i++) {
      drawLevel(node, act[i][1], cx, cy, r, alpha * act[i][0], time, act[i][3], cap);
    }
  }

  // один уровень: сетка деталей с джиттером в системе координат объекта
  function drawLevel(node, lv, cx, cy, r, alpha, time, sPx, cap) {
    var a = alpha * (lv.a === undefined ? 1 : lv.a);
    if (a < 0.02 || !(sPx > 0)) return;
    var sLocal = lv.f !== undefined ? lv.f : lv.s / node.R;
    var RRl = Math.hypot(VW, VH);
    // «рассыпные» уровни (звёзды, пыль) заполняют весь кадр, но разрежаются:
    // на экране остаётся ограниченное число точек, как на настоящем небе
    var spread = (lv.k === 'star' || lv.spread);
    var drawR = spread ? RRl * 0.62 : Math.min(RRl * 0.55, sPx * Math.sqrt(cap) * 0.62);
    var thin = 1;
    if (spread) {
      var full = (Math.PI * drawR * drawR) / (sPx * sPx);
      thin = Math.min(1, (Math.min(cap, 150) * 1.15) / Math.max(1, full));
    }
    var vx = (VW / 2 - cx) / r, vy = (VH / 2 - cy) / r;
    var jit = lv.j === undefined ? 0.5 : lv.j;
    var lx0 = Math.max((0 - cx) / r, vx - drawR / r, -1.02);
    var lx1 = Math.min((VW - cx) / r, vx + drawR / r, 1.02);
    var ly0 = Math.max((0 - cy) / r, vy - drawR / r, -1.02);
    var ly1 = Math.min((VH - cy) / r, vy + drawR / r, 1.02);
    if (lx1 <= lx0 || ly1 <= ly0) return;

    var i0 = Math.floor(lx0 / sLocal), i1 = Math.ceil(lx1 / sLocal);
    var j0 = Math.floor(ly0 / sLocal), j1 = Math.ceil(ly1 / sLocal);
    if (!isFinite(i0) || !isFinite(i1) || !isFinite(j0) || !isFinite(j1)) return;
    if ((i1 - i0) > 400 || (j1 - j0) > 400) return;      // страховка от «бесконечной» сетки

    var cols = lv.c, seed = node.seed, i, j, h1, h2, h3, h4, lx, ly, sx, sy, dd, edge, size, sp;
    var tw = (lv.k === 'star' || lv.k === 'soft');

    for (i = i0; i <= i1; i++) {
      for (j = j0; j <= j1; j++) {
        h1 = hash(i, j, seed); h2 = hash(i, j, seed + 7);
        h3 = hash(i, j, seed + 13); h4 = hash(i, j, seed + 29);
        if (thin < 1 && hash(i, j, seed + 101) > thin * 1.7) continue;
        lx = (i + 0.5 + (h1 - 0.5) * jit) * sLocal;
        ly = (j + 0.5 + (h2 - 0.5) * jit) * sLocal;
        if (lx * lx + ly * ly > 1.12) continue;
        sx = cx + lx * r; sy = cy + ly * r;
        if (sx < -60 || sy < -60 || sx > VW + 60 || sy > VH + 60) continue;
        dd = Math.hypot(sx - VW / 2, sy - VH / 2) / drawR;
        edge = 1 - smoothstep(0.7, 1, dd);
        if (edge < 0.03) continue;
        if (spread) size = sPx * (lv.sz === undefined ? 0.6 : lv.sz) * (0.3 + 1.7 * h3 * h3);
        else size = sPx * (lv.sz === undefined ? 0.6 : lv.sz) * (0.55 + 0.9 * h3);
        if (size < 0.7) continue;
        sp = PAINT.sprite(lv.k || 'soft', cols[(h4 * cols.length) | 0], size);
        ctx.globalAlpha = a * edge * (spread ? (0.30 + 0.85 * h1) : 1) *
          (tw ? (0.7 + 0.3 * Math.sin(time * (1.4 + h1) + h4 * 30)) : 1);
        ctx.drawImage(sp, sx - size / 2, sy - size / 2, size, size);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawFieldBase(node, cx, cy, r, alpha) {
    var st = node.style;
    if (!st || !st.field || alpha < 0.015) return;
    var prev = ctx.globalAlpha;
    ctx.globalAlpha = alpha;                       // прозрачность оболочки важна
    fieldBase(st.field, cx, cy, r);
    ctx.globalAlpha = prev;
  }

  // линия горизонта: камера всегда «на уровне глаз», поэтому горизонт в кадре
  function drawSky(node, cx, cy, r, alpha, time) {
    var st = node.style;
    if (!st || !st.sky || alpha < 0.2) return null;
    var vy = (VH / 2 - cy) / r;
    var at = st.sky.at === undefined ? 0.54 : st.sky.at;
    // с высоты в десятки километров горизонт уходит вниз за кадр
    at += 0.62 * clamp(Math.log10(node.R / 2e4), 0, 1.6);
    var sy = clamp(VH * at - vy * r * 0.08, -VH, VH * 2);
    var sky = st.sky;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (sy > 0) {
      ctx.fillStyle = PAINT.helpers.lg(ctx, 0, 0, 0, Math.max(1, sy), [0, sky.top0, 1, sky.top1]);
      ctx.fillRect(0, 0, VW, Math.min(VH, sy));
    }
    if (sy < VH) {
      ctx.fillStyle = PAINT.helpers.lg(ctx, 0, Math.max(0, sy), 0, VH + 1, [0, sky.bot0, 1, sky.bot1]);
      ctx.fillRect(0, Math.max(0, sy), VW, VH - Math.max(0, sy));
    }
    if (r > 13 && isFinite(sy)) {
      ctx.fillStyle = PAINT.helpers.rg(ctx, VW / 2, sy, Math.max(9, Math.min(VH, VW) * 0.55), sky.haze || 'rgba(255,255,255,.16)', 'rgba(0,0,0,0)');
      ctx.fillRect(0, Math.max(0, sy - VH * 0.3), VW, Math.min(VH, VH * 0.6));
    }
    // «доски пола» — простая, но узнаваемая фактура интерьера
    if (sky.planks && isFinite(sy) && sy < VH) {
      var step = Math.max(9, VH * 0.075), y0, k2, persp;
      ctx.strokeStyle = sky.plankColor || 'rgba(255,220,180,.10)';
      ctx.lineWidth = 1;
      for (y0 = sy; y0 < VH + step; y0 += step) {
        var t2 = (y0 - sy) / Math.max(1, VH - sy);
        ctx.beginPath();
        ctx.moveTo(0, y0);
        ctx.lineTo(VW, y0 + t2 * 6);
        ctx.stroke();
      }
      // «швы» досок, сходящиеся к точке схода
      for (k2 = -6; k2 <= 6; k2++) {
        ctx.beginPath();
        ctx.moveTo(VW / 2 + k2 * VW * 0.055, sy);
        ctx.lineTo(VW / 2 + k2 * VW * 0.22, VH + 20);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // орбиты: рисуются в системе узла, радиусы — в метрах
  function drawOrbits(node, cx, cy, r, alpha, time) {
    var set = node.orbits && PAINT.orbitSets[node.orbits];
    if (!set) return;
    var ppm = r / node.R, i, kk, ax = cx, ay = cy;
    for (i = 0; i < node.kids.length; i++) {
      kk = node.kids[i];
      if (kk.styleName === 'sun' || kk.styleName === 'sunMarker') { ax = cx + kk.rel[0] * r; ay = cy + kk.rel[1] * r; break; }
    }
    var lim = Math.hypot(VW, VH);
    for (i = 0; i < set.length; i++) {
      var o = PAINT.orbitTable[set[i]];
      if (!o) continue;
      var px = o.r * ppm;
      if (px < 9 || px > lim * 9) continue;
      ctx.globalAlpha = alpha * 0.85 * smoothstep(9, 24, px) * (1 - smoothstep(lim * 3.5, lim * 9, px));
      ctx.strokeStyle = o.c;
      ctx.lineWidth = Math.max(1, Math.min(4, px * 0.008));
      ctx.beginPath(); ctx.arc(ax, ay, px, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ореол далёкого светила: делает заметными объекты меньше пикселя
  function drawHalo(x, y, kReal, minr, alpha) {
    var size = Math.max(kReal * 3.4, minr * 2.6);
    var a = alpha * 0.55 * (1 - smoothstep(minr * 2.5, minr * 8, kReal));
    if (a < 0.02) return;
    var sp = PAINT.sprite('soft', 'rgba(255,246,220,.75)', size);
    ctx.globalAlpha = a;
    ctx.drawImage(sp, x - size / 2, y - size / 2, size, size);
    ctx.globalAlpha = Math.min(1, a * 1.3);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, Math.min(1.6, kReal * 0.6 + 0.5)), 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // вызов художника: начало координат — центр объекта, рисовать можно только в кадре
  function callOuter(st, r, node, time, cx, cy, alpha) {
    if (!st.outer || alpha < 0.012 || !(r > 0.2)) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
    ctx.translate(cx, cy);
    st.outer(ctx, r, node, time);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawNode(node, cx, cy, r, alpha, time, isContainer) {
    var st = node.style || PAINT.get('empty');
    var ratio = r / half;
    var near = smoothstep(0.62, 1.02, ratio);
    var far = 1 - smoothstep(0.80, 1.16, ratio);
    var opaque = (st.shell === undefined ? 1 : st.shell) >= 0.98;
    var fieldA, outerA;

    if (opaque) {
      outerA = (st.shell === undefined ? 1 : st.shell) * far * alpha;
      fieldA = smoothstep(0.86, 1.16, ratio) * alpha;
    } else {
      // полупрозрачные объекты: снаружи видно силуэт и намёк на внутренность
      outerA = Math.min(1, 0.55 + st.shell * 0.5) * far * alpha;
      fieldA = (0.16 + 0.84 * near) * alpha;
    }

    var onScreen = (cx + r > -2 && cx - r < VW + 2 && cy + r > -2 && cy - r < VH + 2);
    if (!onScreen) return;
    stats.drawn++;

    var RR = Math.hypot(VW, VH);
    // если диск заведомо больше экрана — отсечение не нужно (и вредно: путь огромный)
    var needClip = st.clip && r < RR * 3.2;
    ctx.save();
    if (needClip) { ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.5, Math.min(r, RR * 3.2)), 0, TAU); ctx.clip(); }

    // внешний вид и внутренность: порядок зависит от прозрачности оболочки
    if (opaque) {
      if (r < RR * 1.7) callOuter(st, r, node, time, cx, cy, outerA);
      if (st.lum > 0 && r > 6) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = st.lum * 0.5 * alpha * near;
        ctx.fillStyle = PAINT.helpers.rg(ctx, cx, cy, r * 1.3, 'rgba(255,240,200,.5)', 'rgba(0,0,0,0)');
        ctx.fillRect(0, 0, VW, VH);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    }
    if (fieldA > 0.01) {
      // внутренность всегда живёт внутри диска объекта
      ctx.save();
      if (r < RR * 3.2) { ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.5, r), 0, TAU); ctx.clip(); }
      ctx.globalAlpha = 1;
      drawFieldBase(node, cx, cy, r, fieldA);
      var skyY = (isContainer || ratio > 0.55) ? drawSky(node, cx, cy, r, fieldA, time) : null;
      if (skyY !== null && isFinite(skyY) && skyY < VH) {
        // фактура земли — только под линией горизонта, небо остаётся чистым
        ctx.save();
        ctx.beginPath(); ctx.rect(0, Math.max(0, skyY), VW, VH); ctx.clip();
        drawFieldLevels(node, cx, cy, r, fieldA, time);
        ctx.restore();
      } else {
        drawFieldLevels(node, cx, cy, r, fieldA, time);
      }
      ctx.restore();
    }
    if (alpha > 0.2) drawOrbits(node, cx, cy, r, alpha, time);
    if (!opaque && r < RR * 1.7) callOuter(st, r, node, time, cx, cy, outerA);

    // дети (всегда внутри диска объекта)
    var i, k, kx, ky, kr, krReal, ka, minr;
    ctx.save();
    if (node.kids.length && r < RR * 3.2) {
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.5, r), 0, TAU); ctx.clip();
    }
    for (i = 0; i < node.kids.length; i++) {
      k = node.kids[i];
      krReal = rPxOf(k, state.z);
      minr = k.style ? (k.style.min || 0) : 0;
      if (krReal < 0.35 && !minr) continue;
      kx = cx + k.rel[0] * r;
      ky = cy + k.rel[1] * r;
      var mg = krReal > 4 ? krReal * 1.4 : 4;
      if (kx + mg < -30 || kx - mg > VW + 30 || ky + mg < -30 || ky - mg > VH + 30) continue;
      ka = alpha * clamp(1 - (k.rel[2] || 0) * 0.16, 0.72, 1.1);
      if (minr && krReal < minr * 8) drawHalo(kx, ky, krReal, minr, ka);
      if (krReal < 0.35) continue;
      if (state.nokids) continue;
      drawNode(k, kx, ky, krReal, ka, time, false);
    }
    ctx.restore();

    // «стенка» контейнера: кромка диска, если она в кадре
    ctx.restore();

    if (ratio > 0.55 && ratio < 2.4) {
      var rim = Math.exp(-Math.pow((ratio - 1) / 0.30, 2));
      if (rim > 0.04 && r < RR * 3.2) {
        ctx.globalAlpha = rim * 0.45 * alpha;
        ctx.strokeStyle = opaque ? 'rgba(255,255,255,.5)' : (st.rimColor || 'rgba(255,255,255,.45)');
        ctx.lineWidth = Math.max(1.2, r * 0.012);
        ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.5, r), 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // метки
    if (node.label && node.name && r > 9 && r < half * 0.78) {
      stats.labels.push({ x: cx, y: cy, r: r, name: node.name, alive: node.alive, spine: node.spineIdx >= 0, d: r });
    }
    if (node.alive && r > half * 0.02) stats.alive++;
  }

  // предок: видна только его «стенка» — фон, без детей и деталей
  function drawAncestor(node, cx, cy, r, alpha, time) {
    var st = node.style || PAINT.get('empty');
    if (!st.field) return;
    var RR = Math.hypot(VW, VH);
    ctx.save();
    if (r < RR * 3.2) {
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.5, r), 0, TAU); ctx.clip();
    }
    ctx.globalAlpha = alpha;
    fieldBase(st.field, cx, cy, r);
    ctx.globalAlpha = alpha * 0.35;
    if (r > 8 && r < RR * 1.7) callOuter(st, r, node, time, cx, cy, 0.35);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ======================= форматирование =============================== */
  var UNITS = [
    [1e-18, 'ам'], [1e-15, 'фм'], [1e-12, 'пм'], [1e-9, 'нм'], [1e-6, 'мкм'],
    [1e-3, 'мм'], [1, 'м'], [1e3, 'км'], [1e6, 'Мм'], [1e9, 'Гм'], [1e12, 'Тм'],
    [1.495978707e11, 'а.е.'], [9.4607e15, 'св. года'], [3.0857e16, 'пк'],
    [3.0857e19, 'кпк'], [3.0857e22, 'Мпк'], [3.0857e25, 'Гпк']
  ];
  function fmt(m) {
    var i, best = null;
    for (i = 0; i < UNITS.length; i++) {
      if (m >= UNITS[i][0] * 0.999) best = UNITS[i];
    }
    if (!best) best = UNITS[0];
    var v = m / best[0];
    var s;
    if (v >= 100) s = v.toFixed(0);
    else if (v >= 10) s = v.toFixed(1);
    else s = v.toFixed(2);
    s = s.replace('.', ',');
    return s + ' ' + best[1];
  }
  function fmtLong(m) {
    // «10 в степени» для мелких подписей
    var e = Math.floor(Math.log10(m));
    var mant = m / Math.pow(10, e);
    return (Math.abs(mant - 1) < 0.05 ? '' : mant.toFixed(1).replace('.', ',') + '·') + '10' + sup(e);
  }
  function sup(e) {
    var map = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    return String(e).split('').map(function (c) { return map[c] || c; }).join('');
  }

  /* ======================= кадр ========================================= */
  var C = null, prevC = null;

  function updateCamera(dt, time) {
    if (state.tween !== null) {
      var d = state.tween - state.z;
      var step = state.speed * 3.4 * dt;
      if (Math.abs(d) <= step) { state.z = state.tween; state.tween = null; }
      else state.z += Math.sign(d) * step;
      state.dir = d < 0 ? -1 : 1;
    } else if (state.auto) {
      state.z += state.dir * state.speed * dt;
      if (state.z >= ZMAX) { state.z = ZMAX; state.dir = -1; }
      if (state.z <= ZMIN) { state.z = ZMIN; state.dir = 1; }
    } else {
      state.z += state.dir * state.speed * dt * (state.manual ? 0 : 0);
    }
    state.z = clamp(state.z, ZMIN, ZMAX);

    C = containerAt(state.z);
    var T = nextSmaller(C);
    // насколько мы «внутри» контейнера по пути к следующему объекту
    var span = T ? Math.max(0.10, C.logR - T.logR) : 1;
    var u = (C.logR - state.z) / span;
    var f = 0;
    if (state.dir < 0 && T) f = smoothstep(0.40, 0.90, u);
    else if (state.dir < 0) f = 0;
    // цель взгляда: центр контейнера -> центр следующего объекта
    var tx = f * (T ? T.rel[0] : 0), ty = f * (T ? T.rel[1] : 0), tz = f * (T ? T.rel[2] : 0);
    var k = 1 - Math.exp(-dt * 6);
    state.look[0] += (tx - state.look[0]) * k;
    state.look[1] += (ty - state.look[1]) * k;
    state.look[2] += (tz - state.look[2]) * k;
    // ручной сдвиг затухает
    state.pan[0] *= Math.exp(-dt * 0.35); state.pan[1] *= Math.exp(-dt * 0.35);
  }

  function render(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VW, VH);
    stats.alive = 0; stats.drawn = 0; stats.labels.length = 0; fieldBudget = 0;

    var z = state.z;
    var kC = rPxOf(C, z);
    var lookPx = [ (state.look[0] + state.pan[0]) * kC, (state.look[1] + state.pan[1]) * kC ];

    // 1) предки: их «стенка» за контейнером (от больших к меньшим)
    var i, a, ap, ar;
    for (i = Math.min(SPINE.length - 1, C.spineIdx + 6); i > C.spineIdx; i--) {
      a = SPINE[i];
      ap = centerOf(a, C);
      ar = rPxOf(a, z);
      drawAncestor(a, VW / 2 + ap[0] * kC - lookPx[0], VH / 2 + ap[1] * kC - lookPx[1], ar, 0.30, time);
    }

    // 2) контейнер: мы внутри него
    var cp = project(C, C, z, lookPx);
    drawNode(C, cp[0], cp[1], kC, 1, time, true);

    // 3) метки
    drawLabels();

    // 4) виньетка
    var vg = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.35, VW / 2, VH / 2, Math.max(VW, VH) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VW, VH);
  }

  /* ======================= подписи ====================================== */
  var used = [];
  function drawLabels() {
    if (!state.labels) return;
    used.length = 0;
    var L = stats.labels, i, j, l, ok, w, h, x, y;
    L.sort(function (a, b) { return b.d - a.d; });
    ctx.font = '500 13px ui-sans-serif, -apple-system, "SF Pro Text", system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    var n = 0;
    for (i = 0; i < L.length && n < 14; i++) {
      l = L[i];
      w = ctx.measureText(l.name).width + 22;
      h = 22;
      x = l.x + l.r * 0.72 + 10;
      y = l.y - l.r * 0.35;
      if (x + w > VW - 8) x = l.x - l.r * 0.72 - 10 - w;
      if (x < 8) x = 8;
      y = clamp(y, 40, VH - 40);
      ok = true;
      for (j = 0; j < used.length; j++) {
        if (x < used[j][0] + used[j][2] + 6 && x + w + 6 > used[j][0] &&
            y - h / 2 < used[j][1] + used[j][3] / 2 + 4 && y + h / 2 + 4 > used[j][1] - used[j][3] / 2) { ok = false; break; }
      }
      if (!ok) continue;
      used.push([x, y, w, h]);
      n++;
      var a = clamp(smoothstep(9, 22, l.r), 0, 1) * 0.95;
      ctx.globalAlpha = a;
      // поводок
      ctx.strokeStyle = 'rgba(255,255,255,.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(l.x + l.r * 0.7, l.y - l.r * 0.7 * 0.5);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = l.alive ? 'rgba(150,255,190,.95)' : 'rgba(255,255,255,.7)';
      ctx.beginPath(); ctx.arc(l.x + l.r * 0.7, l.y - l.r * 0.35, 2.4, 0, TAU); ctx.fill();
      // плашка
      ctx.fillStyle = 'rgba(8,10,16,.55)';
      roundRect(x, y - h / 2, w, h, 7);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.96)';
      ctx.fillText(l.name, x + 11, y + 0.5);
      ctx.globalAlpha = 1;
    }
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ======================= интерфейс ==================================== */
  var el = {
    name: document.getElementById('sname'),
    meta: document.getElementById('smeta'),
    desc: document.getElementById('sdesc'),
    view: document.getElementById('viewsize'),
    decade: document.getElementById('decade'),
    alive: document.getElementById('alive'),
    ruler: document.getElementById('ruler'),
    play: document.getElementById('btn-play'),
    speed: document.getElementById('speed'),
    slower: document.getElementById('btn-slower'),
    faster: document.getElementById('btn-faster'),
    human: document.getElementById('btn-human'),
    labels: document.getElementById('btn-labels')
  };

  function buildRuler() {
    if (!el.ruler) return;
    var html = '', i, n, pos, cls, names = {
      quark: 'кварк', atom: 'атом', dna: 'ДНК', cell: 'клетка', human: 'человек',
      room: 'комната', earth: 'Земля', sun: 'Солнце', earthOrbit: 'орбита Земли',
      milkyWay: 'Млечный Путь', localGroup: 'Местная группа', universe: 'Вселенная',
      kuiper: 'пояс Койпера', nearestStars: 'ближайшие звёзды'
    };
    for (i = 0; i < SPINE.length; i++) {
      n = SPINE[i];
      if (!names[n.id]) continue;
      pos = (n.logR - ZMIN) / (ZMAX - ZMIN) * 100;
      html += '<div class="tick" style="left:' + pos.toFixed(2) + '%" data-z="' + n.logR + '"><i></i><span>' + names[n.id] + '</span></div>';
    }
    for (i = 0; i <= 22; i++) {
      var ez = Math.round((ZMIN + (ZMAX - ZMIN) * i / 22) / 2) * 2;
      pos = (ez - ZMIN) / (ZMAX - ZMIN) * 100;
      if (pos < 0 || pos > 100) continue;
      html += '<div class="dec" style="left:' + pos.toFixed(2) + '%"><b>10' + sup(ez) + '</b> м</div>';
    }
    html += '<div id="marker"><i></i></div>';
    el.ruler.innerHTML = html;
    el.marker = document.getElementById('marker');
    el.ruler.addEventListener('click', function (e) {
      var t = e.target.closest('.tick');
      if (t) { goTo(parseFloat(t.dataset.z), true); return; }
      var rect = el.ruler.getBoundingClientRect();
      var fr = (e.clientX - rect.left) / rect.width;
      goTo(ZMIN + (ZMAX - ZMIN) * clamp(fr, 0, 1), false);
    });
  }

  function goTo(z, keepWalking) {
    state.tween = clamp(z, ZMIN, ZMAX);
    if (keepWalking) { state.auto = true; updatePlayBtn(); }
  }

  function humanZ() {
    // масштаб, при котором в кадр по высоте влезает человек (1,9 м)
    return Math.log10(Math.max(0.35, 2 * half / Math.max(1, VH) * 0.95));
  }

  function updatePlayBtn() {
    if (!el.play) return;
    el.play.textContent = state.auto ? '❙❙' : '▶';
    el.play.title = state.auto ? 'Пауза (пробел)' : 'Продолжить (пробел)';
  }

  var hudT = 0;
  function updateHUD(dt) {
    hudT += dt;
    if (hudT < 0.08) return;
    hudT = 0;
    var C_ = C, T = nextSmaller(C_);
    var span = T ? Math.max(0.10, C_.logR - T.logR) : 1;
    var u = clamp((C_.logR - state.z) / span, 0, 1);
    var subj = (state.dir < 0 && T && u > 0.5) ? T : C_;
    if (el.name) el.name.textContent = subj.name || '';
    if (el.meta) el.meta.textContent = 'радиус ≈ ' + fmt(subj.R) + '  (' + fmtLong(subj.R) + ' м)';
    if (el.desc) el.desc.textContent = subj.desc || C_.desc || '';
    var viewM = VW / pxPerMeter(state.z);
    if (el.view) el.view.textContent = 'в кадре ≈ ' + fmt(viewM);
    if (el.decade) el.decade.textContent = fmtLong(Math.pow(10, state.z)) + ' м';
    if (el.alive) el.alive.textContent = stats.alive > 0 ? ('живого в кадре: ' + stats.alive) : 'живого в кадре нет';
    if (el.marker) el.marker.style.left = ((state.z - ZMIN) / (ZMAX - ZMIN) * 100).toFixed(2) + '%';
    document.body.classList.toggle('alive', stats.alive > 0);
  }

  /* ======================= ввод ========================================= */
  function bindInput() {
    var dragging = false, lastX = 0, lastY = 0, manualUntil = 0, pinch = null;

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var d = e.deltaMode === 1 ? e.deltaY * 18 : e.deltaY;
      state.tween = null;
      state.z = clamp(state.z + d * 0.0016, ZMIN, ZMAX);
      manualUntil = performance.now() + 1400;
    }, { passive: false });

    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add('grabbing');
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var kC = rPxOf(C, state.z);
      state.pan[0] -= (e.clientX - lastX) / kC * 1.15;
      state.pan[1] -= (e.clientY - lastY) / kC * 1.15;
      lastX = e.clientX; lastY = e.clientY;
    });
    window.addEventListener('pointerup', function () { dragging = false; canvas.classList.remove('grabbing'); });

    // два пальца — щипок
    canvas.addEventListener('touchmove', function (e) {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (pinch) { state.z = clamp(state.z + Math.log10(pinch / d) * 1.2, ZMIN, ZMAX); state.tween = null; }
      pinch = d;
    }, { passive: false });
    canvas.addEventListener('touchend', function () { pinch = null; });

    window.addEventListener('keydown', function (e) {
      if (e.code === 'Space') { e.preventDefault(); state.auto = !state.auto; state.tween = null; updatePlayBtn(); }
      else if (e.key === 'ArrowUp' || e.key === '=' || e.key === '+') { state.z = clamp(state.z - 0.25, ZMIN, ZMAX); state.tween = null; }
      else if (e.key === 'ArrowDown' || e.key === '-' || e.key === '_') { state.z = clamp(state.z + 0.25, ZMIN, ZMAX); state.tween = null; }
      else if (e.key === 'h' || e.key === 'H' || e.key === 'р' || e.key === 'Р') goTo(humanZ(), false);
      else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') { state.dir *= -1; }
      else if (e.key === 'l' || e.key === 'L' || e.key === 'д' || e.key === 'Д') { state.labels = !state.labels; syncLabelsBtn(); }
    });

    if (el.play) el.play.onclick = function () { state.auto = !state.auto; state.tween = null; updatePlayBtn(); };
    if (el.slower) el.slower.onclick = function () { state.speed = clamp(state.speed - 0.08, 0.04, 1.6); syncSpeed(); };
    if (el.faster) el.faster.onclick = function () { state.speed = clamp(state.speed + 0.08, 0.04, 1.6); syncSpeed(); };
    if (el.speed) el.speed.oninput = function () { state.speed = parseFloat(el.speed.value); syncSpeed(); };
    if (el.human) el.human.onclick = function () { goTo(humanZ(), false); };
    if (el.labels) el.labels.onclick = function () { state.labels = !state.labels; syncLabelsBtn(); };
  }
  function syncSpeed() {
    if (el.speed) el.speed.value = state.speed;
    var v = document.getElementById('speedval');
    if (v) v.textContent = (state.speed / 0.30).toFixed(2).replace('.', ',') + '×';
  }
  function syncLabelsBtn() {
    if (el.labels) el.labels.classList.toggle('off', !state.labels);
  }

  /* ======================= размеры и цикл =============================== */
  function resize() {
    dpr = Math.min(1.6, window.devicePixelRatio || 1);
    VW = canvas.clientWidth; VH = canvas.clientHeight;
    canvas.width = Math.round(VW * dpr);
    canvas.height = Math.round(VH * dpr);
    half = Math.max(VW, VH) / 2;
  }

  var last = 0, acc = 0, frames = 0, ftime = 0, started = false;
  function loop(now) {
    var time = now / 1000;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    if (dt > 0) { ftime += dt; frames++; }
    if (frames >= 30) {
      var avg = ftime / frames;
      if (avg > 0.034) state.quality = Math.max(90, state.quality - 25);
      else if (avg < 0.020) state.quality = Math.min(300, state.quality + 10);
      frames = 0; ftime = 0;
    }
    updateCamera(dt, time);
    if (!state.norender) render(time);
    updateHUD(dt);
    state.frame++;
    requestAnimationFrame(loop);
  }

  function boot() {
    resize();
    // параметры в адресе: ?z=-4.7&paused=1&labels=0 — удобно для проверки и ссылок
    var q = {};
    location.search.replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      var a = kv.split('=');
      q[decodeURIComponent(a[0])] = decodeURIComponent(a[1] === undefined ? '1' : a[1]);
    });
    state.z = (q.z !== undefined && isFinite(parseFloat(q.z))) ? parseFloat(q.z) : humanZ();
    if (q.paused) state.auto = false;
    if (q.dir === '-1') state.dir = -1;
    if (q.labels === '0') state.labels = false;
    if (q.norender) state.norender = true;
    if (q.nokids) state.nokids = true;
    state.look = [0, 0, 0];
    updatePlayBtn();
    if (el.speed) el.speed.value = state.speed;
    syncSpeed(); syncLabelsBtn();
    bindInput();
    buildRuler();
    window.addEventListener('resize', function () { resize(); });
    requestAnimationFrame(function (n) { loop(n); });
    window.__scale = { state: state, SPINE: SPINE, ALL: ALL, render: render, containerAt: containerAt, stats: stats };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
