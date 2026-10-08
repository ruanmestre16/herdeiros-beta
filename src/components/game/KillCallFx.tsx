import { useEffect, useRef, useState } from 'react';
import { BOOM, createKillFx } from './killFxEngine';

const KILL_MARK = '☠KILL:';
const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'.split('');
const rune = (i: number) => RUNES[i % RUNES.length]!;
/** Fileiras de runas douradas que atravessam a tela, como nomenclaturas sendo recitadas. Valores fixos (sem Math.random) para a animação ser estável. */
const ROWS = Array.from({ length: 9 }, (_, r) => ({
  text: Array.from({ length: 28 }, (_, i) => rune(r * 7 + i * 5 + 3)).join(' '),
  top: 4 + r * 11,
  size: 30 + ((r * 7) % 5) * 8,
  dur: 16 + ((r * 5) % 4) * 4,
  opacity: 0.7 + ((r * 3) % 5) * 0.075,
  reverse: r % 2 === 1,
}));

/**
 * "Como você quer matar ele(a)?": o Karma (roxo) e o Fluxo (dourado) se chocam e se degladiam num canvas animado em
 * tempo real (killFxEngine.ts); o Fluxo vence, tudo explode ("boom") e fica só o dourado, com a frase e as runas passando.
 * Aparece para todos da mesa quando o Mestre aciona o botão. O momento do boom (BOOM) é compartilhado com o CSS (.kx-*).
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
    const t = setTimeout(() => setShow(null), 13000);
    return () => clearTimeout(t);
  }, [show]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Motor do canvas: um laço requestAnimationFrame por exibição, limpo ao fechar.
  useEffect(() => {
    if (!show || !canvasRef.current) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const desktop = window.matchMedia?.('(pointer: fine)').matches ?? window.innerWidth >= 900;
    const fx = createKillFx(canvasRef.current, { reduced, desktop });
    if (reduced) return () => fx.destroy();
    let raf = 0, last = performance.now();
    const loop = (now: number) => { fx.step((now - last) / 1000); last = now; fx.draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); fx.destroy(); };
  }, [show]);
  if (!show) return null;
  return <div className="kx-root" style={{ ['--boom' as string]: `${BOOM}s` }} role="alert" key={show} onClick={() => setShow(null)}>
    <div className="kx-shake">
      <canvas ref={canvasRef} className="kx-canvas" aria-hidden="true" />
      <div className="kx-shade" />
      <div className="kx-runes" aria-hidden="true">
        {ROWS.map((r, i) => <div key={i} className={`kx-row${r.reverse ? ' rev' : ''}`} style={{ top: `${r.top}%`, fontSize: r.size, animationDuration: `${r.dur}s`, opacity: r.opacity }}><span>{r.text}</span><span>{r.text}</span></div>)}
      </div>
      <div className="kx-ring" /><div className="kx-ring kx-ring2" />
      <div className="kx-flash" />
      <div className="kx-content"><span className="kx-skull">☠</span><h1>Como Você Quer Matar Ele(a)?</h1></div>
    </div>
  </div>;
}
