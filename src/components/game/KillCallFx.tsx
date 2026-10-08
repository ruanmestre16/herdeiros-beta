import { useEffect, useState } from 'react';

const KILL_MARK = '☠KILL:';
const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'.split('');
const rune = (i: number) => RUNES[i % RUNES.length]!;
/** Runas que giram em volta do texto: dois anéis em sentidos opostos. */
const RING_OUTER = Array.from({ length: 16 }, (_, i) => ({ g: rune(i * 3), a: (360 / 16) * i }));
const RING_INNER = Array.from({ length: 11 }, (_, i) => ({ g: rune(i * 5 + 1), a: (360 / 11) * i }));
/** Runas que sobem flutuando (valores fixos, sem Math.random, para a animação ser estável). */
const FLOATS = Array.from({ length: 18 }, (_, i) => ({ g: rune(i * 7 + 2), left: 3 + ((i * 37) % 94), delay: 2 + ((i * 53) % 40) / 10, dur: 5 + ((i * 29) % 40) / 10, size: 18 + ((i * 11) % 22) }));

/**
 * "Como você quer matar ele?": o roxo do Karma é comprimido pelo dourado do Fluxo,
 * explode num "boom" e sobra só o dourado, com runas voando em volta da frase.
 * Aparece para todos da mesa quando o Mestre aciona o botão.
 */
export function KillCallFx({ campaigns }: { campaigns: { id: string; log: string[] }[] }) {
  const [seen, setSeen] = useState<string>('');
  const [show, setShow] = useState<string | null>(null);
  useEffect(() => {
    for (const c of campaigns) {
      const e = c.log?.[0];
      if (e?.startsWith(KILL_MARK)) {
        const ts = Number(e.slice(KILL_MARK.length).split('|')[0]);
        const key = c.id + ts;
        if (key !== seen && Date.now() - ts < 20000) { setSeen(key); setShow(key); return; }
      }
    }
  }, [campaigns, seen]);
  // O timer fica num efeito próprio: antes, setSeen refazia o efeito acima e cancelava o timer.
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(null), 11000);
    return () => clearTimeout(t);
  }, [show]);
  if (!show) return null;
  return <div className="kc-root" role="alert" key={show} onClick={() => setShow(null)}>
    <div className="kc-gold" /><div className="kc-rays" />
    <div className="kc-purple" />
    <div className="kc-band kc-g-l" /><div className="kc-band kc-g-r" /><div className="kc-band kc-g-t" /><div className="kc-band kc-g-b" />
    <div className="kc-core" /><div className="kc-flash" /><div className="kc-ring" /><div className="kc-ring kc-ring2" />
    <div className="kc-orbit kc-orbit-outer" aria-hidden="true">{RING_OUTER.map((r, i) => <b key={i} style={{ ['--a' as string]: `${r.a}deg` }}>{r.g}</b>)}</div>
    <div className="kc-orbit kc-orbit-inner" aria-hidden="true">{RING_INNER.map((r, i) => <b key={i} style={{ ['--a' as string]: `${r.a}deg` }}>{r.g}</b>)}</div>
    <div className="kc-floats" aria-hidden="true">{FLOATS.map((f, i) => <i key={i} style={{ left: `${f.left}%`, animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s`, fontSize: f.size }}>{f.g}</i>)}</div>
    <div className="kc-content"><span className="kc-skull">☠</span><h1>Como você quer matar ele?</h1></div>
  </div>;
}
