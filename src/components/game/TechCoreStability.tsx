import { useState } from 'react';
import { AlertTriangle, Cpu, ShieldCheck, Skull, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Stepper } from './Controls';
import {
  coreDestructionMaximum, coreDestructionPercent, coreRiskDetails,
  forceFlux, isTechAgent, techCoreConsumed, type Character,
} from '@/lib/game';
import type { RollEntry } from './SheetExtras';
import './tech-core-stability.css';

type Update = (patch: Partial<Character>) => void;
export function TechCoreStability({ character, update, addRoll, compact = false }: {
  character: Character;
  update?: Update;
  addRoll?: (entry: RollEntry) => void;
  compact?: boolean;
}) {
  const [last, setLast] = useState('');
  if (!isTechAgent(character.lineage)) return null;
  const max = coreDestructionMaximum(character);
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

  return <section className={`tc-stability tc-${risk.stage}${compact ? ' tc-compact' : ''}`} aria-label="Integridade do Núcleo">
    <header className="tc-heading">
      <span className="tc-icon">{consumed ? <Skull size={21} /> : percent >= 50 ? <AlertTriangle size={21} /> : <ShieldCheck size={21} />}</span>
      <div><span className="tc-overline">AGENTE TECNOLÓGICO · SOBRECARGA</span><strong>{risk.title}</strong></div>
      <span className="tc-percent">{percent}%<small>destruição</small></span>
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
    {update&&<div className="tc-actions">
      {!compact&&<Stepper label="DESTRUIÇÃO ACUMULADA" value={Math.min(max,character.karma)} min={0} max={max} tone="nucleo" onChange={karma=>update({karma})}/>}
      {addRoll&&<Button type="button" variant="outline" className="tc-force" disabled={consumed} onClick={force}><Zap size={17}/> Forçar Núcleo</Button>}
      <span className="tc-force-hint"><Cpu size={15}/> Rola {Math.max(1,character.espirito)}d20 de TECNOLOGIA: metade vira PN; metade dos PN gerados aumenta a destruição.</span>
    </div>}
    {last&&<p className="tc-last" role="status"><Sparkles size={14}/>{last}</p>}
    <p className="tc-small">O campo técnico é salvo na ficha existente. A destruição não é GS e não altera as trilhas de evolução. Reparos e consequências dependem do Mestre.</p>
  </section>;
}
