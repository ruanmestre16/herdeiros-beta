import { Minus, Plus, Sparkles } from 'lucide-react';
import { isTechAgent, milestoneKey, milestonePath, sheetState, stageIndexFor, type Character } from '@/lib/game';
import './gs-control.css';

/**
 * Controle compartilhado de Grau de Sincronia.
 * A alteração do GS NÃO aplica o marco automaticamente: o jogador/Mestre
 * precisa escolher e confirmar o marco no painel de Evolução, como no Códice.
 * O salvamento ocorre através do mesmo update da ficha (Supabase Realtime).
 */
export function GsControl({ character, onChange, compact = false, disabled = false }: {
  character: Character;
  onChange: (gs: number) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const value = Math.max(0, Math.min(10, Number(character.gs) || 0));
  const state = sheetState(character);
  const milestones = state.milestones;
  const stage = stageIndexFor(character.lineage, character.stage);
  const tech = isTechAgent(character.lineage);
  const pathChosen = tech ? !!state.techGsMarks?.['0:5'] : !!milestonePath(character);
  const markers = ([5, 7, 10] as const).map(gs => {
    const completed = tech && stage === 0 ? !!state.techGsMarks?.[`0:${gs}`] : tech && stage === 1 ? (state.techCoreMarks ?? []).includes(gs) : milestones.includes(milestoneKey(character, gs));
    const reached = value >= gs;
    const needsPrevious = tech ? (stage===0 ? gs > 5 && !pathChosen : stage===1 ? (gs===7 && !(state.techCoreMarks??[]).includes(5) || gs===10 && !(state.techCoreMarks??[]).includes(7)) : false) : stage < 2 && gs > 5 && !pathChosen;
    const ready = reached && !completed && !needsPrevious;
    return { gs, completed, ready, reached, needsPrevious };
  });
  const available = markers.filter(m => m.ready);

  const adjust = (difference: number) => {
    const next = Math.max(0, Math.min(10, value + difference));
    if (next !== value) onChange(next);
  };

  return <div className={`hu-gs-control ${compact ? 'hu-gs-compact' : ''}`}>
    <div className="hu-gs-main">
      <div className="hu-gs-value">
        {!compact && <span className="hu-gs-label"><Sparkles size={15} /> GRAU DE SINCRONIA</span>}
        <strong aria-label={`Grau de Sincronia: ${value} de 10`}>{value}<small>/10</small></strong>
        {compact && <span className="hu-gs-mini-label">GS</span>}
      </div>
      <div className="hu-gs-buttons" role="group" aria-label={`Ajustar GS de ${character.name}`}>
        <button type="button" onClick={() => adjust(-1)} disabled={disabled || value <= 0} title="Diminuir 1 GS" aria-label={`Diminuir GS de ${character.name}`}><Minus size={19}/></button>
        <button type="button" onClick={() => adjust(1)} disabled={disabled || value >= 10} title="Aumentar 1 GS" aria-label={`Aumentar GS de ${character.name}`}><Plus size={19}/></button>
      </div>
    </div>
    {!compact && <>
      <div className="hu-gs-progress" role="progressbar" aria-label="Progresso de Grau de Sincronia" aria-valuenow={value} aria-valuemin={0} aria-valuemax={10}>
        <span style={{ width: `${value * 10}%` }} />
      </div>
      <div className="hu-gs-markers" aria-label="Marcos de evolução">
        {markers.map(({gs,completed,ready,reached,needsPrevious}) => <div key={gs} className={`hu-gs-marker ${completed ? 'completed' : ready ? 'ready' : 'locked'}`}>
          <strong>{gs} GS</strong><small>{completed ? 'Concluído' : ready ? 'Liberado' : reached && needsPrevious ? (tech && stage === 1 ? 'Conclua o marco anterior' : 'Escolha o caminho') : 'Bloqueado'}</small>
        </div>)}
      </div>
      <p className={`hu-gs-feedback ${available.length ? 'available' : ''}`} role="status" aria-live="polite">
        {available.length
          ? `✦ ${available.length === 1 ? 'Marco liberado' : 'Marcos liberados'}: ${available.map(m => `${m.gs} GS`).join(', ')}. Abra a trilha de evolução abaixo e escolha o aprimoramento.`
          : value === 10 && markers[2]?.completed
            ? 'Marco de 10 GS concluído. Confira se o avanço de estágio está disponível abaixo.'
            : 'Os marcos de 5, 7 e 10 GS serão liberados conforme sua jornada.'}
      </p>
      <p className="hu-gs-rule-note">O Mestre concede GS. Aumentar GS libera marcos, mas não escolhe poderes automaticamente. Diminuir GS não desfaz marcos já concluídos.</p>
    </>}
  </div>;
}
