import { useState } from 'react';
import { AlertTriangle, Dices, Flame, Minus, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  forceFlux, isTechAgent, karmaMaximum, karmaStage, sheetState, type Character,
} from '@/lib/game';
import type { RollEntry } from './SheetExtras';
import { KarmaRiskPanel } from './KarmaRiskPanel';
import './force-flux.css';

type Update = (patch: Partial<Character>) => void;
type AddRoll = (entry: RollEntry) => void;

type ForceResult = {
  dice: number[];
  rolled: number;
  generated: number;
  stored: number;
  karmaGenerated: number;
  karmaApplied: number;
  doubled: boolean;
  nextKarma: number;
  maxKarma: number;
  nextPf: number;
  maxPf: number;
  stage: ReturnType<typeof karmaStage>;
};

/**
 * Forçar o Fluxo: Códice Supremo, capítulo VI, pág. 33.
 *  - ação livre; d20s de ESPÍRITO;
 *  - PF gerados = metade da soma, arredondada para baixo;
 *  - Karma recebido = metade dos PF gerados, arredondada para baixo;
 *  - Âncora Sentimental quebrada dobra o Karma recebido (regra já existente na ficha);
 *  - os medidores persistentes respeitam o limite da ficha e o limite de Karma.
 * Apenas para linhagens que usam PF. O Agente usa TechCoreStability/Forçar Núcleo.
 */
export function ForceFluxAction({ character, update, addRoll }: {
  character: Character;
  update: Update;
  addRoll: AddRoll;
}) {
  const [last, setLast] = useState<ForceResult | null>(null);
  const tech = isTechAgent(character.lineage);
  const maxPf = Math.max(1, character.pf_max);
  const maxKarma = karmaMaximum(character.mente, character.espirito);
  const currentKarma = Math.max(0, Math.min(maxKarma, Math.round(character.karma || 0)));
  const stage = karmaStage(currentKarma, maxKarma);
  const percent = Math.min(100, Math.floor(currentKarma / maxKarma * 100));
  const full = character.pf_current >= maxPf;
  const consumed = stage === 'consumido';
  // PF cheio ou Karma acima de 50/70% NÃO impedem Forçar Fluxo.
  // Só o estado terminal Consumido impede uma nova ação até decisão do Mestre.
  const canForce = !tech && !consumed;

  function force() {
    if (!canForce) return;
    const r = forceFlux(character.espirito);
    const broken = sheetState(character).anchorBroken;
    const karmaGenerated = r.karma * (broken ? 2 : 1);
    const nextPf = Math.min(maxPf, Math.max(0, character.pf_current) + r.pf);
    const nextKarma = Math.min(maxKarma, Math.max(0, character.karma) + karmaGenerated);
    const stored = nextPf - Math.max(0, character.pf_current);
    const karmaApplied = nextKarma - Math.max(0, character.karma);
    const nextStage = karmaStage(nextKarma, maxKarma);
    // Uma atualização para PF e Karma: a mesma ação é persistida pelo fluxo de salvamento da ficha.
    update({ pf_current: nextPf, karma: nextKarma });
    addRoll({
      expression: r.expression,
      dice: r.dice,
      modifier: 0,
      total: r.total,
      source: `Forçar o Fluxo · ${character.name} · ${r.total} nos dados → +${r.pf} PF gerados (${stored} armazenados), +${karmaGenerated} Karma${broken ? ' · Âncora quebrada: Karma dobrado' : ''}${nextStage === 'consumido' ? ' · CONSUMIDO PELO KARMA' : ''}`,
    });
    setLast({
      dice: r.dice, rolled: r.total, generated: r.pf, stored,
      karmaGenerated, karmaApplied, doubled: broken, nextKarma,
      maxKarma, nextPf, maxPf, stage: nextStage,
    });
  }

  if (tech) return null;

  return <section className="hff-panel" data-karma-stage={stage} aria-label="Forçar o Fluxo">
    <div className="hff-header">
      <div className="hff-icon"><Flame size={20} /></div>
      <div className="hff-heading">
        <span>ENERGIA SOB PRESSÃO · AÇÃO LIVRE</span>
        <strong>Forçar o Fluxo</strong>
        <p>Use quando os PF faltarem ou quando escolher arriscar mais poder. Mesmo com PF cheio, o Karma da rolagem é cobrado.</p>
      </div>
    </div>
    <div className="hff-counters" aria-label="Estado atual dos recursos">
      <div><span>PF disponíveis</span><strong>{character.pf_current}<small> / {maxPf}</small></strong></div>
      <div className="hff-karma-counter">
        <span>Karma acumulado</span>
        <strong>{currentKarma}<small> / {maxKarma}</small></strong>
        <div className="hff-karma-adjust" role="group" aria-label="Ajustar Karma durante o combate">
          <button type="button" aria-label="Diminuir Karma em 1 ponto" title="Diminuir Karma em 1 ponto" disabled={currentKarma <= 0}
            onClick={() => update({ karma: Math.max(0, currentKarma - 1) })}><Minus size={16}/></button>
          <button type="button" aria-label="Aumentar Karma em 1 ponto" title="Aumentar Karma em 1 ponto" disabled={currentKarma >= maxKarma}
            onClick={() => update({ karma: Math.min(maxKarma, currentKarma + 1) })}><Plus size={16}/></button>
        </div>
      </div>
      <div><span>Risco</span><strong>{percent}%</strong></div>
    </div>
    <div className="hff-meter" role="progressbar" aria-label="Karma acumulado" aria-valuemin={0} aria-valuemax={maxKarma} aria-valuenow={Math.min(maxKarma, Math.max(0, character.karma))}>
      <div style={{ width: `${percent}%` }} />
    </div>
    <KarmaRiskPanel character={character} addRoll={addRoll} update={update} showAdjust={false}/>
    <div className="hff-buttons">
      <Button type="button" variant="outline" className="hff-force" onClick={force} disabled={!canForce} aria-label="Forçar o Fluxo: rolar Espírito para recuperar PF e receber Karma">
        <Dices size={18}/> Forçar o Fluxo
      </Button>
      <span>Rola {Math.max(1, character.espirito)}d20 de ESPÍRITO · ½ da soma = PF · ½ dos PF = Karma</span>
    </div>
    {full && <p className="hff-note">PF já está no máximo. Você ainda pode Forçar o Fluxo: o excedente não será armazenado, mas o Karma será recebido.</p>}
    {consumed && <p className="hff-danger" role="alert"><AlertTriangle size={17}/> 100% de Karma: personagem consumido. Não é possível Forçar o Fluxo até a decisão narrativa do Mestre.</p>}
    {last && <div className="hff-result" role="status" aria-live="polite">
      <div className="hff-result-title"><Zap size={16}/><strong>Fluxo forçado</strong></div>
      <p>ESPÍRITO: {last.dice.join(' + ')} = <strong>{last.rolled}</strong>.</p>
      <p><strong>+{last.generated} PF</strong> gerados{last.stored !== last.generated ? ` · ${last.stored} armazenados (limite ${last.maxPf})` : ' e armazenados'}.</p>
      <p><strong>+{last.karmaGenerated} Karma</strong>{last.doubled ? ' (Âncora quebrada: dobrado)' : ''}{last.karmaApplied !== last.karmaGenerated ? ` · ${last.karmaApplied} até o limite` : ''}. Agora {last.nextKarma}/{last.maxKarma}.</p>
      {last.stage === 'gaki' && <p className="hff-risk-note">Distorção: +3 de dano, resistência à dor e perda progressiva de empatia.</p>}
      {last.stage === 'berserker' && <p className="hff-risk-note">Berserker: +5 de dano, imunidade à dor. Teste de MENTE quando o Mestre solicitar (até 1× por rodada).</p>}
      {last.stage === 'consumido' && <p className="hff-danger"><AlertTriangle size={16}/> 100%: Consumido. Morte é o desfecho padrão da campanha; o Mestre decide a resolução narrativa.</p>}
    </div>}
  </section>;
}
