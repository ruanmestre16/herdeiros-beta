import { AlertTriangle, Brain, Flame, Minus, Plus, ShieldAlert, Skull } from 'lucide-react';
import { isTechAgent, karmaMaximum, karmaStage, type Character } from '@/lib/game';
import { KarmaTest, type RollEntry } from './SheetExtras';
import './karma-risk.css';

/** Estados do Capítulo IX do Códice. Os detalhes de apatia, teste por rodada
 * e morte como desfecho padrão seguem a adaptação definida para esta mesa.
 * O Mestre continua responsável por resolver a narrativa e a DT dos testes.
 */
export function KarmaRiskPanel({ character, addRoll, update, compact = false, showAdjust = true }: {
  character: Character;
  addRoll?: (entry: RollEntry) => void;
  update?: (patch: Partial<Character>) => void;
  compact?: boolean;
  /** Oculta apenas os botões quando o ajuste já aparece no cabeçalho do combate. */
  showAdjust?: boolean;
}) {
  if (isTechAgent(character.lineage)) return null;
  const max = karmaMaximum(character.mente, character.espirito);
  const current = Math.max(0, Math.min(max, Math.round(character.karma || 0)));
  const percent = Math.min(100, Math.floor((100 * current) / max));
  const stage = karmaStage(current, max);
  const info = {
    normal: { name: 'Fluxo estável', label: 'ABAIXO DE 50%', damage: 'Sem bônus de Karma', icon: Flame },
    gaki: { name: 'Distorção', label: 'A PARTIR DE 50%', damage: '+3 de dano em todos os ataques', icon: Flame },
    berserker: { name: 'Berserker', label: 'A PARTIR DE 70%', damage: '+5 de dano em todos os ataques', icon: ShieldAlert },
    consumido: { name: 'Consumido pelo Karma', label: '100% · ESTADO TERMINAL', damage: 'Morte / desfecho definido pelo Mestre', icon: Skull },
  }[stage];
  const Icon = info.icon;
  return <section className={`hkr-panel hkr-${stage}${compact ? ' hkr-compact' : ''}`} aria-label={`Karma: ${info.name}, ${percent}%`}>
    <div className="hkr-heading">
      <div className="hkr-heading-main"><span className="hkr-icon"><Icon size={19}/></span><div><small>{info.label}</small><strong>{info.name}</strong></div></div>
      <div className="hkr-quick-adjust">
        {update && showAdjust && <div className="hkr-adjust-buttons" role="group" aria-label="Ajustar Karma diretamente">
          <button type="button" disabled={current <= 0} onClick={() => update({ karma: Math.max(0, current - 1) })} aria-label="Diminuir Karma em 1 ponto" title="Diminuir Karma em 1 ponto"><Minus size={16}/></button>
          <button type="button" disabled={current >= max} onClick={() => update({ karma: Math.min(max, current + 1) })} aria-label="Aumentar Karma em 1 ponto" title="Aumentar Karma em 1 ponto"><Plus size={16}/></button>
        </div>}
        <div className="hkr-percentage"><strong>{percent}%</strong><small>{current}/{max} Karma</small></div>
      </div>
    </div>
    <div className="hkr-track" role="progressbar" aria-label="Karma acumulado" aria-valuenow={Math.min(max,current)} aria-valuemin={0} aria-valuemax={max}><div style={{width:`${percent}%`}}/></div>
    <p className="hkr-damage"><strong>{info.damage}</strong>{stage==='berserker' ? ' (substitui +3; não soma)' : ''}</p>
    {stage === 'normal' && <p className="hkr-copy">Sem alterações de comportamento. A partir de 50% começa a Distorção.</p>}
    {stage === 'gaki' && <p className="hkr-copy">O personagem fica mais resistente à dor; surgem marcas de Gaki. A agressividade aumenta, ele se torna mais apático e começa a perder empatia pelas pessoas ao redor.</p>}
    {stage === 'berserker' && <>
      <p className="hkr-copy">Imune à dor, com marcas graves de corrupção, agressividade intensa e pensamentos cada vez mais descontrolados.</p>
      <p className="hkr-callout"><Brain size={16}/><span><strong>Teste de MENTE:</strong> quando o Mestre pedir, até uma vez por rodada. Se falhar, ataca o ser mais próximo, sem distinguir amigo de inimigo. A DT é definida pelo Mestre.</span></p>
      {!!addRoll && <details className="hkr-mental-check"><summary>Rolar teste de MENTE contra o Karma</summary><KarmaTest character={character} addRoll={addRoll} {...(update ? {update} : {})}/></details>}
    </>}
    {stage === 'consumido' && <p className="hkr-callout hkr-end" role="alert"><AlertTriangle size={18}/><span><strong>Limite atingido: o Karma consumiu o personagem.</strong> Na campanha, o desfecho esperado é a morte. O Mestre pode definir a consequência narrativa final, como prevê o Códice. Não se deve continuar atacando ou forçando o Fluxo sem essa resolução.</span></p>}
  </section>;
}
