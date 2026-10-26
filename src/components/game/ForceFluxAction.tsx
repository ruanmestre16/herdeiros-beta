import { useState } from 'react';
import { AlertTriangle, Dices, Flame, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  forceFlux, isTechAgent, karmaMaximum, karmaStage, sheetState, type Character,
} from '@/lib/game';
import type { RollEntry } from './SheetExtras';
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
  const stage = karmaStage(character.karma, maxKarma);
  const percent = Math.min(100, Math.floor(Math.max(0, character.karma) / maxKarma * 100));
  const full = character.pf_current >= maxPf;
  const consumed = stage === 'consumido';
  const canForce = !tech && !full && !consumed;

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

  return <section className="hff-panel" aria-label="Forçar o Fluxo">
    <div className="hff-header">
      <div className="hff-icon"><Flame size={20} /></div>
      <div className="hff-heading">
        <span>ENERGIA SOB PRESSÃO · AÇÃO LIVRE</span>
        <strong>Forçar o Fluxo</strong>
        <p>Quando os PF não bastam, force seus limites. O poder volta, mas o Karma aumenta.</p>
      </div>
    </div>
    <div className="hff-counters" aria-label="Estado atual dos recursos">
      <div><span>PF disponíveis</span><strong>{character.pf_current}<small> / {maxPf}</small></strong></div>
      <div><span>Karma acumulado</span><strong>{character.karma}<small> / {maxKarma}</small></strong></div>
      <div><span>Risco</span><strong>{percent}%</strong></div>
    </div>
    <div className="hff-meter" role="progressbar" aria-label="Karma acumulado" aria-valuemin={0} aria-valuemax={maxKarma} aria-valuenow={Math.min(maxKarma, Math.max(0, character.karma))}>
      <div style={{ width: `${percent}%` }} />
    </div>
    <div className="hff-buttons">
      <Button type="button" variant="outline" className="hff-force" onClick={force} disabled={!canForce} aria-label="Forçar o Fluxo: rolar Espírito para recuperar PF e receber Karma">
        <Dices size={18}/> Forçar o Fluxo
      </Button>
      <span>Rola {Math.max(1, character.espirito)}d20 de ESPÍRITO · ½ da soma = PF · ½ dos PF = Karma</span>
    </div>
    {full && <p className="hff-note">Seu reservatório de PF já está cheio. Gaste PF antes de forçar o Fluxo.</p>}
    {consumed && <p className="hff-danger" role="alert"><AlertTriangle size={17}/> Karma em 100%: resolva o estado Consumido com o Mestre antes de forçar novamente.</p>}
    {last && <div className="hff-result" role="status" aria-live="polite">
      <div className="hff-result-title"><Zap size={16}/><strong>Fluxo forçado</strong></div>
      <p>ESPÍRITO: {last.dice.join(' + ')} = <strong>{last.rolled}</strong>.</p>
      <p><strong>+{last.generated} PF</strong> gerados{last.stored !== last.generated ? ` · ${last.stored} armazenados (limite ${last.maxPf})` : ' e armazenados'}.</p>
      <p><strong>+{last.karmaGenerated} Karma</strong>{last.doubled ? ' (Âncora quebrada: dobrado)' : ''}{last.karmaApplied !== last.karmaGenerated ? ` · ${last.karmaApplied} até o limite` : ''}. Agora {last.nextKarma}/{last.maxKarma}.</p>
      {last.stage === 'gaki' && <p className="hff-risk-note">50% de Karma: Distorção, +3 de dano (conforme o Códice).</p>}
      {last.stage === 'berserker' && <p className="hff-risk-note">70% de Karma: Berserker, +5 de dano (conforme o Códice).</p>}
      {last.stage === 'consumido' && <p className="hff-danger"><AlertTriangle size={16}/> 100%: Consumido pelo Karma. O Mestre resolve as consequências.</p>}
    </div>}
  </section>;
}
