(function (global) {
  "use strict";

  const U = global.ScaleUtil;
  const { lerp, smoothstep, mulberry32, hash2, motion, disc, glow, YEAR, DAY, AU, withAlpha, clamp } = U;

  function loadImg(src) {
    const im = new Image();
    im.src = src;
    return im;
  }

  const IMG = {
    earth: loadImg("img/earth_globe.png"),
    africa: loadImg("img/africa_map.png"),
    landscape: loadImg("img/landscape_aerial.png"),
    human: loadImg("img/human_figure.png"),
  };

  function spriteReady(img) {
    return img && img.complete && img.naturalWidth > 0;
  }

  function drawSprite(ctx, img, w, h) {
    if (!spriteReady(img)) return false;
    ctx.drawImage(img, -w * 0.5, -h * 0.5, w, h);
    return true;
  }

  function rngArray(seed, n, fn) {
    const r = mulberry32(seed);
    const a = [];
    for (let i = 0; i < n; i++) a.push(fn(r, i));
    return a;
  }

  const STARS = rngArray(7, 900, (r) => ({
    a: r() * Math.PI * 2,
    d: Math.pow(r(), 0.55),
    s: 0.4 + r() * 1.8,
    c: r() < 0.15 ? "#9bd7ff" : r() < 0.3 ? "#ffd7a8" : "#f4f1ea",
    tw: r() * Math.PI * 2,
  }));

  const WEB = rngArray(21, 48, (r) => {
    const pts = [];
    let x = (r() * 2 - 1) * 0.85;
    let y = (r() * 2 - 1) * 0.85;
    let a = r() * Math.PI * 2;
    const len = 10 + (r() * 18) | 0;
    for (let k = 0; k < len; k++) {
      pts.push({ x: x, y: y });
      a += (r() - 0.5) * 0.7;
      x += Math.cos(a) * 0.045;
      y += Math.sin(a) * 0.045;
    }
    return { pts: pts, w: 0.6 + r() * 1.8, b: 0.25 + r() * 0.55 };
  });

  const GALAXIES = rngArray(99, 160, (r) => ({
    x: (r() * 2 - 1) * 0.92,
    y: (r() * 2 - 1) * 0.92,
    r: 0.004 + r() * 0.018,
    hue: 200 + r() * 80,
    spin: r() * Math.PI * 2,
    type: r(),
  }));

  const NEIGHBOR_STARS = rngArray(44, 70, (r) => ({
    x: (r() * 2 - 1) * 0.9,
    y: (r() * 2 - 1) * 0.9,
    r: 0.004 + r() * 0.012,
    c: r() < 0.2 ? "#8ecbff" : r() < 0.5 ? "#ffe1a6" : "#fff6e8",
  }));

  const CITY_BLOCKS = rngArray(12, 90, (r) => ({
    x: (r() * 2 - 1) * 0.82,
    y: (r() * 2 - 1) * 0.82,
    w: 0.04 + r() * 0.08,
    h: 0.04 + r() * 0.07,
    t: 0.35 + r() * 0.65,
    hue: r() < 0.12 ? 42 : 210 + r() * 30,
  }));

  const CARS = rngArray(3, 28, (r) => ({
    lane: (r() * 4) | 0,
    s: r(),
    speed: 0.04 + r() * 0.08,
    c: r() < 0.5 ? "#ffd36a" : "#f4f0e6",
  }));

  const ORGANELLES = rngArray(5, 14, (r) => ({
    x: (r() * 2 - 1) * 0.35,
    y: (r() * 2 - 1) * 0.35,
    a: 0.06 + r() * 0.08,
    b: 0.03 + r() * 0.04,
    p: r() * Math.PI * 2,
    kind: r() < 0.45 ? "mito" : "vesicle",
  }));

  const ATOMS_AROUND = rngArray(8, 9, (r, i) => ({
    a: (i / 9) * Math.PI * 2 + r() * 0.2,
    d: 0.55 + r() * 0.28,
    z: r() < 0.3 ? 8 : 6,
  }));

  function viewCover(R, env) {
    if (!env || !env.W || !env.H) return 1;
    return (R * 2) / Math.min(env.W, env.H);
  }

  /** Full-viewport wash with no circular/square edge. Only when this node fills the screen. */
  function fillBg(ctx, R, c0, c1, env) {
    const W = (env && env.W) || ctx.canvas.clientWidth || 800;
    const H = (env && env.H) || ctx.canvas.clientHeight || 600;
    const cover = (R * 2) / Math.min(W, H);
    const fade = smoothstep(0.55, 1.05, cover);
    if (fade < 0.01) return;
    ctx.save();
    ctx.globalAlpha *= fade;
    const s = Math.max(W, H);
    const g = ctx.createRadialGradient(0, 0, s * 0.08, 0, 0, s * 0.95);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.restore();
  }

  function softBody(ctx, R, color) {
    if (R < 3) return;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    g.addColorStop(0, color);
    g.addColorStop(0.55, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
  }

  function clipCircle(ctx, r, fn) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(r, 0.5), 0, Math.PI * 2);
    ctx.clip();
    fn();
    ctx.restore();
  }

  function drawUniverse(ctx, R, t, env) {
    fillBg(ctx, R, "#14081f", "#05030a", env);
    const exp = motion(YEAR * 1e10, t, env.rate);
    const stretch = 1 + (exp.amount ? exp.phase * 0.02 : 0);

    ctx.save();
    ctx.scale(stretch, stretch);
    ctx.globalCompositeOperation = "lighter";
    for (const f of WEB) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(170, 140, 255," + (0.12 + f.b * 0.25) + ")";
      ctx.lineWidth = Math.max(0.6, f.w * R * 0.004);
      const p0 = f.pts[0];
      ctx.moveTo(p0.x * R, p0.y * R);
      for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i].x * R, f.pts[i].y * R);
      ctx.stroke();
    }
    for (const g of GALAXIES) {
      const pulse = 0.7 + 0.3 * Math.sin(env.wall * 0.4 + g.spin);
      ctx.fillStyle = "hsla(" + g.hue + ",70%,70%," + (0.35 * pulse) + ")";
      ctx.beginPath();
      ctx.ellipse(g.x * R, g.y * R, g.r * R, g.r * R * (0.35 + g.type * 0.5), g.spin, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
    glow(ctx, 0, 0, R * 0.18, "rgba(120,80,255,0.18)", "rgba(240,220,255,0.35)");
  }

  function drawSupercluster(ctx, R, t, env) {
    fillBg(ctx, R, "#0c0820", "#05040c", env);
    const rot = motion(YEAR * 5e9, t, env.rate);
    ctx.save();
    ctx.rotate(rot.phase * Math.PI * 2 * 0.15);
    for (let i = 0; i < 28; i++) {
      const a = hash2(i, 3) * Math.PI * 2;
      const d = (0.15 + hash2(i, 9) * 0.7) * R;
      const rr = (0.03 + hash2(i, 11) * 0.07) * R;
      glow(ctx, Math.cos(a) * d, Math.sin(a) * d, rr * 2.2, "rgba(160,180,255,0.14)");
      disc(ctx, Math.cos(a) * d * 0.2, Math.sin(a) * d * 0.15, rr * 0.15, "rgba(230,230,255,0.5)");
    }
    ctx.restore();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + t * 1e-18;
      ctx.strokeStyle = "rgba(180,160,255,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, R * (0.25 + i * 0.1), R * (0.12 + i * 0.05), a, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawGalaxy(ctx, R, t, env) {
    fillBg(ctx, R, "#07060e", "#030208", env);
    const rot = motion(YEAR * 2.3e8, t, env.rate);
    const ang = rot.phase * Math.PI * 2;

    ctx.save();
    ctx.translate(-R * 0.58, R * 0.1);
    ctx.rotate(ang);
    glow(ctx, 0, 0, R * 1.05, "rgba(80,60,140,0.18)");

    for (let arm = 0; arm < 4; arm++) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(200, 210, 255, 0.09)";
      ctx.lineWidth = Math.max(1, R * 0.045);
      for (let i = 0; i < 80; i++) {
        const u = i / 79;
        const rad = R * (0.08 + u * 0.88);
        const th = arm * (Math.PI / 2) + u * 3.4;
        const x = Math.cos(th) * rad;
        const y = Math.sin(th) * rad * 0.72;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const n = Math.min(520, 80 + (R | 0));
    for (let i = 0; i < n; i++) {
      const u = hash2(i, 1);
      const arm = (i % 4) * (Math.PI / 2);
      const rad = R * (0.06 + Math.pow(hash2(i, 2), 0.7) * 0.9);
      const th = arm + Math.pow(rad / R, 1.1) * 3.4 + (hash2(i, 3) - 0.5) * 0.35;
      const x = Math.cos(th) * rad;
      const y = Math.sin(th) * rad * 0.72;
      const s = 0.4 + hash2(i, 4) * 1.6;
      ctx.fillStyle = hash2(i, 5) < 0.12 ? "rgba(255,210,160,0.9)" : "rgba(230,235,255,0.75)";
      ctx.fillRect(x, y, s, s);
    }

    glow(ctx, 0, 0, R * 0.22, "rgba(255, 210, 140, 0.35)", "rgba(255, 244, 220, 0.8)");
    disc(ctx, 0, 0, R * 0.045, "#fff6d8");

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 0.95, R * 0.68, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawStarfield(ctx, R, t, env) {
    fillBg(ctx, R, "#070712", "#020208", env);
    const tw = env.wall;
    for (const s of NEIGHBOR_STARS) {
      if (Math.abs(s.x) < 0.05 && Math.abs(s.y) < 0.05) continue;
      const a = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(tw * 1.3 + s.x * 8));
      glow(ctx, s.x * R, s.y * R, s.r * R * 3, "rgba(255,240,210," + 0.12 * a + ")");
      disc(ctx, s.x * R, s.y * R, Math.max(1.2, s.r * R), s.c);
    }
  }

  function keplerPos(a, e, period, t, phase) {
    const m = motion(period, t, 1);
    const ang = (m.phase + (phase || 0)) * Math.PI * 2;
    return { x: Math.cos(ang) * a, y: Math.sin(ang) * a * (1 - e * 0.15) };
  }

  function drawSolarSystem(ctx, R, t, env) {
    fillBg(ctx, R, "#0a0a12", "#030308", env);
    const m2 = (R * 2) / 3.2e12;
    const earth = keplerPos(AU, 0.017, YEAR, t, 0);
    const sunX = -earth.x * m2;
    const sunY = -earth.y * m2;
    const sunR = Math.max(4, 6.96e8 * m2);

    const planets = [
      { a: 0.39 * AU, p: YEAR * 0.241, col: "#c9b8a6", rad: 2.4e6, e: 0.2 },
      { a: 0.72 * AU, p: YEAR * 0.615, col: "#e8d09a", rad: 6.0e6, e: 0.007 },
      { a: 1.52 * AU, p: YEAR * 1.88, col: "#d07a52", rad: 3.4e6, e: 0.09 },
      { a: 5.2 * AU, p: YEAR * 11.86, col: "#d9b48c", rad: 7.0e7, e: 0.05 },
    ];

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (const pl of planets) {
      ctx.beginPath();
      ctx.ellipse(sunX, sunY, pl.a * m2, pl.a * m2 * 0.98, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    glow(ctx, sunX, sunY, Math.max(sunR * 8, 28), "rgba(255,170,40,0.22)", "rgba(255,230,140,0.7)");
    disc(ctx, sunX, sunY, Math.max(sunR, 16), "#ffd27a");

    for (const pl of planets) {
      const pos = keplerPos(pl.a, pl.e, pl.p, t, 0.1);
      const x = sunX + pos.x * m2;
      const y = sunY + pos.y * m2;
      const pr = Math.max(pl.a === AU ? 9 : 5, pl.rad * m2 * 0.35);
      disc(ctx, x, y, pr, pl.col);
    }

    ctx.strokeStyle = "rgba(110,180,230,0.35)";
    ctx.beginPath();
    ctx.ellipse(sunX, sunY, AU * m2, AU * m2 * 0.98, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawInnerSystem(ctx, R, t, env) {
    fillBg(ctx, R, "#0b0c14", "#04050a", env);
    const m2 = (R * 2) / 4.6e11;
    const earth = keplerPos(AU, 0.017, YEAR, t, 0);
    const sunX = -earth.x * m2;
    const sunY = -earth.y * m2;
    glow(ctx, sunX, sunY, Math.max(28, 6.96e8 * m2 * 10), "rgba(255,160,40,0.28)");
    disc(ctx, sunX, sunY, Math.max(14, 6.96e8 * m2), "#ffcc66");
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath();
    ctx.ellipse(sunX, sunY, AU * m2, AU * m2 * 0.985, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawEarthSpace(ctx, R, t, env) {
    fillBg(ctx, R, "#070814", "#020208", env);
    const sun = keplerPos(AU, 0.017, YEAR, t, 0);
    const m2 = (R * 2) / 4.5e10;
    const sunX = -sun.x * m2;
    const sunY = -sun.y * m2;
    glow(ctx, sunX, sunY, Math.max(40, R * 0.35), "rgba(255,170,60,0.2)", "rgba(255,220,120,0.45)");
    disc(ctx, sunX, sunY, Math.max(8, R * 0.04), "#ffd078");
    const moon = motion(DAY * 27.3, t, env.rate);
    const md = Math.min(R * 0.55, 3.84e8 * m2 * 8);
    disc(
      ctx,
      Math.cos(moon.phase * 6.283) * md,
      Math.sin(moon.phase * 6.283) * md,
      Math.max(3, R * 0.03),
      "#cfc8bb"
    );
  }

  function drawEarthMoon(ctx, R, t, env) {
    fillBg(ctx, R, "#05060c", "#020208", env);
    const moon = motion(DAY * 27.3, t, env.rate);
    const a = moon.phase * Math.PI * 2;
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 0.72, R * 0.7, 0.15, 0, Math.PI * 2);
    ctx.stroke();
    const mx = Math.cos(a) * R * 0.72;
    const my = Math.sin(a) * R * 0.7;
    glow(ctx, mx, my, R * 0.08, "rgba(200,200,220,0.15)");
    disc(ctx, mx, my, R * 0.06, "#c9c3b6");
    disc(ctx, mx - R * 0.02, my - R * 0.01, R * 0.018, "rgba(90,90,100,0.55)");
    disc(ctx, mx + R * 0.015, my + R * 0.01, R * 0.012, "rgba(70,70,80,0.5)");
  }

  function blob(ctx, x, y, rx, ry, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function densifyRing(pts, stepDeg) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      out.push(a);
      let dlon = b[0] - a[0];
      const dlat = b[1] - a[1];
      if (dlon > 180) dlon -= 360;
      if (dlon < -180) dlon += 360;
      const dist = Math.hypot(dlon, dlat);
      const steps = Math.max(1, Math.ceil(dist / stepDeg));
      for (let k = 1; k < steps; k++) {
        const t = k / steps;
        out.push([a[0] + dlon * t, a[1] + dlat * t]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  function projectSphere(lon, lat, rotDeg) {
    const la = (lat * Math.PI) / 180;
    const lo = ((lon - rotDeg) * Math.PI) / 180;
    return {
      x: Math.cos(la) * Math.sin(lo),
      y: Math.sin(la),
      z: Math.cos(la) * Math.cos(lo),
    };
  }

  function clipFront(pts, rotDeg) {
    const raw = densifyRing(pts, 2);
    const proj = [];
    for (let i = 0; i < raw.length; i++) proj.push(projectSphere(raw[i][0], raw[i][1], rotDeg));
    const out = [];
    const EPS = 0.03;
    const n = proj.length;
    for (let i = 0; i < n - 1; i++) {
      const a = proj[i];
      const b = proj[i + 1];
      const aIn = a.z >= EPS;
      const bIn = b.z >= EPS;
      if (aIn) out.push(a);
      if (aIn !== bIn) {
        const t = (EPS - a.z) / (b.z - a.z);
        out.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          z: EPS,
        });
      }
    }
    return out;
  }

  function fillLonLat(ctx, R, rotDeg, rings, fill, stroke) {
    for (let r = 0; r < rings.length; r++) {
      const vis = clipFront(rings[r], rotDeg);
      if (vis.length < 4) continue;
      ctx.beginPath();
      ctx.moveTo(vis[0].x * R, -vis[0].y * R);
      for (let i = 1; i < vis.length; i++) ctx.lineTo(vis[i].x * R, -vis[i].y * R);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke && R > 24) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = Math.max(0.8, R * 0.0075);
        ctx.stroke();
      }
    }
  }

  function projectFlat(lon, lat, lon0, lat0, kx, ky) {
    const x = (lon - lon0) * Math.cos((lat * Math.PI) / 180) * kx;
    const y = -(lat - lat0) * ky;
    return [x, y];
  }

  function fillFlat(ctx, rings, lon0, lat0, kx, ky, s, fill, stroke) {
    for (let r = 0; r < rings.length; r++) {
      const pts = rings[r];
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = projectFlat(pts[i][0], pts[i][1], lon0, lat0, kx, ky);
        if (i === 0) ctx.moveTo(p[0] * s, p[1] * s);
        else ctx.lineTo(p[0] * s, p[1] * s);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = Math.max(1.2, s * 0.01);
        ctx.stroke();
      }
    }
  }

  function strokeFlat(ctx, pts, lon0, lat0, kx, ky, s, color, width) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = projectFlat(pts[i][0], pts[i][1], lon0, lat0, kx, ky);
      if (i === 0) ctx.moveTo(p[0] * s, p[1] * s);
      else ctx.lineTo(p[0] * s, p[1] * s);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }

  function fillLocal(ctx, pts, s, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * s, pts[0][1] * s);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * s, pts[i][1] * s);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(1, s * 0.008);
      ctx.stroke();
    }
  }

  // Coastlines in lon/lat. Iconic silhouettes, not cartographic accuracy.
  const AFRICA = [
    [-17.0, 21.0], [-16.3, 19.0], [-16.8, 16.0], [-17.5, 14.7], [-16.6, 12.4],
    [-15.0, 11.0], [-13.0, 8.5], [-8.0, 4.5], [-5.0, 5.0], [-2.0, 5.2],
    [0.5, 6.0], [4.5, 5.0], [8.5, 4.4], [9.8, 3.2], [9.5, 0.5],
    [9.0, 1.5], [11.5, -5.0], [12.3, -6.0], [13.5, -12.2], [12.0, -17.0],
    [14.5, -22.0], [16.5, -28.5], [18.4, -34.0], [18.5, -34.8], [20.0, -34.8],
    [22.2, -34.2], [26.0, -33.8], [28.5, -33.0], [32.6, -28.6], [35.9, -18.5],
    [40.6, -15.0], [40.5, -12.5], [39.3, -10.0], [40.4, -3.0], [41.8, -1.2],
    [44.0, 1.5], [48.5, 5.2], [51.4, 10.5], [51.2, 11.8], [43.2, 12.6],
    [39.6, 15.8], [38.2, 18.0], [37.0, 21.5], [36.8, 23.5], [32.6, 23.0],
    [32.4, 29.8], [32.9, 31.2], [30.0, 31.5], [25.0, 31.8], [20.0, 32.4],
    [11.5, 33.0], [10.2, 36.8], [8.6, 37.0], [6.5, 37.0], [3.0, 37.0],
    [-2.2, 35.5], [-5.6, 36.0], [-9.8, 31.5], [-14.5, 26.5], [-16.0, 24.0],
    [-17.0, 21.0],
  ];
  const MADAGASCAR = [
    [49.2, -12.0], [50.5, -15.2], [47.6, -25.0], [45.2, -25.6],
    [43.3, -22.0], [43.7, -17.0], [47.0, -13.0], [49.2, -12.0],
  ];
  const EUROPE = [
    [-9.5, 39.0], [-9.0, 37.0], [-7.9, 37.0], [-6.0, 36.2], [-5.3, 36.7],
    [-1.8, 37.2], [0.0, 39.0], [3.1, 42.5], [3.2, 43.2], [-1.5, 43.3],
    [-1.8, 46.5], [-4.5, 48.5], [-4.8, 51.0], [-1.6, 49.5], [1.6, 49.4],
    [2.5, 51.1], [4.5, 51.5], [6.8, 53.4], [8.6, 54.0], [10.4, 54.4],
    [8.6, 48.6], [7.6, 47.6], [9.2, 45.5], [12.4, 45.4], [13.7, 45.6],
    [13.8, 42.4], [12.5, 41.2], [12.5, 38.1], [15.5, 38.1], [17.2, 40.8],
    [15.0, 41.3], [16.6, 43.5], [18.5, 42.5], [19.8, 40.2], [22.0, 37.0],
    [24.0, 38.2], [23.0, 40.6], [26.3, 40.1], [29.0, 41.0], [27.9, 42.0],
    [27.9, 44.2], [29.6, 45.2], [33.5, 46.0], [36.6, 45.3], [39.0, 47.2],
    [38.0, 51.0], [32.0, 51.5], [30.0, 54.0], [24.0, 54.5], [18.5, 54.8],
    [14.2, 53.9], [12.6, 55.6], [12.2, 56.3], [18.2, 57.4], [18.8, 63.2],
    [16.0, 68.5], [21.0, 70.4], [25.8, 71.1], [31.1, 70.4], [28.0, 66.5],
    [24.0, 65.0], [21.5, 61.0], [12.5, 58.9], [11.0, 59.0], [5.3, 62.0],
    [5.0, 58.9], [8.0, 58.0], [4.9, 52.9], [1.2, 51.0], [-1.8, 48.6],
    [-4.5, 48.0], [-9.5, 43.0], [-9.5, 39.0],
  ];
  const UK = [
    [-5.7, 50.1], [-4.0, 50.3], [-2.3, 50.6], [1.4, 51.4], [1.8, 52.6],
    [0.3, 53.6], [-0.3, 54.6], [-1.5, 55.0], [-1.8, 55.8], [-3.2, 56.0],
    [-5.7, 55.3], [-4.9, 56.8], [-6.2, 56.8], [-5.0, 58.6], [-3.4, 57.7],
    [-3.0, 58.6], [-6.2, 57.6], [-7.0, 57.2], [-6.2, 56.5], [-5.6, 54.6],
    [-4.8, 53.3], [-5.3, 51.8], [-5.7, 50.1],
  ];
  const IRELAND = [
    [-10.2, 51.6], [-8.2, 51.5], [-6.0, 52.1], [-6.4, 54.1], [-7.3, 55.3],
    [-8.2, 54.8], [-10.2, 54.4], [-9.8, 53.3], [-10.2, 51.6],
  ];
  const SICILY = [
    [12.4, 38.2], [15.6, 38.3], [15.1, 36.7], [12.5, 37.5], [12.4, 38.2],
  ];
  const ITALY = [
    [8.2, 44.1], [9.5, 44.2], [12.4, 45.5], [13.5, 43.6], [13.8, 42.4],
    [12.6, 41.2], [12.5, 38.15], [15.3, 38.15], [17.3, 40.5], [18.5, 40.1],
    [16.6, 38.9], [15.5, 38.2], [16.5, 41.1], [14.3, 42.4], [12.5, 44.1],
    [9.2, 44.0], [8.2, 44.1],
  ];
  const ASIA = [
    [27.5, 41.0], [29.0, 41.0], [32.0, 36.5], [36.0, 36.5], [36.2, 35.8],
    [40.0, 41.0], [40.2, 43.0], [40.0, 39.5], [44.0, 39.0], [48.5, 42.0],
    [49.0, 40.0], [50.0, 40.2], [52.0, 36.5], [56.0, 27.4], [57.0, 25.6],
    [61.5, 25.0], [67.0, 24.0], [68.0, 23.7], [69.6, 23.0], [72.8, 19.0],
    [72.8, 21.0], [77.0, 8.1], [80.3, 13.0], [80.2, 15.5], [85.0, 20.5],
    [87.0, 21.5], [88.4, 21.6], [91.9, 21.4], [94.5, 18.0], [97.5, 16.5],
    [98.6, 12.0], [100.0, 6.5], [103.5, 1.3], [104.5, 1.3], [109.5, 13.4],
    [109.0, 21.5], [107.0, 20.7], [108.0, 21.5], [114.2, 22.5], [117.0, 23.5],
    [121.5, 25.0], [121.9, 31.2], [122.0, 31.7], [121.0, 37.5], [117.5, 38.9],
    [122.0, 37.4], [126.5, 35.5], [129.4, 35.4], [129.3, 37.5], [128.0, 38.6],
    [126.0, 37.8], [124.4, 40.0], [125.3, 40.2], [128.0, 41.5], [129.8, 42.0],
    [130.7, 42.6], [133.0, 42.8], [141.0, 45.5], [145.0, 44.0], [142.0, 46.0],
    [143.0, 49.0], [140.0, 53.0], [138.0, 54.5], [156.5, 51.0], [163.0, 56.0],
    [161.0, 60.0], [170.0, 66.0], [180.0, 69.0], [170.0, 70.0], [140.0, 73.0],
    [100.0, 76.0], [80.0, 73.0], [70.0, 70.0], [60.0, 70.0], [50.0, 68.0],
    [44.0, 65.0], [42.0, 47.5], [40.0, 43.5], [36.6, 45.3], [27.5, 41.0],
  ];
  const ARABIA = [
    [32.5, 31.2], [34.5, 31.3], [35.0, 29.5], [36.0, 27.5], [39.0, 20.0],
    [43.5, 12.6], [51.0, 12.5], [54.0, 17.0], [56.4, 25.6], [55.0, 26.0],
    [48.5, 27.8], [48.0, 29.5], [47.0, 29.8], [39.0, 22.0], [36.8, 24.0],
    [34.9, 29.4], [32.5, 31.2],
  ];
  const INDIA = [
    [68.2, 23.7], [69.6, 22.8], [72.7, 21.0], [72.8, 18.9], [73.0, 16.0],
    [77.0, 8.1], [80.3, 13.3], [80.3, 15.8], [82.5, 16.5], [87.0, 21.5],
    [88.4, 21.6], [80.2, 22.0], [74.0, 22.5], [70.0, 22.8], [68.2, 23.7],
  ];
  const SRI_LANKA = [
    [79.7, 9.8], [81.8, 7.5], [80.2, 6.0], [79.8, 8.0], [79.7, 9.8],
  ];
  const NAMERICA = [
    [-168.0, 65.6], [-165.0, 64.5], [-141.0, 60.0], [-136.0, 59.0],
    [-130.0, 55.0], [-127.0, 50.5], [-124.6, 48.3], [-124.4, 43.0],
    [-124.0, 40.4], [-122.0, 37.0], [-120.0, 34.5], [-117.1, 32.5],
    [-115.0, 32.5], [-114.5, 31.0], [-112.0, 25.0], [-109.4, 23.4],
    [-105.0, 21.5], [-97.4, 25.8], [-97.2, 26.0], [-94.0, 29.2],
    [-90.0, 29.2], [-89.0, 29.0], [-87.5, 30.3], [-84.3, 30.0],
    [-82.5, 27.5], [-81.3, 25.2], [-80.1, 25.4], [-80.0, 26.8],
    [-81.5, 31.0], [-76.0, 35.2], [-75.5, 37.5], [-74.0, 40.5],
    [-70.0, 41.8], [-70.0, 43.0], [-67.0, 44.8], [-66.0, 44.6],
    [-64.0, 45.0], [-60.0, 47.0], [-53.0, 47.5], [-55.6, 51.5],
    [-57.0, 51.0], [-62.0, 58.5], [-64.2, 60.3], [-77.9, 62.5],
    [-85.0, 65.0], [-88.0, 64.0], [-92.0, 62.5], [-94.8, 60.0],
    [-95.0, 69.0], [-88.0, 74.0], [-80.0, 73.0], [-85.0, 70.0],
    [-105.0, 68.5], [-110.0, 68.0], [-128.0, 70.0], [-140.0, 69.5],
    [-156.0, 71.0], [-166.0, 68.5], [-168.0, 65.6],
  ];
  const BAJA = [
    [-117.1, 32.5], [-114.5, 32.5], [-109.4, 23.4], [-112.2, 24.8],
    [-114.8, 29.0], [-117.1, 32.5],
  ];
  const CUBA = [
    [-84.9, 21.9], [-77.2, 20.2], [-74.1, 20.2], [-77.8, 21.6], [-84.9, 21.9],
  ];
  const GREENLAND = [
    [-73.0, 78.0], [-60.0, 76.0], [-47.0, 72.0], [-43.0, 60.0],
    [-44.0, 60.0], [-50.0, 64.5], [-53.0, 71.0], [-68.0, 76.0], [-73.0, 78.0],
  ];
  const SAMERICA = [
    [-80.0, 8.4], [-77.4, 7.5], [-76.0, 9.5], [-71.6, 12.2], [-68.2, 10.6],
    [-61.4, 8.6], [-60.0, 8.4], [-51.6, 4.4], [-50.0, 1.8], [-47.9, -0.5],
    [-44.0, -2.5], [-38.5, -4.0], [-34.8, -7.0], [-35.2, -9.0],
    [-39.0, -14.0], [-39.0, -16.0], [-40.5, -20.3], [-40.6, -22.4],
    [-43.6, -23.0], [-48.5, -25.5], [-48.7, -28.4], [-53.4, -34.0],
    [-56.0, -35.0], [-58.4, -38.8], [-62.3, -39.0], [-65.3, -43.3],
    [-67.2, -46.0], [-68.6, -50.0], [-68.4, -52.4], [-71.2, -53.0],
    [-73.6, -51.6], [-75.6, -46.8], [-73.6, -41.8], [-74.0, -36.8],
    [-71.6, -33.6], [-71.4, -29.8], [-70.4, -23.4], [-70.3, -18.3],
    [-76.2, -14.1], [-79.0, -8.0], [-81.3, -5.0], [-80.4, -2.4],
    [-80.1, 0.8], [-77.4, 1.4], [-79.0, 8.0], [-80.0, 8.4],
  ];
  const AUSTRALIA = [
    [114.0, -22.0], [113.6, -24.8], [115.0, -30.5], [115.0, -34.4],
    [118.5, -35.0], [124.0, -33.0], [129.0, -31.7], [133.0, -32.4],
    [136.0, -35.3], [138.0, -36.0], [139.7, -37.5], [141.0, -38.3],
    [146.3, -39.0], [147.0, -38.3], [149.0, -37.8], [150.2, -37.2],
    [153.6, -28.2], [153.5, -25.0], [146.3, -18.7], [145.3, -14.9],
    [143.5, -12.6], [142.5, -10.7], [141.6, -12.6], [136.0, -12.2],
    [130.0, -12.4], [126.0, -14.0], [122.0, -16.5], [114.0, -22.0],
  ];
  const TASMANIA = [
    [144.6, -40.7], [148.3, -40.8], [147.3, -43.6], [144.8, -43.5], [144.6, -40.7],
  ];
  const NZ_NORTH = [
    [172.7, -34.4], [175.0, -36.0], [178.5, -37.6], [177.0, -39.0],
    [174.8, -41.3], [172.7, -34.4],
  ];
  const NZ_SOUTH = [
    [172.6, -40.6], [174.0, -41.6], [170.5, -45.5], [166.4, -46.2],
    [166.7, -45.0], [172.6, -40.6],
  ];
  const JAPAN = [
    [130.8, 31.4], [131.4, 31.4], [132.5, 33.2], [135.0, 34.6],
    [136.0, 34.6], [139.8, 35.5], [140.9, 38.3], [141.4, 40.4],
    [141.5, 41.5], [145.8, 43.4], [145.1, 44.0], [141.4, 43.0],
    [140.3, 41.5], [139.8, 35.7], [138.0, 34.8], [131.3, 31.6], [130.8, 31.4],
  ];
  const ICELAND = [
    [-24.5, 63.4], [-14.5, 64.4], [-13.5, 65.1], [-16.0, 66.5],
    [-22.0, 66.0], [-24.5, 63.4],
  ];
  const ANTARCTICA = [
    [-180, -72], [-150, -76], [-90, -73], [-60, -64], [-45, -60],
    [0, -70], [40, -68], [80, -70], [120, -76], [160, -72], [180, -72],
    [180, -90], [-180, -90], [-180, -72],
  ];
  const SAHARA = [
    [-16.5, 18.0], [10.0, 16.0], [25.0, 18.0], [32.0, 22.0], [32.0, 30.5],
    [25.0, 31.5], [10.0, 32.0], [-5.0, 31.0], [-16.0, 27.0], [-16.5, 18.0],
  ];
  const CONGO_BASIN = [
    [10.0, 4.0], [18.0, 5.0], [27.0, 3.5], [28.0, -2.0], [25.0, -8.0],
    [16.0, -6.0], [12.0, -4.0], [10.0, 0.0], [10.0, 4.0],
  ];

  function earthFacingDeg(t, env) {
    const spin = motion(DAY, t, env.rate);
    const close = env && env.viewLog != null ? smoothstep(7.85, 6.85, env.viewLog) : 0;
    return lerp(spin.phase * 360, 18, close);
  }

  function drawEarth(ctx, R, t, env) {
    glow(ctx, 0, 0, R * 1.28, "rgba(70,150,255,0.22)", "rgba(140,200,255,0.3)");
    if (spriteReady(IMG.earth)) {
      clipCircle(ctx, R, function () {
        ctx.drawImage(IMG.earth, -R, -R, R * 2, R * 2);
        const night = ctx.createLinearGradient(-R, 0, R * 0.15, 0);
        night.addColorStop(0, "rgba(4,10,28,0.42)");
        night.addColorStop(0.46, "rgba(4,10,28,0)");
        ctx.fillStyle = night;
        ctx.fillRect(-R, -R, R * 2, R * 2);
      });
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(170,215,255,0.4)";
      ctx.lineWidth = Math.max(1, R * 0.014);
      ctx.stroke();
      return;
    }
    const deg = earthFacingDeg(t, env);
    clipCircle(ctx, R, function () {
      const ocean = ctx.createLinearGradient(-R, -R * 0.25, R, R * 0.45);
      ocean.addColorStop(0, "#08325f");
      ocean.addColorStop(0.45, "#1a73b8");
      ocean.addColorStop(1, "#0a2c50");
      ctx.fillStyle = ocean;
      ctx.fillRect(-R, -R, R * 2, R * 2);

      if (R > 48) {
        ctx.strokeStyle = "rgba(200,230,255,0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, R * 0.999, R * 0.18, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -R);
        ctx.lineTo(0, R);
        ctx.stroke();
      }

      const land = "#3c8f45";
      const edge = "#1f5a2c";
      fillLonLat(ctx, R, deg, [AFRICA, MADAGASCAR], land, edge);
      fillLonLat(ctx, R, deg, [EUROPE, UK, IRELAND, ITALY, SICILY, ICELAND], "#4ca056", edge);
      fillLonLat(ctx, R, deg, [ASIA, INDIA, SRI_LANKA, JAPAN], "#3a8442", edge);
      fillLonLat(ctx, R, deg, [ARABIA], "#c2a05c", edge);
      fillLonLat(ctx, R, deg, [NAMERICA, BAJA, CUBA, GREENLAND], "#4aa057", edge);
      fillLonLat(ctx, R, deg, [SAMERICA], "#3b8a44", edge);
      fillLonLat(ctx, R, deg, [AUSTRALIA, TASMANIA, NZ_NORTH, NZ_SOUTH], "#6a9a40", edge);
      fillLonLat(ctx, R, deg, [ANTARCTICA], "#eef3f6", "#c5d0d8");
      fillLonLat(ctx, R, deg, [GREENLAND], "#e6eef2", null);

      const n = projectSphere(0, 88, deg);
      if (n.z > 0.05) {
        ctx.fillStyle = "#eef3f6";
        ctx.beginPath();
        ctx.ellipse(n.x * R, -n.y * R, R * 0.22 * n.z, R * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      const night = ctx.createLinearGradient(-R, 0, R * 0.15, 0);
      night.addColorStop(0, "rgba(4,10,28,0.58)");
      night.addColorStop(0.46, "rgba(4,10,28,0)");
      ctx.fillStyle = night;
      ctx.fillRect(-R, -R, R * 2, R * 2);
    });
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(170,215,255,0.45)";
    ctx.lineWidth = Math.max(1, R * 0.016);
    ctx.stroke();
  }

  function drawContinent(ctx, R, t, env) {
    if (viewCover(R, env) > 1.18) fillBg(ctx, R, "#1a73b8", "#0c3d6a", env);
    if (drawSprite(ctx, IMG.africa, R * 2.05, R * 2.05)) return;
    const lon0 = 20;
    const lat0 = 8;
    const kx = 1 / 42;
    const ky = 1 / 44;
    const coast = "#1c4f28";
    fillFlat(ctx, [AFRICA], lon0, lat0, kx, ky, R, "#3f9448", coast);
    ctx.save();
    fillFlat(ctx, [AFRICA], lon0, lat0, kx, ky, R, "rgba(0,0,0,0)", null);
    ctx.clip();
    fillFlat(ctx, [SAHARA], lon0, lat0, kx, ky, R, "#d2b06a", null);
    fillFlat(ctx, [CONGO_BASIN], lon0, lat0, kx, ky, R, "#2a6c34", null);
    ctx.restore();
    fillFlat(ctx, [MADAGASCAR], lon0, lat0, kx, ky, R, "#3f9448", coast);
    fillFlat(ctx, [EUROPE, ITALY, SICILY, UK, IRELAND], lon0, lat0, kx, ky, R, "#4ca056", coast);
    fillFlat(ctx, [ARABIA], lon0, lat0, kx, ky, R, "#c2a05c", coast);
    fillFlat(
      ctx,
      [[[14, -22], [26, -22], [28, -28], [20, -30], [16, -26], [14, -22]]],
      lon0,
      lat0,
      kx,
      ky,
      R,
      "#c4a45a",
      null
    );

    strokeFlat(
      ctx,
      [[31.2, 31.2], [31.0, 27.0], [32.5, 22.0], [32.6, 15.6], [31.5, 12.0], [32.5, 6.0]],
      lon0,
      lat0,
      kx,
      ky,
      R,
      "#2a6aa8",
      Math.max(1.5, R * 0.012)
    );
    strokeFlat(
      ctx,
      [[-5, 16], [0, 16], [4, 14], [8, 12], [14, 6]],
      lon0,
      lat0,
      kx,
      ky,
      R,
      "#3a7ec8",
      Math.max(1.2, R * 0.01)
    );

    ctx.fillStyle = "#2a6aa8";
    const lakes = [
      [33.0, 1.0],
      [32.0, -2.0],
      [29.0, -6.0],
    ];
    for (let i = 0; i < lakes.length; i++) {
      const p = projectFlat(lakes[i][0], lakes[i][1], lon0, lat0, kx, ky);
      ctx.beginPath();
      ctx.ellipse(p[0] * R, p[1] * R, R * 0.035, R * 0.055, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (R > 70) {
      const cities = [
        [31.2, 30.0],
        [3.1, 6.5],
        [18.4, -33.9],
        [36.8, -1.3],
      ];
      ctx.fillStyle = "#d8c48a";
      for (let i = 0; i < cities.length; i++) {
        const p = projectFlat(cities[i][0], cities[i][1], lon0, lat0, kx, ky);
        ctx.fillRect(p[0] * R - 2, p[1] * R - 2, 4, 4);
      }
    }

    const clouds = motion(DAY * 4, t, env.rate);
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#fff";
    const cx = (clouds.phase - 0.5) * R * 0.9;
    ctx.beginPath();
    ctx.ellipse(cx, -0.28 * R, R * 0.16, R * 0.035, 0.15, 0, Math.PI * 2);
    ctx.ellipse(cx + R * 0.22, 0.18 * R, R * 0.12, R * 0.028, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCity(ctx, R, t, env) {
    fillBg(ctx, R, "#8ec4e8", "#8aaa78", env);

    ctx.fillStyle = "#8f8a84";
    ctx.fillRect(-R * 0.95, R * 0.08, R * 1.9, R * 0.04);
    ctx.fillRect(-R * 0.08, -R * 0.95, R * 0.04, R * 1.9);

    for (const b of CITY_BLOCKS) {
      if (Math.hypot(b.x, b.y) < 0.08) continue;
      ctx.fillStyle = "hsla(" + b.hue + ", 12%, " + (38 + b.t * 20) + "%, 0.95)";
      ctx.fillRect((b.x - b.w / 2) * R, (b.y - b.h / 2) * R, b.w * R, b.h * R);
      if (R > 80) {
        ctx.fillStyle = "rgba(255, 230, 150, 0.18)";
        ctx.fillRect((b.x - b.w / 2) * R + 2, (b.y - b.h / 2) * R + 2, b.w * R - 4, b.h * R - 4);
      }
    }

    const river = ctx.createLinearGradient(-R, 0, R, 0);
    river.addColorStop(0, "rgba(70,140,190,0.0)");
    river.addColorStop(0.5, "rgba(70,150,200,0.85)");
    river.addColorStop(1, "rgba(70,140,190,0.0)");
    ctx.strokeStyle = river;
    ctx.lineWidth = Math.max(3, R * 0.035);
    ctx.beginPath();
    ctx.moveTo(-R, R * 0.35);
    ctx.quadraticCurveTo(0, R * 0.1, R, R * 0.3);
    ctx.stroke();

    const traffic = motion(120, t, env.rate);
    for (const car of CARS) {
      const u = (car.s + traffic.phase * car.speed * 8) % 1;
      let x, y;
      if (car.lane < 2) {
        x = lerp(-R, R, u);
        y = (car.lane === 0 ? 0.06 : -0.02) * R;
      } else {
        y = lerp(-R, R, u);
        x = (car.lane === 2 ? 0.06 : -0.02) * R;
      }
      ctx.fillStyle = car.c;
      ctx.fillRect(x - 2, y - 1, Math.max(3, R * 0.012), Math.max(1.5, R * 0.006));
    }
  }

  function drawPlaza(ctx, R, t, env) {
    fillBg(ctx, R, "#9fd2f2", "#c8d9b8", env);

    ctx.fillStyle = "#8fb56a";
    ctx.beginPath();
    ctx.ellipse(0, R * 0.42, R * 1.1, R * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c9c2b3";
    ctx.beginPath();
    ctx.ellipse(0, R * 0.28, R * 0.42, R * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    tree(ctx, -R * 0.55, R * 0.18, R * 0.18, t);
    tree(ctx, R * 0.62, R * 0.22, R * 0.14, t + 1.7);

    const bird = motion(8, t, env.rate);
    const bx = lerp(-R * 0.8, R * 0.8, bird.phase);
    const by = -R * 0.35 + Math.sin(bird.phase * 18) * R * 0.04;
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx - 6, by);
    ctx.quadraticCurveTo(bx, by - 5 - Math.sin(env.wall * 12) * 3, bx + 6, by);
    ctx.stroke();

    const wind = Math.sin(env.wall * 0.7) * 0.04;
    ctx.save();
    ctx.translate(-R * 0.2, -R * 0.55);
    ctx.rotate(wind);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    blob(ctx, 0, 0, R * 0.16, R * 0.06, 0);
    blob(ctx, R * 0.12, 0.01 * R, R * 0.1, R * 0.05, 0.2);
    ctx.restore();
  }

  function tree(ctx, x, y, s, t) {
    const sway = Math.sin(t * 0.0002 + x) * 0.05;
    ctx.fillStyle = "#6a4a32";
    ctx.fillRect(x - s * 0.055, y, s * 0.11, s * 0.72);
    ctx.fillStyle = "#2f7a3a";
    disc(ctx, x + sway * s, y - s * 0.05, s * 0.28, "#2f7a3a");
    disc(ctx, x - s * 0.16 + sway * s, y + s * 0.02, s * 0.2, "#3b8c44");
    disc(ctx, x + s * 0.16 + sway * s, y + s * 0.04, s * 0.18, "#34843f");
    disc(ctx, x + sway * s, y - s * 0.22, s * 0.22, "#45a050");
  }

  function drawHuman(ctx, R, t, env) {
    const sway = 0.018 * Math.sin(env.wall * 0.7);
    if (spriteReady(IMG.human)) {
      ctx.save();
      ctx.rotate(sway);
      const h = R * 1.92;
      const w = h * (IMG.human.naturalWidth / IMG.human.naturalHeight);
      ctx.drawImage(IMG.human, -w * 0.5, -h * 0.5, w, h);
      ctx.restore();
      return;
    }
    const breath = motion(4.2, t, env.rate);
    const pulse = motion(0.85, t, env.rate);
    const chest = 1 + 0.035 * Math.sin(breath.phase * Math.PI * 2) * (breath.amount || (breath.frozen ? 0 : 1));
    const h = R * 1.78;
    const w = h * 0.23;
    const skin = "#e4b48c";
    const shirt = "#2a4a78";
    const pants = "#2b3038";

    ctx.save();
    ctx.rotate(sway);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.strokeStyle = pants;
    ctx.lineWidth = w * 0.3;
    ctx.beginPath();
    ctx.moveTo(-w * 0.16, h * 0.12);
    ctx.lineTo(-w * 0.22, h * 0.52);
    ctx.lineTo(-w * 0.2, h * 0.68);
    ctx.moveTo(w * 0.16, h * 0.12);
    ctx.lineTo(w * 0.24, h * 0.52);
    ctx.lineTo(w * 0.22, h * 0.68);
    ctx.stroke();

    ctx.fillStyle = "#3a2a22";
    ctx.beginPath();
    ctx.ellipse(-w * 0.2, h * 0.72, w * 0.16, w * 0.07, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.22, h * 0.72, w * 0.16, w * 0.07, -0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = skin;
    ctx.lineWidth = w * 0.2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.42 * chest, -h * 0.08);
    ctx.lineTo(-w * 0.78, h * 0.14);
    ctx.lineTo(-w * 0.86, h * 0.22);
    ctx.moveTo(w * 0.42 * chest, -h * 0.08);
    ctx.lineTo(w * 0.76, h * 0.12);
    ctx.lineTo(w * 0.84, h * 0.2);
    ctx.stroke();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(-w * 0.86, h * 0.24, w * 0.09, 0, Math.PI * 2);
    ctx.arc(w * 0.84, h * 0.22, w * 0.09, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.moveTo(-w * 0.48 * chest, -h * 0.16);
    ctx.lineTo(w * 0.48 * chest, -h * 0.16);
    ctx.lineTo(w * 0.38, h * 0.16);
    ctx.lineTo(-w * 0.38, h * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1e3a62";
    ctx.fillRect(-w * 0.06, -h * 0.16, w * 0.12, h * 0.28);

    ctx.fillStyle = skin;
    ctx.fillRect(-w * 0.08, -h * 0.22, w * 0.16, h * 0.08);

    disc(ctx, 0, -h * 0.38, w * 0.28, skin);
    ctx.fillStyle = "#3a2a22";
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.44, w * 0.3, w * 0.24, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    ctx.fillStyle = "#2a2018";
    ctx.beginPath();
    ctx.arc(-w * 0.09, -h * 0.38, w * 0.04, 0, Math.PI * 2);
    ctx.arc(w * 0.09, -h * 0.38, w * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c47a6a";
    ctx.lineWidth = Math.max(1, w * 0.04);
    ctx.beginPath();
    ctx.arc(0, -h * 0.34, w * 0.1, 0.15, Math.PI - 0.15);
    ctx.stroke();

    const beat = 0.5 + 0.5 * Math.sin(pulse.phase * Math.PI * 2);
    ctx.fillStyle = "rgba(200, 40, 60," + (0.28 + beat * 0.5) + ")";
    ctx.beginPath();
    ctx.moveTo(-w * 0.12, -h * 0.04);
    ctx.bezierCurveTo(-w * 0.12, -h * 0.1, 0, -h * 0.1, 0, -h * 0.04);
    ctx.bezierCurveTo(0, -h * 0.1, w * 0.12, -h * 0.1, w * 0.12, -h * 0.04);
    ctx.bezierCurveTo(w * 0.12, h * 0.04, 0, h * 0.08, 0, h * 0.08);
    ctx.bezierCurveTo(0, h * 0.08, -w * 0.12, h * 0.04, -w * 0.12, -h * 0.04);
    ctx.fill();

    ctx.restore();
  }
  function drawSkin(ctx, R, t, env) {
    fillBg(ctx, R, "#f0c4a4", "#d29a78", env);

    ctx.strokeStyle = "rgba(160,90,70,0.18)";
    ctx.lineWidth = 1;
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(-R, i * R * 0.12);
      ctx.bezierCurveTo(-R * 0.3, i * R * 0.12 + R * 0.04, R * 0.3, i * R * 0.12 - R * 0.03, R, i * R * 0.12);
      ctx.stroke();
    }

    const flow = motion(2.4, t, env.rate);
    for (let i = 0; i < 18; i++) {
      const y = ((hash2(i, 2) + flow.phase) % 1) * 2 - 1;
      const x = (hash2(i, 4) * 2 - 1) * 0.8;
      disc(ctx, x * R, y * R, R * 0.012, "rgba(180, 40, 50, 0.35)");
    }

    glow(ctx, 0, 0, R * 0.18, "rgba(255,180,140,0.15)");
  }

  function drawCell(ctx, R, t, env) {
    fillBg(ctx, R, "#163028", "#0b1a14", env);
    const wobble = motion(6, t, env.rate);
    const k = 1 + 0.018 * Math.sin(wobble.phase * Math.PI * 2);

    ctx.save();
    ctx.scale(k, 1 / k);

    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const rr = R * (0.88 + 0.04 * Math.sin(a * 3) + 0.02 * Math.sin(a * 7 + 1));
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr * 0.86;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(50, 140, 105, 0.28)";
    ctx.fill();
    ctx.strokeStyle = "rgba(170, 235, 190, 0.85)";
    ctx.lineWidth = Math.max(3, R * 0.034);
    ctx.stroke();
    ctx.strokeStyle = "rgba(40, 90, 70, 0.55)";
    ctx.lineWidth = Math.max(1.2, R * 0.012);
    ctx.stroke();

    ctx.strokeStyle = "rgba(180,255,200,0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.22, Math.sin(a) * R * 0.18);
      ctx.lineTo(Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.68);
      ctx.stroke();
    }

    const stream = motion(14, t, env.rate);
    for (let i = 0; i < 16; i++) {
      const u = (hash2(i, 1) + stream.phase) % 1;
      const a = u * Math.PI * 2 + hash2(i, 2);
      const d = 0.32 + hash2(i, 3) * 0.42;
      disc(ctx, Math.cos(a) * d * R, Math.sin(a) * d * R * 0.85, R * 0.016, "rgba(220,255,180,0.45)");
    }

    for (const o of ORGANELLES) {
      const p = motion(9 + o.p * 5, t, env.rate);
      const ox = o.x * R + Math.cos(p.phase * 6.28) * R * 0.05;
      const oy = o.y * R + Math.sin(p.phase * 6.28) * R * 0.04;
      if (o.kind === "mito") {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(o.p);
        ctx.fillStyle = "#c45a42";
        ctx.beginPath();
        ctx.ellipse(0, 0, o.a * R, o.b * R, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#7a2e22";
        ctx.lineWidth = Math.max(1, o.b * R * 0.18);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 200, 160, 0.7)";
        ctx.lineWidth = Math.max(1, o.b * R * 0.12);
        for (let k = -2; k <= 2; k++) {
          ctx.beginPath();
          ctx.moveTo(-o.a * R * 0.55, k * o.b * R * 0.28);
          ctx.lineTo(o.a * R * 0.55, k * o.b * R * 0.28);
          ctx.stroke();
        }
        ctx.restore();
      } else {
        disc(ctx, ox, oy, o.a * R * 0.42, "rgba(240, 220, 120, 0.6)");
      }
    }
    ctx.restore();
  }
  function drawNucleusCell(ctx, R, t, env) {
    fillBg(ctx, R, "#2a1830", "#120814", env);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.92, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(220,160,200,0.5)";
    ctx.lineWidth = Math.max(2, R * 0.025);
    ctx.stroke();

    const drift = motion(20, t, env.rate);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + drift.phase * 2;
      ctx.strokeStyle = "rgba(180, 80, 140, 0.55)";
      ctx.lineWidth = Math.max(1.5, R * 0.02);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * R * 0.15, Math.sin(a) * R * 0.15, R * 0.28, a, a + 2.2);
      ctx.stroke();
    }
  }

  function drawDNA(ctx, R, t, env) {
    fillBg(ctx, R, "#1a1020", "#0a0610", env);
    const rot = motion(2.8, t, env.rate);
    const turns = 7;
    ctx.lineCap = "round";
    for (let strand = 0; strand < 2; strand++) {
      ctx.beginPath();
      ctx.strokeStyle = strand ? "#5ad0ff" : "#ff7aa2";
      ctx.lineWidth = Math.max(2, R * 0.045);
      for (let i = 0; i <= 80; i++) {
        const u = i / 80;
        const y = lerp(-R * 0.9, R * 0.9, u);
        const a = u * turns * Math.PI * 2 + rot.phase * Math.PI * 2 + strand * Math.PI;
        const x = Math.cos(a) * R * 0.28;
        const z = Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        if (i % 6 === 0) {
          ctx.stroke();
          ctx.beginPath();
          ctx.strokeStyle = z > 0 ? "rgba(240,220,120,0.8)" : "rgba(120,200,160,0.55)";
          ctx.lineWidth = Math.max(1, R * 0.02);
          const a2 = a + Math.PI;
          ctx.moveTo(x, y);
          ctx.lineTo(Math.cos(a2) * R * 0.28, y);
          ctx.stroke();
          ctx.beginPath();
          ctx.strokeStyle = strand ? "#5ad0ff" : "#ff7aa2";
          ctx.lineWidth = Math.max(2, R * 0.045);
          ctx.moveTo(x, y);
        }
      }
      ctx.stroke();
    }
  }

  function drawMolecule(ctx, R, t, env) {
    fillBg(ctx, R, "#101018", "#07070c", env);
    const vib = motion(0.08, t, env.rate);
    const j = (vib.amount ? Math.sin(vib.phase * Math.PI * 2) : 0) * R * 0.02;
    const atoms = [
      { x: 0, y: 0, c: "#888", r: 0.22 },
      { x: 0.42, y: 0.18, c: "#ff5a4a", r: 0.16 },
      { x: -0.38, y: 0.22, c: "#ff5a4a", r: 0.16 },
      { x: 0.08, y: -0.45, c: "#e8e8f0", r: 0.12 },
      { x: -0.18, y: -0.32, c: "#e8e8f0", r: 0.12 },
    ];
    ctx.strokeStyle = "rgba(230,230,240,0.55)";
    ctx.lineWidth = Math.max(2, R * 0.03);
    for (let i = 1; i < atoms.length; i++) {
      ctx.beginPath();
      ctx.moveTo(j, j * 0.4);
      ctx.lineTo(atoms[i].x * R + j * 0.3, atoms[i].y * R);
      ctx.stroke();
    }
    for (const a of atoms) {
      if (a.x === 0 && a.y === 0) continue;
      glow(ctx, a.x * R + j * 0.3, a.y * R, a.r * R * 1.8, withAlpha(a.c, 0.2));
      disc(ctx, a.x * R + j * 0.3, a.y * R, a.r * R, a.c);
    }
  }

  function drawAtom(ctx, R, t, env) {
    fillBg(ctx, R, "#0c1020", "#05060c", env);
    glow(ctx, 0, 0, R * 0.12, "rgba(120,180,255,0.15)");

    const shells = [
      { rx: 0.38, ry: 0.18, n: 2, p: 1.5e-16 },
      { rx: 0.72, ry: 0.42, n: 4, p: 6e-16 },
    ];
    for (let s = 0; s < shells.length; s++) {
      const sh = shells[s];
      ctx.strokeStyle = "rgba(120, 190, 255, 0.28)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, sh.rx * R, sh.ry * R, s * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, sh.rx * R, sh.ry * R, -s * 0.9, 0, Math.PI * 2);
      ctx.stroke();

      const m = motion(sh.p, t, env.rate);
      for (let i = 0; i < sh.n; i++) {
        const ph = m.phase * Math.PI * 2 + (i / sh.n) * Math.PI * 2;
        if (m.blur) {
          ctx.strokeStyle = "rgba(150,210,255,0.12)";
          ctx.lineWidth = Math.max(2, R * 0.02);
          ctx.beginPath();
          ctx.ellipse(0, 0, sh.rx * R, sh.ry * R, s * 0.7, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const x = Math.cos(ph) * sh.rx * R;
          const y = Math.sin(ph) * sh.ry * R;
          glow(ctx, x, y, R * 0.08, "rgba(120,200,255,0.35)");
          disc(ctx, x, y, Math.max(2, R * 0.028), "#bfe9ff");
        }
      }
    }
  }

  function drawNucleus(ctx, R, t, env) {
    fillBg(ctx, R, "#140c08", "#070402", env);
    const nucleons = [];
    const rng = mulberry32(42);
    for (let i = 0; i < 12; i++) {
      const a = rng() * Math.PI * 2;
      const d = rng() * 0.55;
      nucleons.push({
        x: Math.cos(a) * d,
        y: Math.sin(a) * d,
        p: rng() < 0.5,
        ph: rng() * 6.28,
      });
    }
    const vib = motion(1e-22, t, env.rate);
    for (const n of nucleons) {
      if (Math.hypot(n.x, n.y) < 0.16) continue;
      const jx = Math.cos(vib.phase * 6.28 + n.ph) * 0.04 * (vib.amount ? 1 : 0);
      const jy = Math.sin(vib.phase * 6.28 + n.ph * 1.3) * 0.04 * (vib.amount ? 1 : 0);
      const x = (n.x + jx) * R;
      const y = (n.y + jy) * R;
      glow(ctx, x, y, R * 0.22, n.p ? "rgba(255,80,60,0.25)" : "rgba(80,140,255,0.25)");
      disc(ctx, x, y, R * 0.16, n.p ? "#ff6a4a" : "#6aa0ff");
    }
  }

  function drawProton(ctx, R, t, env) {
    fillBg(ctx, R, "#1a0a10", "#080406", env);
    const m = motion(1e-23, t, env.rate);
    glow(ctx, 0, 0, R * 1.05, "rgba(255,80,80,0.16)");
    const pulse = 0.82 + 0.08 * Math.sin(m.phase * Math.PI * 2);
    ctx.beginPath();
    ctx.arc(0, 0, R * pulse * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 90, 70, 0.22)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 160, 120, 0.35)";
    ctx.lineWidth = Math.max(1, R * 0.03);
    ctx.stroke();
  }

  function drawQuarks(ctx, R, t, env) {
    fillBg(ctx, R, "#120614", "#050208", env);
    const m = motion(5e-24, t, env.rate);
    const cols = ["#ff3355", "#33ff88", "#4488ff"];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.sin(m.phase * 6.28 + i) * 0.35;
      const d = R * (0.42 + 0.08 * Math.sin(m.phase * 16 + i * 2));
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d * 0.85;
      for (let k = 0; k < 8; k++) {
        const u = k / 7;
        const sx = lerp(x, Math.cos(a + 2.1) * d, u);
        const sy = lerp(y, Math.sin(a + 2.1) * d * 0.85, u);
        const wiggle = Math.sin(u * 12 + m.phase * 20) * R * 0.04;
        disc(ctx, sx + wiggle, sy, R * 0.03, "rgba(255,220,80,0.35)");
      }
      glow(ctx, x, y, R * 0.4, withAlpha(cols[i], 0.4));
      disc(ctx, x, y, R * 0.2, cols[i]);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.85, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawStreet(ctx, R, t, env) {
    fillBg(ctx, R, "#8ec8ee", "#d5e6c9", env);
    ctx.fillStyle = "#5c5a58";
    ctx.fillRect(-R, R * 0.08, R * 2, R * 0.22);
    ctx.strokeStyle = "rgba(255,220,80,0.7)";
    ctx.setLineDash([R * 0.06, R * 0.05]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-R, R * 0.19);
    ctx.lineTo(R, R * 0.19);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#b9b3a8";
    ctx.fillRect(-R, R * 0.02, R * 2, R * 0.06);
    ctx.fillRect(-R, R * 0.3, R * 2, R * 0.06);

    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      const x = i * R * 0.32;
      ctx.fillStyle = i % 2 ? "#c8c0b0" : "#9aa7b4";
      ctx.fillRect(x - R * 0.12, -R * 0.55, R * 0.24, R * 0.58);
      ctx.fillStyle = "rgba(255, 230, 140, 0.35)";
      for (let w = 0; w < 3; w++) {
        for (let f = 0; f < 4; f++) {
          ctx.fillRect(x - R * 0.08 + w * R * 0.06, -R * 0.48 + f * R * 0.1, R * 0.035, R * 0.045);
        }
      }
    }

    const traffic = motion(8, t, env.rate);
    for (let i = 0; i < 6; i++) {
      const u = (i / 6 + traffic.phase) % 1;
      const x = lerp(-R, R, u);
      ctx.fillStyle = i % 2 ? "#e8c547" : "#f4f0e6";
      ctx.fillRect(x, R * 0.14, R * 0.07, R * 0.035);
    }
  }

  function drawBlock(ctx, R, t, env) {
    fillBg(ctx, R, "#8abfe0", "#7d9a68", env);
    ctx.fillStyle = "#6e6a66";
    ctx.fillRect(-R, -R * 0.04, R * 2, R * 0.08);
    ctx.fillRect(-R * 0.04, -R, R * 0.08, R * 2);
    for (let i = 0; i < 16; i++) {
      const x = (hash2(i, 1) * 2 - 1) * 0.75;
      const y = (hash2(i, 2) * 2 - 1) * 0.75;
      if (Math.hypot(x, y) < 0.12) continue;
      ctx.fillStyle = hash2(i, 3) < 0.3 ? "#8d97a4" : "#c2b8a6";
      ctx.fillRect((x - 0.08) * R, (y - 0.07) * R, 0.16 * R, 0.14 * R);
    }
    const cars = motion(20, t, env.rate);
    for (let i = 0; i < 10; i++) {
      const u = (hash2(i, 8) + cars.phase) % 1;
      ctx.fillStyle = "#ffd36a";
      ctx.fillRect(lerp(-R, R, u) - 3, (i % 2 ? -0.02 : 0.02) * R, 6, 3);
    }
  }

  function drawDistrict(ctx, R, t, env) {
    drawCity(ctx, R, t, env);
  }

  function drawRegion(ctx, R, t, env) {
    fillBg(ctx, R, "#7ec4f0", "#4e8a55", env);
    if (drawSprite(ctx, IMG.landscape, R * 2.08, R * 2.08)) return;

    ctx.fillStyle = "#3fa0d0";
    ctx.beginPath();
    ctx.moveTo(-R, R * 0.12);
    ctx.quadraticCurveTo(-R * 0.4, R * 0.42, 0, R * 0.28);
    ctx.quadraticCurveTo(R * 0.45, R * 0.12, R, R * 0.38);
    ctx.lineTo(R, R);
    ctx.lineTo(-R, R);
    ctx.closePath();
    ctx.fill();

    fillLocal(
      ctx,
      [
        [-1.05, 0.12], [-0.7, 0.02], [-0.42, 0.16], [-0.1, 0.04],
        [0.22, 0.18], [0.55, 0.06], [1.05, 0.22], [1.05, -1.05],
        [-1.05, -1.05], [-1.05, 0.12],
      ],
      R,
      "#5aa45a",
      null
    );

    ctx.save();
    ctx.beginPath();
    ctx.rect(-R, -R, R * 2, R * 2);
    ctx.clip();
    for (let row = -6; row < 4; row++) {
      for (let col = -6; col < 7; col++) {
        const x = (col * 0.16 + (row % 2) * 0.05) * R;
        const y = (row * 0.14 - 0.12) * R;
        if (y > R * 0.12) continue;
        ctx.fillStyle = hash2(row + 20, col + 7) < 0.35 ? "#d2c46a" : hash2(row, col) < 0.5 ? "#4e9648" : "#6aad52";
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(0.08);
        ctx.fillRect(-0.07 * R, -0.055 * R, 0.13 * R, 0.1 * R);
        ctx.restore();
      }
    }
    ctx.restore();

    fillLocal(
      ctx,
      [[-0.85, -0.62], [-0.55, -0.72], [-0.22, -0.55], [-0.38, -0.32], [-0.72, -0.38], [-0.85, -0.62]],
      R,
      "#2f6d38",
      "#1f4c28"
    );
    fillLocal(
      ctx,
      [[0.42, -0.55], [0.72, -0.62], [0.88, -0.38], [0.62, -0.22], [0.38, -0.32], [0.42, -0.55]],
      R,
      "#2f6d38",
      "#1f4c28"
    );

    ctx.strokeStyle = "#2a6aa8";
    ctx.lineWidth = Math.max(3, R * 0.028);
    ctx.beginPath();
    ctx.moveTo(-R * 0.9, -R * 0.35);
    ctx.quadraticCurveTo(-0.2 * R, -0.05 * R, 0.15 * R, 0.18 * R);
    ctx.quadraticCurveTo(0.45 * R, 0.32 * R, R * 0.2, R * 0.55);
    ctx.stroke();

    ctx.strokeStyle = "#c9c2a8";
    ctx.lineWidth = Math.max(1.5, R * 0.012);
    ctx.beginPath();
    ctx.moveTo(-R, -0.05 * R);
    ctx.lineTo(R * 0.15, 0.05 * R);
    ctx.lineTo(R * 0.15, -R);
    ctx.stroke();

    ctx.fillStyle = "#8a8680";
    ctx.fillRect(0.02 * R, -0.08 * R, 0.22 * R, 0.16 * R);
    ctx.fillStyle = "#6e6a66";
    for (let i = 0; i < 8; i++) {
      const x = (0.04 + (i % 4) * 0.05) * R;
      const y = (-0.06 + Math.floor(i / 4) * 0.06) * R;
      ctx.fillRect(x, y, 0.04 * R, 0.04 * R);
    }
    ctx.fillStyle = "rgba(255, 220, 140, 0.35)";
    ctx.fillRect(0.05 * R, -0.05 * R, 0.16 * R, 0.1 * R);

    const clouds = motion(DAY * 2, t, env.rate);
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse((clouds.phase - 0.5) * R, -R * 0.72, R * 0.18, R * 0.05, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function drawChromosome(ctx, R, t, env) {
    fillBg(ctx, R, "#24101c", "#0e060c", env);
    const drift = motion(16, t, env.rate);
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(210, 70, 130, 0.75)";
    ctx.lineWidth = Math.max(3, R * 0.04);
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const u = i / 40;
        const a = u * Math.PI * 2 * 2.2 + k * 0.9 + drift.phase * 2;
        const rad = R * (0.15 + u * 0.7);
        const x = Math.cos(a) * rad * 0.45;
        const y = lerp(-R * 0.8, R * 0.8, u) + Math.sin(a * 2) * R * 0.06;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function drawAtomicInterior(ctx, R, t, env) {
    fillBg(ctx, R, "#080a14", "#03040a", env);
    const m = motion(1.5e-16, t, env.rate);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + m.phase * 3;
      const d = R * (0.35 + 0.5 * hash2(i, 2));
      ctx.fillStyle = "rgba(120, 180, 255, 0.06)";
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * d * 0.15, Math.sin(a) * d * 0.1, d, d * 0.18, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawOort(ctx, R, t, env) {
    fillBg(ctx, R, "#08080f", "#020208", env);
    const drift = motion(YEAR * 1e5, t, env.rate);
    for (let i = 0; i < 90; i++) {
      const a = hash2(i, 1) * Math.PI * 2 + drift.phase * 0.2;
      const d = (0.2 + hash2(i, 2) * 0.75) * R;
      disc(ctx, Math.cos(a) * d, Math.sin(a) * d * 0.85, 1 + hash2(i, 3) * 1.8, "rgba(180,200,220,0.7)");
    }
  }

  function drawStarsBackdrop(ctx, R) {
    for (const s of STARS) {
      const x = Math.cos(s.a) * s.d * R * 1.2;
      const y = Math.sin(s.a) * s.d * R * 1.2;
      ctx.fillStyle = s.c;
      ctx.globalAlpha = 0.35 + 0.65 * s.s * 0.3;
      ctx.fillRect(x, y, s.s, s.s);
    }
    ctx.globalAlpha = 1;
  }

  function node(spec) {
    spec.ox = spec.ox || 0;
    spec.oy = spec.oy || 0;
    spec.children = spec.children || [];
    spec.interior = spec.interior || "#050508";
    return spec;
  }

  function createWorld() {
    const quarks = node({
      id: "quarks",
      name: "Кварки",
      desc: "Цветовой заряд, глюонные струны, удержание",
      size: 1.0e-18,
      interior: "#120614",
      draw: drawQuarks,
    });
    const proton = node({
      id: "proton",
      name: "Протон",
      desc: "Два u-кварка и один d-кварк в глюонном поле",
      size: 8.4e-16,
      interior: "#1a0a10",
      draw: drawProton,
      children: [quarks],
    });
    const nucleus = node({
      id: "nucleus",
      name: "Атомное ядро",
      desc: "Протоны и нейтроны, связанная капля",
      size: 6e-15,
      interior: "#140c08",
      draw: drawNucleus,
      children: [proton],
    });
    const atomicInterior = node({
      id: "atomic-interior",
      name: "Внутри атома",
      desc: "Почти пустота: электронные облака и далёкое ядро",
      size: 8e-13,
      interior: "#080a14",
      draw: drawAtomicInterior,
      children: [nucleus],
    });
    const atom = node({
      id: "atom",
      name: "Атом",
      desc: "Ядро и электронные оболочки",
      size: 2.0e-10,
      interior: "#0c1020",
      draw: drawAtom,
      children: [atomicInterior],
    });
    const molecule = node({
      id: "molecule",
      name: "Молекула",
      desc: "Ковалентные связи, тепловые колебания",
      size: 1.2e-9,
      interior: "#101018",
      draw: drawMolecule,
      children: [atom],
    });
    const dna = node({
      id: "dna",
      name: "ДНК",
      desc: "Двойная спираль, комплементарные основания",
      size: 3.4e-8,
      interior: "#1a1020",
      draw: drawDNA,
      children: [molecule],
    });
    const chromosome = node({
      id: "chromosome",
      name: "Хроматин",
      desc: "Упакованные петли ДНК",
      size: 1.1e-6,
      interior: "#24101c",
      draw: drawChromosome,
      children: [dna],
    });
    const nucleusCell = node({
      id: "cell-nucleus",
      name: "Ядро клетки",
      desc: "Хроматин и ядерная оболочка",
      size: 6e-6,
      interior: "#2a1830",
      draw: drawNucleusCell,
      children: [chromosome],
    });
    const cell = node({
      id: "cell",
      name: "Клетка",
      desc: "Мембрана, органеллы, цитоплазматический поток",
      size: 3.0e-5,
      interior: "#163028",
      draw: drawCell,
      children: [nucleusCell],
    });
    const skin = node({
      id: "skin",
      name: "Кожа",
      desc: "Эпидермис, капилляры",
      size: 2.5e-3,
      interior: "#d29a78",
      draw: drawSkin,
      children: [cell],
    });
    const human = node({
      id: "human",
      name: "Человек",
      desc: "Дыхание, пульс, лёгкое покачивание",
      size: 1.75,
      interior: "#c8d9b8",
      draw: drawHuman,
      children: [skin],
    });
    const plaza = node({
      id: "plaza",
      name: "Площадь",
      desc: "Деревья, облака, птица",
      size: 14,
      interior: "#9fd2f2",
      draw: drawPlaza,
      children: [human],
    });
    const street = node({
      id: "street",
      name: "Улица",
      desc: "Фасады, дорога, машины",
      size: 110,
      interior: "#8ec8ee",
      draw: drawStreet,
      children: [plaza],
    });
    const block = node({
      id: "block",
      name: "Квартал",
      desc: "Крыши домов и перекрёсток",
      size: 850,
      interior: "#8abfe0",
      draw: drawBlock,
      children: [street],
    });
    const district = node({
      id: "district",
      name: "Район",
      desc: "Сеть улиц и кварталов",
      size: 7000,
      interior: "#8ec4e8",
      draw: drawDistrict,
      children: [block],
    });
    const city = node({
      id: "city",
      name: "Город",
      desc: "Кварталы, река, поток машин",
      size: 2.4e4,
      interior: "#8ec4e8",
      draw: drawCity,
      children: [block],
    });
    const region = node({
      id: "region",
      name: "Ландшафт",
      desc: "Поля, лес, река, город на побережье",
      size: 2.2e5,
      interior: "#7ec4f0",
      draw: drawRegion,
      children: [city],
    });
    const continent = node({
      id: "continent",
      name: "Континент",
      desc: "Африка, Сахара, Нил, Мадагаскар",
      size: 3.2e6,
      interior: "#3fa0d8",
      draw: drawContinent,
      children: [region],
    });
    const earth = node({
      id: "earth",
      name: "Земля",
      desc: "Вращение, атмосфера, терминатор",
      size: 1.2742e7,
      interior: "#1c6fb3",
      draw: drawEarth,
      children: [continent],
    });
    const earthMoon = node({
      id: "earth-moon",
      name: "Земля и Луна",
      desc: "Орбита Луны",
      size: 8.2e8,
      interior: "#05060c",
      draw: drawEarthMoon,
      children: [earth],
    });
    const solar = node({
      id: "solar",
      name: "Солнечная система",
      desc: "Планеты на кеплеровых орбитах",
      size: 3.2e12,
      interior: "#0a0a12",
      draw: drawSolarSystem,
      children: [earthMoon],
    });
    const oort = node({
      id: "oort",
      name: "Облако Оорта",
      desc: "Ледяные тела на окраине системы",
      size: 1.5e16,
      interior: "#08080f",
      draw: drawOort,
      children: [solar],
    });
    const stars = node({
      id: "stars",
      name: "Ближние звёзды",
      desc: "Солнце среди соседей",
      size: 4.0e17,
      interior: "#070712",
      draw: drawStarfield,
      children: [oort],
    });
    const galaxy = node({
      id: "galaxy",
      name: "Млечный Путь",
      desc: "Спиральные рукава, балдж, вращение",
      size: 1.9e21,
      interior: "#07060e",
      draw: drawGalaxy,
      children: [stars],
    });
    const group = node({
      id: "group",
      name: "Местная группа",
      desc: "Скопление галактик, включая Млечный Путь",
      size: 1.0e23,
      interior: "#0c0820",
      draw: drawSupercluster,
      children: [galaxy],
    });
    const universe = node({
      id: "universe",
      name: "Наблюдаемая Вселенная",
      desc: "Космическая паутина, расширение",
      size: 8.8e26,
      interior: "#05030a",
      draw: function (ctx, R, t, env) {
        drawUniverse(ctx, R, t, env);
      },
      children: [group],
    });
    return universe;
  }

  global.ScaleScene = {
    createWorld: createWorld,
    drawStarsBackdrop: drawStarsBackdrop,
  };
})(window);
