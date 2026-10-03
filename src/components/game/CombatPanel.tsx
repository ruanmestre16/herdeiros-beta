import { useMemo, useState } from 'react';
import { ArrowRight, Crosshair, Dices, RotateCcw, Shield, Skull, Swords, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ATTR_LABEL, WEAPONS, attackRoll, multiAttackRoll, humanAttackDice, cappedNomenclatureDice, cappedWeaponDice, damageRoll, derived, initiativeRoll,
  karmaDamageBonus, weaponAttrFor, weaponByKey, type Attr, type Campaign, type Character, type Npc,
} from '@/lib/game';
import type { RollEntry } from './SheetExtras';

type Combatant = {
  id: string; kind: 'pc' | 'npc'; name: string; pv: number; pvMax: number; pf: number; pfMax: number;
  corpo: number; mente: number; espirito: number; esquiva: number; bloqueio: number; initiative: number | null;
  pc?: Character; npc?: Npc;
};
type AttackOption = { id: string; label: string; hitAttr: Attr; dice: string[]; damageAttr: Attr | null; pfCost: number; karma: number; nomenclature: boolean; hitCount?: number };

function toCombatants(party: Character[], npcs: Npc[]): Combatant[] {
  const pcs = party.map<Combatant>(c => { const d = derived(c.corpo); return { id: c.id, kind: 'pc', name: c.name, pv: c.pv_current, pvMax: c.pv_max, pf: c.pf_current, pfMax: c.pf_max, corpo: c.corpo, mente: c.mente, espirito: c.espirito, esquiva: d.esquiva, bloqueio: d.bloqueio, initiative: c.initiative, pc: c }; });
  const ns = npcs.map<Combatant>(n => ({ id: n.id, kind: 'npc', name: n.name, pv: n.pv_current, pvMax: n.pv_max, pf: n.pf_current, pfMax: n.pf_max, corpo: n.corpo, mente: n.mente, espirito: n.espirito, esquiva: n.esquiva, bloqueio: n.bloqueio, initiative: n.initiative ?? null, npc: n }));
  return [...pcs, ...ns].sort((a, b) => (b.initiative ?? -999) - (a.initiative ?? -999));
}

function optionsFor(c: Combatant): AttackOption[] {
  const karma = c.pc ? karmaDamageBonus(c.pc) : 0;
  const opts: AttackOption[] = [
    { id: 'desarmado_leve', label: 'Físico · Desarmado leve (1d6 + CORPO)', hitAttr: 'corpo', dice: ['1d6'], damageAttr: 'corpo', pfCost: 0, karma, nomenclature: false },
    { id: 'desarmado_pesado', label: 'Físico · Desarmado médio/pesado (2d8 a 3d8 + CORPO)', hitAttr: 'corpo', dice: ['2d8', '3d8'], damageAttr: 'corpo', pfCost: 0, karma, nomenclature: false },
  ];
  if (c.pc) {
    const w = weaponByKey(c.pc.weapon_type);
    if (w && w.attr !== 'corpo') { const attr = weaponAttrFor(c.pc.lineage); const human = c.pc.lineage === 'Humano'; const hc = human ? humanAttackDice(c.pc.mente) : 1; opts.push({ id: 'arma', label: `Arma · ${c.pc.weapon || w.label} (${human ? `ataque ${hc}d20 + MENTE · dano ` : ''}${cappedWeaponDice(w.key, c.pc.weapon_dice)}${w.attr && !human ? ` + ${ATTR_LABEL[attr]}` : ''})`, hitAttr: attr, dice: [cappedWeaponDice(w.key, c.pc.weapon_dice)!], damageAttr: w.attr && !human ? attr : null, pfCost: 0, karma, nomenclature: false, hitCount: hc }); }
    c.pc.nomenclatures.forEach((n, i) => { const dice = cappedNomenclatureDice(n.kind, n.dice); opts.push({ id: `nom-${i}`, label: `Nomenclatura · ${n.name} (${dice}d8 · ${n.cost} PF)`, hitAttr: 'espirito', dice: [`${dice}d8`], damageAttr: null, pfCost: n.cost, karma, nomenclature: true }); });
  } else {
    WEAPONS.filter(w => w.attr !== 'corpo').forEach(w => opts.push({ id: `npc-${w.key}`, label: `Arma · ${w.label} (${w.dice.join(' a ')}${w.attr ? ' + CORPO' : ''})`, hitAttr: 'corpo', dice: w.dice, damageAttr: w.attr ? 'corpo' : null, pfCost: 0, karma: 0, nomenclature: false }));
  }
  return opts;
}

export function CombatPanel({ campaign, party, npcs, saveCampaign, saveNpc, updateSheet, addRoll }: {
  campaign: Campaign; party: Character[]; npcs: Npc[];
  saveCampaign: (c: Campaign) => void; saveNpc: (n: Npc) => void;
  updateSheet: (id: string, pv: number | null, pf: number | null, clearInitiative?: boolean) => void;
  addRoll: (r: RollEntry) => void;
}) {
  const combatants = useMemo(() => toCombatants(party, npcs), [party, npcs]);
  const current = campaign.combat_active && combatants.length ? combatants[campaign.turn_index % combatants.length] : undefined;
  const [attackerId, setAttackerId] = useState('');
  const [optionId, setOptionId] = useState('desarmado_leve');
  const [diceChoice, setDiceChoice] = useState('');
  const [targetId, setTargetId] = useState('');
  const [useBlock, setUseBlock] = useState(true);
  const [mode, setMode] = useState<'single' | 'full' | 'half'>('single');
  const [area, setArea] = useState<null | { attackerId: string; option: AttackOption; dice: string; d20: number; total: number; crit: boolean; results: { id: string; name: string; esquiva: number; hit: boolean; crit: boolean }[]; damage?: { raw: number; applied: number; lines: string[] } }>(null);
  const [pending, setPending] = useState<null | { attackerId: string; targetId: string; option: AttackOption; dice: string; d20: number; total: number; esquiva: number; hit: boolean; crit: boolean; damage?: { raw: number; dice: number[]; bonus: number; block: number; final: number } }>(null);

  const attacker = combatants.find(c => c.id === (attackerId || current?.id)) ?? combatants[0];
  const options = attacker ? optionsFor(attacker) : [];
  const option = options.find(o => o.id === optionId) ?? options[0];
  const dice = option && option.dice.includes(diceChoice) ? diceChoice : option?.dice[0] ?? '';
  const targets = combatants.filter(c => c.id !== attacker?.id);
  const target = targets.find(c => c.id === targetId) ?? targets[0];

  const areaTargets = attacker ? combatants.filter(c => c.id !== attacker.id && c.kind !== attacker.kind) : [];
  function rollAreaAttack() {
    if (!attacker || !option || !areaTargets.length || option.pfCost > attacker.pf) return;
    const attrValue = attacker[option.hitAttr]; const hc = option.hitCount ?? Math.max(1, attrValue);
    const r = hc > 1 ? multiAttackRoll(hc, attrValue) : { ...attackRoll(attrValue), dice: undefined as number[] | undefined };
    if (option.pfCost) setResources(attacker, null, attacker.pf - option.pfCost);
    const results = areaTargets.map(t => { const hit = r.total >= t.esquiva; return { id: t.id, name: t.name, esquiva: t.esquiva, hit, crit: r.d20 === 20 && r.total > t.esquiva }; });
    setPending(null); setArea({ attackerId: attacker.id, option, dice, d20: r.d20, total: r.total, crit: r.d20 === 20, results });
    addRoll({ expression: `${hc}d20${hc > 1 ? ' (maior)' : ''} + ${attrValue}`, dice: r.dice ?? [r.d20], modifier: attrValue, total: r.total, source: `${attacker.name} → todos (${mode === 'half' ? 'metade' : 'dano total'})`, crit: r.d20 === 20 });
    log([`${attacker.name} ataca TODOS os inimigos (${option.label}, ${mode === 'half' ? 'metade do dano' : 'dano total'}): total ${r.total} → ${results.map(x => `${x.name} (Esq ${x.esquiva}): ${x.hit ? (x.crit ? 'CRÍTICO' : 'acertou') : 'esquivou'}`).join('; ')}`]);
  }
  function rollAreaDamage() {
    if (!area || area.damage) return;
    const a = combatants.find(c => c.id === area.attackerId); if (!a) return;
    const bonus = (area.option.damageAttr ? a[area.option.damageAttr] : 0) + area.option.karma;
    const d = damageRoll(area.dice, bonus, area.results.some(x => x.crit));
    const applied = mode === 'half' ? Math.floor(d.total / 2) : d.total;
    const lines: string[] = [];
    area.results.filter(x => x.hit).forEach(x => { const t = combatants.find(c => c.id === x.id); if (!t) return; const block = useBlock ? t.bloqueio : 0; const final = Math.max(0, applied - block); const pv = Math.max(0, t.pv - final); setResources(t, pv, null); lines.push(`${t.name}: ${applied} − Bloqueio ${block} = ${final} → ${pv} PV${pv === 0 ? ' (AGONIA)' : ''}`); });
    setArea({ ...area, damage: { raw: d.total, applied, lines } });
    addRoll({ expression: d.expression, dice: d.dice, modifier: bonus, total: d.total, source: `Dano em área${mode === 'half' ? ' (metade)' : ''}` });
    log([`Dano em área: ${d.expression} = ${d.total}${mode === 'half' ? ` → metade ${applied}` : ''}. ${lines.join('; ')}`]);
  }

  const log = (lines: string[]) => saveCampaign({ ...campaign, log: [...lines.reverse(), ...campaign.log] });
  function setResources(c: Combatant, pv: number | null, pf: number | null) {
    if (c.npc) saveNpc({ ...c.npc, pv_current: pv === null ? c.npc.pv_current : Math.max(0, Math.min(c.pvMax, pv)), pf_current: pf === null ? c.npc.pf_current : Math.max(0, Math.min(c.pfMax, pf)) });
    else updateSheet(c.id, pv, pf);
  }

  function rollAttack() {
    if (!attacker || !target || !option) return;
    if (option.pfCost > attacker.pf) return;
    const attrValue = attacker[option.hitAttr];
    const hc = option.hitCount ?? Math.max(1, attrValue); const r = hc > 1 ? multiAttackRoll(hc, attrValue, target.esquiva) : { ...attackRoll(attrValue, target.esquiva), dice: undefined as number[] | undefined };
    if (option.pfCost) setResources(attacker, null, attacker.pf - option.pfCost);
    setPending({ attackerId: attacker.id, targetId: target.id, option, dice, d20: r.d20, total: r.total, esquiva: target.esquiva, hit: !!r.hit, crit: r.crit });
    addRoll({ expression: `${hc}d20${hc > 1 ? ' (maior)' : ''} + ${attrValue}`, dice: r.dice ?? [r.d20], modifier: attrValue, total: r.total, source: `${attacker.name} → ${target.name}${r.crit ? ' — CRÍTICO' : ''}`, crit: r.crit });
    log([`${attacker.name} ataca ${target.name} (${option.label}${option.pfCost ? `, −${option.pfCost} PF` : ''}): d20 ${r.d20} + ${ATTR_LABEL[option.hitAttr]} ${attrValue} = ${r.total} vs Esquiva ${target.esquiva} → ${r.hit ? (r.crit ? 'CRÍTICO! ATAQUE ACERTOU' : 'ATAQUE ACERTOU') : 'ALVO ESQUIVOU'}`]);
  }

  function rollDamage() {
    if (!pending || pending.damage) return;
    const a = combatants.find(c => c.id === pending.attackerId); const t = combatants.find(c => c.id === pending.targetId);
    if (!a || !t) return;
    const bonus = (pending.option.damageAttr ? a[pending.option.damageAttr] : 0) + pending.option.karma;
    const d = damageRoll(pending.dice, bonus, pending.crit);
    const block = useBlock ? t.bloqueio : 0; const final = Math.max(0, d.total - block); const pv = Math.max(0, t.pv - final);
    setPending({ ...pending, damage: { raw: d.total, dice: d.dice, bonus, block, final } });
    setResources(t, pv, null);
    addRoll({ expression: d.expression, dice: d.dice, modifier: bonus, total: d.total, source: `Dano em ${t.name}${pending.crit ? ' — CRÍTICO' : ''}`, crit: pending.crit });
    log([`Dano${pending.crit ? ' CRÍTICO (dados dobrados)' : ''}: ${d.expression} = ${d.total} − Bloqueio ${block} = ${final}. ${t.name}: ${t.pv} → ${pv} PV${pv === 0 ? ' — entra em AGONIA' : ''}`]);
  }

  function rollNpcInitiative(n: Npc) {
    const r = initiativeRoll(n.corpo); saveNpc({ ...n, initiative: r.total });
    addRoll({ expression: `${n.corpo}d20 (maior) + ${n.corpo}`, dice: r.dice, modifier: n.corpo, total: r.total, source: `Iniciativa: ${n.name}` });
  }

  return <div className="combat-layout">
    <div className="stack">
      <section className="game-panel"><div className="panel-head"><h3>Ordem de iniciativa</h3><span className="field-kicker">RODADA {campaign.round}</span></div>
        <div className="combat-list">{combatants.map((c, i) => <div key={c.id} className={`combatant ${current?.id === c.id ? 'current' : ''}`}>
          <span className="combatant-number">{c.initiative ?? '—'}</span>
          <span className="combatant-icon">{c.kind === 'npc' ? <Skull /> : <Users />}</span>
          <span className="flex-1"><strong>{c.name}</strong><small>{c.pv} / {c.pvMax} PV · <span className="text-flux">{c.pf} / {c.pfMax} PF</span> · Esq {c.esquiva} · RD {c.bloqueio}{c.pv === 0 ? ' · AGONIA' : ''}</small></span>
          {c.npc ? <Button variant="ghost" size="icon" title="Rolar iniciativa" aria-label={`Rolar iniciativa de ${c.name}`} onClick={() => rollNpcInitiative(c.npc!)}><Dices /></Button> : <span className="field-kicker">{c.initiative === null ? 'AGUARDANDO FICHA' : 'DA FICHA'}</span>}
          <span className="sr-only">{i}</span>
        </div>)}{!combatants.length && <p className="empty-copy">Os jogadores entram pela Mesa escolhendo sua ficha. Adicione NPCs para o combate.</p>}</div>
        <div className="combat-controls">
          <Button disabled={!combatants.length} onClick={() => saveCampaign({ ...campaign, combat_active: !campaign.combat_active, round: 1, turn_index: 0, log: [`${campaign.combat_active ? 'Combate encerrado' : 'Combate iniciado'} — ${new Date().toLocaleTimeString('pt-BR')}`, ...campaign.log] })}>{campaign.combat_active ? 'Encerrar combate' : 'Iniciar combate'}</Button>
          <Button variant="outline" disabled={!campaign.combat_active} onClick={() => { const next = campaign.turn_index + 1; setAttackerId(''); setPending(null); saveCampaign({ ...campaign, turn_index: next % Math.max(1, combatants.length), round: next >= combatants.length ? campaign.round + 1 : campaign.round, log: [`Turno de ${combatants[next % Math.max(1, combatants.length)]?.name ?? '—'}`, ...campaign.log] }); }}>Próximo turno <ArrowRight /></Button>
          <Button variant="ghost" title="Limpar iniciativas para uma nova rolagem" onClick={() => { combatants.forEach(c => c.npc ? saveNpc({ ...c.npc, initiative: null }) : updateSheet(c.id, null, null, true)); }}><RotateCcw /> Limpar iniciativas</Button>
        </div>
      </section>

      <section className="game-panel"><div className="panel-head"><h3>Ação de ataque</h3><Crosshair size={15} /></div>
        {attacker && target ? <div className="field-stack">
          <div className="input-grid">
            <label className="field"><span className="field-label">ATACANTE</span><select value={attacker.id} onChange={e => { setAttackerId(e.target.value); setOptionId('desarmado_leve'); setPending(null); }}>{combatants.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="field"><span className="field-label">ALVO</span><select value={target.id} onChange={e => { setTargetId(e.target.value); setPending(null); }}>{targets.map(c => <option key={c.id} value={c.id}>{c.name} (Esq {c.esquiva})</option>)}</select></label>
          </div>
          <label className="field"><span className="field-label">ATAQUE</span><select value={option?.id} onChange={e => { setOptionId(e.target.value); setDiceChoice(''); setPending(null); }}>{options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
          {option && option.dice.length > 1 && <label className="field"><span className="field-label">DADOS DE DANO (LIMITE DA TABELA)</span><select value={dice} onChange={e => setDiceChoice(e.target.value)}>{option.dice.map(d => <option key={d}>{d}</option>)}</select></label>}
          {option && <p className="weapon-summary">Acerto: <strong>{option.hitCount ?? Math.max(1, attacker[option.hitAttr])}d20{(option.hitCount ?? attacker[option.hitAttr]) > 1 ? ' (maior)' : ''} + {ATTR_LABEL[option.hitAttr]} ({attacker[option.hitAttr]})</strong> vs Esquiva <strong>{target.esquiva}</strong> · Dano <strong>{dice}{option.damageAttr ? ` + ${ATTR_LABEL[option.damageAttr]} (${attacker[option.damageAttr]})` : ''}</strong>{option.karma ? <strong className="text-karma"> + {option.karma} Karma</strong> : null}{option.pfCost ? <> · Custo <strong className="text-flux">{option.pfCost} PF</strong> (tem <span className="text-flux">{attacker.pf}</span>)</> : null}</p>}
          <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={useBlock} onChange={e => setUseBlock(e.target.checked)} /> Aplicar Bloqueio/RD do alvo ({target.bloqueio})</label>
          <label className="field"><span className="field-label">MODO DE ATAQUE</span><select value={mode} onChange={e => { setMode(e.target.value as 'single' | 'full' | 'half'); setPending(null); setArea(null); }}><option value="single">Um alvo</option><option value="full">Todos os inimigos · dano total</option><option value="half">Todos os inimigos · metade do dano</option></select></label>
          {mode !== 'single' ? <>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!option || option.pfCost > attacker.pf || !areaTargets.length} onClick={rollAreaAttack}><Swords /> Atacar todos ({areaTargets.length})</Button>
            <Button variant="outline" disabled={!area?.results.some(x => x.hit) || !!area?.damage} onClick={rollAreaDamage}><Dices /> Rolar dano em área</Button>
          </div>
          {area && <div className={`combat-banner ${area.results.some(x => x.hit) ? 'banner-hit' : 'banner-miss'}`}>
            <strong>Acerto {area.total} (d20 {area.d20})</strong>
            {area.results.map(x => <span key={x.id}>{x.name} · Esq {x.esquiva} → {x.hit ? (x.crit ? 'CRÍTICO' : 'ACERTOU') : 'ESQUIVOU'}</span>)}
            {area.damage && <span><Shield size={12} className="inline" /> Dano {area.damage.raw}{mode === 'half' ? ` → metade ${area.damage.applied}` : ''}: {area.damage.lines.join(' · ')}</span>}
          </div>}
          </> : <>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!option || option.pfCost > attacker.pf} onClick={rollAttack}><Swords /> Rolar ataque</Button>
            <Button variant="outline" className={pending?.crit ? 'action-critical' : ''} disabled={!pending?.hit || !!pending?.damage} onClick={rollDamage}><Dices /> Rolar dano{pending?.crit ? ' crítico' : ''}</Button>
          </div>
          {pending && <div className={`combat-banner ${pending.crit ? 'banner-crit' : pending.hit ? 'banner-hit' : 'banner-miss'}`}>
            <strong>{pending.crit ? 'CRÍTICO! ATAQUE ACERTOU' : pending.hit ? 'ATAQUE ACERTOU' : 'ALVO ESQUIVOU'}</strong>
            <span>d20 {pending.d20} → total {pending.total} vs Esquiva {pending.esquiva}</span>
            {pending.damage && <span><Shield size={12} className="inline" /> Dano {pending.damage.raw} ({pending.damage.dice.join(' + ')}{pending.damage.bonus ? ` + ${pending.damage.bonus}` : ''}) − Bloqueio {pending.damage.block} = <strong>{pending.damage.final}</strong></span>}
          </div>}
          </>}
        </div> : <p className="empty-copy">São necessários ao menos dois combatentes.</p>}
      </section>
    </div>
    <section className="game-panel"><div className="panel-head"><h3>Crônica do combate</h3></div>{campaign.log.length ? campaign.log.filter(l => !l.startsWith('☠KILL:')).slice(0, 30).map((l, i) => <p className={`log-entry ${l.includes('CRÍTICO') ? 'log-crit' : ''}`} key={i}><span>✦</span>{l}</p>) : <p className="empty-copy">Os acontecimentos da batalha aparecerão aqui.</p>}</section>
  </div>;
}
