import { useState } from 'react';
import { AlertTriangle, Cpu, Minus, Plus, ShieldCheck, Skull, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  coreDestructionMaximum, coreDestructionPercent, coreRiskDetails,
  forceFlux, isTechAgent, techCoreConsumed, type Character,
} from '@/lib/game';
import type { RollEntry } from './SheetExtras';
import './tech-core-stability.css';

type Update = (patch: Partial<Character>) => void;
export function TechCoreStability({ character, update, addRoll, compact = false, forceOnly = false, showForce = true }: {
  character: Character;
  update?: Update;
  addRoll?: (entry: RollEntry) => void;
  compact?: boolean;
  /** Mostra apenas a ação de Forçar Núcleo em Combate → Fluxo e carga. */
  forceOnly?: boolean;
  /** Mantém o estado e os ajustes +/− visíveis, sem repetir a ação de combate. */
  showForce?: boolean;
}) {
  const [last, setLast] = useState('');
  if (!isTechAgent(character.lineage)) return null;
  const max = coreDestructionMaximum(character);
  const current = Math.max(0, Math.min(max, Math.round(character.karma || 0)));
  const percent = coreDestructionPercent(character);
  const risk = coreRiskDetails(character)!;
  const consumed = techCoreConsumed(character);

  function force() {
    if (!update || !addRoll || consumed) return;
    const f = forceFlux(character.espirito);
    const nextPn = Math.min(character.pf_max, character.pf_current + f.pf);
    const nextRisk = Math.min(max, character.karma + f.karma);
    update({ pf_current: nextPn, karma: nextRisk });
    addRoll({ expression: f.expression, dice: f.dice, modifier: 0, total: f.total,
      source: `Forçar Núcleo · ${character.name} · +${f.pf} PN (${nextPn - character.pf_current} armazenados), +${f.karma} Destruição do Núcleo` });
    setLast(`Forçou o Núcleo: +${f.pf} PN gerados, +${f.karma} Destruição. Nova integridade: ${Math.max(0, Math.round((1 - nextRisk / max) * 100))}%.${nextRisk >= max ? ' NÚCLEO CONSUMIDO — resolva com o Mestre.' : ''}`);
  }

  if (forceOnly) return <section className={`tc-stability tc-force-only tc-${risk.stage}`} aria-label="Forçar Núcleo em Fluxo e carga">
    <header className="tc-heading">
      <span className="tc-icon"><Zap size={21}/></span>
      <div><span className="tc-overline">AGENTE TECNOLÓGICO · AÇÃO LIVRE</span><strong>Forçar Núcleo</strong></div>
    </header>
    <p className="tc-description">Role os d20 de TECNOLOGIA para gerar PN. Metade dos PN gerados aumenta a Destruição do Núcleo, mesmo se os PN já estiverem cheios.</p>
    <div className="tc-force-stats"><span>PN atuais <strong>{character.pf_current}/{character.pf_max}</strong></span><span>Destruição <strong>{current}/{max} · {percent}%</strong></span></div>
    {consumed && <p className="tc-critical" role="alert"><AlertTriangle size={18}/> Núcleo consumido. Novas ativações indisponíveis até a resolução do Mestre.</p>}
    <div className="tc-actions">
      <Button type="button" variant="outline" className="tc-force" disabled={!update || !addRoll || consumed} onClick={force}><Zap size={17}/> Forçar Núcleo</Button>
      <span className="tc-force-hint"><Cpu size={15}/> {Math.max(1,character.espirito)}d20 de TECNOLOGIA → metade em PN → metade dos PN gerados em Destruição.</span>
    </div>
    {last && <p className="tc-last" role="status"><Sparkles size={14}/>{last}</p>}
  </section>;

  return <section className={`tc-stability tc-${risk.stage}${compact ? ' tc-compact' : ''}`} aria-label="Integridade do Núcleo">
    <header className="tc-heading">
      <span className="tc-icon">{consumed ? <Skull size={21} /> : percent >= 50 ? <AlertTriangle size={21} /> : <ShieldCheck size={21} />}</span>
      <div><span className="tc-overline">AGENTE TECNOLÓGICO · SOBRECARGA</span><strong>{risk.title}</strong></div>
      <span className="tc-quick-adjust">
        {update && <span className="tc-adjust-buttons" role="group" aria-label="Ajustar destruição do Núcleo diretamente">
          <button type="button" disabled={current <= 0} onClick={() => update({ karma: Math.max(0, current - 1) })} aria-label="Diminuir destruição do Núcleo em 1 ponto" title="Diminuir destruição do Núcleo em 1 ponto"><Minus size={16}/></button>
          <button type="button" disabled={current >= max} onClick={() => update({ karma: Math.min(max, current + 1) })} aria-label="Aumentar destruição do Núcleo em 1 ponto" title="Aumentar destruição do Núcleo em 1 ponto"><Plus size={16}/></button>
        </span>}
        <span className="tc-percent">{percent}%<small>{current}/{max} · destruição</small></span>
      </span>
    </header>
    <div className="tc-meter" role="progressbar" aria-valuenow={Math.min(max, character.karma)} aria-valuemin={0} aria-valuemax={max} aria-label="Destruição acumulada do Núcleo">
      <div style={{width:`${percent}%`}} />
      <span className="tc-mark tc-mark50"/><span className="tc-mark tc-mark70"/>
    </div>
    <div className="tc-scale"><span>0 · Estável</span><span>50% · +3</span><span>70% · +5</span><span>100% · Consumido</span></div>
    <p className="tc-description">{risk.text}</p>
    {consumed&&<div className="tc-critical" role="alert"><AlertTriangle size={18}/><span>Habilidades e Arma de Núcleo bloqueadas na ficha. Não foram apagadas. O Mestre decide a perda, reconstrução, sobrevivência ou morte conforme a história.</span></div>}
    {!compact&&<div className="tc-thresholds">
      <div className={percent>=50?'tc-reached':''}><strong>50%</strong><span>Núcleo Instável</span><small>+3 de dano</small></div>
      <div className={percent>=70?'tc-reached':''}><strong>70%</strong><span>Autodestruição Iminente</span><small>+5 de dano, pulsos elétricos</small></div>
      <div className={percent>=100?'tc-reached':''}><strong>100%</strong><span>Núcleo Consumido</span><small>Colapso e decisão narrativa</small></div>
    </div>}
    {update && showForce && <div className="tc-actions">

      {showForce && addRoll && <Button type="button" variant="outline" className="tc-force" disabled={consumed} onClick={force}><Zap size={17}/> Forçar Núcleo</Button>}
      {showForce && <span className="tc-force-hint"><Cpu size={15}/> Rola {Math.max(1,character.espirito)}d20 de TECNOLOGIA: metade vira PN; metade dos PN gerados aumenta a destruição.</span>}
    </div>}
    {last&&<p className="tc-last" role="status"><Sparkles size={14}/>{last}</p>}
    <p className="tc-small">O campo técnico é salvo na ficha existente. A destruição não é GS e não altera as trilhas de evolução. Reparos e consequências dependem do Mestre.</p>
  </section>;
}
