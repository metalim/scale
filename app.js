/* SCALE — интерактивная логарифмическая Вселенная.
   Единая ось зума: M = десятичный логарифм увеличения (10^M метров = 1 метр экрана).
   M=0.62 — масштаб человека. M∈[-26.6..37]: наблюдаемая Вселенная … планковская длина.
   Все объекты живут по одному сим-времени simT; скорость его хода зависит ТОЛЬКО от зума. */

'use strict';
const TAU = Math.PI * 2;
const cv = document.getElementById('scene');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, Z = 90;          // Z — пикселей на метр при M=0

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = W * DPR; cv.height = H * DPR;
  Z = H / 10;
}
window.addEventListener('resize', resize); resize();

/* ── утилиты ─────────────────────────────────────── */
function sr(n) { const x = Math.sin((n % 100000) * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function fade(c, a) { return c.replace(/[\d.]+\)$/, a.toFixed(3) + ')'); }
function glow(x, y, r, col, a) {
  if (a <= 0.002 || r <= 0.2) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, fade(col, a)); g.addColorStop(1, fade(col, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
function poly(pts, close = true) {
  ctx.beginPath();
  pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  if (close) ctx.closePath();
}
function wavy(x1, y1, x2, y2, amp, waves, ph) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L, n = Math.max(6, Math.floor(L / 6));
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= n; i++) {
    const s = i / n, o = Math.sin(s * TAU * waves + ph) * amp;
    ctx.lineTo(x1 + dx * s + nx * o, y1 + dy * s + ny * o);
  }
}

/* ── форматирование ─────────────────────────────── */
const SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function sup(n) {
  let s = '', neg = n < 0; n = Math.round(Math.abs(n));
  do { s = SUPD[n % 10] + s; n = Math.floor(n / 10); } while (n);
  return (neg ? '⁻' : '') + s;
}
function fmtLen(v) {
  if (!(v > 0)) return '?';
  const U = [[1e-15, 'фм'], [1e-12, 'пм'], [1e-9, 'нм'], [1e-6, 'мкм'], [1e-3, 'мм'],
             [1e-2, 'см'], [1, 'м'], [1e3, 'км'], [1.496e11, 'а.е.'], [9.461e15, 'св. лет']];
  if (v < 1e-15 || v >= 9.461e21) return '10' + sup(Math.floor(Math.log10(v))) + ' м';
  let best = U[0];
  for (const u of U) if (v >= u[0]) best = u;
  const x = v / best[0];
  if (best[1] === 'св. лет') {
    if (x >= 1e12) return (x / 1e12).toPrecision(3) + ' трлн св. лет';
    if (x >= 1e9) return (x / 1e9).toPrecision(3) + ' млрд св. лет';
    if (x >= 1e6) return (x / 1e6).toPrecision(3) + ' млн св. лет';
    if (x >= 1e3) return (x / 1e3).toPrecision(3) + ' тыс. св. лет';
  }
  return (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x >= 1 ? x.toFixed(2) : x.toPrecision(2)) + ' ' + best[1];
}
function fmtRate(r) {
  if (r >= 1000 || r < 0.01) return '×10' + sup(Math.log10(r));
  return '×' + (r >= 100 ? Math.round(r) : r >= 1 ? r.toFixed(1) : r.toFixed(2));
}

/* ── единая шкала времени ────────────────────────── */
/* Скорость сим-времени задаётся только зумом: rate(M)=10^(0.14·M).
   Темп каждого объекта откалиброван так, чтобы на «своём» зуме цикл занимал p секунд. */
function rateAt(M) { return Math.pow(10, 0.14 * M); }

/* ── 44 уровня реальности ────────────────────────── */
/* s — характерный размер (м), p — длительность цикла на домашнем зуме (с). */
const OB = [
/* 1 */ { s: 1e-35, n: 'Планковская пена', p: 1.2, d: 'Пространство-время на пределе разрешения — кипящие геометрические флуктуации.',
  f(u, t, w, A) {
    glow(0, 0, u * 1.6, 'rgba(120,100,255,1)', 0.14 * A);
    ctx.lineWidth = Math.max(1, u * 0.05);
    for (let i = 0; i < 30; i++) {
      const a = sr(i) * TAU, r = (0.15 + sr(i + 50) * 0.85) * u * 1.2;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 2.4);
      const x = Math.cos(a) * r, y = Math.sin(a) * r, L = u * (0.08 + 0.1 * tw), b = a + tw * 2.5;
      ctx.strokeStyle = `rgba(175,155,255,${(0.2 + 0.6 * tw) * A})`;
      ctx.beginPath(); ctx.moveTo(x - Math.cos(b) * L, y - Math.sin(b) * L);
      ctx.lineTo(x + Math.cos(b) * L, y + Math.sin(b) * L); ctx.stroke();
    }
  } },
/* 2 */ { s: 1e-33, n: 'Виртуальные пары', p: 1.6, d: 'Частица и античастица рождаются из пустоты и аннигилируют, занимая долг у принципа неопределённости.',
  f(u, t, w, A) {
    for (let i = 0; i < 7; i++) {
      const ph = (t / TAU * 0.45 + i / 7) % 1, a = i * 2.3 + 0.7;
      const d = u * (0.15 + ph * 1.1), al = Math.sin(ph * Math.PI) * A;
      const x1 = Math.cos(a) * d, y1 = Math.sin(a) * d;
      glow(x1, y1, u * 0.11, 'rgba(110,220,255,1)', 0.85 * al);
      glow(-x1 * 0.8, -y1 * 0.8, u * 0.11, 'rgba(255,165,110,1)', 0.85 * al);
      if (ph < 0.45) {
        ctx.strokeStyle = `rgba(205,185,255,${0.35 * al})`; ctx.lineWidth = Math.max(1, u * 0.02);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(-x1 * 0.8, -y1 * 0.8); ctx.stroke();
      }
    }
  } },
/* 3 */ { s: 1e-30, n: 'Суперструна', p: 2.2, d: 'Замкнутая вибрирующая нить — возможно, самый глубокий «кирпичик» материи.',
  f(u, t, w, A) {
    glow(0, 0, u * 1.1, 'rgba(140,120,255,1)', 0.3 * A);
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = i / 64 * TAU;
      const r = u * (0.55 + 0.26 * Math.sin(6 * a + 2.5 * t) + 0.13 * Math.sin(11 * a - 3.7 * t));
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    const hue = 265 + 45 * Math.sin(t * 0.8);
    ctx.strokeStyle = `hsla(${hue},90%,72%,${0.95 * A})`;
    ctx.lineWidth = Math.max(1.2, u * 0.05); ctx.stroke();
    ctx.strokeStyle = `hsla(${hue},90%,88%,${0.5 * A})`;
    ctx.lineWidth = Math.max(0.6, u * 0.018); ctx.stroke();
  } },
/* 4 */ { s: 1e-27, n: 'Нейтрино', p: 1.4, d: 'Призрачная частица: каждую секунду сквозь ваше тело проходят триллионы нейтрино.',
  f(u, t, w, A) {
    for (let i = 0; i < 3; i++) {
      const c = (t / TAU * 0.4 + i * 0.37) % 1, x = (c * 2.4 - 1.2) * u, y = (sr(i * 7) * 1.6 - 0.8) * u * 0.5;
      const tl = u * 1.1;
      const g = ctx.createLinearGradient(x - tl, y, x, y);
      g.addColorStop(0, 'rgba(160,200,255,0)'); g.addColorStop(1, `rgba(190,220,255,${0.55 * A})`);
      ctx.strokeStyle = g; ctx.lineWidth = Math.max(1, u * 0.05);
      ctx.beginPath(); ctx.moveTo(x - tl, y); ctx.lineTo(x, y); ctx.stroke();
      glow(x, y, u * 0.09, 'rgba(220,235,255,1)', 0.8 * (1 - c) * A);
    }
  } },
/* 5 */ { s: 1e-24, n: 'Кварк', p: 1.1, d: 'Точка без внутренней структуры. Цветовой заряд мелькает красный-зелёный-синий.',
  f(u, t, w, A) {
    const jx = u * 0.1 * (Math.sin(3.1 * t) + 0.6 * Math.sin(5.7 * t));
    const jy = u * 0.1 * (Math.cos(2.3 * t) + 0.6 * Math.sin(4.9 * t));
    const ci = Math.floor(t / TAU * 3) % 3;
    const col = ['rgba(255,90,90,1)', 'rgba(90,255,130,1)', 'rgba(110,150,255,1)'][ci];
    ctx.strokeStyle = `rgba(150,170,255,${0.35 * A})`; ctx.lineWidth = 1;
    ctx.setLineDash([Math.max(2, u * 0.06), Math.max(3, u * 0.08)]);
    ctx.beginPath(); ctx.arc(jx, jy, u * 0.45, t, t + TAU * 0.8); ctx.stroke();
    ctx.setLineDash([]);
    glow(jx, jy, u * 0.4, col, 0.7 * A);
    ctx.fillStyle = fade(col, A); circle(jx, jy, u * 0.07); ctx.fill();
  } },
/* 6 */ { s: 1e-21, n: 'Глюонный поток', p: 1.2, d: 'Глюоны сцепляют кварки «цветными» петлями — сила, не ослабевающая с расстоянием.',
  f(u, t, w, A) {
    ctx.strokeStyle = `rgba(255,120,220,${0.5 * A})`; ctx.lineWidth = Math.max(1, u * 0.03);
    ctx.beginPath(); ctx.moveTo(-u * 1.3, 0); ctx.lineTo(u * 1.3, 0); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const c = (w * 0.25 + i / 5) % 1, x = (c * 2.6 - 1.3) * u;
      const y = Math.sin(c * TAU * 2 + i) * u * 0.3, r = u * 0.09;
      ctx.strokeStyle = `rgba(255,150,230,${0.9 * A})`; ctx.lineWidth = Math.max(1, u * 0.035);
      ctx.beginPath(); ctx.ellipse(x, y - r * 0.7, r, r * 0.55, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.7, r, r * 0.55, 0, 0, TAU); ctx.stroke();
      glow(x, y, u * 0.22, 'rgba(255,120,220,1)', 0.5 * A);
    }
  } },
/* 7 */ { s: 1e-18, n: 'Электрон', p: 2, d: 'Элементарная частица, «облако вероятности». Всё электричество мира — его.',
  f(u, t, w, A) {
    const jx = u * 0.16 * Math.sin(4.1 * t), jy = u * 0.16 * Math.sin(3.3 * t + 1);
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.35 + i / 3) % 1;
      ctx.strokeStyle = `rgba(120,210,255,${(1 - ph) * 0.5 * A})`;
      ctx.lineWidth = Math.max(1, u * 0.03 * (1 - ph));
      circle(jx, jy, u * (0.12 + ph * 1.1)); ctx.stroke();
    }
    glow(jx, jy, u * 0.5, 'rgba(140,220,255,1)', 0.9 * A);
    ctx.fillStyle = `rgba(240,250,255,${A})`; circle(jx, jy, u * 0.08); ctx.fill();
  } },
/* 8 */ { s: 1e-16, n: 'Мезон', p: 2.4, d: 'Кварк и антикварк, связанные глюонной струной, — короткоживущая пара.',
  f(u, t, w, A) {
    const a = t, r = u * 0.5;
    const x1 = Math.cos(a) * r, y1 = Math.sin(a) * r * 0.6;
    ctx.strokeStyle = `rgba(255,170,120,${0.6 * A})`; ctx.lineWidth = Math.max(1.2, u * 0.05);
    ctx.beginPath(); wavy(x1, y1, -x1, -y1, u * 0.08, 3, t * 4); ctx.stroke();
    glow(x1, y1, u * 0.3, 'rgba(255,110,110,1)', 0.9 * A);
    glow(-x1, -y1, u * 0.3, 'rgba(110,255,190,1)', 0.9 * A);
    ctx.fillStyle = `rgba(255,190,190,${A})`; circle(x1, y1, u * 0.06); ctx.fill();
    ctx.fillStyle = `rgba(190,255,220,${A})`; circle(-x1, -y1, u * 0.06); ctx.fill();
  } },
/* 9 */ { s: 1.7e-15, n: 'Протон', p: 6, d: 'Три кварка в вечном танце глюонных полей. В каждом атоме водорода — один такой.',
  f(u, t, w, A) {
    glow(0, 0, u * 1.25, 'rgba(255,190,120,1)', 0.22 * A);
    ctx.strokeStyle = `rgba(255,200,140,${0.4 * A})`; ctx.lineWidth = Math.max(1, u * 0.02);
    circle(0, 0, u * 0.95); ctx.stroke();
    const q = [];
    for (let i = 0; i < 3; i++) {
      q.push([u * 0.5 * Math.sin(t + i * 2.1), u * 0.5 * Math.sin(t * 1.31 + i * 1.57),
              ['rgba(255,90,90,1)', 'rgba(90,230,140,1)', 'rgba(110,150,255,1)'][i]]);
    }
    ctx.strokeStyle = `rgba(255,230,180,${0.55 * A})`; ctx.lineWidth = Math.max(1, u * 0.03);
    for (let i = 0; i < 3; i++) {
      const a = q[i], b = q[(i + 1) % 3];
      ctx.beginPath(); wavy(a[0], a[1], b[0], b[1], u * 0.07, 2.2, t * 5 + i * 2); ctx.stroke();
    }
    for (const [x, y, c] of q) { glow(x, y, u * 0.16, c, 0.95 * A); ctx.fillStyle = fade(c, A); circle(x, y, u * 0.06); ctx.fill(); }
  } },
/* 10 */ { s: 1.5e-14, n: 'Ядро урана', p: 3, d: '238 нуклонов на грани развала. Период полураспада — 4,5 миллиарда лет.',
  f(u, t, w, A) {
    const jx = u * 0.03 * Math.sin(t * 9), jy = u * 0.03 * Math.cos(t * 11);
    ctx.save(); ctx.translate(jx, jy);
    for (let i = 0; i < 20; i++) {
      const a = sr(i) * TAU, r = Math.sqrt(sr(i + 40)) * u * 0.62;
      const x = Math.cos(a) * r, y = Math.sin(a) * r, pr = sr(i) > 0.45;
      const rr = u * 0.13;
      ctx.fillStyle = fade(pr ? 'rgba(255,160,90,0.95)' : 'rgba(170,180,200,0.95)', A);
      circle(x, y, rr); ctx.fill();
      ctx.strokeStyle = fade('rgba(10,15,30,0.6)', A); ctx.lineWidth = Math.max(0.5, u * 0.012);
      ctx.beginPath(); ctx.arc(x + rr * 0.25, y - rr * 0.25, rr * 0.55, -2.4, -0.4); ctx.stroke();
    }
    const ph = (t / TAU) % 1, aa = ph * 4 + 1, rr = ph * u * 1.9, al = (1 - ph) * A;
    ctx.globalAlpha = al;
    for (let i = 0; i < 4; i++) {
      const b = i * 1.57, bx = Math.cos(aa) * rr + Math.cos(b) * u * 0.06, by = Math.sin(aa) * rr + Math.sin(b) * u * 0.06;
      ctx.fillStyle = fade(i < 2 ? 'rgba(255,160,90,1)' : 'rgba(170,180,200,1)', 1);
      circle(bx, by, u * 0.1); ctx.fill();
    }
    ctx.globalAlpha = 1;
    glow(Math.cos(aa) * rr, Math.sin(aa) * rr, u * 0.5, 'rgba(180,220,255,1)', al * 0.4);
    ctx.restore();
  } },
/* 11 */ { s: 1e-13, n: 'Гамма-квант', p: 2, d: 'Самые энергичные фотоны. Один такой пробивает тело насквозь.',
  f(u, t, w, A) {
    const c = ((t / TAU) % 1) * 2.8 - 1.4;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const x = (i / 60 * 2.8 - 1.4) * u;
      const env = Math.exp(-Math.pow((x / u - c), 2) / 0.12);
      const y = Math.sin(x / u * 9 - t * 7) * env * u * 0.3;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = `rgba(190,130,255,${0.9 * A})`; ctx.lineWidth = Math.max(1.2, u * 0.04); ctx.stroke();
    const cx = c * u;
    const cy = Math.sin(cx / u * 9 - t * 7) * u * 0.3;
    ctx.strokeStyle = `rgba(220,180,255,${0.7 * A})`; ctx.lineWidth = Math.max(1, u * 0.02);
    ctx.beginPath(); ctx.moveTo(cx, cy - u * 0.45); ctx.lineTo(cx, cy + u * 0.45); ctx.stroke();
    glow(cx, cy, u * 0.35, 'rgba(190,130,255,1)', 0.4 * A);
  } },
/* 12 */ { s: 1e-12, n: 'Альфа-частица', p: 3, d: 'Ядро гелия, вылетевшее из радиоактивного распада, оставляет шлейф пузырьков.',
  f(u, t, w, A) {
    glow(0, 0, u * 1.5, 'rgba(90,110,180,1)', 0.12 * A);
    const ph = (t / TAU) % 1;
    const hx = -u * 1.3 + ph * u * 2.4, hy = u * 0.7 - ph * u * 1.2;
    for (let i = 0; i < 26; i++) {
      const d = i / 26; if (d > ph) break;
      const bx = -u * 1.3 + d * u * 2.4, by = u * 0.7 - d * u * 1.2;
      const tw = Math.sin(t * 8 + i * 1.7) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(200,230,255,${(1 - d) * 0.55 * tw * A})`;
      circle(bx + (sr(i) - 0.5) * u * 0.1, by + (sr(i + 9) - 0.5) * u * 0.1, Math.max(0.5, u * 0.02)); ctx.fill();
    }
    ctx.globalAlpha = clamp((1 - ph) * 3, 0, 1) * A;
    for (let i = 0; i < 4; i++) {
      const b = i * 1.57 + 0.4;
      ctx.fillStyle = fade(i < 2 ? 'rgba(255,160,90,1)' : 'rgba(180,190,210,1)', 1);
      circle(hx + Math.cos(b) * u * 0.055, hy + Math.sin(b) * u * 0.055, u * 0.07); ctx.fill();
    }
    ctx.globalAlpha = 1;
    glow(hx, hy, u * 0.3, 'rgba(180,220,255,1)', 0.5 * A);
  } },
/* 13 */ { s: 5.3e-11, n: 'Атом водорода', p: 4, d: 'Протон и облако вероятности. 90% обычного вещества Вселенной — это он.',
  f(u, t, w, A) {
    glow(0, 0, u * 1.3, 'rgba(100,160,255,1)', 0.16 * A);
    for (let i = 0; i < 90; i++) {
      const r = Math.sqrt(sr(i)) * u * 0.92, a = sr(i + 90) * TAU + t * 0.35 + (i % 5) * 0.13;
      const tw = 0.4 + 0.6 * Math.sin(t * 1.7 + i * 2.13);
      ctx.fillStyle = `rgba(140,190,255,${(0.1 + 0.6 * tw) * A})`;
      circle(Math.cos(a) * r, Math.sin(a) * r, Math.max(0.5, u * 0.016)); ctx.fill();
    }
    glow(0, 0, u * 0.14, 'rgba(255,200,140,1)', 0.9 * A);
    ctx.fillStyle = `rgba(255,225,180,${A})`; circle(0, 0, u * 0.04); ctx.fill();
  } },
/* 14 */ { s: 3.5e-10, n: 'Атом урана', p: 8, d: '92 электрона на оболочках, тяжёлое ядро в центре. Тяжелее — только трансураны.',
  f(u, t, w, A) {
    ctx.save(); ctx.rotate(0.2);
    for (let i = 0; i < 8; i++) {
      const a = sr(i) * TAU, r = Math.sqrt(sr(i + 40)) * u * 0.1;
      ctx.fillStyle = fade(sr(i) > 0.45 ? 'rgba(255,160,90,0.95)' : 'rgba(170,180,200,0.95)', A);
      circle(Math.cos(a) * r, Math.sin(a) * r, Math.max(0.8, u * 0.035)); ctx.fill();
    }
    glow(0, 0, u * 0.35, 'rgba(255,200,140,1)', 0.35 * A);
    const shells = [[0.42, 2, -0.4], [0.68, 8, 0.35], [0.95, 10, 1.1]];
    shells.forEach(([rx, nE, rot], si) => {
      ctx.save(); ctx.rotate(rot);
      ctx.strokeStyle = `rgba(120,170,255,${0.25 * A})`; ctx.lineWidth = Math.max(0.7, u * 0.012);
      ctx.beginPath(); ctx.ellipse(0, 0, rx * u, rx * u * 0.38, 0, 0, TAU); ctx.stroke();
      for (let e = 0; e < nE; e++) {
        const a = t * (1.6 - si * 0.35) + e / nE * TAU;
        const x = Math.cos(a) * rx * u, y = Math.sin(a) * rx * u * 0.38;
        ctx.fillStyle = `rgba(150,215,255,${A})`;
        circle(x, y, Math.max(0.8, u * 0.028)); ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();
    const ph = (t / TAU) % 1;
    if (ph > 0.55) {
      const d = (ph - 0.55) / 0.45, a = 2.1;
      const x = Math.cos(a) * d * u * 1.7, y = Math.sin(a) * d * u * 1.7;
      ctx.globalAlpha = (1 - d) * A;
      ctx.fillStyle = 'rgba(255,180,120,1)'; circle(x, y, Math.max(1, u * 0.05)); ctx.fill();
      ctx.globalAlpha = 1;
    }
  } },
/* 15 */ { s: 2.4e-9, n: 'Двойная спираль ДНК', p: 8, d: 'Код жизни: 3 миллиарда букв в каждой клетке вашего тела.',
  f(u, t, w, A) {
    const cols = [['rgba(255,210,90,1)', 'rgba(120,220,160,1)'], ['rgba(255,120,120,1)', 'rgba(150,140,255,1)']];
    for (let r = 0; r < 12; r++) {
      const yy = (r / 11 * 2 - 1) * u * 1.15;
      const ph = yy / u * 2.2 + t;
      const x1 = Math.sin(ph) * u * 0.34, x2 = Math.sin(ph + Math.PI) * u * 0.34;
      const cc = cols[r % 2];
      ctx.strokeStyle = fade(cc[0], 0.85 * A); ctx.lineWidth = Math.max(1, u * 0.035);
      ctx.beginPath(); ctx.moveTo(x1, yy); ctx.lineTo(x2, yy); ctx.stroke();
      ctx.strokeStyle = fade(cc[1], 0.85 * A);
      ctx.beginPath(); ctx.moveTo((x1 + x2) / 2, yy); ctx.lineTo(x2, yy); ctx.stroke();
      ctx.fillStyle = fade('rgba(90,200,255,1)', A); circle(x1, yy, Math.max(1, u * 0.055)); ctx.fill();
      ctx.fillStyle = fade('rgba(255,110,170,1)', A); circle(x2, yy, Math.max(1, u * 0.055)); ctx.fill();
    }
    for (const off of [0, Math.PI]) {
      ctx.strokeStyle = fade(off ? 'rgba(255,110,170,1)' : 'rgba(90,200,255,1)', 0.75 * A);
      ctx.lineWidth = Math.max(1.5, u * 0.07);
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const yy = (i / 40 * 2 - 1) * u * 1.15, x = Math.sin(yy / u * 2.2 + t + off) * u * 0.34;
        i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
      }
      ctx.stroke();
    }
  } },
/* 16 */ { s: 2.5e-8, n: 'Рибосома', p: 10, d: 'Фабрика белков: читает РНК и собирает аминокислоты в цепочки.',
  f(u, t, w, A) {
    glow(0, 0, u * 1.3, 'rgba(240,200,110,1)', 0.2 * A);
    ctx.fillStyle = fade('rgba(240,205,115,0.85)', A);
    ctx.beginPath(); ctx.ellipse(-u * 0.3, u * 0.08, u * 0.42, u * 0.34, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(u * 0.22, -u * 0.05, u * 0.36, u * 0.3, 0.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,235,180,${0.8 * A})`; ctx.lineWidth = Math.max(1, u * 0.03);
    ctx.beginPath(); ctx.ellipse(-u * 0.3, u * 0.08, u * 0.42, u * 0.34, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(u * 0.22, -u * 0.05, u * 0.36, u * 0.3, 0.4, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(255,130,170,${0.8 * A})`; ctx.lineWidth = Math.max(1, u * 0.04);
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const x = (i / 24 * 2 - 1) * u * 1.05;
      const y = Math.sin(i * 0.9 + t * 2) * u * 0.12 + Math.sin(i * 0.31) * u * 0.05;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.35 + i / 3) % 1;
      const x = (ph * 2 - 1) * u * 1.05;
      const y = Math.sin(ph * 21.6 + 1) * u * 0.12;
      ctx.fillStyle = `rgba(160,255,210,${Math.sin(ph * Math.PI) * A})`;
      circle(x, y - u * 0.06, Math.max(1, u * 0.06)); ctx.fill();
    }
  } },
/* 17 */ { s: 1e-7, n: 'Бактериофаг', p: 12, d: 'Вирус-охотник на бактерий: икосаэдральная голова, хвост-шприц, паучьи ноги.',
  f(u, t, w, A) {
    const con = 0.5 + 0.5 * Math.sin(t * 1.5);
    glow(0, -u * 0.5, u * 0.9, 'rgba(120,220,255,1)', 0.25 * A);
    ctx.strokeStyle = `rgba(140,230,255,${0.9 * A})`; ctx.lineWidth = Math.max(1.2, u * 0.05);
    poly(Array.from({ length: 6 }, (_, i) => {
      const a = i / 6 * TAU - 0.52;
      return [Math.cos(a) * u * 0.42, Math.sin(a) * u * 0.42 - u * 0.5];
    })); ctx.stroke();
    ctx.strokeStyle = `rgba(120,200,255,${0.5 * A})`; ctx.lineWidth = Math.max(1, u * 0.03);
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const a = i / 30 * TAU * 2.5, r = i / 30 * u * 0.3;
      const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.5 - u * 0.5;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    const tl = u * (0.55 - 0.22 * con);
    ctx.strokeStyle = `rgba(180,220,240,${0.9 * A})`; ctx.lineWidth = Math.max(1.5, u * 0.07);
    ctx.beginPath(); ctx.moveTo(0, -u * 0.08); ctx.lineTo(0, -u * 0.08 + tl); ctx.stroke();
    ctx.strokeStyle = `rgba(160,200,230,${0.8 * A})`; ctx.lineWidth = Math.max(1, u * 0.04);
    ctx.beginPath(); ctx.moveTo(-u * 0.1, -u * 0.08 + tl); ctx.lineTo(u * 0.1, -u * 0.08 + tl); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const s = i < 3 ? -1 : 1, tw = Math.sin(t * 2 + i) * 0.12;
      ctx.beginPath(); ctx.moveTo(0, -u * 0.08 + tl);
      ctx.lineTo(s * u * 0.35, -u * 0.08 + tl + u * 0.3);
      ctx.lineTo(s * u * 0.5 + tw * u, -u * 0.08 + tl + u * 0.42);
      ctx.stroke();
    }
  } },
/* 18 */ { s: 2e-6, n: 'Кишечная палочка', p: 12, d: 'Жгутики крутятся со скоростью 300 оборотов в секунду — пловец микромира.',
  f(u, t, w, A) {
    const bend = Math.sin(t * 2.2) * 0.12;
    ctx.save(); ctx.rotate(bend);
    glow(0, 0, u * 1.4, 'rgba(110,230,180,1)', 0.16 * A);
    for (let i = 0; i < 5; i++) {
      const yo = (i / 4 - 0.5) * u * 0.5;
      ctx.strokeStyle = `rgba(140,240,200,${0.55 * A})`; ctx.lineWidth = Math.max(1, u * 0.025);
      ctx.beginPath();
      for (let k = 0; k <= 24; k++) {
        const x = -u * 1.05 - k / 24 * u * 1.3;
        const y = yo + Math.sin(k / 24 * TAU * 2 + t * 7 + i) * u * 0.16;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = fade('rgba(110,220,170,0.25)', A);
    ctx.beginPath();
    ctx.moveTo(-u, -u * 0.42); ctx.lineTo(u, -u * 0.42);
    ctx.arc(u, 0, u * 0.42, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(-u, u * 0.42);
    ctx.arc(-u, 0, u * 0.42, Math.PI / 2, Math.PI * 1.5);
    ctx.fill();
    ctx.strokeStyle = `rgba(160,255,210,${0.8 * A})`; ctx.lineWidth = Math.max(1.2, u * 0.04); ctx.stroke();
    ctx.fillStyle = fade('rgba(230,255,240,0.35)', A);
    ctx.beginPath(); ctx.ellipse(u * 0.2 + Math.sin(t) * u * 0.1, 0, u * 0.32, u * 0.2, 0, 0, TAU); ctx.fill();
    ctx.restore();
  } },
/* 19 */ { s: 8e-6, n: 'Эритроциты', p: 10, d: 'Сплюснутые диски, набитые гемоглобином. 25 триллионов их в ваших сосудах.',
  f(u, t, w, A) {
    ctx.strokeStyle = `rgba(255,120,110,${0.12 * A})`; ctx.lineWidth = Math.max(1, u * 0.08);
    for (let i = 0; i < 4; i++) {
      const y = (sr(i * 3) - 0.5) * u * 1.6;
      ctx.beginPath(); ctx.moveTo(-u * 2, y); ctx.lineTo(u * 2, y + (sr(i) - 0.5) * u * 0.4); ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const spd = 0.25 + sr(i * 7) * 0.2, off = sr(i * 5);
      const x = ((t / TAU * spd + off) % 1) * 4 * u - 2 * u;
      const y = (sr(i * 11) - 0.5) * u * 1.5, r = u * (0.5 + sr(i * 13) * 0.25);
      const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
      g.addColorStop(0, fade('rgba(150,20,40,0.9)', A));
      g.addColorStop(0.55, fade('rgba(220,40,60,0.9)', A));
      g.addColorStop(1, fade('rgba(255,90,90,0.9)', A));
      ctx.fillStyle = g; circle(x, y, r); ctx.fill();
      ctx.fillStyle = fade('rgba(140,10,30,0.8)', A * 0.7); circle(x, y, r * 0.4); ctx.fill();
    }
  } },
/* 20 */ { s: 3e-5, n: 'Клетка человека', p: 12, d: 'Миниатюрный город: электростанции, фабрики, архив ДНК и почтовая служба.',
  f(u, t, w, A) {
    glow(0, 0, u * 1.3, 'rgba(120,220,190,1)', 0.14 * A);
    ctx.strokeStyle = `rgba(140,235,200,${0.75 * A})`; ctx.lineWidth = Math.max(1.2, u * 0.03);
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = i / 48 * TAU, r = u * (1 + Math.sin(a * 7 + t) * 0.04 + Math.sin(a * 3 - t * 0.7) * 0.03);
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.stroke();
    ctx.fillStyle = fade('rgba(150,240,210,0.08)', A); ctx.fill();
    glow(0, 0, u * 0.42, 'rgba(150,180,255,1)', 0.35 * A);
    ctx.strokeStyle = `rgba(160,190,255,${0.8 * A})`; ctx.lineWidth = Math.max(1.2, u * 0.03);
    circle(0, 0, u * 0.38); ctx.stroke();
    ctx.fillStyle = fade('rgba(140,170,255,0.5)', A); circle(u * 0.08, -u * 0.05, u * 0.12); ctx.fill();
    for (let i = 0; i < 5; i++) {
      const a = sr(i) * TAU + t * 0.15 * (i % 2 ? 1 : -1), r = u * (0.55 + sr(i + 7) * 0.35);
      const x = Math.cos(a) * r, y = Math.sin(a) * r, ro = sr(i + 3) * TAU;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ro);
      ctx.strokeStyle = `rgba(255,180,120,${0.85 * A})`; ctx.lineWidth = Math.max(1, u * 0.04);
      ctx.beginPath(); ctx.ellipse(0, 0, u * 0.14, u * 0.06, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); wavy(-u * 0.12, 0, u * 0.12, 0, u * 0.035, 3, t * 3 + i); ctx.stroke();
      ctx.restore();
    }
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.12 + sr(i)) % 1;
      const a = sr(i + 20) * TAU;
      ctx.fillStyle = `rgba(200,255,240,${Math.sin(ph * Math.PI) * 0.6 * A})`;
      circle(Math.cos(a) * ph * u * 1.1, Math.sin(a) * ph * u * 1.1, Math.max(0.8, u * 0.025)); ctx.fill();
    }
  } },
/* 21 */ { s: 2.5e-4, n: 'Амёба', p: 12, d: 'Ползёт, вытянув псевдоподии. Одноклеточная, но уже умеет охотиться.',
  f(u, t, w, A) {
    glow(0, 0, u * 1.4, 'rgba(150,200,230,1)', 0.16 * A);
    ctx.strokeStyle = `rgba(170,220,245,${0.7 * A})`; ctx.lineWidth = Math.max(1.2, u * 0.03);
    ctx.beginPath();
    for (let i = 0; i <= 56; i++) {
      const a = i / 56 * TAU;
      const r = u * (0.72 + 0.16 * Math.sin(a * 2 + t * 1.1) + 0.09 * Math.sin(a * 5 - t * 1.7));
      const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.8;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fade('rgba(160,215,245,0.14)', A); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const a = sr(i) * TAU + t * 0.4, r = u * (0.15 + sr(i + 9) * 0.4);
      ctx.fillStyle = `rgba(230,245,255,${0.5 * A})`;
      circle(Math.cos(a) * r, Math.sin(a) * r * 0.7, Math.max(0.8, u * 0.03)); ctx.fill();
    }
    ctx.fillStyle = fade('rgba(120,160,190,0.6)', A);
    circle(u * 0.2, -u * 0.08, u * 0.12); ctx.fill();
  } },
/* 22 */ { s: 1e-3, n: 'Снежинка', p: 20, d: 'Шестигранная ледяная решётка: ни одна из бесконечных вариаций не повторяется.',
  f(u, t, w, A) {
    ctx.save(); ctx.rotate(t * 0.25);
    glow(0, 0, u * 1.3, 'rgba(150,210,255,1)', 0.2 * A);
    for (let b = 0; b < 6; b++) {
      const a = b / 6 * TAU, tw = 0.75 + 0.25 * Math.sin(t * 2 + b);
      ctx.strokeStyle = `rgba(200,235,255,${tw * A})`; ctx.lineWidth = Math.max(1.2, u * 0.045);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * u, Math.sin(a) * u); ctx.stroke();
      for (const [f, ln] of [[0.4, 0.22], [0.65, 0.16]]) {
        for (const s of [-1, 1]) {
          const bx = Math.cos(a) * u * f, by = Math.sin(a) * u * f;
          const ba = a + s * 0.9;
          ctx.lineWidth = Math.max(1, u * 0.03);
          ctx.beginPath(); ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(ba) * u * ln, by + Math.sin(ba) * u * ln); ctx.stroke();
        }
      }
      ctx.fillStyle = `rgba(220,245,255,${tw * A})`;
      circle(Math.cos(a) * u, Math.sin(a) * u, Math.max(1, u * 0.05)); ctx.fill();
    }
    ctx.strokeStyle = `rgba(210,240,255,${0.9 * A})`; ctx.lineWidth = Math.max(1.2, u * 0.05);
    poly(Array.from({ length: 6 }, (_, i) => {
      const a = i / 6 * TAU + 0.52;
      return [Math.cos(a) * u * 0.14, Math.sin(a) * u * 0.14];
    })); ctx.stroke();
    ctx.restore();
  } },
/* 23 */ { s: 5e-3, n: 'Муравей', p: 3, d: 'Шагает на шести ногах в триподе — всегда две трети опоры под телом.',
  f(u, t, w, A) {
    const g = t * 9;
    ctx.fillStyle = fade('rgba(60,42,34,0.95)', A);
    ctx.strokeStyle = `rgba(120,90,70,${0.5 * A})`; ctx.lineWidth = Math.max(1, u * 0.02);
    ctx.beginPath(); ctx.ellipse(-u * 0.55, -u * 0.1, u * 0.42, u * 0.26, -0.15, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-u * 0.05, -u * 0.12, u * 0.2, u * 0.15, 0.1, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(u * 0.35, -u * 0.18, u * 0.22, u * 0.17, 0.15, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.lineWidth = Math.max(1, u * 0.035); ctx.strokeStyle = fade('rgba(60,42,34,0.95)', A);
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? 1 : -1, k = i % 3;
      const ph = g + (k % 2 === 0 ? 0 : Math.PI) + side * 0.4;
      const ax = -u * 0.05 + (k - 1) * u * 0.18, ay = -u * 0.05;
      const sw = Math.sin(ph) * 0.55, lift = Math.max(0, Math.sin(ph)) * u * 0.12;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + side * u * (0.28 + Math.cos(sw) * 0.15), ay - u * 0.05 - lift);
      ctx.lineTo(ax + side * u * (0.4 + sw * 0.2), ay + u * 0.42 - lift * 0.2);
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(1, u * 0.025); ctx.strokeStyle = fade('rgba(60,42,34,0.95)', A);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(u * 0.5, -u * 0.22);
      ctx.quadraticCurveTo(u * 0.75, -u * (0.45 + 0.06 * Math.sin(t * 4 + s)), u * 0.85, -u * (0.3 + 0.1 * Math.sin(t * 3 + s * 2)));
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(20,12,8,${0.9 * A})`;
    circle(u * 0.47, -u * 0.2, u * 0.045); ctx.fill();
  } },
/* 24 */ { s: 2e-2, n: 'Пчела', p: 0.9, d: '230 взмахов крыльев в секунду. Именно гул, который вы слышите в саду.',
  f(u, t, w, A) {
    const bob = Math.sin(t * 5) * u * 0.05;
    ctx.save(); ctx.translate(0, bob); ctx.rotate(Math.sin(t * 3) * 0.06);
    for (const s of [-1, 1]) {
      const fl = Math.abs(Math.sin(t * 14 + (s > 0 ? 0 : 0.5)));
      ctx.save(); ctx.translate(s * u * 0.05, -u * 0.28); ctx.rotate(s * (0.5 + fl * 0.6)); ctx.scale(1, 0.35 + fl * 0.65);
      ctx.fillStyle = fade('rgba(210,235,255,0.3)', A);
      ctx.beginPath(); ctx.ellipse(s * u * 0.42, -u * 0.12, u * 0.4, u * 0.13, s * -0.3, 0, TAU); ctx.fill();
      ctx.strokeStyle = fade('rgba(230,245,255,0.5)', A); ctx.lineWidth = Math.max(0.7, u * 0.015);
      ctx.beginPath(); ctx.ellipse(s * u * 0.42, -u * 0.12, u * 0.4, u * 0.13, s * -0.3, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = fade('rgba(255,200,60,0.95)', A);
    ctx.beginPath(); ctx.ellipse(-u * 0.35, 0.05 * u, u * 0.5, u * 0.32, 0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = fade('rgba(40,30,20,0.95)', A);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(-u * (0.15 + i * 0.22), u * 0.05 + i * u * 0.01, u * 0.055, u * 0.3, 0.1, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = fade('rgba(50,40,25,0.95)', A);
    ctx.beginPath(); ctx.ellipse(u * 0.32, -u * 0.02, u * 0.22, u * 0.2, 0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${0.8 * A})`; circle(u * 0.38, -u * 0.08, Math.max(1, u * 0.035)); ctx.fill();
    ctx.strokeStyle = fade('rgba(50,40,25,0.9)', A); ctx.lineWidth = Math.max(1, u * 0.03);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(u * 0.1, -u * 0.1); ctx.lineTo(u * 0.4, -u * (0.35 + 0.05 * Math.sin(t * 6 + s))); ctx.stroke();
    }
    ctx.restore();
  } },
/* 25 */ { s: 9e-2, n: 'Колибри', p: 0.6, d: 'Зависает на месте, маша крыльями восьмёркой — 50 раз в секунду.',
  f(u, t, w, A) {
    const bob = Math.sin(t * 4) * u * 0.06;
    ctx.save(); ctx.translate(0, bob);
    for (const s of [-1, 1]) {
      for (let g = 0; g < 3; g++) {
        const f2 = Math.sin(t * 22 - g * 0.25);
        ctx.save(); ctx.translate(-s * u * 0.1, -u * 0.15); ctx.rotate(s * f2 * 0.9);
        ctx.fillStyle = fade('rgba(160,220,255,0.22)', A * (1 - g * 0.3));
        ctx.beginPath(); ctx.ellipse(-s * u * 0.5, 0, u * 0.55, u * 0.12, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
    ctx.fillStyle = fade('rgba(30,200,150,0.95)', A);
    ctx.beginPath(); ctx.ellipse(0, 0, u * 0.45, u * 0.2, 0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = fade('rgba(20,160,120,0.95)', A);
    ctx.beginPath(); ctx.ellipse(-u * 0.5, u * 0.08, u * 0.25, u * 0.12, 0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = fade('rgba(20,20,25,0.95)', A); ctx.lineWidth = Math.max(1, u * 0.035);
    ctx.beginPath(); ctx.moveTo(u * 0.42, -u * 0.04); ctx.lineTo(u * 1.05, u * 0.1); ctx.stroke();
    glow(u * 0.3, u * 0.02, u * 0.16, 'rgba(255,60,160,1)', (0.5 + 0.3 * Math.sin(t * 6)) * A);
    ctx.fillStyle = `rgba(10,10,15,${0.9 * A})`; circle(u * 0.36, -u * 0.05, Math.max(1, u * 0.03)); ctx.fill();
    ctx.restore();
  } },
/* 26 */ { s: 0.46, n: 'Кошка', p: 2.5, d: 'Позирует. Хвост выписывает ленивые иероглифы, усы читают воздух.',
  f(u, t, w, A) {
    const tail = Math.sin(t * 1.4) * 0.5;
    ctx.fillStyle = fade('rgba(38,42,58,0.97)', A);
    ctx.beginPath(); ctx.ellipse(-u * 0.18, -u * 0.3, u * 0.34, u * 0.4, 0.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(u * 0.08, -u * 0.25, u * 0.3, u * 0.28, -0.2, 0, TAU); ctx.fill();
    circle(u * 0.42, -u * 0.62, u * 0.2); ctx.fill();
    poly([[u * 0.28, -u * 0.72], [u * 0.3, -u * 0.92], [u * 0.42, -u * 0.78]]); ctx.fill();
    poly([[u * 0.48, -u * 0.79], [u * 0.56, -u * 0.94], [u * 0.58, -u * 0.74]]); ctx.fill();
    ctx.strokeStyle = fade('rgba(38,42,58,0.97)', A); ctx.lineWidth = Math.max(2, u * 0.09); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-u * 0.42, -u * 0.35);
    ctx.bezierCurveTo(-u * (0.75 + tail * 0.1), -u * 0.4, -u * (0.7 - tail * 0.15), -u * 0.85, -u * (0.35 + tail * 0.25), -u * (0.8 + tail * 0.1));
    ctx.stroke();
    ctx.lineWidth = Math.max(2, u * 0.07);
    for (const [lx, lo] of [[u * 0.24, 0], [u * 0.16, 0.12]]) {
      ctx.beginPath(); ctx.moveTo(lx, -u * 0.18); ctx.lineTo(lx + lo, u * 0.1); ctx.stroke();
    }
    ctx.lineWidth = Math.max(1, u * 0.02); ctx.strokeStyle = `rgba(230,235,255,${0.5 * A})`;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(u * 0.5, -u * 0.55);
      ctx.lineTo(u * (0.75 + i * 0.04), -u * (0.5 + i * 0.06)); ctx.stroke();
    }
    const blink = (t / TAU % 1) < 0.08;
    ctx.strokeStyle = `rgba(255,220,120,${0.95 * A})`; ctx.lineWidth = Math.max(1.2, u * 0.035);
    ctx.beginPath();
    if (blink) { ctx.moveTo(u * 0.38, -u * 0.62); ctx.lineTo(u * 0.46, -u * 0.62); }
    else ctx.arc(u * 0.42, -u * 0.62, u * 0.045, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.lineCap = 'butt';
  } },
/* 27 */ { s: 1.7, n: 'Человек', p: 1.3, d: '1,7 метра — середина шкалы. Вы стоите ровно посередине 62 порядков.',
  f(u, t, w, A) {
    const ph = t * 2.6, bob = -Math.abs(Math.cos(ph)) * u * 0.04;
    ctx.fillStyle = `rgba(10,14,26,${0.5 * A})`;
    ctx.beginPath(); ctx.ellipse(0, u * 1.02, u * 0.3, u * 0.06, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(0, bob);
    ctx.lineCap = 'round';
    const skin = fade('rgba(225,200,180,0.95)', A), dark = fade('rgba(44,52,74,0.95)', A);
    function limb(x0, y0, a1, l1, a2, l2, wd) {
      const x1 = x0 + Math.sin(a1) * l1, y1 = y0 + Math.cos(a1) * l1;
      const x2 = x1 + Math.sin(a2) * l2, y2 = y1 + Math.cos(a2) * l2;
      ctx.strokeStyle = dark; ctx.lineWidth = wd;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    const th = 0.5 * Math.sin(ph), sh = 0.55 * Math.sin(ph + Math.PI);
    const kneeL = th + 0.75 * Math.max(0, Math.sin(ph + 2.2)) + 0.15;
    const kneeR = sh + 0.75 * Math.max(0, Math.sin(ph + Math.PI + 2.2)) + 0.15;
    limb(-u * 0.02, u * 0.05, th, u * 0.42, kneeL, u * 0.42, u * 0.13);
    limb(u * 0.02, u * 0.05, sh, u * 0.42, kneeR, u * 0.42, u * 0.13);
    limb(-u * 0.15, -u * 0.48, -0.3 + 0.45 * Math.sin(ph + Math.PI), u * 0.3, -0.5 + 0.5 * Math.sin(ph + Math.PI), u * 0.28, u * 0.1);
    limb(u * 0.15, -u * 0.48, 0.3 + 0.45 * Math.sin(ph), u * 0.3, 0.5 + 0.5 * Math.sin(ph), u * 0.28, u * 0.1);
    ctx.strokeStyle = dark; ctx.lineWidth = u * 0.24;
    ctx.beginPath(); ctx.moveTo(0, -u * 0.68); ctx.lineTo(0, u * 0.02); ctx.stroke();
    ctx.fillStyle = skin;
    circle(0, -u * 0.82, u * 0.14); ctx.fill();
    ctx.fillStyle = fade('rgba(60,45,35,0.9)', A);
    ctx.beginPath(); ctx.arc(0, -u * 0.84, u * 0.145, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
    ctx.lineCap = 'butt';
    ctx.restore();
  } },
/* 28 */ { s: 4.5, n: 'Автомобиль', p: 1.6, d: 'Полтора метра колёсной базы на каждую тонну стали и мечту о скорости.',
  f(u, t, w, A) {
    const bob = Math.sin(t * 9) * u * 0.012;
    ctx.save(); ctx.translate(0, bob);
    glow(-u * 0.92, u * 0.02, u * 0.5, 'rgba(255,240,180,1)', 0.35 * A);
    ctx.fillStyle = fade('rgba(200,60,60,0.95)', A);
    poly([[-u * 0.98, u * 0.12], [-u * 0.98, -u * 0.1], [-u * 0.6, -u * 0.14], [-u * 0.42, -u * 0.42],
          [u * 0.18, -u * 0.44], [u * 0.5, -u * 0.13], [u * 0.98, -u * 0.07], [u * 0.98, u * 0.12]]);
    ctx.fill();
    ctx.fillStyle = fade('rgba(150,220,255,0.85)', A);
    poly([[-u * 0.38, -u * 0.4], [-u * 0.06, -u * 0.4], [-u * 0.06, -u * 0.16], [-u * 0.48, -u * 0.16]]);
    ctx.fill();
    poly([[u * 0.02, -u * 0.4], [u * 0.4, -u * 0.4], [u * 0.6, -u * 0.16], [u * 0.02, -u * 0.16]]);
    ctx.fill();
    ctx.strokeStyle = fade('rgba(120,20,20,0.8)', A); ctx.lineWidth = Math.max(1, u * 0.02);
    ctx.beginPath(); ctx.moveTo(-u * 0.98, -u * 0.02); ctx.lineTo(u * 0.98, -u * 0.02); ctx.stroke();
    for (const wx of [-u * 0.58, u * 0.58]) {
      ctx.fillStyle = fade('rgba(25,28,38,0.98)', A); circle(wx, u * 0.12, u * 0.19); ctx.fill();
      ctx.strokeStyle = `rgba(200,210,230,${0.9 * A})`; ctx.lineWidth = Math.max(1.2, u * 0.03);
      circle(wx, u * 0.12, u * 0.11); ctx.stroke();
      for (let k = 0; k < 5; k++) {
        const a = t * 5 + k / 5 * TAU;
        ctx.beginPath(); ctx.moveTo(wx, u * 0.12);
        ctx.lineTo(wx + Math.cos(a) * u * 0.1, u * 0.12 + Math.sin(a) * u * 0.1); ctx.stroke();
      }
    }
    ctx.fillStyle = `rgba(255,240,190,${A})`; circle(-u * 0.95, u * 0.02, Math.max(1, u * 0.04)); ctx.fill();
    ctx.fillStyle = `rgba(255,90,70,${A})`; circle(u * 0.95, u * 0.02, Math.max(1, u * 0.03)); ctx.fill();
    ctx.restore();
  } },
/* 29 */ { s: 12, n: 'Дом', p: 3, d: 'Частный дом: окна теплеют к вечеру, из трубы уходит дым ужина.',
  f(u, t, w, A) {
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.12 + i / 3) % 1, a = 2.6 + i * 0.35;
      const x = Math.cos(a) * u * 0.5 * (0.3 + ph * 0.7), y = -u * 0.95 - ph * u * 1.1;
      ctx.fillStyle = `rgba(200,210,230,${Math.sin(ph * Math.PI) * 0.3 * A})`;
      circle(x, y, u * (0.1 + ph * 0.25)); ctx.fill();
    }
    ctx.fillStyle = fade('rgba(210,170,120,0.95)', A);
    ctx.fillRect(-u * 0.75, -u * 0.15, u * 1.5, u * 1.05);
    ctx.fillStyle = fade('rgba(150,70,50,0.95)', A);
    poly([[-u * 0.95, -u * 0.15], [0, -u * 0.85], [u * 0.95, -u * 0.15]]); ctx.fill();
    ctx.fillStyle = fade('rgba(120,90,70,0.95)', A); ctx.fillRect(u * 0.42, -u * 0.75, u * 0.18, u * 0.35);
    ctx.fillStyle = fade('rgba(90,60,40,0.95)', A); ctx.fillRect(-u * 0.18, u * 0.35, u * 0.36, u * 0.55);
    for (const [wx, wy] of [[-u * 0.52, 0.1], [u * 0.2, 0.1], [-u * 0.52, -0.02]]) {
      const fl = 0.65 + 0.35 * Math.sin(t * 1.7 + wx);
      glow(wx, wy * u, u * 0.2, 'rgba(255,200,110,1)', 0.5 * fl * A);
      ctx.fillStyle = `rgba(255,214,130,${(0.35 + 0.5 * fl) * A})`;
      ctx.fillRect(wx - u * 0.11, wy * u - u * 0.1, u * 0.22, u * 0.2);
      ctx.strokeStyle = fade('rgba(90,60,40,0.8)', A); ctx.lineWidth = Math.max(1, u * 0.02);
      ctx.strokeRect(wx - u * 0.11, wy * u - u * 0.1, u * 0.22, u * 0.2);
    }
    ctx.strokeStyle = fade('rgba(80,55,40,0.9)', A); ctx.lineWidth = Math.max(1, u * 0.025);
    ctx.beginPath(); ctx.moveTo(-u * 0.95, u * 0.9); ctx.lineTo(u * 0.95, u * 0.9); ctx.stroke();
  } },
/* 30 */ { s: 330, n: 'Эйфелева башня', p: 4, d: '18 000 деталей клёпаного железа. Каждый вечер — 20 000 лампочек.',
  f(u, t, w, A) {
    ctx.strokeStyle = `rgba(150,175,215,${0.9 * A})`; ctx.lineWidth = Math.max(1.2, u * 0.03);
    ctx.beginPath(); ctx.moveTo(-u * 0.55, u); ctx.quadraticCurveTo(-u * 0.16, -u * 0.2, -u * 0.05, -u * 0.82); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(u * 0.55, u); ctx.quadraticCurveTo(u * 0.16, -u * 0.2, u * 0.05, -u * 0.82); ctx.stroke();
    ctx.lineWidth = Math.max(0.8, u * 0.016);
    for (let i = 0; i < 8; i++) {
      const yy = u - i * u * 0.22;
      const hw = u * 0.55 * Math.max(0.12, 1 - i / 7.5) * (1 - i * 0.09);
      if (hw < u * 0.05) break;
      ctx.beginPath(); ctx.moveTo(-hw, yy); ctx.lineTo(hw, yy - u * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hw, yy); ctx.lineTo(-hw, yy - u * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-hw, yy); ctx.lineTo(-hw * 0.94, yy - u * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hw, yy); ctx.lineTo(hw * 0.94, yy - u * 0.1); ctx.stroke();
    }
    ctx.lineWidth = Math.max(1.5, u * 0.04);
    for (const [yy, hw] of [[u * 0.62, u * 0.42], [u * 0.32, u * 0.26], [-u * 0.5, u * 0.09]]) {
      ctx.beginPath(); ctx.moveTo(-hw, yy); ctx.lineTo(hw, yy); ctx.stroke();
    }
    ctx.lineWidth = Math.max(1, u * 0.025);
    ctx.beginPath(); ctx.moveTo(-u * 0.38, u * 0.62);
    ctx.quadraticCurveTo(0, u * 0.28, u * 0.38, u * 0.62); ctx.stroke();
    ctx.fillStyle = `rgba(255,235,150,${A})`; circle(0, -u * 0.84, Math.max(1.5, u * 0.045)); ctx.fill();
    glow(0, -u * 0.84, u * 0.2, 'rgba(255,240,170,1)', 0.8 * A);
    const ba = t * 1.1;
    for (const s of [0, Math.PI]) {
      const g = ctx.createLinearGradient(0, -u * 0.84, Math.cos(ba + s) * u * 1.6, -u * 0.84 + Math.sin(ba + s) * u * 1.6);
      g.addColorStop(0, `rgba(255,245,200,${0.4 * A})`); g.addColorStop(1, 'rgba(255,245,200,0)');
      ctx.strokeStyle = g; ctx.lineWidth = Math.max(2, u * 0.06);
      ctx.beginPath(); ctx.moveTo(0, -u * 0.84);
      ctx.lineTo(Math.cos(ba + s) * u * 1.6, -u * 0.84 + Math.sin(ba + s) * u * 1.6); ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const yy = u * (1 - i / 11), hw = u * 0.55 * Math.max(0.1, 1 - i / 10);
      const tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.2);
      ctx.fillStyle = `rgba(255,235,160,${tw * 0.8 * A})`;
      circle((i % 2 ? -1 : 1) * hw, yy, Math.max(0.8, u * 0.018)); ctx.fill();
    }
  } },
/* 31 */ { s: 8848, n: 'Эверест', p: 20, d: '8848 метров. «Джомолунгма» — Богиня-мать мира, ветра и облаков.',
  f(u, t, w, A) {
    ctx.fillStyle = fade('rgba(52,62,92,0.6)', A);
    poly([[-u * 1.7, u * 0.7], [-u * 0.7, -u * 0.25], [-u * 0.2, u * 0.1], [u * 0.3, u * 0.7]]); ctx.fill();
    ctx.fillStyle = fade('rgba(70,80,110,0.8)', A);
    poly([[-u * 1.9, u * 0.7], [-u * 0.2, u * 0.1], [u * 0.2, u * 0.4], [u * 0.5, u * 0.7]]); ctx.fill();
    ctx.fillStyle = fade('rgba(88,96,128,0.95)', A);
    poly([[-u, u * 0.7], [u * 0.12, -u * 0.95], [u * 0.42, -u * 0.35], [u * 0.72, u * 0.1], [u * 1.1, u * 0.7]]); ctx.fill();
    ctx.fillStyle = `rgba(240,246,255,${0.92 * A})`;
    poly([[u * 0.12, -u * 0.95], [u * 0.02, -u * 0.7], [u * 0.12, -u * 0.66], [u * 0.2, -u * 0.72],
          [u * 0.26, -u * 0.6], [u * 0.34, -u * 0.62], [u * 0.42, -u * 0.35], [u * 0.3, -u * 0.42], [u * 0.22, -u * 0.38]]);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const c = (t * 0.04 + sr(i) * 2) % 2 - 0.5;
      const x = c * u * 2.4, y = -u * (0.3 + sr(i + 3) * 0.5);
      ctx.fillStyle = `rgba(225,235,255,${0.28 * A})`;
      ctx.beginPath(); ctx.ellipse(x, y, u * 0.4, u * 0.07, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + u * 0.25, y - u * 0.04, u * 0.25, u * 0.05, 0, 0, TAU); ctx.fill();
    }
  } },
/* 32 */ { s: 3e4, n: 'Город ночью', p: 6, d: 'Миллионы окон и потоков огней — электрический организм из бетона.',
  f(u, t, w, A) {
    ctx.fillStyle = fade('rgba(30,34,52,0.9)', A);
    ctx.fillRect(-u * 1.5, -u * 1.5, u * 3, u * 3);
    ctx.fillStyle = fade('rgba(45,110,80,0.35)', A); ctx.fillRect(u * 0.5, -u * 1.1, u * 0.6, u * 0.9);
    ctx.fillStyle = fade('rgba(60,110,150,0.3)', A); ctx.fillRect(-u * 1.5, u * 0.55, u * 3, u * 0.22);
    ctx.strokeStyle = `rgba(120,140,180,${0.25 * A})`; ctx.lineWidth = Math.max(1, u * 0.02);
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(i * u * 0.42, -u * 1.4); ctx.lineTo(i * u * 0.42, u * 1.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-u * 1.4, i * u * 0.42); ctx.lineTo(u * 1.4, i * u * 0.42); ctx.stroke();
    }
    for (let i = 0; i < 26; i++) {
      const bx = (Math.floor(sr(i) * 6) - 3) * u * 0.42 + u * 0.05;
      const by = (Math.floor(sr(i + 30) * 6) - 3) * u * 0.42 + u * 0.05;
      if (bx > u * 0.35 && bx < u * 1.15 && by > -u * 1.2 && by < -u * 0.15) continue;
      ctx.fillStyle = `rgba(255,190,110,${(0.15 + sr(i + 60) * 0.5) * (0.7 + 0.3 * Math.sin(t * 2 + i)) * A})`;
      ctx.fillRect(bx, by, u * 0.3, u * 0.3);
    }
    for (let i = 0; i < 14; i++) {
      const vert = i % 2, lane = Math.floor(sr(i * 3) * 6) - 3;
      const c = (t * 0.25 * (0.5 + sr(i) * 0.8) + sr(i + 9)) % 1;
      const p = (c * 2 - 1) * u * 1.35;
      ctx.fillStyle = `rgba(255,${vert ? 220 : 170},${vert ? 150 : 90},${0.9 * A})`;
      if (vert) { circle(lane * u * 0.42 + (i % 4 < 2 ? u * 0.06 : -u * 0.06), p, Math.max(0.8, u * 0.02)); ctx.fill(); }
      else { circle(p, lane * u * 0.42 + (i % 4 < 2 ? u * 0.06 : -u * 0.06), Math.max(0.8, u * 0.02)); ctx.fill(); }
    }
  } },
/* 33 */ { s: 5e5, n: 'Ураган', p: 30, d: 'Спираль грозовых башен вокруг спокойного глаза — энергия тысячи станций.',
  f(u, t, w, A) {
    glow(0, 0, u * 1.15, 'rgba(120,160,220,1)', 0.2 * A);
    for (let arm = 0; arm < 5; arm++) {
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) {
        const r = u * (0.16 + k / 40 * 0.86);
        const a = arm * TAU / 5 + t * 0.3 + Math.log(r / u + 0.2) * 2.4;
        const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.85;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = `rgba(220,235,255,${(0.5 - arm * 0.06) * A})`;
      ctx.lineWidth = Math.max(2, u * 0.09); ctx.stroke();
      ctx.strokeStyle = `rgba(140,180,240,${0.25 * A})`;
      ctx.lineWidth = Math.max(1, u * 0.03); ctx.stroke();
    }
    ctx.fillStyle = fade('rgba(10,16,34,0.75)', A);
    circle(0, 0, u * 0.13); ctx.fill();
    ctx.strokeStyle = `rgba(200,225,255,${0.5 * A})`; ctx.lineWidth = Math.max(1.5, u * 0.03);
    circle(0, 0, u * 0.16); ctx.stroke();
  } },
/* 34 */ { s: 3.47e6, n: 'Луна', p: 40, d: 'Наш спутник: кратеры, моря и вечная либрация — мы видим лишь 59% поверхности.',
  f(u, t, w, A) {
    glow(0, 0, u * 1.25, 'rgba(200,200,220,1)', 0.2 * A);
    const g = ctx.createRadialGradient(-u * 0.3, -u * 0.3, u * 0.1, 0, 0, u);
    g.addColorStop(0, `rgba(226,224,218,${A})`); g.addColorStop(1, `rgba(120,118,124,${A})`);
    ctx.fillStyle = g; circle(0, 0, u); ctx.fill();
    ctx.save(); circle(0, 0, u); ctx.clip();
    ctx.fillStyle = `rgba(105,104,112,${0.55 * A})`;
    for (const [mx, my, mr] of [[-0.35, -0.25, 0.3], [0.1, -0.05, 0.24], [-0.05, 0.3, 0.34], [0.35, 0.25, 0.2]]) {
      ctx.beginPath(); ctx.ellipse(mx * u, my * u, mr * u, mr * u * 0.8, 0, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 14; i++) {
      const a = sr(i) * TAU, r = Math.sqrt(sr(i + 40)) * u * 0.92;
      const x = Math.cos(a) * r, y = Math.sin(a) * r, cr = u * (0.03 + sr(i + 7) * 0.07);
      ctx.fillStyle = `rgba(90,90,98,${0.4 * A})`; circle(x, y, cr); ctx.fill();
      ctx.strokeStyle = `rgba(230,228,222,${0.35 * A})`; ctx.lineWidth = Math.max(0.6, u * 0.012);
      ctx.beginPath(); ctx.arc(x, y, cr, 0.6, 2.4); ctx.stroke();
    }
    ctx.restore();
    const sh = ctx.createRadialGradient(u * 0.55, u * 0.4, u * 0.2, u * 0.3, u * 0.2, u * 1.35);
    sh.addColorStop(0, 'rgba(6,10,20,0.75)'); sh.addColorStop(0.55, 'rgba(6,10,20,0.25)'); sh.addColorStop(1, 'rgba(6,10,20,0)');
    ctx.fillStyle = sh; circle(0, 0, u); ctx.fill();
  } },
/* 35 */ { s: 1.274e7, n: 'Земля', p: 14, d: 'Единственный известный мир, где время имеет вкус утреннего кофе.',
  f(u, t, w, A) {
    glow(0, 0, u * 1.3, 'rgba(90,160,255,1)', 0.35 * A);
    const oc = ctx.createRadialGradient(-u * 0.35, -u * 0.35, u * 0.15, 0, 0, u);
    oc.addColorStop(0, `rgba(70,140,225,${A})`); oc.addColorStop(1, `rgba(18,55,120,${A})`);
    ctx.fillStyle = oc; circle(0, 0, u); ctx.fill();
    ctx.save(); circle(0, 0, u); ctx.clip();
    const shift = ((t / TAU) % 1) * 4 - 2;
    /* континенты — кластеры мягких «клякс», огибающие сферу с запасом */
    const conts = [
      [[-0.72, -0.52, 0.34, 0.4, 0.5], [-0.5, -0.28, 0.3, 0.34, -0.4], [-0.45, 0.02, 0.26, 0.34, 0.7], [-0.58, 0.34, 0.2, 0.3, -0.6], [-0.52, 0.66, 0.24, 0.22, 0.2]],
      [[-0.08, -0.56, 0.3, 0.26, 0.3], [0.05, -0.3, 0.22, 0.24, -0.5], [-0.12, -0.06, 0.28, 0.2, 0.8], [0.02, 0.24, 0.24, 0.18, -0.3], [0.12, 0.56, 0.2, 0.24, 0.5]],
      [[0.44, -0.5, 0.4, 0.32, 0.2], [0.3, -0.2, 0.3, 0.26, -0.7], [0.52, 0.08, 0.34, 0.26, 0.5], [0.42, 0.42, 0.26, 0.3, -0.2], [0.6, 0.7, 0.2, 0.2, 0.9]],
      [[-0.95, 0.9, 0.5, 0.2, 0.1], [-0.1, 0.95, 0.45, 0.18, -0.3], [0.8, 0.9, 0.4, 0.2, 0.4]]
    ];
    for (const blobs of conts) {
      ctx.fillStyle = fade('rgba(84,150,96,0.92)', A);
      for (const wrapOff of [0, 4]) {
        for (const [bx, by, rx, ry, ro] of blobs) {
          const x = (bx + shift + wrapOff) * u, y = by * u;
          ctx.beginPath(); ctx.ellipse(x, y, rx * u, ry * u, ro, 0, TAU); ctx.fill();
        }
      }
      ctx.fillStyle = fade('rgba(196,178,110,0.4)', A);
      for (const wrapOff of [0, 4]) {
        for (const [bx, by, rx, ry, ro] of blobs) {
          const x = (bx + shift + wrapOff) * u, y = by * u;
          ctx.beginPath(); ctx.ellipse(x + rx * u * 0.2, y + ry * u * 0.25, rx * u * 0.34, ry * u * 0.32, ro, 0, TAU); ctx.fill();
        }
      }
    }
    for (let i = 0; i < 9; i++) {
      const c = ((t * 0.06 + sr(i) * 2) % 2 - 0.5) * 2;
      const x = c * u, y = (sr(i + 5) * 1.6 - 0.8) * u;
      ctx.fillStyle = `rgba(255,255,255,${0.3 * A})`;
      ctx.beginPath(); ctx.ellipse(x, y, u * 0.3, u * 0.09, sr(i + 9) - 0.5, 0, TAU); ctx.fill();
    }
    const ng = ctx.createLinearGradient(u * 0.2, -u, u * 1.1, u);
    ng.addColorStop(0, 'rgba(5,8,20,0)'); ng.addColorStop(1, 'rgba(5,8,20,0.85)');
    ctx.fillStyle = ng; circle(0, 0, u); ctx.fill();
    ctx.fillStyle = `rgba(255,200,120,${0.5 * A})`;
    for (let i = 0; i < 16; i++) {
      const px = (sr(i) * 1.4 + 0.35) * u, py = (sr(i + 33) * 2 - 1) * u;
      if (px > u * 0.55) { circle(Math.min(px, u * 0.95), py, Math.max(0.5, u * 0.015)); ctx.fill(); }
    }
    ctx.restore();
  } },
/* 36 */ { s: 1.4e8, n: 'Юпитер', p: 26, d: 'Гигант из водорода. Большое красное пятно — шторм старше трёхсот лет.',
  f(u, t, w, A) {
    glow(0, 0, u * 1.25, 'rgba(230,180,130,1)', 0.25 * A);
    ctx.save(); circle(0, 0, u); ctx.clip();
    const bands = ['rgba(190,150,110,1)', 'rgba(225,195,155,1)', 'rgba(160,110,80,1)', 'rgba(235,210,175,1)',
                   'rgba(200,160,120,1)', 'rgba(170,120,90,1)', 'rgba(230,200,165,1)', 'rgba(180,140,105,1)'];
    bands.forEach((c, i) => {
      const yy = (i / (bands.length - 1) * 2 - 1) * u;
      const h = u * 0.26;
      ctx.fillStyle = fade(c, A);
      ctx.beginPath();
      ctx.moveTo(-u, yy + Math.sin(i * 2.1 + t * 0.4) * u * 0.02);
      for (let x = -u; x <= u; x += u / 12) {
        ctx.lineTo(x, yy + Math.sin(x / u * 3 + i * 1.7 + t * 0.35) * u * 0.03);
      }
      ctx.lineTo(u, yy + h); ctx.lineTo(-u, yy + h); ctx.closePath(); ctx.fill();
    });
    const sx = u * 0.32, sy = u * 0.38;
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(235,150,110,${(0.5 - i * 0.1) * A})`; ctx.lineWidth = Math.max(1, u * 0.02);
      ctx.beginPath(); ctx.ellipse(sx, sy, u * (0.16 - i * 0.035), u * (0.1 - i * 0.02), t * 0.5 + i, 0, TAU); ctx.stroke();
    }
    glow(sx, sy, u * 0.2, 'rgba(220,90,60,1)', 0.6 * A);
    const lg = ctx.createRadialGradient(0, 0, u * 0.55, 0, 0, u);
    lg.addColorStop(0, 'rgba(30,20,15,0)'); lg.addColorStop(1, 'rgba(30,20,15,0.75)');
    ctx.fillStyle = lg; circle(0, 0, u); ctx.fill();
    ctx.restore();
  } },
/* 37 */ { s: 1.39e9, n: 'Солнце', p: 30, d: 'Гранулы плазмы размером с страну, протуберанцы высотой в десятки Земель.',
  f(u, t, w, A) {
    glow(0, 0, u * 1.6, 'rgba(255,180,60,1)', 0.5 * A);
    glow(0, 0, u * 1.15, 'rgba(255,220,120,1)', 0.5 * A);
    const g = ctx.createRadialGradient(0, 0, u * 0.2, 0, 0, u);
    g.addColorStop(0, `rgba(255,250,220,${A})`); g.addColorStop(0.8, `rgba(255,200,80,${A})`); g.addColorStop(1, `rgba(255,150,40,${A})`);
    ctx.fillStyle = g; circle(0, 0, u); ctx.fill();
    ctx.save(); circle(0, 0, u); ctx.clip();
    for (let i = 0; i < 46; i++) {
      const a = sr(i) * TAU, r = Math.sqrt(sr(i + 40)) * u * 0.96;
      const tw = Math.sin(t * 3 + i * 2.7) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255,140,40,${(0.25 + 0.3 * tw) * A})`;
      circle(Math.cos(a) * r, Math.sin(a) * r, u * (0.04 + sr(i + 9) * 0.06)); ctx.fill();
    }
    for (const [px0, py0] of [[-0.45, -0.35], [0.5, 0.3]]) {
      const px = px0 * u + Math.sin(t * 0.2) * u * 0.1, py = py0 * u + Math.cos(t * 0.17) * u * 0.08;
      ctx.fillStyle = fade('rgba(60,30,15,0.8)', A);
      circle(px, py, u * 0.07); ctx.fill();
      ctx.fillStyle = fade('rgba(30,15,8,0.9)', A);
      circle(px, py, u * 0.045); ctx.fill();
    }
    ctx.restore();
    for (let pr = 0; pr < 3; pr++) {
      const a = sr(pr + 5) * TAU + t * 0.1;
      const bx = Math.cos(a) * u, by = Math.sin(a) * u;
      const h = u * (0.2 + 0.12 * Math.sin(t * 1.2 + pr * 2));
      const tx = Math.cos(a + 0.25) * u, ty = Math.sin(a + 0.25) * u;
      ctx.strokeStyle = `rgba(255,160,60,${0.7 * A})`; ctx.lineWidth = Math.max(1.5, u * 0.03);
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.quadraticCurveTo((bx + tx) / 2 + Math.cos(a + 1.57) * h, (by + ty) / 2 + Math.sin(a + 1.57) * h, tx, ty);
      ctx.stroke();
    }
  } },
/* 38 */ { s: 3e11, n: 'Орбита Земли', p: 18, d: '150 миллионов километров от Солнца. Мы пролетаем их со скоростью 30 км/с.',
  f(u, t, w, A) {
    const sx = -u * 0.45;
    glow(sx, 0, u * 0.22, 'rgba(255,220,120,1)', 0.9 * A);
    ctx.fillStyle = `rgba(255,235,170,${A})`; circle(sx, 0, u * 0.05); ctx.fill();
    ctx.strokeStyle = `rgba(150,170,220,${0.3 * A})`; ctx.lineWidth = Math.max(0.7, u * 0.008);
    ctx.beginPath(); ctx.ellipse(0, 0, u * 0.9, u * 0.34, 0, 0, TAU); ctx.stroke();
    const a = t * 0.9, ex = Math.cos(a) * u * 0.9, ey = Math.sin(a) * u * 0.34;
    glow(ex, ey, u * 0.08, 'rgba(120,200,255,1)', 0.8 * A);
    ctx.fillStyle = fade('rgba(90,170,230,1)', A); circle(ex, ey, Math.max(1.4, u * 0.022)); ctx.fill();
    const ma = t * 6;
    ctx.fillStyle = `rgba(220,220,230,${A})`;
    circle(ex + Math.cos(ma) * u * 0.055, ey + Math.sin(ma) * u * 0.02, Math.max(0.8, u * 0.007)); ctx.fill();
    const ray = (t * 0.9) % 1;
    ctx.strokeStyle = `rgba(255,240,200,${(1 - ray) * 0.5 * A})`; ctx.lineWidth = Math.max(1, u * 0.01);
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + (ex - sx) * ray, ey * ray); ctx.stroke();
  } },
/* 39 */ { s: 9e12, n: 'Солнечная система', p: 26, d: 'Восемь планет, пояс астероидов и одна комета — вся семья жёлтого карлика.',
  f(u, t, w, A) {
    glow(0, 0, u * 0.16, 'rgba(255,220,120,1)', 0.95 * A);
    ctx.fillStyle = `rgba(255,235,170,${A})`; circle(0, 0, Math.max(2, u * 0.045)); ctx.fill();
    const planetCols = ['rgba(170,170,175,1)', 'rgba(230,190,130,1)', 'rgba(120,200,230,1)', 'rgba(220,120,80,1)',
                        'rgba(230,190,140,1)', 'rgba(220,190,120,1)', 'rgba(160,210,230,1)', 'rgba(140,160,230,1)'];
    for (let i = 0; i < 8; i++) {
      const r = u * (0.1 + 0.155 * Math.log2(2 + i * 2.2));
      ctx.strokeStyle = `rgba(150,170,220,${0.16 * A})`; ctx.lineWidth = Math.max(0.7, u * 0.006);
      circle(0, 0, r); ctx.stroke();
    }
    for (let i = 0; i < 50; i++) {
      const a = sr(i) * TAU + t * 0.1, r = u * (0.62 + sr(i + 50) * 0.1);
      ctx.fillStyle = `rgba(180,170,160,${0.4 * A})`;
      circle(Math.cos(a) * r, Math.sin(a) * r, Math.max(0.4, u * 0.005)); ctx.fill();
    }
    for (let i = 0; i < 8; i++) {
      const r = u * (0.1 + 0.155 * Math.log2(2 + i * 2.2));
      const a = t * (1.4 / Math.pow(r / u, 1.5)) + i * 1.3;
      const x = Math.cos(a) * r, y = Math.sin(a) * r, pr = Math.max(1.2, u * (0.008 + (i === 5 ? 0.014 : 0.006) + sr(i) * 0.006));
      ctx.fillStyle = fade(planetCols[i], A); circle(x, y, pr); ctx.fill();
      if (i === 5) {
        ctx.strokeStyle = `rgba(230,200,150,${0.8 * A})`; ctx.lineWidth = Math.max(0.7, u * 0.008);
        ctx.beginPath(); ctx.ellipse(x, y, pr * 2.2, pr * 0.8, 0.4, 0, TAU); ctx.stroke();
      }
    }
    const ca = t * 0.22, crx = u * 0.95, cry = u * 0.42;
    const cx = Math.cos(ca) * crx - u * 0.3, cy = Math.sin(ca) * cry;
    const dS = Math.hypot(cx, cy);
    ctx.strokeStyle = `rgba(180,220,255,${0.55 * A})`; ctx.lineWidth = Math.max(1, u * 0.012);
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + cx / dS * u * 0.3, cy + cy / dS * u * 0.3); ctx.stroke();
    ctx.fillStyle = `rgba(220,240,255,${A})`; circle(cx, cy, Math.max(1, u * 0.012)); ctx.fill();
  } },
/* 40 */ { s: 1e16, n: 'Облако Оорта', p: 40, d: 'Сфера из триллионов ледяных глыб на самом краю солнечной системы.',
  f(u, t, w, A) {
    glow(0, 0, u * 0.14, 'rgba(255,220,120,1)', 0.5 * A);
    for (let i = 0; i < 90; i++) {
      const a = sr(i) * TAU + t * 0.04, r = u * (0.55 + sr(i + 60) * 0.48);
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.9 + i * 2.2));
      ctx.fillStyle = fade('rgba(200,220,255,1)', (0.2 + 0.5 * tw) * A);
      circle(Math.cos(a) * r, Math.sin(a) * r * 0.9, Math.max(0.5, u * 0.012)); ctx.fill();
    }
    const ph = (t * 0.18) % 1;
    const ca = ph * TAU * 2, cr = (1 - ph) * u * 0.9;
    ctx.strokeStyle = `rgba(190,225,255,${Math.sin(ph * Math.PI) * 0.5 * A})`; ctx.lineWidth = Math.max(1, u * 0.012);
    ctx.beginPath(); ctx.moveTo(Math.cos(ca) * cr, Math.sin(ca) * cr);
    ctx.lineTo(Math.cos(ca) * cr * 1.35, Math.sin(ca) * cr * 1.35); ctx.stroke();
    ctx.fillStyle = `rgba(230,245,255,${Math.sin(ph * Math.PI) * A})`;
    circle(Math.cos(ca) * cr, Math.sin(ca) * cr, Math.max(1, u * 0.02)); ctx.fill();
  } },
/* 41 */ { s: 1.5e17, n: 'Туманность Ориона', p: 20, d: 'Колыбель новорождённых звёзд в 1300 световых годах от Земли.',
  f(u, t, w, A) {
    const blobs = [[0, 0, 1, 'rgba(255,110,199,1)'], [0.4, -0.2, 0.7, 'rgba(60,220,255,1)'],
                   [-0.35, 0.25, 0.6, 'rgba(120,110,255,1)'], [0.1, 0.35, 0.5, 'rgba(80,255,200,1)'],
                   [-0.15, -0.4, 0.45, 'rgba(255,180,120,1)']];
    for (const [bx, by, br, c] of blobs) {
      const ox = Math.sin(t * 0.3 + bx * 9) * u * 0.06, oy = Math.cos(t * 0.26 + by * 7) * u * 0.06;
      glow(bx * u + ox, by * u + oy, u * br * 0.85, c, 0.3 * A);
    }
    ctx.strokeStyle = `rgba(20,15,40,${0.4 * A})`; ctx.lineWidth = Math.max(2, u * 0.09);
    ctx.beginPath(); ctx.moveTo(-u * 0.7, -u * 0.1);
    ctx.quadraticCurveTo(-u * 0.2, u * 0.15, u * 0.3, -u * 0.05); ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const x = (sr(i) * 1.6 - 0.8) * u, y = (sr(i + 20) * 1.6 - 0.8) * u;
      const tw = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 2.1);
      glow(x, y, u * 0.07, 'rgba(255,255,240,1)', tw * A);
      ctx.strokeStyle = `rgba(255,255,245,${tw * 0.6 * A})`; ctx.lineWidth = Math.max(0.6, u * 0.008);
      ctx.beginPath(); ctx.moveTo(x - u * 0.05, y); ctx.lineTo(x + u * 0.05, y);
      ctx.moveTo(x, y - u * 0.05); ctx.lineTo(x, y + u * 0.05); ctx.stroke();
    }
  } },
/* 42 */ { s: 1.3e18, n: 'Шаровое скопление', p: 26, d: 'Сотни тысяч звёзд, стянутых гравитацией в один плотный шар.',
  f(u, t, w, A) {
    glow(0, 0, u * 0.9, 'rgba(255,230,190,1)', 0.3 * A);
    for (let i = 0; i < 200; i++) {
      const a = sr(i) * TAU + t * 0.05, r = Math.pow(sr(i + 40), 0.65) * u * 0.85;
      const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.95;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.4 + i * 1.9));
      const warm = sr(i + 5) > 0.7;
      ctx.fillStyle = fade(warm ? 'rgba(255,220,170,1)' : 'rgba(220,235,255,1)', (0.25 + 0.65 * tw) * A);
      circle(x, y, Math.max(0.5, u * 0.01 * (0.5 + sr(i)))); ctx.fill();
      if (i % 23 === 0) glow(x, y, u * 0.08, 'rgba(255,240,210,1)', 0.5 * A);
    }
  } },
/* 43 */ { s: 1e21, n: 'Млечный Путь', p: 40, d: '200 миллиардов звёзд в спиральных рукавах. Солнце — на окраине, в тихом квартале.',
  f(u, t, w, A) {
    glow(0, 0, u * 0.55, 'rgba(255,220,170,1)', 0.5 * A);
    glow(0, 0, u * 0.25, 'rgba(255,245,220,1)', 0.7 * A);
    /* 4 рукава: логарифмическая спираль + лёгкое эллиптическое сжатие кадра */
    ctx.save(); ctx.rotate(-0.5); ctx.scale(1, 0.82);
    for (let arm = 0; arm < 4; arm++) {
      ctx.strokeStyle = `rgba(140,170,255,${0.07 * A})`; ctx.lineWidth = Math.max(2, u * 0.16);
      ctx.beginPath();
      for (let k = 0; k <= 44; k++) {
        const r = u * (0.14 + k / 44 * 0.86);
        const a = arm * (TAU / 4) + Math.log(r / (u * 0.14)) * 2.6 + t * 0.55 / (0.35 + r / u);
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    for (let k = 0; k < 460; k++) {
      const arm = k % 4;
      const r = u * (0.14 + Math.pow(sr(k), 0.72) * 0.9);
      const wr = 0.55 / (0.35 + r / u);
      const a = arm * (TAU / 4) + Math.log(r / (u * 0.14)) * 2.6 + t * wr + (sr(k + 90) - 0.5) * 0.3;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + k * 1.7));
      const col = sr(k + 5) > 0.9 ? 'rgba(255,150,170,1)' : sr(k + 5) > 0.65 ? 'rgba(170,200,255,1)' : 'rgba(235,240,255,1)';
      ctx.fillStyle = fade(col, (0.2 + tw * 0.6) * A);
      circle(x, y, Math.max(0.5, u * 0.009 * (0.6 + sr(k + 3)))); ctx.fill();
    }
    for (let i = 0; i < 8; i++) {
      const arm = i % 4, r = u * (0.25 + sr(i) * 0.62);
      const a = arm * (TAU / 4) + Math.log(r / (u * 0.14)) * 2.6 + t * 0.55 / (0.35 + r / u);
      glow(Math.cos(a) * r, Math.sin(a) * r, u * 0.07, 'rgba(255,120,170,1)', 0.4 * A);
    }
    ctx.restore();
  } },
/* 44 */ { s: 9.5e22, n: 'Местная группа', p: 44, d: 'Млечный Путь, Андромеда и полсотня карликов. Столкновение — через 4 млрд лет.',
  f(u, t, w, A) {
    glow(0, 0, u * 0.9, 'rgba(100,110,220,1)', 0.14 * A);
    const drift = Math.sin(t * 0.14) * u * 0.06;
    function miniSpiral(cx, cy, r, sp) {
      glow(cx, cy, r * 0.4, 'rgba(255,230,190,1)', 0.5 * A);
      for (let k = 0; k < 90; k++) {
        const rr = r * (0.16 + Math.pow(sr(k + sp), 0.65) * 0.8);
        const arm = k % 2;
        const a = arm * Math.PI + (rr / r) * 2.4 + t * 0.5 / (0.4 + rr / r) + sp;
        ctx.fillStyle = fade(sr(k + sp + 5) > 0.8 ? 'rgba(255,170,190,1)' : 'rgba(225,235,255,1)', 0.6 * A);
        circle(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.55, Math.max(0.5, u * 0.007)); ctx.fill();
      }
    }
    miniSpiral(-u * 0.42 - drift, u * 0.12, u * 0.3, 0);
    ctx.fillStyle = fade('rgba(230,220,190,0.5)', A);
    ctx.beginPath(); ctx.ellipse(u * 0.4 + drift, -u * 0.12, u * 0.24, u * 0.15, 0.4, 0, TAU); ctx.fill();
    glow(u * 0.4 + drift, -u * 0.12, u * 0.14, 'rgba(255,235,200,1)', 0.6 * A);
    for (let i = 0; i < 5; i++) {
      const a = t * 0.08 + sr(i + 3) * TAU, r = u * (0.4 + sr(i + 11) * 0.4);
      const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.75;
      glow(x, y, u * 0.05, 'rgba(180,195,255,1)', 0.4 * A);
      ctx.fillStyle = fade('rgba(190,200,245,0.5)', A);
      ctx.beginPath(); ctx.ellipse(x, y, u * 0.04, u * 0.02, sr(i) * 3, 0, TAU); ctx.fill();
    }
  } },
/* 45 */ { s: 5.2e24, n: 'Ланиакея', p: 50, d: 'Сверхскопление из 100 тысяч галактик. Все они текут к Великому аттрактору.',
  f(u, t, w, A) {
    glow(u * 0.3, u * 0.1, u * 1.1, 'rgba(90,110,220,1)', 0.14 * A);
    const attractor = [u * 0.3, u * 0.1];
    ctx.strokeStyle = `rgba(120,140,230,${0.12 * A})`; ctx.lineWidth = Math.max(1, u * 0.008);
    for (let i = 0; i < 8; i++) {
      const x0 = (sr(i) * 1.8 - 0.9) * u, y0 = (sr(i + 20) * 1.8 - 0.9) * u;
      ctx.beginPath(); ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + attractor[0]) / 2 + (y0 - attractor[1]) * 0.3,
                           (y0 + attractor[1]) / 2 - (x0 - attractor[0]) * 0.3,
                           attractor[0], attractor[1]);
      ctx.stroke();
    }
    for (let i = 0; i < 30; i++) {
      const bx = (sr(i) * 1.8 - 0.9) * u, by = (sr(i + 20) * 1.8 - 0.9) * u;
      const dx = attractor[0] - bx, dy = attractor[1] - by, dl = Math.hypot(dx, dy) || 1;
      const drift = Math.sin(t * 0.12 + i) * 0.06;
      const x = bx + dx / dl * drift * u, y = by + dy / dl * drift * u;
      const r = u * (0.02 + sr(i + 40) * 0.035);
      if (sr(i + 7) > 0.5) {
        ctx.strokeStyle = fade('rgba(190,205,255,0.8)', A); ctx.lineWidth = Math.max(0.7, u * 0.006);
        for (const o of [0, 1.2]) ctx.beginPath(), ctx.arc(x, y, r * 2.2, o, o + 2), ctx.stroke();
      } else {
        ctx.fillStyle = fade('rgba(170,185,240,0.5)', A);
        ctx.beginPath(); ctx.ellipse(x, y, r * 2.2, r * 1.3, sr(i) * 3, 0, TAU); ctx.fill();
      }
      glow(x, y, r * 3.2, 'rgba(160,180,255,1)', 0.35 * A);
    }
  } },
/* 46 */ { s: 8.8e26, n: 'Наблюдаемая Вселенная', p: 60, d: '93 миллиарда световых лет. Всё, что мы можем видеть, — одна пузырьковая нить.',
  f(u, t, w, A) {
    glow(0, 0, u * 1.05, 'rgba(120,90,255,1)', 0.12 * A);
    for (let i = 0; i < 12; i++) {
      const a1 = sr(i) * TAU, a2 = sr(i + 30) * TAU, r1 = sr(i + 60) * u * 0.75, r2 = sr(i + 90) * u * 0.75;
      ctx.strokeStyle = `rgba(150,160,255,${0.16 * A})`; ctx.lineWidth = Math.max(1, u * 0.01);
      ctx.beginPath(); ctx.moveTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
      ctx.quadraticCurveTo((Math.cos(a1) * r1 + Math.cos(a2) * r2) / 2 + (sr(i + 5) - 0.5) * u * 0.4,
                           (Math.sin(a1) * r1 + Math.sin(a2) * r2) / 2 + (sr(i + 15) - 0.5) * u * 0.4,
                           Math.cos(a2) * r2, Math.sin(a2) * r2);
      ctx.stroke();
    }
    for (let i = 0; i < 110; i++) {
      const a = sr(i) * TAU, r = Math.pow(sr(i + 40), 0.6) * u * 0.8;
      const br = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.8 + i * 2.3));
      ctx.fillStyle = fade(sr(i + 3) > 0.75 ? 'rgba(255,180,140,1)' : 'rgba(200,210,255,1)', br * A);
      circle(Math.cos(a) * r, Math.sin(a) * r, Math.max(0.5, u * 0.007)); ctx.fill();
    }
    for (let i = 0; i < 70; i++) {
      const a = sr(i + 200) * TAU, r = u * (0.92 + (sr(i + 250) - 0.5) * 0.05);
      const tw = Math.sin(t * 1.5 + i * 1.9) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(${200 + tw * 55},${90 + tw * 60},60,${(0.3 + 0.45 * tw) * A})`;
      circle(Math.cos(a) * r, Math.sin(a) * r, Math.max(0.6, u * 0.016 * (0.6 + sr(i + 300)))); ctx.fill();
    }
    glow(0, 0, u * 0.9, 'rgba(255,140,90,1)', 0.07 * A);
  } },
];

/* калибровка темпов */
for (let i = 0; i < OB.length; i++) {
  const o = OB[i]; o.idx = i;
  o.home = 0.85 - Math.log10(o.s);
  o.k1 = (TAU / o.p) / rateAt(o.home);
  o.k2 = o.k1 * 1.618;
}
const OB_SORTED = [...OB].sort((a, b) => b.s - a.s);
const OB_BY_HOME = [...OB].sort((a, b) => a.home - b.home);
const HUMAN = OB.find(o => o.n === 'Человек');

/* ── состояние камеры и времени ──────────────────── */
const M_MIN = -26.6, M_MAX = 37.0;
let M = HUMAN.home, Mt = M;
let simT = 0;
let zoomVel = 0;
let lastNow = performance.now();

/* ── ввод ────────────────────────────────────────── */
const helpBox = document.getElementById('helpbox');
function hideHelp() { if (helpBox) helpBox.hidden = true; }
if (helpBox) helpBox.addEventListener('click', hideHelp);

window.addEventListener('wheel', e => {
  e.preventDefault(); hideHelp();
  const d = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY;
  Mt = clamp(Mt - d * 0.0016, M_MIN, M_MAX);
}, { passive: false });

const ptrs = new Map();
let pinchD0 = 0, pinchM0 = 0, dragY0 = 0, dragM0 = 0;
cv.addEventListener('pointerdown', e => {
  hideHelp(); cv.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 1) { dragY0 = e.clientY; dragM0 = Mt; }
  if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    pinchD0 = Math.hypot(a[0] - b[0], a[1] - b[1]); pinchM0 = Mt;
  }
});
cv.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 1) {
    Mt = clamp(dragM0 - (e.clientY - dragY0) / H * 4.5, M_MIN, M_MAX);
  } else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (pinchD0 > 0) Mt = clamp(pinchM0 + Math.log10(pinchD0 / d) * 3, M_MIN, M_MAX);
  }
});
for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, e => ptrs.delete(e.pointerId));

window.addEventListener('keydown', e => {
  const step = e.key === 'PageUp' || e.key === 'PageDown' ? 1 : 0.5;
  if (e.key === 'ArrowUp' || e.key === 'PageUp') { Mt = clamp(Mt + step, M_MIN, M_MAX); hideHelp(); }
  if (e.key === 'ArrowDown' || e.key === 'PageDown') { Mt = clamp(Mt - step, M_MIN, M_MAX); hideHelp(); }
});
document.getElementById('zin').addEventListener('click', () => { Mt = clamp(Mt + 0.5, M_MIN, M_MAX); hideHelp(); });
document.getElementById('zout').addEventListener('click', () => { Mt = clamp(Mt - 0.5, M_MIN, M_MAX); hideHelp(); });
document.getElementById('home').addEventListener('click', () => { Mt = HUMAN.home; hideHelp(); });
document.getElementById('help').addEventListener('click', () => { helpBox.hidden = !helpBox.hidden; });

/* ── лента уровней ───────────────────────────────── */
const ladderEl = document.getElementById('ladder');
const rungs = OB_BY_HOME.map(o => {
  const el = document.createElement('div');
  el.className = 'rung';
  el.innerHTML = `<div class="dot"></div><div class="lbl">${o.n}</div><div class="maglbl">10${sup(Math.round(Math.log10(o.s)))}</div>`;
  el.addEventListener('click', () => { Mt = clamp(o.home, M_MIN, M_MAX); hideHelp(); });
  ladderEl.appendChild(el);
  return el;
});

/* ── HUD ─────────────────────────────────────────── */
const elMag = document.getElementById('mtxt'), elWays = document.getElementById('wtxt'),
      elName = document.getElementById('otxt'), elDesc = document.getElementById('dtxt'),
      elRate = document.getElementById('ctype'), elSpec = document.getElementById('spectrum');

function updateHUD(dom) {
  const field = H / (Z * Math.pow(10, M));
  elMag.textContent = fmtLen(field);
  elWays.innerHTML = `поле зрения 10<sup style="font-size:8px">${Math.round(Math.log10(field))}</sup> м · ` +
    (M >= 0 ? `увеличение ×10${sup(Math.round(M))}` : `уменьшение ÷10${sup(Math.round(-M))}`);
  elName.textContent = dom ? dom.n : '';
  elDesc.textContent = dom ? dom.d : '';
  elRate.textContent = fmtRate(rateAt(M));
  const p = clamp((M - M_MIN) / (M_MAX - M_MIN) * 100, 0, 100);
  elSpec.style.setProperty('--p', p + '%');
  OB_BY_HOME.forEach((o, i) => {
    const d = Math.abs(M - o.home);
    rungs[i].classList.toggle('cur', dom === o);
    rungs[i].classList.toggle('near', d < 1.6 && dom !== o);
  });
}

/* ── звёздный фон ────────────────────────────────── */
const stars = Array.from({ length: 140 }, (_, i) => [sr(i), sr(i + 500), 0.4 + sr(i + 900) * 0.8]);

/* ── главный цикл ────────────────────────────────── */
function frame(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000); lastNow = now;

  const prevM = M;
  M += (Mt - M) * Math.min(1, dt * 7);
  if (Math.abs(Mt - M) < 0.0004) M = Mt;
  zoomVel += ((M - prevM) / Math.max(dt, 1e-4) - zoomVel) * Math.min(1, dt * 8);

  const rate = rateAt(M);
  simT += dt * rate;

  const pxPerM = Z * Math.pow(10, M);

  const micro = clamp((M - 24) / 12, 0, 1);
  const starA = clamp((-5 - M) / 5, 0, 1);
  const bg1 = `rgb(${6 + micro * 12},${10},${20 + micro * 16})`;
  const g0 = ctx.createLinearGradient(0, 0, 0, H);
  g0.addColorStop(0, micro > 0 ? `rgb(${18 + micro * 12},${9},${36 + micro * 10})` : bg1);
  g0.addColorStop(1, bg1);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
  if (starA > 0) {
    for (const [sx, sy, sbr] of stars) {
      const tw = 0.5 + 0.5 * Math.sin(simT * (0.3 + sbr) + sx * 40);
      ctx.fillStyle = `rgba(230,235,255,${starA * sbr * (0.4 + 0.6 * tw) * 0.9})`;
      ctx.fillRect(((sx + 0.02) * W) | 0, ((sy + 0.02) * H) | 0, sbr > 1 ? 2 : 1.4, sbr > 1 ? 2 : 1.4);
    }
  }

  /* «герой» кадра — объект, чей экранный размер ближе всего к половине высоты */
  let dom = null, bestScore = 1e9;
  for (const o of OB_SORTED) {
    const px = o.s * pxPerM;
    if (px < 1.5 || px > 2.4 * H) continue;
    const score = Math.abs(Math.log10(px / (H * 0.5)));
    if (score < bestScore) { bestScore = score; dom = o; }
  }

  for (const o of OB_SORTED) {
    const sPx = o.s * pxPerM;
    if (sPx < 1.5 || sPx > 2.4 * H) continue;
    const fadeIn = clamp((sPx - 1.5) / 3.5, 0, 1);
    const fadeOut = sPx > 1.1 * H ? clamp((2.4 * H - sPx) / (1.3 * H), 0, 1) : 1;
    let A = Math.min(fadeIn, fadeOut);
    /* объект крупнее героя и больше экрана — не рисуем (иначе заливает кадр) */
    if (dom && o.s > dom.s && sPx > 0.85 * H) A *= clamp((1.35 * H - sPx) / (0.5 * H), 0, 1);
    if (A <= 0.004) continue;
    const u = sPx / 2;
    const ox = ((((o.idx * 0.618034) % 1) - 0.5) * W * 0.26);
    const oy = ((((o.idx * 0.381966) % 1) - 0.5) * H * 0.15);
    ctx.save();
    ctx.translate(W / 2 + ox, H / 2 + oy);
    o.f(u, (simT * o.k1) % (TAU * 512), (simT * o.k2) % (TAU * 512), A);
    ctx.restore();
    if (sPx > 30 && sPx < H * 0.55) {
      const label = `${o.n} · ${fmtLen(o.s)}`;
      ctx.font = '11px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(170,190,235,${0.75 * A})`;
      ctx.fillText(label, W / 2 + ox, H / 2 + oy + u + 20);
    }
  }

  const v = clamp(Math.abs(zoomVel) * 2.2, 0, 1);
  if (v > 0.04) {
    const dir = zoomVel > 0 ? 1 : -1;
    ctx.strokeStyle = `rgba(140,180,255,${v * 0.3})`;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 26; i++) {
      const a = sr(i) * TAU, r1 = (0.2 + sr(i + 40) * 0.75) * Math.max(W, H) * 0.7;
      const len = (18 + sr(i + 80) * 60) * v * dir;
      ctx.beginPath();
      ctx.moveTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1);
      ctx.lineTo(W / 2 + Math.cos(a) * (r1 + len), H / 2 + Math.sin(a) * (r1 + len));
      ctx.stroke();
    }
  }

  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.36, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,4,12,0.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  updateHUD(dom);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* отладочный хук для тестов */
window.__setM = v => { Mt = clamp(v, M_MIN, M_MAX); M = Mt; };
