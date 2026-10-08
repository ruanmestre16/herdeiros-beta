/**
 * Motor da animação "Como você quer matar ele(a)?": fitas de energia roxa (Karma) e dourada (Fluxo)
 * giram em vórtices, se chocam no meio, o dourado vence e explode. Desenhado em canvas, em tempo real
 * (nada de imagem), então o movimento é contínuo e fluido. A imagem de referência só serviu para as cores e o clima.
 *
 * Linha do tempo (segundos): 0–BOOM o choque, com a frente de batalha indo e vindo e recuando para a esquerda
 * (o dourado ganha terreno); em BOOM a explosão; depois só o dourado continua girando por trás da frase.
 */
export const BOOM = 3.8;

type Particle = { x: number; y: number; px: number; py: number; vx: number; vy: number; team: 0 | 1; hot: boolean; age: number; life: number; w: number; seed: number };
type Spark = { x: number; y: number; px: number; py: number; vx: number; vy: number; team: 0 | 1; age: number; life: number };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (v: number) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

// Cores tiradas da imagem de referência.
const COLORS = {
  purple: ['rgba(140,60,255,0.55)', 'rgba(222,160,255,0.75)'],
  gold: ['rgba(255,178,36,0.55)', 'rgba(255,238,160,0.8)'],
} as const;

export function createKillFx(canvas: HTMLCanvasElement, opts: { reduced?: boolean } = {}) {
  const ctx = canvas.getContext('2d')!;
  let W = 0, H = 0, dpr = 1, sc = 1, maxP = 900;
  let t = 0, boomed = false, boomAt = 0, acc = 0;
  const ps: Particle[] = [];
  const sparks: Spark[] = [];

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    sc = clamp(Math.sqrt((W * H) / (1280 * 720)), 0.6, 1.5);
    maxP = Math.round(clamp((W * H) / 1400, 450, 1100));
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#05030a'; ctx.fillRect(0, 0, W, H);
  };

  /** X da frente de batalha na altura y: vai e volta (cabo de guerra) e, no fim, o dourado empurra tudo para a esquerda. */
  const frontX = (time: number, y: number) => {
    const ramp = smooth((time - 0.7) / 0.9);
    const wobble = (Math.sin(time * 2.2) * 0.055 + Math.sin(time * 5.3 + 1) * 0.012) * W * ramp;
    const push = -0.12 * W * smooth((time - 1.5) / (BOOM - 1.5));
    const bulge = (Math.sin((y / H) * Math.PI * 3 + time * 3.1) * 0.014 + Math.sin((y / H) * Math.PI * 7 - time * 4.4) * 0.006) * W * ramp;
    return W / 2 + wobble + push + bulge;
  };

  const spawn = (left: boolean, team: 0 | 1, initial = false) => {
    if (ps.length >= maxP) return;
    const x = initial ? (left ? rnd(0, W * 0.35) : rnd(W * 0.65, W)) : left ? rnd(-40, W * 0.05) : rnd(W * 0.95, W + 40);
    const y = rnd(-20, H + 20);
    ps.push({ x, y, px: x, py: y, vx: left ? 80 : -80, vy: rnd(-60, 60), team, hot: Math.random() < 0.22, age: 0, life: rnd(3.2, 6), w: rnd(0.8, 2.4) * sc, seed: Math.random() * 100 });
  };

  const addSpark = (x: number, y: number, vx: number, vy: number, team: 0 | 1, life: number) => sparks.push({ x, y, px: x, py: y, vx, vy, team, age: 0, life });

  const step = (dtRaw: number) => {
    const dt = Math.min(dtRaw, 0.05);
    t += dt; acc += dt;
    const cy = H / 2;
    const post = boomed ? smooth((t - boomAt) / 0.8) : 0;
    const started = smooth(t / 0.5);

    if (!boomed && t >= BOOM) {
      boomed = true; boomAt = t;
      for (const p of ps) { p.team = 1; p.hot = Math.random() < 0.3; }
      const fx = frontX(t, cy);
      for (let i = 0; i < 380; i++) { const a = rnd(0, Math.PI * 2), s = rnd(250, 1700) * sc; addSpark(fx, cy, Math.cos(a) * s, Math.sin(a) * s, 1, rnd(0.8, 2.2)); }
    }

    // Surgimento contínuo de fitas pelos dois lados; depois do boom os dois lados são dourados.
    const rate = (190 * started + 60) * sc * dt;
    let n = rate; while (n > 0) { if (Math.random() < Math.min(n, 1)) { spawn(true, boomed ? 1 : 0); spawn(false, 1); } n -= 1; }
    if (t === dt) for (let i = 0; i < 140 * sc; i++) { spawn(true, 0, true); spawn(false, 1, true); }

    // Faíscas nascem na frente de batalha, mais e mais fortes.
    if (!boomed) {
      const sr = 70 * smooth((t - 0.8) / 1.5) * sc * dt; let m = sr;
      while (m > 0) { if (Math.random() < Math.min(m, 1)) { const y = rnd(H * 0.08, H * 0.92); const fx = frontX(t, y); const s = rnd(120, 520) * sc; const ang = rnd(-1.2, 1.2); const dir = Math.random() < 0.5 ? -1 : 1; addSpark(fx, y, Math.cos(ang) * s * dir, Math.sin(ang) * s, dir < 0 ? 0 : 1, rnd(0.35, 0.9)); } m -= 1; }
    }

    const Lx = W * 0.27, Rx = W * 0.73, r0 = Math.max(160, W * 0.2);
    const ease = 1 - Math.exp(-dt * 2.6);
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]!;
      p.age += dt;
      if (p.age > p.life || p.x < -120 || p.x > W + 120 || p.y < -120 || p.y > H + 120) { ps.splice(i, 1); continue; }
      const side = !boomed ? (p.team === 0 ? -1 : 1) : p.x < W / 2 ? -1 : 1;
      const vx0 = side < 0 ? Lx : Rx;
      const dx = p.x - vx0, dy = p.y - cy, r = Math.hypot(dx, dy) + 1;
      const spin = 1; // os dois vórtices giram no mesmo sentido: no meio as correntes se raspam (o choque) e nada se acumula nas bordas
      const g = (r / r0) * Math.exp(1 - r / r0);
      const S = 400 * sc * g * (0.2 + 0.8 * smooth(Math.abs(p.x - W / 2) / (W * 0.16)));
      let tvx = (-dy / r) * spin * S - (dx / r) * 55 * sc + Math.sin(p.y * 0.006 + t * 0.9 + p.seed) * 60 * sc;
      let tvy = (dx / r) * spin * S - (dy / r) * 40 * sc + Math.cos(p.x * 0.006 - t * 0.8 + p.seed * 1.7) * 60 * sc;
      if (!boomed) {
        const fx = frontX(t, p.y);
        const toFront = fx - p.x;
        const pw = smooth((t - 0.2) / 1.0);
        tvx += toFront * 0.9 * pw;
        const over = p.team === 0 ? p.x - fx : fx - p.x; // quanto invadiu o lado inimigo
        if (over > 0) tvx += (p.team === 0 ? -1 : 1) * (over * 5 + 160 * sc);
      } else {
        tvx += (p.x < W / 2 ? 1 : -1) * 30 * sc * (1 - post);
      }
      p.vx += (tvx - p.vx) * ease; p.vy += (tvy - p.vy) * ease;
      p.px = p.x; p.py = p.y;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]!;
      s.age += dt;
      if (s.age > s.life) { sparks.splice(i, 1); continue; }
      const drag = Math.exp(-dt * 2.2);
      s.vx *= drag; s.vy = s.vy * drag + 60 * sc * dt;
      s.px = s.x; s.py = s.y; s.x += s.vx * dt; s.y += s.vy * dt;
    }
  };

  const glow = (x: number, y: number, rad: number, stops: [number, string][]) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    for (const [o, c] of stops) g.addColorStop(o, c);
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  };

  const draw = () => {
    const dtFade = 1 - Math.pow(1 - 0.12, Math.min(acc, 0.05) * 60); acc = 0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(5,3,10,${dtFade.toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const cy = H / 2;
    const conv = boomed ? smooth((t - boomAt) / 0.7) : 0;
    const started = smooth(t / 0.6);

    // Fumaça de energia: manchas macias que respiram atrás das fitas.
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 6; i++) {
        const ph = i * 1.7 + side * 3;
        const bx = (side === 0 ? W * 0.24 : W * 0.76) + Math.sin(t * 0.5 + ph) * W * 0.09;
        const by = H * (0.2 + 0.6 * ((i % 3) / 2)) + Math.cos(t * 0.45 + ph * 1.3) * H * 0.1;
        const rad = W * (0.2 + 0.05 * Math.sin(t * 0.7 + ph)) + 90;
        const purple = side === 0 && conv < 1;
        const col = purple ? `${Math.round(140 + 115 * conv)},${Math.round(50 + 130 * conv)},${Math.round(255 - 205 * conv)}` : '255,185,45';
        glow(bx, by, rad, [[0, `rgba(${col},${(0.03 * started).toFixed(3)})`], [1, `rgba(${col},0)`]]);
      }
    }

    // Núcleo de luz na frente de batalha, crescendo até o boom.
    const heat = boomed ? Math.max(0, 1 - (t - boomAt) / 0.8) : smooth((t - 0.5) / (BOOM - 0.5));
    if (heat > 0.01) {
      const fx = frontX(t, cy), rad = Math.min(W, H) * (0.12 + 0.22 * heat) * (0.92 + 0.08 * Math.sin(t * 17));
      glow(fx, cy, rad, [[0, `rgba(255,252,225,${(0.2 * heat).toFixed(3)})`], [0.2, `rgba(255,205,90,${(0.14 * heat).toFixed(3)})`], [0.55, `rgba(160,70,255,${(0.08 * heat).toFixed(3)})`], [1, 'rgba(120,40,255,0)']]);
    }

    // Fitas: agrupadas por cor e espessura para desenhar rápido.
    const batches = new Map<string, Path2D>();
    const widths = new Map<string, number>();
    for (const p of ps) {
      const fade = smooth(p.age / 0.5) * smooth((p.life - p.age) / 0.8);
      if (fade < 0.04) continue;
      const lvl = fade > 0.66 ? 2 : fade > 0.33 ? 1 : 0;
      const team = p.team === 0 ? (conv > 0.5 ? 'gold' : 'purple') : 'gold';
      const key = `${team}|${p.hot ? 1 : 0}|${lvl}|${p.w > 1.6 ? 1 : 0}`;
      let path = batches.get(key);
      if (!path) { path = new Path2D(); batches.set(key, path); widths.set(key, (1 + lvl * 1.1) * (p.w > 1.6 ? 1.7 : 1)); }
      path.moveTo(p.px, p.py); path.lineTo(p.x, p.y);
    }
    for (const [key, path] of batches) {
      const [team, hot] = key.split('|') as [keyof typeof COLORS, string];
      ctx.strokeStyle = COLORS[team][hot === '1' ? 1 : 0]; ctx.lineWidth = (widths.get(key) ?? 1) * sc; ctx.stroke(path);
    }
    for (const s of sparks) {
      const k = 1 - s.age / s.life;
      ctx.strokeStyle = s.team === 0 ? `rgba(225,170,255,${(0.9 * k).toFixed(3)})` : `rgba(255,240,175,${(0.95 * k).toFixed(3)})`;
      ctx.lineWidth = (0.8 + 2 * k) * sc;
      ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(s.x, s.y); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  resize();
  window.addEventListener('resize', resize);
  // "Reduzir movimento": avança a simulação em silêncio e mostra só o quadro final, parado.
  if (opts.reduced) { for (let i = 0; i < 260; i++) { step(1 / 30); draw(); } }

  return { step, draw, resize, destroy: () => window.removeEventListener('resize', resize), get time() { return t; } };
}
