import { useCallback, useEffect, useRef, useState } from 'react';
import { Dices, GripHorizontal, Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { attrLabelFor, dieFor, weaponAttrFor, type Attr, type Character } from '@/lib/game';

/**
 * Janela de dados da mesa (estilo mesa virtual): arrastável, com dados rolando numa telinha.
 * Quem estiver logado numa mesa transmite a rolagem em tempo real: todos veem os mesmos dados caírem
 * (jogadores e Mestre). Fora de uma mesa, a janela funciona só localmente.
 */
const SIDES = [4, 6, 8, 10, 12, 20] as const;
const MAX_DICE = 40;
const ACCENT: Record<number, string> = { 4: '#3db89a', 6: '#bea9eb', 8: '#c9a227', 10: '#e08fb0', 12: '#7fb2e5', 20: '#f0e8d4' };
const STAGE_W = 320; const STAGE_H = 190;
const POS_KEY = 'herdeiros-dice-pos';

type DieRoll = { sides: number; value: number };
type Agg = 'sum' | 'max';
export type DiceRollMsg = { id: string; userId: string; name: string; label: string; dice: DieRoll[]; agg: Agg; bonus: number; ts: number };

const rollSide = (sides: number) => 1 + Math.floor(Math.random() * sides);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function total(m: DiceRollMsg) {
  const vals = m.dice.map(d => d.value);
  const base = m.agg === 'max' ? Math.max(0, ...vals) : vals.reduce((a, b) => a + b, 0);
  return base + m.bonus;
}
function breakdown(m: DiceRollMsg) {
  return SIDES.map(s => { const vals = m.dice.filter(d => d.sides === s).map(d => d.value); return vals.length ? `${vals.length}d${s}: ${vals.join(', ')}` : ''; }).filter(Boolean).join(' · ');
}
/** Valida o que chega pela rede: só d4/d6/d8/d10/d12/d20, valores inteiros dentro da faixa, no máximo MAX_DICE dados. */
function sanitize(raw: unknown): DiceRollMsg | null {
  const m = raw as Partial<DiceRollMsg> | null;
  if (!m || typeof m.id !== 'string' || !Array.isArray(m.dice) || m.dice.length === 0 || m.dice.length > MAX_DICE) return null;
  const dice: DieRoll[] = [];
  for (const d of m.dice) {
    const sides = Number((d as DieRoll)?.sides); const value = Number((d as DieRoll)?.value);
    if (!(SIDES as readonly number[]).includes(sides) || !Number.isInteger(value) || value < 1 || value > sides) return null;
    dice.push({ sides, value });
  }
  return { id: m.id.slice(0, 64), userId: String(m.userId ?? '').slice(0, 64), name: String(m.name ?? 'Jogador').slice(0, 40), label: String(m.label ?? 'Rolagem').slice(0, 80), dice, agg: m.agg === 'max' ? 'max' : 'sum', bonus: Number.isFinite(Number(m.bonus)) ? clamp(Math.trunc(Number(m.bonus)), -99, 99) : 0, ts: Number(m.ts) || Date.now() };
}

// ---------- geometria e desenho dos dados ----------
type Pt = [number, number];
function shape(sides: number, r: number): { outer: Pt[]; inner: Pt[] } {
  const poly = (n: number, off: number, rr: number, sx = 1, sy = 1): Pt[] => Array.from({ length: n }, (_, i) => { const a = off + (i * 2 * Math.PI) / n; return [Math.cos(a) * rr * sx, Math.sin(a) * rr * sy] as Pt; });
  switch (sides) {
    case 4: return { outer: poly(3, -Math.PI / 2, r * 1.15), inner: [] };
    case 6: return { outer: poly(4, Math.PI / 4, r * 1.05), inner: [] };
    case 8: return { outer: poly(4, -Math.PI / 2, r, 0.82, 1.15), inner: [[-r * 0.82, 0], [r * 0.82, 0]] };
    case 10: return { outer: [[0, -r * 1.1], [r * 0.9, -r * 0.12], [0, r * 1.1], [-r * 0.9, -r * 0.12]], inner: [[0, -r * 1.1], [0, r * 1.1]] };
    case 12: return { outer: poly(5, -Math.PI / 2, r * 1.05), inner: poly(5, Math.PI / 2, r * 0.5) };
    default: return { outer: poly(6, -Math.PI / 2, r * 1.05), inner: poly(3, -Math.PI / 2, r * 0.55) };
  }
}
type Body = { x: number; y: number; vx: number; vy: number; a: number; w: number; r: number; sides: number; value: number; settleAt: number; done: boolean; shown: number; nextFlip: number };

function DiceStage({ roll, onSettled }: { roll: DiceRollMsg | null; onSettled: (id: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = STAGE_W * dpr; canvas.height = STAGE_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = roll?.dice.length ?? 0;
    const r = clamp(30 - n * 0.9, 13, 26);
    const bodies: Body[] = (roll?.dice ?? []).map((d, i) => ({
      x: r + Math.random() * (STAGE_W - 2 * r), y: -r - Math.random() * 40, vx: (Math.random() - 0.5) * 520, vy: 260 + Math.random() * 280,
      a: Math.random() * Math.PI * 2, w: (Math.random() - 0.5) * 26, r, sides: d.sides, value: d.value,
      settleAt: 1.25 + Math.min(0.9, i * 0.06), done: false, shown: rollSide(d.sides), nextFlip: 0,
    }));
    const separate = (a: Body, b: Body, bounce: boolean) => {
      const dx = b.x - a.x, dy = b.y - a.y; const dist = Math.hypot(dx, dy) || 0.01; const min = (a.r + b.r) * 0.95;
      if (dist >= min) return;
      const nx = dx / dist, ny = dy / dist; const push = min - dist;
      if (a.done && b.done) { b.x += nx * push; b.y += ny * push; }
      else if (a.done) { b.x += nx * push; b.y += ny * push; }
      else if (b.done) { a.x -= nx * push; a.y -= ny * push; }
      else { a.x -= nx * push / 2; a.y -= ny * push / 2; b.x += nx * push / 2; b.y += ny * push / 2; }
      if (bounce && !a.done && !b.done) { const va = a.vx * nx + a.vy * ny, vb = b.vx * nx + b.vy * ny; const d = vb - va; a.vx += nx * d * 0.8; a.vy += ny * d * 0.8; b.vx -= nx * d * 0.8; b.vy -= ny * d * 0.8; }
    };
    const draw = (t: number) => {
      ctx.clearRect(0, 0, STAGE_W, STAGE_H);
      const g = ctx.createRadialGradient(STAGE_W / 2, STAGE_H / 2, 10, STAGE_W / 2, STAGE_H / 2, STAGE_W * 0.7);
      g.addColorStop(0, '#1d1a26'); g.addColorStop(1, '#0d0b12'); ctx.fillStyle = g; ctx.fillRect(0, 0, STAGE_W, STAGE_H);
      if (!bodies.length) { ctx.fillStyle = '#6f6a7d'; ctx.font = '13px "DM Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Escolha os dados e jogue', STAGE_W / 2, STAGE_H / 2 + 4); return; }
      for (const b of bodies) {
        const color = ACCENT[b.sides] ?? '#c9a227'; const sh = shape(b.sides, b.r);
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
        ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = b.done ? 5 : 12; ctx.shadowOffsetY = b.done ? 2 : 6;
        ctx.beginPath(); sh.outer.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath();
        const crit = b.done && b.sides === 20 && b.value === 20; const fumble = b.done && b.sides === 20 && b.value === 1;
        ctx.fillStyle = crit ? '#3a2e0d' : fumble ? '#3a1217' : '#17141f'; ctx.fill();
        ctx.shadowColor = crit ? '#c9a227' : 'transparent'; ctx.shadowBlur = crit ? 14 : 0; ctx.shadowOffsetY = 0;
        ctx.lineWidth = 1.6; ctx.strokeStyle = fumble ? '#e0505d' : color; ctx.stroke();
        ctx.shadowColor = 'transparent'; ctx.lineWidth = 0.8; ctx.strokeStyle = `${color}88`;
        if (b.sides === 20 || b.sides === 12) { ctx.beginPath(); sh.inner.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.stroke(); }
        else if (sh.inner.length === 2) { ctx.beginPath(); ctx.moveTo(sh.inner[0]![0], sh.inner[0]![1]); ctx.lineTo(sh.inner[1]![0], sh.inner[1]![1]); ctx.stroke(); }
        ctx.fillStyle = crit ? '#ffe9a6' : fumble ? '#ff9aa3' : '#f0e8d4';
        ctx.font = `bold ${Math.round(b.r * (b.shown > 9 ? 0.78 : 0.95))}px "DM Sans", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(b.done ? b.value : b.shown), 0, b.sides === 4 ? b.r * 0.22 : 0);
        ctx.restore();
      }
      void t;
    };
    if (!bodies.length) { draw(0); return; }
    let raf = 0; let last = performance.now(); const t0 = last; let notified = false;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000); last = now; const t = (now - t0) / 1000;
      for (const b of bodies) {
        if (!b.done && t >= b.settleAt) { b.done = true; b.vx = 0; b.vy = 0; b.w = 0; }
        if (b.done) {
          const norm = ((b.a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); const target = norm > Math.PI ? norm - 2 * Math.PI : norm;
          b.a = target * 0.78; b.shown = b.value; continue;
        }
        b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
        const damp = Math.max(0, 1 - 1.9 * dt); b.vx *= damp; b.vy *= damp; b.w *= Math.max(0, 1 - 1.2 * dt);
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.75; } if (b.x > STAGE_W - b.r) { b.x = STAGE_W - b.r; b.vx = -Math.abs(b.vx) * 0.75; }
        if (b.y < b.r && b.vy < 0) { b.y = b.r; b.vy = Math.abs(b.vy) * 0.75; } if (b.y > STAGE_H - b.r) { b.y = STAGE_H - b.r; b.vy = -Math.abs(b.vy) * 0.75; }
        b.nextFlip -= dt; if (b.nextFlip <= 0) { b.shown = rollSide(b.sides); b.nextFlip = 0.07; }
      }
      for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) separate(bodies[i]!, bodies[j]!, true);
      const all = bodies.every(b => b.done);
      if (all) { for (let k = 0; k < 12; k++) for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) separate(bodies[i]!, bodies[j]!, false); for (const b of bodies) { b.x = clamp(b.x, b.r, STAGE_W - b.r); b.y = clamp(b.y, b.r, STAGE_H - b.r); } }
      draw(t);
      if (all && !notified) { notified = true; if (roll) onSettled(roll.id); }
      if (!all || t < 4) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [roll, onSettled]);
  return <canvas ref={ref} className="tdice-canvas" style={{ width: STAGE_W, height: STAGE_H }} aria-label="Mesa de dados" />;
}

export function TabletopDice({ campaignId, userId, name, character }: { campaignId: string | null; userId: string | null; name: string; character?: Character }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<'manual' | 'ficha'>('manual');
  const [counts, setCounts] = useState<Record<number, number>>({ 4: 0, 6: 0, 8: 0, 10: 0, 12: 0, 20: 1 });
  const [bonus, setBonus] = useState(0);
  const [current, setCurrent] = useState<DiceRollMsg | null>(null);
  const [settledId, setSettledId] = useState('');
  const [history, setHistory] = useState<DiceRollMsg[]>([]);
  const [online, setOnline] = useState(false);
  const [autoOpen, setAutoOpen] = useState(true);
  const winRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const autoOpenRef = useRef(true);
  autoOpenRef.current = autoOpen;

  useEffect(() => {
    setMounted(true);
    try { const raw = localStorage.getItem(POS_KEY); if (raw) { const p = JSON.parse(raw) as { x: number; y: number }; if (Number.isFinite(p.x) && Number.isFinite(p.y)) setPos({ x: clamp(p.x, 0, Math.max(0, window.innerWidth - 120)), y: clamp(p.y, 0, Math.max(0, window.innerHeight - 80)) }); } } catch { /* ignore */ }
  }, []);

  const show = useCallback((m: DiceRollMsg) => {
    setCurrent(m); setSettledId('');
    setHistory(h => [m, ...h.filter(x => x.id !== m.id)].slice(0, 12));
  }, []);

  // Canal em tempo real da mesa: todos que estiverem na mesma mesa veem as mesmas rolagens.
  useEffect(() => {
    if (!campaignId || !userId) { setOnline(false); return; }
    const channel = supabase.channel(`herdeiros-dice-${campaignId}`, { config: { broadcast: { self: false } } });
    channelRef.current = channel;
    channel.on('broadcast', { event: 'dice_roll' }, ({ payload }) => {
      const m = sanitize(payload); if (!m) return;
      show(m); if (autoOpenRef.current) setOpen(true);
    }).subscribe(status => setOnline(status === 'SUBSCRIBED'));
    return () => { channelRef.current = null; setOnline(false); void supabase.removeChannel(channel); };
  }, [campaignId, userId, show]);

  const onSettled = useCallback((id: string) => setSettledId(id), []);

  function launch(dice: number[], label: string, agg: Agg = 'sum', extra = 0) {
    if (!dice.length || dice.length > MAX_DICE) return;
    const msg: DiceRollMsg = { id: crypto.randomUUID(), userId: userId ?? 'local', name, label, dice: dice.map(sides => ({ sides, value: rollSide(sides) })), agg, bonus: extra, ts: Date.now() };
    show(msg); setOpen(true);
    const ch = channelRef.current;
    if (ch && online) void ch.send({ type: 'broadcast', event: 'dice_roll', payload: msg });
  }
  const manualDice = SIDES.flatMap(s => Array.from({ length: counts[s] ?? 0 }, () => s as number));
  const manualLabel = SIDES.filter(s => (counts[s] ?? 0) > 0).map(s => `${counts[s]}d${s}`).join(' + ') + (bonus ? ` ${bonus > 0 ? '+' : '−'} ${Math.abs(bonus)}` : '');
  const setCount = (s: number, delta: number) => setCounts(c => ({ ...c, [s]: clamp((c[s] ?? 0) + delta, 0, 20) }));

  const presets = character ? (() => {
    const atk = weaponAttrFor(character.lineage) as Attr; const lin = character.lineage;
    const die = (a: Attr) => dieFor(character[a]) ?? 4;
    return [
      { key: 'atq', label: `Ataque · 1d20 + 1d${die(atk)} (${attrLabelFor(atk, lin)})`, dice: [20, die(atk)], agg: 'sum' as Agg, bonus: 0 },
      ...(['corpo', 'mente', 'espirito'] as Attr[]).map(a => ({ key: `t-${a}`, label: `Teste de ${attrLabelFor(a, lin)} · 1d${die(a)}`, dice: [die(a)], agg: 'sum' as Agg, bonus: 0 })),
      { key: 'ini', label: `Iniciativa · ${character.corpo}d20 (maior + ${character.corpo})`, dice: Array.from({ length: Math.max(1, character.corpo) }, () => 20), agg: 'max' as Agg, bonus: character.corpo },
      { key: 'abs', label: `Absorção de PF · ${character.espirito}d20 (o maior define a faixa)`, dice: Array.from({ length: Math.max(1, character.espirito) }, () => 20), agg: 'sum' as Agg, bonus: 0 },
    ];
  })() : [];

  // ---- arrastar a janela ----
  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return;
    const rect = winRef.current?.getBoundingClientRect(); if (!rect) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
  }
  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return; const w = winRef.current?.offsetWidth ?? 340; const h = winRef.current?.offsetHeight ?? 400;
    setPos({ x: clamp(e.clientX - drag.current.dx, 0, Math.max(0, window.innerWidth - w)), y: clamp(e.clientY - drag.current.dy, 0, Math.max(0, window.innerHeight - h)) });
  }
  function onUp() { drag.current = null; try { if (pos) localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ } }

  if (!mounted) return null;
  if (!open) return <button type="button" className="tdice-launcher" onClick={() => setOpen(true)} aria-label="Abrir a janela de dados"><Dices size={18} /> Dados</button>;
  const settled = !!current && settledId === current.id;
  return <div ref={winRef} className="tdice-win" style={pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined} role="dialog" aria-label="Janela de dados da mesa">
    <div className="tdice-head" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <GripHorizontal size={16} /><strong>Dados da mesa</strong>
      <span className={`tdice-live ${online ? 'on' : ''}`}>{campaignId && userId ? (online ? 'ao vivo' : 'conectando') : 'só local'}</span>
      <button type="button" className="tdice-x" onClick={() => setOpen(false)} aria-label="Fechar a janela de dados"><X size={16} /></button>
    </div>
    <div className="tdice-body">
      <DiceStage roll={current} onSettled={onSettled} />
      <div className="tdice-result" aria-live="polite">
        {current ? <>
          <span className="tdice-who">{current.name} · {current.label}</span>
          {settled ? <><strong className="tdice-total">{total(current)}</strong><small>{breakdown(current)}{current.bonus ? ` · bônus ${current.bonus > 0 ? '+' : '−'}${Math.abs(current.bonus)}` : ''}{current.agg === 'max' ? ' · vale o maior dado' : ''}</small></> : <small>rolando…</small>}
        </> : <small>Nenhuma rolagem ainda.</small>}
      </div>
      <div className="tdice-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'manual'} className={mode === 'manual' ? 'on' : ''} onClick={() => setMode('manual')}>Jogar manual</button>
        <button type="button" role="tab" aria-selected={mode === 'ficha'} className={mode === 'ficha' ? 'on' : ''} onClick={() => setMode('ficha')}>Da ficha</button>
      </div>
      {mode === 'manual' ? <div className="tdice-manual">
        <div className="tdice-grid">{SIDES.map(s => <div className="tdice-count" key={s}>
          <span style={{ color: ACCENT[s] }}>d{s}</span>
          <div><button type="button" onClick={() => setCount(s, -1)} aria-label={`Menos um d${s}`}><Minus size={12} /></button><strong>{counts[s] ?? 0}</strong><button type="button" onClick={() => setCount(s, 1)} aria-label={`Mais um d${s}`}><Plus size={12} /></button></div>
        </div>)}</div>
        <label className="tdice-bonus"><span>Bônus</span><input type="number" min={-99} max={99} value={bonus} onChange={e => setBonus(clamp(Number(e.target.value) || 0, -99, 99))} /></label>
        <div className="tdice-actions">
          <Button variant="ghost" size="sm" onClick={() => setCounts({ 4: 0, 6: 0, 8: 0, 10: 0, 12: 0, 20: 0 })}>Zerar</Button>
          <Button disabled={!manualDice.length} onClick={() => launch(manualDice, manualLabel || 'Rolagem manual', 'sum', bonus)}><Dices /> Jogar dados{manualDice.length ? ` (${manualDice.length})` : ''}</Button>
        </div>
      </div> : <div className="tdice-presets">
        {presets.length ? presets.map(p => <Button key={p.key} variant="outline" size="sm" className="justify-start" onClick={() => launch(p.dice, p.label, p.agg, p.bonus)}><Dices /> {p.label}</Button>) : <small className="muted-copy">Abra uma ficha para rolar com os dados dela.</small>}
      </div>}
      {history.length > 0 && <div className="tdice-history"><span className="field-kicker">ÚLTIMAS ROLAGENS DA MESA</span>
        {history.map(h => <button type="button" key={h.id} className="tdice-row" onClick={() => show(h)}><span>{h.name} · {h.label}</span><strong>{total(h)}</strong></button>)}
      </div>}
      <label className="tdice-auto"><input type="checkbox" checked={autoOpen} onChange={e => setAutoOpen(e.target.checked)} /> Abrir a janela quando alguém da mesa rolar</label>
    </div>
  </div>;
}
