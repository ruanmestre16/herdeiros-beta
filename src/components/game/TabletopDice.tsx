import { useCallback, useEffect, useRef, useState } from 'react';
import { Dices, GripHorizontal, Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { NOMENCLATURE_CRIT_DICE, absorbActionLabel, absorbFromDice, attrLabelFor, dieFor, forceActionLabel, isTechAgent, forceFluxFromDice, karmaDamageBonus, karmaMaximum, parseDice, nomenclatureLabel, techniqueRules, weaponAttrFor, weaponByKey, weaponDiceFor, weaponRules, withSheetState, type Attr, type Character } from '@/lib/game';
import { damageDiceFaces, parseDamageFormula } from '@/lib/weapon-damage';
import type { RollEntry } from './SheetExtras';

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
const COLOR_KEY = 'herdeiros-dice-color';
/** Temas de cor do dado. "Clássico" mantém uma cor por tipo de dado; os demais pintam todos os dados da mesma cor. */
const THEMES: { key: string; label: string; color: string | null }[] = [
  { key: 'classico', label: 'Clássico', color: null },
  { key: 'fluxo', label: 'Fluxo', color: '#c9a227' },
  { key: 'karma', label: 'Karma', color: '#8e5bd6' },
  { key: 'azul', label: 'Azul', color: '#3f8fe0' },
  { key: 'vermelho', label: 'Vermelho', color: '#e0505d' },
  { key: 'verde', label: 'Verde', color: '#3db89a' },
  { key: 'rosa', label: 'Rosa', color: '#e08fb0' },
];
const HEX = /^#[0-9a-fA-F]{6}$/;
const toRgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** Mistura duas cores (t = parte da segunda). */
function mixHex(a: string, b: string, t: number) {
  const x = toRgb(a), y = toRgb(b);
  return '#' + x.map((v, i) => Math.round(v * (1 - t) + y[i]! * t).toString(16).padStart(2, '0')).join('');
}

type DieRoll = { sides: number; value: number };
type Agg = 'sum' | 'max';
export type DiceRollMsg = { id: string; userId: string; name: string; label: string; dice: DieRoll[]; agg: Agg; bonus: number; ts: number; color?: string; result?: number; note?: string };
/** Efeito de uma rolagem na ficha de quem rolou (PF, Karma, iniciativa…). Só é aplicado quando os dados terminam de cair. */
type Fx = { note?: string; result?: number; block?: string; apply?: (c: Character) => Partial<Character>; log?: RollEntry };

/** Rolagem de qualquer parte do app (ataque, dano, teste, absorção…) mostrada a toda a mesa. */
export type TableRoll = { id: string; userId: string; name: string; source: string; expression: string; dice: number[]; total: number; ts: number };
function sanitizeRoll(raw: unknown): TableRoll | null {
  const m = raw as Partial<TableRoll> | null;
  if (!m || typeof m.id !== 'string' || !Array.isArray(m.dice)) return null;
  const total = Number(m.total); if (!Number.isFinite(total)) return null;
  return { id: m.id.slice(0, 64), userId: String(m.userId ?? '').slice(0, 64), name: String(m.name ?? 'Jogador').slice(0, 40), source: String(m.source ?? 'Rolagem').slice(0, 140), expression: String(m.expression ?? '').slice(0, 160), dice: m.dice.map(Number).filter(Number.isFinite).slice(0, 40), total: clamp(Math.trunc(total), -9999, 9999), ts: Number(m.ts) || Date.now() };
}
const rollSide = (sides: number) => 1 + Math.floor(Math.random() * sides);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function total(m: DiceRollMsg) {
  const vals = m.dice.map(d => d.value);
  if (typeof m.result === 'number') return m.result;
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
  return { id: m.id.slice(0, 64), userId: String(m.userId ?? '').slice(0, 64), name: String(m.name ?? 'Jogador').slice(0, 40), label: String(m.label ?? 'Rolagem').slice(0, 80), dice, agg: m.agg === 'max' ? 'max' : 'sum', bonus: Number.isFinite(Number(m.bonus)) ? clamp(Math.trunc(Number(m.bonus)), -99, 99) : 0, ts: Number(m.ts) || Date.now(), ...(typeof m.color === 'string' && HEX.test(m.color) ? { color: m.color } : {}), ...(m.result !== undefined && m.result !== null && Number.isFinite(Number(m.result)) ? { result: clamp(Math.trunc(Number(m.result)), -9999, 9999) } : {}), ...(typeof m.note === 'string' && m.note ? { note: m.note.slice(0, 160) } : {}) };
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

/** A cor (tint) só repinta os dados que já estão na mesa: trocar de cor nunca refaz a rolagem. */
function DiceStage({ roll, tint, onSettled }: { roll: DiceRollMsg | null; tint: string | null; onSettled: (id: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tintRef = useRef<string | null>(tint);
  tintRef.current = tint;
  const redrawRef = useRef<(() => void) | null>(null);
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
    if (!roll) bodies.push({ x: STAGE_W / 2, y: STAGE_H / 2, vx: 0, vy: 0, a: -0.15, w: 0, r: 36, sides: 20, value: 17, settleAt: 0, done: true, shown: 17, nextFlip: 0 });
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
        const color = tintRef.current ?? ACCENT[b.sides] ?? '#c9a227'; const sh = shape(b.sides, b.r);
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
        ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = b.done ? 5 : 12; ctx.shadowOffsetY = b.done ? 2 : 6;
        ctx.beginPath(); sh.outer.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath();
        const crit = b.done && b.sides === 20 && b.value === 20; const fumble = b.done && b.sides === 20 && b.value === 1;
        const gr = ctx.createLinearGradient(-b.r, -b.r, b.r, b.r); gr.addColorStop(0, crit ? '#6b5413' : fumble ? '#5a1c24' : mixHex(color, '#0d0b12', 0.6)); gr.addColorStop(1, crit ? '#2a2008' : fumble ? '#2a0c10' : mixHex(color, '#0d0b12', 0.9)); ctx.fillStyle = gr; ctx.fill();
        ctx.shadowColor = crit ? '#c9a227' : 'transparent'; ctx.shadowBlur = crit ? 14 : 0; ctx.shadowOffsetY = 0;
        ctx.lineWidth = 1.6; ctx.strokeStyle = fumble ? '#e0505d' : color; ctx.stroke();
        ctx.shadowColor = 'transparent'; ctx.lineWidth = 0.8; ctx.strokeStyle = `${color}88`;
        if (b.sides === 20 || b.sides === 12) { ctx.beginPath(); sh.inner.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.stroke(); }
        else if (sh.inner.length === 2) { ctx.beginPath(); ctx.moveTo(sh.inner[0]![0], sh.inner[0]![1]); ctx.lineTo(sh.inner[1]![0], sh.inner[1]![1]); ctx.stroke(); }
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(-b.r * 0.28, -b.r * 0.42, b.r * 0.38, b.r * 0.15, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = crit ? '#ffe9a6' : fumble ? '#ff9aa3' : mixHex(color, '#ffffff', 0.78);
        ctx.font = `bold ${Math.round(b.r * (b.shown > 9 ? 0.78 : 0.95))}px "DM Sans", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(b.done ? b.value : b.shown), 0, b.sides === 4 ? b.r * 0.22 : 0);
        ctx.restore();
      }
      void t;
    };
    redrawRef.current = () => draw(0);
    if (!roll) { draw(0); return; }
    let raf = 0; let last = performance.now(); const t0 = last; let notified = false; let lastT = 0;
    redrawRef.current = () => draw(lastT);
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
      lastT = t; draw(t);
      if (all && !notified) { notified = true; if (roll) onSettled(roll.id); }
      if (!all || t < 4) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [roll, onSettled]);
  useEffect(() => { redrawRef.current?.(); }, [tint]);
  return <canvas ref={ref} className="tdice-canvas" style={{ width: STAGE_W, height: STAGE_H }} aria-label="Mesa de dados" />;
}

export function TabletopDice({ campaignId, userId, name, character, onApply, addRoll, isMaster = false }: { campaignId: string | null; userId: string | null; name: string; character?: Character; /** Aplica uma mudança na ficha de quem rolou (PF, Karma, iniciativa). */ onApply?: (patch: Partial<Character>) => void; addRoll?: (e: RollEntry) => void; isMaster?: boolean }) {
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
  /** Cor dos meus dados (null = clássico). Vai junto com a rolagem, então todos da mesa veem os dados na cor de quem rolou. */
  const [color, setColor] = useState<string | null>(null);
  /** Refletir o resultado na ficha (PF da absorção, Karma, iniciativa, custo de PF da Nomenclatura). */
  const [reflect, setReflect] = useState(true);
  const [warn, setWarn] = useState('');
  /** Tudo que a mesa rolou (qualquer parte do app), visível a todos. */
  const [feed, setFeed] = useState<TableRoll[]>([]);
  const [unread, setUnread] = useState(0);
  /** O Mestre liga e desliga se as próprias rolagens aparecem para os jogadores (jogadores sempre compartilham). */
  const [shareMine, setShareMine] = useState(true);
  const shareRef = useRef(true); shareRef.current = !isMaster || shareMine;
  const nameRef = useRef(name); nameRef.current = name;
  const onlineRef = useRef(false); onlineRef.current = online;
  const userRef = useRef(userId); userRef.current = userId;
  const charRef = useRef<Character | undefined>(character); charRef.current = character;
  const applyRef = useRef(onApply); applyRef.current = onApply;
  const addRollRef = useRef(addRoll); addRollRef.current = addRoll;
  const pendingFx = useRef(new Map<string, Fx>());
  const winRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const autoOpenRef = useRef(true);
  autoOpenRef.current = autoOpen;

  useEffect(() => {
    setMounted(true);
    try { const c = localStorage.getItem(COLOR_KEY); if (c && HEX.test(c)) setColor(c); if (localStorage.getItem('herdeiros-share-rolls') === 'off') setShareMine(false); } catch { /* ignore */ }
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
    }).on('broadcast', { event: 'table_roll' }, ({ payload }) => {
      const r = sanitizeRoll(payload); if (!r) return;
      setFeed(f => [r, ...f.filter(x => x.id !== r.id)].slice(0, 40)); setUnread(u => u + 1);
    }).subscribe(status => setOnline(status === 'SUBSCRIBED'));
    return () => { channelRef.current = null; setOnline(false); void supabase.removeChannel(channel); };
  }, [campaignId, userId, show]);

  // Toda rolagem do app (addRoll) chega aqui: entra no registro da mesa e é enviada aos outros.
  useEffect(() => {
    const onAppRoll = (e: Event) => {
      const d = (e as CustomEvent<{ expression: string; dice: number[]; total: number; source: string; publicExpression?: string; publicSource?: string }>).detail; if (!d) return;
      const base = { id: crypto.randomUUID(), userId: userRef.current ?? 'local', name: nameRef.current, dice: d.dice, total: d.total, ts: Date.now() };
      const r = sanitizeRoll({ ...base, source: d.source, expression: d.expression }); if (!r) return;
      setFeed(f => [r, ...f].slice(0, 40));
      const pub = sanitizeRoll({ ...base, source: d.publicSource ?? d.source, expression: d.publicExpression ?? d.expression });
      const ch = channelRef.current; if (pub && ch && onlineRef.current && shareRef.current) void ch.send({ type: 'broadcast', event: 'table_roll', payload: pub });
    };
    window.addEventListener('herdeiros:roll', onAppRoll);
    return () => window.removeEventListener('herdeiros:roll', onAppRoll);
  }, []);
  useEffect(() => { if (open) setUnread(0); }, [open, feed]);
  const runEffect = useCallback((id: string) => {
    const eff = pendingFx.current.get(id); if (!eff) return; pendingFx.current.delete(id);
    const c = charRef.current; const apply = applyRef.current; if (!c || !apply || !eff.apply) return;
    apply(eff.apply(c));
    if (eff.log) addRollRef.current?.(eff.log);
  }, []);
  const onSettled = useCallback((id: string) => { setSettledId(id); runEffect(id); }, [runEffect]);
  function pickColor(c: string | null) { setColor(c); try { if (c) localStorage.setItem(COLOR_KEY, c); else localStorage.removeItem(COLOR_KEY); } catch { /* ignore */ } }

  function launch(dice: number[], label: string, agg: Agg = 'sum', extra = 0, fx?: (v: number[]) => Fx) {
    if (!dice.length || dice.length > MAX_DICE) return;
    setWarn('');
    const values = dice.map(rollSide);
    const live = reflect && !!applyRef.current && !!charRef.current;
    const eff = fx ? fx(values) : null;
    if (eff?.block && live) { setWarn(eff.block); return; }
    const msg: DiceRollMsg = { id: crypto.randomUUID(), userId: userId ?? 'local', name, label, dice: dice.map((sides, i) => ({ sides, value: values[i] ?? 1 })), agg, bonus: extra, ts: Date.now(), ...(color ? { color } : {}), ...(eff?.result !== undefined ? { result: eff.result } : {}), ...(eff?.note ? { note: `${eff.note}${live && eff.apply ? ' · aplicado na ficha' : ''}` } : {}) };
    if (live && eff?.apply) { pendingFx.current.set(msg.id, eff); window.setTimeout(() => runEffect(msg.id), 3600); }
    show(msg); setOpen(true);
    const ch = channelRef.current;
    if (ch && online && shareRef.current) void ch.send({ type: 'broadcast', event: 'dice_roll', payload: msg });
  }
  const manualDice = SIDES.flatMap(s => Array.from({ length: counts[s] ?? 0 }, () => s as number));
  const manualLabel = SIDES.filter(s => (counts[s] ?? 0) > 0).map(s => `${counts[s]}d${s}`).join(' + ') + (bonus ? ` ${bonus > 0 ? '+' : '−'} ${Math.abs(bonus)}` : '');
  const setCount = (s: number, delta: number) => setCounts(c => ({ ...c, [s]: clamp((c[s] ?? 0) + delta, 0, 20) }));

  /** "NdS" -> lista de lados (só d4..d20); mult dobra a quantidade (crítico). */
  const expand = (exprs: string[], mult = 1): number[] => exprs.flatMap(e => { const p = parseDice(e); return p ? Array.from({ length: p.count * mult }, () => p.sides) : []; }).filter(sd => (SIDES as readonly number[]).includes(sd));
  const nomRolls = (n: NonNullable<Character['nomenclatures']>[number]) => {
    const t = techniqueRules(character!, n);
    const normal = { dice: expand([t.dice, ...t.extraDice]), bonus: t.bonus };
    const crit = t.kind === 'Completa' ? { dice: expand([NOMENCLATURE_CRIT_DICE.Completa]), bonus: 0 } : { dice: expand([t.dice, ...t.extraDice], 2), bonus: t.bonus };
    const eff = `${t.ignoreBlock ? ` · ignora ${t.ignoreBlock >= 999 ? 'todo o' : `${t.ignoreBlock} de`} bloqueio` : ''}${t.effectNote ? ` · Efeito: ${t.effectNote}` : ''}`;
    return { t, normal, crit, eff };
  };
  const weaponRoll = (() => {
    if (!character) return null;
    const type = weaponByKey(character.weapon_type); if (!type) return null;
    const wr = weaponRules(character);
    const eff = `${wr.ignoreBlock ? ` · ignora ${wr.ignoreBlock >= 999 ? 'todo o' : `${wr.ignoreBlock} de`} bloqueio` : ''}${wr.effectNote ? ` · Efeito: ${wr.effectNote}` : ''}`;
    const chosen = weaponDiceFor(character);
    const normalTerms = [...damageDiceFaces(chosen), ...wr.extraDice.flatMap(e=>damageDiceFaces(e))];
    const critTerms = [...damageDiceFaces(chosen, 2), ...wr.extraDice.flatMap(e=>damageDiceFaces(e, 2))];
    const flat = parseDamageFormula(chosen)?.flat ?? 0;
    return { name: type.label, formula: chosen, eff, normal: { dice: normalTerms.map(t=>t.sides), signs: normalTerms.map(t=>t.sign), bonus: wr.bonus + flat }, crit: { dice: critTerms.map(t=>t.sides), signs: critTerms.map(t=>t.sign), bonus: wr.bonus + flat } };
  })();
  const presets = character ? (() => {
    const atk = (character.weapon_type ? weaponRules(character).attr : weaponAttrFor(character.lineage)) as Attr; const lin = character.lineage;
    const die = (a: Attr) => dieFor(character[a]) ?? 4;
    const d20s = (n: number) => Array.from({ length: Math.max(1, n) }, () => 20);
    type Preset = { key: string; label: string; dice: number[]; agg: Agg; bonus: number; fx?: (v: number[]) => Fx };
    const list: Preset[] = [
      { key: 'atq', label: `Ataque · 1d20 + 1d${die(atk)} (${attrLabelFor(atk, lin)})`, dice: [20, die(atk)], agg: 'sum', bonus: 0 },
      ...(['corpo', 'mente', 'espirito'] as Attr[]).map((a): Preset => ({ key: `t-${a}`, label: `Teste de ${attrLabelFor(a, lin)} · 1d${die(a)}`, dice: [die(a)], agg: 'sum', bonus: 0 })),
      { key: 'ini', label: `Iniciativa · ${character.corpo}d20 (maior + ${character.corpo})`, dice: d20s(character.corpo), agg: 'max', bonus: character.corpo,
        fx: v => { const t = Math.max(0, ...v) + character.corpo; return { note: `Iniciativa ${t} registrada`, apply: () => ({ initiative: t }), log: { expression: `${v.length}d20 (maior ${Math.max(0, ...v)}) + ${character.corpo}`, dice: v, modifier: character.corpo, total: t, source: 'Iniciativa' } }; } },
      { key: 'abs', label: `${absorbActionLabel(lin)} · ${Math.max(1, character.espirito)}d20 (o maior define a faixa)`, dice: d20s(character.espirito), agg: 'sum', bonus: 0,
        fx: v => { const r = absorbFromDice(v, character.espirito); return { result: r.total, note: `+${r.total} ${isTechAgent(lin) ? "PN" : "PF"} (maior ${r.highest}: ${r.band}; soma ${r.sum} vira ${r.diceTotal}, mais ${r.espirito} de ${attrLabelFor("espirito", lin)})`,
          apply: c => { const cap = c.espirito * 20; const sum = c.pf_current + r.total; return { pf_current: Math.min(cap, sum), abilities: withSheetState(c, { excess: Math.max(0, sum - cap), rounds: 0 }) }; },
          log: { expression: `${r.count}d20 (soma ${r.sum}, maior ${r.highest}) + ${r.espirito}`, dice: v, modifier: r.espirito, total: r.total, source: `${absorbActionLabel(lin)} · ${r.band}`, crit: r.crit } }; } },
      { key: 'flux', label: `${forceActionLabel(lin)} · ${Math.max(1, character.espirito)}d20 (metade vira ${isTechAgent(lin) ? "PN" : "PF"})`, dice: d20s(character.espirito), agg: 'sum', bonus: 0,
        fx: v => { const f = forceFluxFromDice(v); return { result: f.pf, note: `+${f.pf} ${isTechAgent(lin) ? "PN" : "PF"} e +${f.karma} Karma`,
          apply: c => ({ pf_current: Math.min(c.pf_max, c.pf_current + f.pf), karma: Math.min(karmaMaximum(c.mente, c.espirito), c.karma + f.karma) }),
          log: { expression: `${v.length}d20 = ${f.total}, metade`, dice: v, modifier: 0, total: f.pf, source: `${forceActionLabel(lin)} · +${f.karma} Karma` } }; } },
    ];
    return list;
  })() : [];
  const karmaBonus = character ? karmaDamageBonus(character) : 0;

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
  if (!open) return <button type="button" className="tdice-launcher" onClick={() => setOpen(true)} aria-label="Abrir a janela de dados"><Dices size={18} /> Dados{unread > 0 ? ` (${unread})` : ''}</button>;
  const settled = !!current && settledId === current.id;
  return <div ref={winRef} className="tdice-win" style={pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined} role="dialog" aria-label="Janela de dados da mesa">
    <div className="tdice-head" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <GripHorizontal size={16} /><strong>Dados da mesa</strong>
      <span className={`tdice-live ${online ? 'on' : ''}`}>{campaignId && userId ? (online ? 'ao vivo' : 'conectando') : 'só local'}</span>
      <button type="button" className="tdice-x" onClick={() => setOpen(false)} aria-label="Fechar a janela de dados"><X size={16} /></button>
    </div>
    <div className="tdice-body">
      <DiceStage roll={current} tint={!current || current.userId === (userId ?? 'local') ? color : (current.color ?? null)} onSettled={onSettled} />
      <div className="tdice-colors" role="radiogroup" aria-label="Cor dos dados">
        {THEMES.map(t => <button type="button" key={t.key} role="radio" aria-checked={color === t.color} title={t.label} aria-label={`Dado ${t.label}`} className={`tdice-swatch ${color === t.color ? 'on' : ''}`} style={t.color ? { background: t.color } : undefined} onClick={() => pickColor(t.color)}>{t.color ? '' : 'C'}</button>)}
        <label className="tdice-swatch tdice-custom" title="Cor personalizada" aria-label="Cor personalizada do dado"><input type="color" value={color ?? '#c9a227'} onChange={e => pickColor(e.target.value)} /></label>
      </div>
      <div className="tdice-result" aria-live="polite">
        {current ? <>
          <span className="tdice-who">{current.name} · {current.label}</span>
          {settled ? <><strong className="tdice-total">{total(current)}</strong><small>{breakdown(current)}{current.bonus ? ` · bônus ${current.bonus > 0 ? '+' : '−'}${Math.abs(current.bonus)}` : ''}{current.agg === 'max' ? ' · vale o maior dado' : ''}</small>{current.note && <small className="tdice-note">{current.note}</small>}</> : <small>rolando…</small>}
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
        {presets.length ? <>
          <span className="field-kicker">TESTES E ATAQUE</span>
          {presets.map(p => <Button key={p.key} variant="outline" size="sm" className="justify-start" onClick={() => launch(p.dice, p.label, p.agg, p.bonus, p.fx)}><Dices /> {p.label}</Button>)}
          {weaponRoll && weaponRoll.normal.dice.length > 0 && <>
            <span className="field-kicker">ARMA · {weaponRoll.name.toUpperCase()}</span>
            <div className="tdice-pair">
              <Button variant="outline" size="sm" onClick={() => launch(weaponRoll.normal.dice, `Dano · ${weaponRoll.name}${karmaBonus ? ` (+${karmaBonus} Karma)` : ''}${weaponRoll.eff}`, 'sum', weaponRoll.normal.bonus + karmaBonus, v => ({result:Math.max(0,v.reduce((a,n,i)=>a+n*(weaponRoll.normal.signs[i]??1),weaponRoll.normal.bonus+karmaBonus)),note:`Dano da ficha: ${weaponRoll.formula} (dados negativos são subtraídos)`}))}><Dices /> Dano</Button>
              <Button variant="outline" size="sm" onClick={() => launch(weaponRoll.crit.dice, `Dano crítico · ${weaponRoll.name}${karmaBonus ? ` (+${karmaBonus} Karma)` : ''}${weaponRoll.eff}`, 'sum', weaponRoll.crit.bonus + karmaBonus, v => ({result:Math.max(0,v.reduce((a,n,i)=>a+n*(weaponRoll.crit.signs[i]??1),weaponRoll.crit.bonus+karmaBonus)),note:`Crítico da ficha: ${weaponRoll.formula} (dados negativos são subtraídos)`}))}><Dices /> Crítico</Button>
            </div>
          </>}
          {character && character.nomenclatures.length > 0 && <>
            <span className="field-kicker">{nomenclatureLabel(character.lineage, true).toUpperCase()}</span>
            {character.nomenclatures.map((n, i) => { const r = nomRolls(n); const spDie = dieFor(character.espirito) ?? 4; return <div className="tdice-nom" key={`${n.name}-${i}`}>
              <span><strong>{n.name}</strong><small>{r.t.kind} · {r.t.cost} {isTechAgent(character.lineage) ? "PN" : "PF"} · {r.t.dice}{r.t.extraDice.length ? ` + ${r.t.extraDice.join(' + ')}` : ''}{r.t.bonus ? ` + ${r.t.bonus}` : ''}</small></span>
              <div className="tdice-pair">
                <Button variant="outline" size="sm" title={`Teste de acerto: 1d20 + dado de ${attrLabelFor("espirito", character.lineage)}`} onClick={() => launch([20, spDie], `Acerto · ${n.name}`, 'sum', 0, v => {
                  if (character.pf_current < r.t.cost) return { block: `${isTechAgent(character.lineage) ? "PN" : "PF"} insuficientes para ${n.name} (${r.t.cost} ${isTechAgent(character.lineage) ? "PN" : "PF"}). Use ${forceActionLabel(character.lineage)} ou ${absorbActionLabel(character.lineage)}.` };
                  const d20 = v[0] ?? 0;
                  return { note: `−${r.t.cost} ${isTechAgent(character.lineage) ? "PN" : "PF"}${d20 === 20 ? ' · CRÍTICO se acertar' : d20 === 1 ? ' · FALHA CRÍTICA' : ''}`, apply: c => ({ pf_current: Math.max(0, c.pf_current - r.t.cost) }), log: { expression: `1d20 + 1d${spDie}`, dice: v, modifier: 0, total: (v[0] ?? 0) + (v[1] ?? 0), source: `${nomenclatureLabel(character.lineage)} · ${n.name} · acerto (−${r.t.cost} ${isTechAgent(character.lineage) ? "PN" : "PF"})`, crit: d20 === 20 } };
                })}>Acerto</Button>
                <Button variant="outline" size="sm" title="Dano da Nomenclatura (quando acerta)" onClick={() => launch(r.normal.dice, `Dano · ${n.name}${karmaBonus ? ` (+${karmaBonus} Karma)` : ''}${r.eff}`, 'sum', r.normal.bonus + karmaBonus)}>Dano</Button>
                <Button variant="outline" size="sm" title="Dano em crítico" onClick={() => launch(r.crit.dice, `Crítico · ${n.name}${karmaBonus ? ` (+${karmaBonus} Karma)` : ''}${r.eff}`, 'sum', r.crit.bonus + karmaBonus)}>Crítico</Button>
              </div>
            </div>; })}
          </>}
          <label className="tdice-auto"><input type="checkbox" checked={reflect} disabled={!onApply} onChange={e => setReflect(e.target.checked)} /> Refletir na ficha ({character && isTechAgent(character.lineage) ? "PN" : "PF"}, Karma e iniciativa){!onApply ? ' · indisponível sem ficha sua' : ''}</label>
          {warn && <small role="alert" className="tdice-warn">{warn}</small>}
          <small className="muted-copy">Com isso ligado, a absorção e a energia do Núcleo/Fluxo atualizam PF ou PN (e Karma) na ficha, e o acerto das técnicas desconta seu custo. O dano das armas e Nomenclaturas só é mostrado: quem sofre o dano é controlado no combate.</small>
        </> : <small className="muted-copy">Abra uma ficha para rolar com os dados dela.</small>}
      </div>}
      <div className="tdice-history"><span className="field-kicker">ROLAGENS DA MESA (TUDO QUE FOI ROLADO)</span>
        {!feed.length && <small className="muted-copy">Ataques, danos, testes e absorções de todos aparecem aqui.</small>}
        {feed.slice(0, 20).map(r => <div className="tdice-row" key={r.id} title={r.expression}><span><strong>{r.name}</strong> · {r.source}<small className="block muted-copy">{r.expression}{r.dice.length ? ` · dados ${r.dice.join(', ')}` : ''}</small></span><strong>{r.total}</strong></div>)}
        {isMaster && <label className="tdice-auto"><input type="checkbox" checked={shareMine} onChange={e => { setShareMine(e.target.checked); try { localStorage.setItem('herdeiros-share-rolls', e.target.checked ? 'on' : 'off'); } catch { /* ignore */ } }} /> Mostrar as minhas rolagens à mesa (desligado: só eu vejo)</label>}
      </div>
      {history.length > 0 && <div className="tdice-history"><span className="field-kicker">ÚLTIMAS ROLAGENS DA MESA</span>
        {history.map(h => <button type="button" key={h.id} className="tdice-row" onClick={() => show(h)}><span><i className="tdice-dot" style={{ background: h.color ?? '#c9a227' }} />{h.name} · {h.label}</span><strong>{total(h)}</strong></button>)}
      </div>}
      <label className="tdice-auto"><input type="checkbox" checked={autoOpen} onChange={e => setAutoOpen(e.target.checked)} /> Abrir a janela quando alguém da mesa rolar</label>
    </div>
  </div>;
}
