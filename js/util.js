(function (global) {
  "use strict";

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(e0, e1, x) {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash2(ix, iy) {
    let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  function formatMeters(m) {
    const abs = Math.abs(m);
    if (abs === 0) return "0 м";
    if (abs >= 1e3 && abs < 1e6) return (m / 1e3).toFixed(abs >= 1e4 ? 0 : 1) + " км";
    if (abs >= 1 && abs < 1e3) return (abs >= 10 ? m.toFixed(0) : m.toFixed(2)) + " м";
    if (abs >= 1e-2 && abs < 1) return (m * 100).toFixed(1) + " см";
    if (abs >= 1e-3 && abs < 1e-2) return (m * 1e3).toFixed(1) + " мм";
    if (abs >= 1e-6 && abs < 1e-3) return (m * 1e6).toFixed(1) + " мкм";
    if (abs >= 1e-9 && abs < 1e-6) return (m * 1e9).toFixed(1) + " нм";
    if (abs >= 1e-12 && abs < 1e-9) return (m * 1e12).toFixed(1) + " пм";
    if (abs >= 9.46e15) {
      const ly = m / 9.46073e15;
      if (ly >= 1e6) return (ly / 1e6).toFixed(1) + " млн св. лет";
      if (ly >= 1e3) return (ly / 1e3).toFixed(1) + " тыс. св. лет";
      return ly.toFixed(ly >= 10 ? 0 : 1) + " св. лет";
    }
    const exp = Math.floor(Math.log10(abs));
    const base = m / Math.pow(10, exp);
    return base.toFixed(1) + " × 10" + superscript(exp) + " м";
  }

  const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺";
  function superscript(n) {
    const s = String(n);
    let out = "";
    for (const ch of s) {
      if (ch === "-") out += SUP[10];
      else if (ch === "+") out += SUP[11];
      else out += SUP[ch | 0];
    }
    return out;
  }

  function formatExp(m) {
    if (m <= 0) return "10⁰ м";
    const exp = Math.round(Math.log10(m));
    return "10" + superscript(exp) + " м";
  }

  const TIME_UNITS = [
    { s: 1e-24, name: "йоктосекунда", short: "ис" },
    { s: 1e-21, name: "зептосекунда", short: "зс" },
    { s: 1e-18, name: "аттосекунда", short: "ас" },
    { s: 1e-15, name: "фемтосекунда", short: "фс" },
    { s: 1e-12, name: "пикосекунда", short: "пс" },
    { s: 1e-9, name: "наносекунда", short: "нс" },
    { s: 1e-6, name: "микросекунда", short: "мкс" },
    { s: 1e-3, name: "миллисекунда", short: "мс" },
    { s: 1, name: "секунда", short: "с" },
    { s: 60, name: "минута", short: "мин" },
    { s: 3600, name: "час", short: "ч" },
    { s: 86400, name: "сутки", short: "сут" },
    { s: 31557600, name: "год", short: "лет" },
    { s: 31557600e3, name: "тысяча лет", short: "тыс. лет" },
    { s: 31557600e6, name: "миллион лет", short: "млн лет" },
    { s: 31557600e9, name: "миллиард лет", short: "млрд лет" },
  ];

  function formatDuration(seconds) {
    const abs = Math.abs(seconds);
    if (!isFinite(abs) || abs === 0) return "0 с";
    let best = TIME_UNITS[0];
    for (const u of TIME_UNITS) {
      if (abs >= u.s) best = u;
    }
    const n = abs / best.s;
    const digits = n >= 10 ? 0 : 1;
    return n.toFixed(digits) + " " + best.short;
  }

  function formatTimeRate(rate) {
    if (!isFinite(rate) || rate <= 0) return "пауза";
    if (rate >= 0.5 && rate < 1.5) return "1 с = 1 с";
    if (rate >= 1) return "1 с = " + formatDuration(rate);
    return "1 с = " + formatDuration(rate);
  }

  /**
   * Shared simulation clock: one rate for every layer, driven by current zoom.
   * Keys are [log10(view meters), log10(sim seconds per wall second)].
   */
  const RATE_KEYS = [
    [-18.5, -23.5],
    [-15.0, -23.0],
    [-14.0, -21.5],
    [-10.5, -16.2],
    [-9.0, -12.0],
    [-8.0, -8.0],
    [-6.5, -4.0],
    [-5.0, -2.2],
    [-3.0, -0.4],
    [0.2, 0.0],
    [2.0, 0.4],
    [4.5, 1.6],
    [7.1, 3.55],
    [8.8, 5.2],
    [11.2, 6.7],
    [13.0, 7.8],
    [16.5, 10.2],
    [18.5, 12.4],
    [21.3, 14.6],
    [23.5, 15.4],
    [26.9, 16.2],
  ];

  function timeRate(logView) {
    const keys = RATE_KEYS;
    if (logView <= keys[0][0]) return Math.pow(10, keys[0][1]);
    if (logView >= keys[keys.length - 1][0]) return Math.pow(10, keys[keys.length - 1][1]);
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i];
      const b = keys[i + 1];
      if (logView <= b[0]) {
        const t = (logView - a[0]) / (b[0] - a[0]);
        return Math.pow(10, lerp(a[1], b[1], t));
      }
    }
    return 1;
  }

  function motion(period, t, rate) {
    if (!period || period <= 0) {
      return { phase: 0, amount: 1, blur: false, frozen: false, cps: 0 };
    }
    const cps = Math.abs(rate) / period;
    const phase = ((t / period) % 1 + 1) % 1;
    const amount = smoothstep(0.002, 0.02, cps) * (1 - smoothstep(12, 22, cps));
    return {
      phase: phase,
      amount: amount,
      blur: cps > 18,
      frozen: cps < 0.003,
      cps: cps,
    };
  }

  function sizeAlpha(radiusPx, minPx, inPx, outPx, maxPx) {
    return smoothstep(minPx, inPx, radiusPx) * (1 - smoothstep(outPx, maxPx, radiusPx));
  }

  function disc(ctx, x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(r, 0.05), 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function glow(ctx, x, y, r, color, inner) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(r, 1));
    g.addColorStop(0, inner || color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function parseOx(v, t) {
    return typeof v === "function" ? v(t) : v || 0;
  }

  global.ScaleUtil = {
    clamp: clamp,
    lerp: lerp,
    smoothstep: smoothstep,
    mulberry32: mulberry32,
    hash2: hash2,
    formatMeters: formatMeters,
    formatExp: formatExp,
    formatTimeRate: formatTimeRate,
    timeRate: timeRate,
    motion: motion,
    sizeAlpha: sizeAlpha,
    disc: disc,
    glow: glow,
    parseOx: parseOx,
    YEAR: 31557600,
    DAY: 86400,
    AU: 1.495978707e11,
    LY: 9.46073e15,
  };
})(window);
