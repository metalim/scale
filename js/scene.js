(function (global) {
  "use strict";

  const U = global.ScaleUtil;
  const { lerp, smoothstep, mulberry32, hash2, motion, disc, glow, YEAR, DAY, AU, withAlpha, clamp } = U;

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

  function drawEarth(ctx, R, t, env) {
    const rot = motion(DAY, t, env.rate);
    glow(ctx, 0, 0, R * 1.35, "rgba(80,160,255,0.18)", "rgba(120,190,255,0.28)");
    clipCircle(ctx, R, function () {
      const g = ctx.createLinearGradient(-R, 0, R, 0);
      g.addColorStop(0, "#0b2a58");
      g.addColorStop(0.5, "#1c6fb3");
      g.addColorStop(1, "#0a2848");
      ctx.fillStyle = g;
      ctx.fillRect(-R, -R, R * 2, R * 2);

      ctx.save();
      ctx.rotate(rot.phase * Math.PI * 2);
      ctx.fillStyle = "#2f8a57";
      blob(ctx, -R * 0.15, -R * 0.05, R * 0.42, R * 0.28, 0.4);
      blob(ctx, R * 0.28, R * 0.05, R * 0.22, R * 0.38, -0.5);
      blob(ctx, -R * 0.05, R * 0.42, R * 0.28, R * 0.16, 0.2);
      ctx.fillStyle = "#c9d6c2";
      blob(ctx, -R * 0.1, -R * 0.78, R * 0.35, R * 0.16, 0);
      blob(ctx, 0.05 * R, R * 0.78, R * 0.28, R * 0.12, 0);
      ctx.restore();

      ctx.save();
      ctx.rotate(rot.phase * Math.PI * 2 * 1.15);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      blob(ctx, R * 0.2, -R * 0.15, R * 0.5, R * 0.12, 0.8);
      blob(ctx, -R * 0.25, R * 0.2, R * 0.4, R * 0.1, -0.4);
      ctx.restore();

      const night = ctx.createLinearGradient(-R, 0, R, 0);
      night.addColorStop(0, "rgba(4,8,20,0.55)");
      night.addColorStop(0.45, "rgba(4,8,20,0)");
      night.addColorStop(1, "rgba(4,8,20,0)");
      ctx.fillStyle = night;
      ctx.fillRect(-R, -R, R * 2, R * 2);
    });
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(160,210,255,0.35)";
    ctx.lineWidth = Math.max(1, R * 0.02);
    ctx.stroke();
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

  function drawContinent(ctx, R, t, env) {
    fillBg(ctx, R, "#6ec4ff", "#2b7fb0", env);

    ctx.fillStyle = "#5daa62";
    blob(ctx, -R * 0.08, 0.02 * R, R * 0.72, R * 0.5, 0.25);
    ctx.fillStyle = "#6bb56f";
    blob(ctx, R * 0.15, -R * 0.12, R * 0.35, R * 0.22, -0.4);
    ctx.fillStyle = "#cfd8c8";
    blob(ctx, -R * 0.2, -R * 0.55, R * 0.2, R * 0.08, 0.2);

    const clouds = motion(DAY * 4, t, env.rate);
    ctx.save();
    ctx.translate(clouds.phase * R * 0.4 - R * 0.2, 0);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    blob(ctx, 0, -R * 0.1, R * 0.28, R * 0.08, 0.1);
    blob(ctx, R * 0.3, R * 0.18, R * 0.22, R * 0.06, -0.2);
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
    ctx.fillStyle = "#6a4a32";
    ctx.fillRect(x - s * 0.06, y, s * 0.12, s * 0.7);
    ctx.fillStyle = "#3f8f4a";
    const sway = Math.sin(t * 0.0002 + x) * 0.05;
    blob(ctx, x + sway * s, y - s * 0.15, s * 0.45, s * 0.4, sway);
  }

  function drawHuman(ctx, R, t, env) {
    const breath = motion(4.2, t, env.rate);
    const pulse = motion(0.85, t, env.rate);
    const chest = 1 + 0.04 * Math.sin(breath.phase * Math.PI * 2) * (breath.amount || (breath.frozen ? 0 : 1));
    const sway = 0.025 * Math.sin(env.wall * 0.7);

    ctx.save();
    ctx.rotate(sway);

    const skin = "#e4b48c";
    const cloth = "#2a4a78";
    const pants = "#2b3038";
    const h = R * 1.72;
    const w = h * 0.22;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = skin;
    ctx.lineWidth = w * 0.22;
    ctx.beginPath();
    ctx.moveTo(-w * 0.42, -h * 0.08);
    ctx.lineTo(-w * 0.85, h * 0.18);
    ctx.moveTo(w * 0.42, -h * 0.08);
    ctx.lineTo(w * 0.82, h * 0.16);
    ctx.stroke();

    ctx.strokeStyle = pants;
    ctx.lineWidth = w * 0.28;
    ctx.beginPath();
    ctx.moveTo(-w * 0.18, h * 0.18);
    ctx.lineTo(-w * 0.22, h * 0.62);
    ctx.moveTo(w * 0.18, h * 0.18);
    ctx.lineTo(w * 0.24, h * 0.62);
    ctx.stroke();

    ctx.fillStyle = "#3a2a22";
    ctx.beginPath();
    ctx.ellipse(-w * 0.22, h * 0.72, w * 0.18, w * 0.08, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.24, h * 0.72, w * 0.18, w * 0.08, -0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = cloth;
    ctx.beginPath();
    ctx.ellipse(0, 0.02 * h, w * 0.5 * chest, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    disc(ctx, 0, -h * 0.36, w * 0.3, skin);
    ctx.fillStyle = "#3a2a22";
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.42, w * 0.32, w * 0.26, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();

    ctx.fillStyle = "#2a2018";
    ctx.beginPath();
    ctx.arc(-w * 0.1, -h * 0.36, w * 0.045, 0, Math.PI * 2);
    ctx.arc(w * 0.1, -h * 0.36, w * 0.045, 0, Math.PI * 2);
    ctx.fill();

    const beat = 0.5 + 0.5 * Math.sin(pulse.phase * Math.PI * 2);
    ctx.fillStyle = "rgba(200, 40, 60," + (0.28 + beat * 0.5) + ")";
    ctx.beginPath();
    ctx.arc(-w * 0.1, -h * 0.02, w * 0.11 * (0.9 + beat * 0.18), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawSkin(ctx, R, t, env) {
    fillBg(ctx, R, "#f0c4a4", "#d29a78", env);
    if (viewCover(R, env) < 0.9) {
      softBody(ctx, R, "rgba(240,196,164,0.85)");
    }

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
    const k = 1 + 0.02 * Math.sin(wobble.phase * Math.PI * 2);

    ctx.save();
    ctx.scale(k, 1 / k);
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 0.92, R * 0.78, 0.15, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(70, 160, 120, 0.22)";
    ctx.fill();
    ctx.strokeStyle = "rgba(160, 230, 180, 0.7)";
    ctx.lineWidth = Math.max(2, R * 0.03);
    ctx.stroke();

    ctx.strokeStyle = "rgba(180,255,200,0.12)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.18);
      ctx.lineTo(Math.cos(a) * R * 0.85, Math.sin(a) * R * 0.72);
      ctx.stroke();
    }

    const stream = motion(14, t, env.rate);
    for (let i = 0; i < 20; i++) {
      const u = (hash2(i, 1) + stream.phase) % 1;
      const a = u * Math.PI * 2 + hash2(i, 2);
      const d = 0.3 + hash2(i, 3) * 0.5;
      disc(ctx, Math.cos(a) * d * R, Math.sin(a) * d * R * 0.85, R * 0.018, "rgba(220,255,180,0.45)");
    }

    for (const o of ORGANELLES) {
      const p = motion(9 + o.p * 5, t, env.rate);
      const ox = o.x * R + Math.cos(p.phase * 6.28) * R * 0.06;
      const oy = o.y * R + Math.sin(p.phase * 6.28) * R * 0.05;
      if (o.kind === "mito") {
        ctx.fillStyle = "rgba(220, 90, 70, 0.7)";
        ctx.beginPath();
        ctx.ellipse(ox, oy, o.a * R, o.b * R, o.p, 0, Math.PI * 2);
        ctx.fill();
      } else {
        disc(ctx, ox, oy, o.a * R * 0.45, "rgba(240, 220, 120, 0.55)");
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
    ctx.fillStyle = "#5ea45c";
    blob(ctx, -R * 0.2, 0, R * 0.7, R * 0.45, 0.2);
    ctx.fillStyle = "#c9d39a";
    blob(ctx, R * 0.25, R * 0.1, R * 0.35, R * 0.2, -0.3);
    ctx.strokeStyle = "rgba(60,120,170,0.7)";
    ctx.lineWidth = Math.max(2, R * 0.02);
    ctx.beginPath();
    ctx.moveTo(-R, R * 0.2);
    ctx.quadraticCurveTo(0, 0, R, R * 0.25);
    ctx.stroke();
    const clouds = motion(DAY * 2, t, env.rate);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    blob(ctx, (clouds.phase - 0.5) * R, -R * 0.35, R * 0.25, R * 0.07, 0);
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
      desc: "Поля, река, город как пятно",
      size: 2.2e5,
      interior: "#7ec4f0",
      draw: drawRegion,
      children: [city],
    });
    const continent = node({
      id: "continent",
      name: "Континент",
      desc: "Суша, облачные поля",
      size: 2.8e6,
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
