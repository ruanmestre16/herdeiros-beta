import { useMemo, useState } from 'react';
import { ArrowRight, Crosshair, Dices, RotateCcw, Shield, Skull, Swords, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ATTR_LABEL, WEAPONS, attackRoll, cappedNomenclatureDice, cappedWeaponDice, damageRoll, derived, dieFor, rollDice, initiativeRoll, nomenclatureLabel, nomenclatureLevelLabel, attrLabelFor,
  karmaDamageBonus, weaponAttrFor, weaponByKey, isHuman, agonyStatus, agonyLabel, type Attr, type Campaign, type Character, type Npc,
} from '@/lib/game';
import type { RollEntry } from './SheetExtras';

type Combatant = {
  id: string; kind: 'pc' | 'npc'; name: string; pv: number; pvMax: number; pf: number; pfMax: number;
  corpo: number; mente: number; espirito: number; esquiva: number; bloqueio: number; initiative: number | null;
  pc?: Character; npc?: Npc;
};
type AttackOption = { id: string; label: string; hitAttr: Attr; dice: string[]; damageAttr: Attr | null; pfCost: number; karma: number; nomenclature: boolean };
type Reaction = 'esquivar' | 'bloquear' | 'contra-atacar' | 'parcial' | 'fluxo';

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
    const pc = c.pc;
    const w = weaponByKey(pc.weapon_type);
    if (w && w.attr !== 'corpo') { const attr = weaponAttrFor(c.pc.lineage); const human = isHuman(c.pc.lineage); const dmgAttr: Attr | null = human ? 'mente' : (w.attr ? attr : null); const wd = cappedWeaponDice(w.key, c.pc.weapon_dice)!; opts.push({ id: 'arma', label: `Arma · ${c.pc.weapon || w.label} (${wd}${dmgAttr ? ` + ${ATTR_LABEL[dmgAttr]}` : ''})`, hitAttr: attr, dice: [wd], damageAttr: dmgAttr, pfCost: 0, karma, nomenclature: false }); }
    pc.nomenclatures.forEach((n, i) => { const dice = cappedNomenclatureDice(n.kind, n.dice); opts.push({ id: `nom-${i}`, label: `${nomenclatureLabel(pc.lineage)} · ${n.name} · ${nomenclatureLevelLabel(pc.lineage, n.kind)} (dano ${dice}d8 · ${n.cost} PF)`, hitAttr: 'espirito', dice: [`${dice}d8`], damageAttr: null, pfCost: n.cost, karma, nomenclature: true }); });
  } else {
    WEAPONS.filter(w => w.attr !== 'corpo').forEach(w => opts.push({ id: `npc-${w.key}`, label: `Arma · ${w.label} (${w.dice.join(' a ')}${w.attr ? ' + CORPO' : ''})`, hitAttr: 'corpo', dice: w.dice, damageAttr: w.attr ? 'corpo' : null, pfCost: 0, karma: 0, nomenclature: false }));
  }
  return opts;
}

export function CombatPanel({ campaign, party, npcs, saveCampaign, saveNpc, updateSheet, addRoll, setPcInitiative, resetStandard, enterAgony }: {
  campaign: Campaign; party: Character[]; npcs: Npc[];
  saveCampaign: (c: Campaign) => void; saveNpc: (n: Npc) => void;
  updateSheet: (id: string, pv: number | null, pf: number | null, clearInitiative?: boolean) => void;
  addRoll: (r: RollEntry) => void;
  setPcInitiative?: (id: string, total: number) => void;
  /** Devolve a Ação Padrão de um personagem (usado quando o turno dele começa). */
  resetStandard?: (c: Character) => void;
  /** Mestre manda um personagem entrar em Agonia (inclusive após sofrer dano, mesmo com PV acima de 0). */
  enterAgony?: (c: Character) => void;
}) {
  const combatants = useMemo(() => toCombatants(party, npcs), [party, npcs]);
  const current = campaign.combat_active && combatants.length ? combatants[campaign.turn_index % combatants.length] : undefined;
  const [attackerId, setAttackerId] = useState('');
  const [optionId, setOptionId] = useState('desarmado_leve');
  const [diceChoice, setDiceChoice] = useState('');
  const [targetId, setTargetId] = useState('');
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [fluxUsed, setFluxUsed] = useState<Record<string, boolean>>({});
  const [lostAction, setLostAction] = useState<Record<string, boolean>>({});
  const [chosenReaction, setChosenReaction] = useState<Reaction>('esquivar');
  const [mode, setMode] = useState<'single' | 'full' | 'half'>('single');
  const [area, setArea] = useState<null | { attackerId: string; option: AttackOption; dice: string; d20: number; attrValue: number; total: number; crit: boolean; results: { id: string; name: string; esquiva: number; hit: boolean; crit: boolean }[]; damage?: { raw: number; applied: number; lines: string[] } }>(null);
  const [pending, setPending] = useState<null | { attackerId: string; targetId: string; option: AttackOption; dice: string; d20: number; attrValue: number; total: number; esquiva: number; hit: boolean; crit: boolean; reaction: Reaction; defense: number; counterDamage?: number; damage?: { raw: number; dice: number[]; bonus: number; block: number; final: number } }>(null);

  const attacker = combatants.find(c => c.id === (attackerId || current?.id)) ?? combatants[0];
  const options = attacker ? optionsFor(attacker) : [];
  const weapons = options.filter(o => !o.nomenclature);
  const nomenclatures = options.filter(o => o.nomenclature);
  const option = options.find(o => o.id === optionId) ?? weapons[0];
  const dice = option && option.dice.includes(diceChoice) ? diceChoice : option?.dice[0] ?? '';
  const targets = combatants.filter(c => c.id !== attacker?.id);
  const target = targets.find(c => c.id === targetId) ?? targets[0];

  const areaTargets = attacker ? combatants.filter(c => c.id !== attacker.id && c.kind !== attacker.kind) : [];
  const lineage = attacker?.pc?.lineage ?? '';
  const skillName = nomenclatureLabel(lineage);
  const selectedSkill = option?.nomenclature ? attacker?.pc?.nomenclatures[Number(option.id.slice(4))] : undefined;
  const reactionAvailable = (c: Combatant) => reactions[c.id] !== campaign.round;
  function selectReaction(c: Combatant, reaction: Reaction, nomenclature: boolean) {
    if (!reactionAvailable(c) || ((reaction === 'parcial' || reaction === 'fluxo') && !nomenclature) || (reaction === 'fluxo' && fluxUsed[c.id])) return null;
    setReactions(prev => ({...prev,[c.id]:campaign.round}));
    setFluxUsed(prev => ({...prev,[c.id]:reaction==='fluxo'}));
    if (reaction==='fluxo') setLostAction(prev=>({...prev,[c.id]:true}));
    return reaction;
  }
  function selectOption(id: string) {
    setOptionId(id); setDiceChoice(''); setPending(null); setArea(null);
  }
  function attackButtons() {
    if (!option) return null;
    return <div className="mt-3 flex flex-wrap gap-2">
      {mode !== 'single' ? <>
        <Button disabled={option.pfCost > (attacker?.pf ?? 0) || !areaTargets.length} onClick={rollAreaAttack}><Swords /> Atacar todos ({areaTargets.length})</Button>
        <Button variant="outline" className={area?.crit ? 'action-critical' : ''} disabled={!area?.results.some(x => x.hit) || !!area?.damage} onClick={rollAreaDamage}><Dices /> Rolar dano em área{area?.crit ? ' CRÍTICO!' : ''}</Button>
      </> : <>
        <Button disabled={option.pfCost > (attacker?.pf ?? 0)} onClick={rollAttack}><Swords /> Rolar ataque</Button>
        <Button variant="outline" className={pending?.crit ? 'action-critical' : ''} disabled={!pending?.hit || !!pending?.damage} onClick={rollDamage}><Dices /> Rolar dano {option.nomenclature ? `da ${skillName.toLowerCase()}` : 'da arma'}{pending?.crit ? ' CRÍTICO!' : ''}</Button>
      </>}
    </div>;
  }
  function rollAreaAttack() {
    if (!attacker || !option || !areaTargets.length || option.pfCost > attacker.pf || lostAction[attacker.id]) return;
    const attrValue = attacker[option.hitAttr]; const r = attackRoll(attrValue);
    if (option.pfCost) setResources(attacker, null, attacker.pf - option.pfCost);
    const results = areaTargets.map(t => { const hit = r.total >= t.esquiva; return { id: t.id, name: t.name, esquiva: t.esquiva, hit, crit: r.d20 === 20 && r.total > t.esquiva }; });
    const crit = results.some(x => x.crit);
    setPending(null); setArea({ attackerId: attacker.id, option, dice, d20: r.d20, attrValue, total: r.total, crit, results });
    addRoll({ expression: `1d20 + ${attrValue}`, dice: [r.d20], modifier: attrValue, total: r.total, source: `${attacker.name} → todos (${mode === 'half' ? 'metade' : 'dano total'})${crit ? ' — CRÍTICO!' : ''}`, crit });
    log([`${attacker.name} ataca TODOS os inimigos (${option.label}, ${mode === 'half' ? 'metade do dano' : 'dano total'}): ${crit ? 'CRÍTICO! ' : ''}d20 [${r.d20}] + ${attrLabelFor(option.hitAttr, lineage)} ${attrValue} = ${r.total} → ${results.map(x => `${x.name} (Esq ${x.esquiva}): ${x.hit ? (x.crit ? 'CRÍTICO!' : 'acertou') : 'esquivou'}`).join('; ')}`]);
  }
  function rollAreaDamage() {
    if (!area || area.damage) return;
    const a = combatants.find(c => c.id === area.attackerId); if (!a) return;
    const bonus = (area.option.damageAttr ? a[area.option.damageAttr] : 0) + area.option.karma;
    const d = damageRoll(area.dice, bonus, area.results.some(x => x.crit));
    const applied = mode === 'half' ? Math.floor(d.total / 2) : d.total;
    const lines: string[] = [];
    area.results.filter(x => x.hit).forEach(x => { const t = combatants.find(c => c.id === x.id); if (!t) return; const final = applied; const pv = Math.max(0, t.pv - final); setResources(t, pv, null); lines.push(`${t.name}: ${applied} = ${final} → ${pv} PV${pv === 0 ? ' (AGONIA)' : ''}`); });
    setArea({ ...area, damage: { raw: d.total, applied, lines } });
    addRoll({ expression: d.expression, dice: d.dice, modifier: bonus, total: d.total, source: `Dano em área${mode === 'half' ? ' (metade)' : ''}` });
    log([`Dano em área${area.crit ? ' CRÍTICO! (dados dobrados)' : ''}: ${d.expression} = ${d.total}${mode === 'half' ? ` → metade ${applied}` : ''}. ${lines.join('; ')}`]);
  }

  const log = (lines: string[]) => saveCampaign({ ...campaign, log: [...lines.reverse(), ...campaign.log] });
  function setResources(c: Combatant, pv: number | null, pf: number | null) {
    if (c.npc) saveNpc({ ...c.npc, pv_current: pv === null ? c.npc.pv_current : Math.max(0, Math.min(c.pvMax, pv)), pf_current: pf === null ? c.npc.pf_current : Math.max(0, Math.min(c.pfMax, pf)) });
    else updateSheet(c.id, pv, pf);
  }

  function rollAttack() {
    if (!attacker || !target || !option || lostAction[attacker.id]) return;
    if (option.pfCost > attacker.pf) return;
    const reaction = selectReaction(target, chosenReaction, option.nomenclature);
    if (!reaction) return;
    const attrValue = attacker[option.hitAttr];
    const r = attackRoll(attrValue, target.esquiva);
    // Bloqueio de Fluxo = 1d20 puro + Espírito do defensor (sem outros modificadores). Demais reações seguem como antes.
    const fluxDie = reaction==='fluxo' ? rollDice(1,20)[0]! : null;
    const defense = fluxDie!==null ? fluxDie + target.espirito : target.esquiva;
    // Crítico = 20 natural com total acima da defesa efetiva (no Bloqueio de Fluxo, a defesa é o resultado do próprio Bloqueio).
    const crit = fluxDie!==null ? (r.d20===20 && r.total>defense) : r.crit;
    const defenseText = fluxDie!==null ? `Bloqueio de Fluxo (d20 [${fluxDie}] + ${attrLabelFor('espirito', target.pc?.lineage)} ${target.espirito} = ${defense})` : `${reaction} (defesa ${defense})`;
    const hit = reaction==='bloquear' || reaction==='parcial' || reaction==='contra-atacar' || r.total>=defense;
    if (option.pfCost) setResources(attacker, null, attacker.pf - option.pfCost);
    setPending({ attackerId: attacker.id, targetId: target.id, option, dice, d20: r.d20, attrValue, total: r.total, esquiva: target.esquiva, hit, crit, reaction, defense });
    addRoll({ expression: `1d20 + ${attrValue}`, dice: [r.d20], modifier: attrValue, total: r.total, source: `${attacker.name} → ${target.name}${crit ? ' — CRÍTICO' : ''}`, crit });
    if (fluxDie!==null) addRoll({ expression: `1d20 + ${target.espirito}`, dice: [fluxDie], modifier: target.espirito, total: defense, source: `Bloqueio de Fluxo: ${target.name}` });
    log([`${attacker.name} ataca ${target.name} (${option.label}${option.pfCost ? `, −${option.pfCost} PF` : ''}): d20 [${r.d20}] + ${attrLabelFor(option.hitAttr, lineage)} ${attrValue} = ${r.total}; reação: ${defenseText} → ${hit ? (crit ? 'CRÍTICO! ATAQUE ACERTOU' : 'ATAQUE ACERTOU') : 'ALVO ESQUIVOU'}`]);
  }

  function rollDamage() {
    if (!pending || pending.damage) return;
    const a = combatants.find(c => c.id === pending.attackerId); const t = combatants.find(c => c.id === pending.targetId);
    if (!a || !t) return;
    const bonus = (pending.option.damageAttr ? a[pending.option.damageAttr] : 0) + pending.option.karma;
    const d = damageRoll(pending.dice, bonus, pending.crit);
    const counterOption = optionsFor(t).find(o=>!o.nomenclature);
    const counterDamage = pending.reaction==='contra-atacar' && counterOption ? damageRoll(counterOption.dice[0]??'1d6', t[counterOption.damageAttr??'corpo'], false).total : 0;
    const counterWins = counterDamage > d.total;
    const block = pending.reaction==='bloquear' ? t.bloqueio : pending.reaction==='parcial' ? (rollDice(1,dieFor(t.espirito)??4)[0]??0)+t.bloqueio : 0;
    const final = counterWins ? 0 : Math.max(0, d.total - block); const pv = Math.max(0, t.pv - final);
    if(counterWins){const counter=attackRoll(t.mente,a.esquiva);if(counter.hit){const free=damageRoll('1d6',t.corpo,counter.crit);setResources(a,Math.max(0,a.pv-free.total),null);log([`${t.name} contra-ataca: dano ${counterDamage} > ${d.total}; ataque grátis corpo a corpo 1d20 + MENTE = ${counter.total}, dano ${free.total} em ${a.name}.`]);}else log([`${t.name} vence a disputa de dano (${counterDamage} > ${d.total}), mas o contra-ataque erra (${counter.total} vs ${a.esquiva}).`]);}
    setPending({ ...pending, counterDamage, damage: { raw: d.total, dice: d.dice, bonus, block, final } });
    setResources(t, pv, null);
    addRoll({ expression: d.expression, dice: d.dice, modifier: bonus, total: d.total, source: `Dano em ${t.name}${pending.crit ? ' — CRÍTICO' : ''}`, crit: pending.crit });
    log([`Dano${pending.crit ? ' CRÍTICO! (dados dobrados)' : ''}: ${d.expression} = ${d.total} − Bloqueio ${block} = ${final}. ${t.name}: ${t.pv} → ${pv} PV${pv === 0 ? ' — entra em AGONIA' : ''}`]);
  }

  function rollNpcInitiative(n: Npc) {
    const r = initiativeRoll(n.corpo); saveNpc({ ...n, initiative: r.total });
    addRoll({ expression: `${n.corpo}d20 (maior) + ${n.corpo}`, dice: r.dice, modifier: n.corpo, total: r.total, source: `Iniciativa: ${n.name}` });
  }

    function rollPcInitiative(c: Combatant) {
    const r = initiativeRoll(c.corpo);
    setPcInitiative?.(c.id, r.total);
    addRoll({ expression: `${c.corpo}d20 (maior) + ${c.corpo}`, dice: r.dice, modifier: c.corpo, total: r.total, source: `Iniciativa: ${c.name}` });
  }
  return <div className="combat-layout">
    <div className="stack">
      <section className="game-panel"><div className="panel-head"><h3>Ordem de iniciativa</h3><span className="field-kicker">RODADA {campaign.round}</span></div>
        <div className="combat-list">{combatants.map((c, i) => <div key={c.id} className={`combatant ${current?.id === c.id ? 'current' : ''}`}>
          <span className="combatant-number">{c.initiative ?? '—'}</span>
          <span className="combatant-icon">{c.kind === 'npc' ? <Skull /> : <Users />}</span>
          <span className="flex-1"><strong>{c.name}</strong><small>{c.pv} / {c.pvMax} PV · <span className="text-flux">{c.pf} / {c.pfMax} PF</span> · Esq {c.esquiva} · RD {c.bloqueio}{c.pc ? agonyLabel(c.pc) : (c.pv === 0 ? ' · AGONIA' : '')}</small></span>
          <Button variant="outline" size="sm" title="Rolar iniciativa" aria-label={`Rolar iniciativa de ${c.name}`} onClick={() => c.npc ? rollNpcInitiative(c.npc) : rollPcInitiative(c)}><Dices /> Iniciativa</Button>
          {c.pc && enterAgony && !agonyStatus(c.pc).active && !agonyStatus(c.pc).dead && <Button variant="outline" size="sm" className="action-agony" title="Entrar em Agonia" aria-label={`Entrar em Agonia: ${c.name}`} onClick={() => enterAgony(c.pc!)}><Skull /> Agonia</Button>}
          <span className="sr-only">{i}</span>
        </div>)}{!combatants.length && <p className="empty-copy">Os jogadores entram pela Mesa escolhendo sua ficha. Adicione NPCs para o combate.</p>}</div>
        <div className="combat-controls">
          <Button disabled={!combatants.length} onClick={() => { combatants.forEach(c => { if (c.pc) resetStandard?.(c.pc); }); saveCampaign({ ...campaign, combat_active: !campaign.combat_active, round: 1, turn_index: 0, log: [`${campaign.combat_active ? 'Combate encerrado' : 'Combate iniciado'} — ${new Date().toLocaleTimeString('pt-BR')}`, ...campaign.log] }); }}>{campaign.combat_active ? 'Encerrar combate' : 'Iniciar combate'}</Button>
           <Button variant="outline" disabled={!campaign.combat_active} onClick={() => { const next = campaign.turn_index + 1; const nextFighter=combatants[next % Math.max(1,combatants.length)]; if(nextFighter){setReactions(prev=>({...prev,[nextFighter.id]:0}));setLostAction(prev=>({...prev,[nextFighter.id]:false}));if(nextFighter.pc)resetStandard?.(nextFighter.pc);} setAttackerId(''); setPending(null); saveCampaign({ ...campaign, turn_index: next % Math.max(1, combatants.length), round: next >= combatants.length ? campaign.round + 1 : campaign.round, log: [`Turno de ${nextFighter?.name ?? '—'}${nextFighter&&lostAction[nextFighter.id]?' (ação padrão e movimento sacrificados)':''}`, ...campaign.log] }); }}>Próximo turno <ArrowRight /></Button>
          <Button variant="ghost" title="Limpar iniciativas para uma nova rolagem" onClick={() => { combatants.forEach(c => c.npc ? saveNpc({ ...c.npc, initiative: null }) : updateSheet(c.id, null, null, true)); }}><RotateCcw /> Limpar iniciativas</Button>
        </div>
      </section>

      <section className="game-panel"><div className="panel-head"><h3>Ação de ataque</h3><Crosshair size={15} /></div>
        {attacker && target ? <div className="field-stack">
          <div className="input-grid">
            <label className="field"><span className="field-label">ATACANTE</span><select value={attacker.id} onChange={e => { setAttackerId(e.target.value); selectOption('desarmado_leve'); }}>{combatants.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="field"><span className="field-label">ALVO</span><select value={target.id} onChange={e => { setTargetId(e.target.value); setPending(null); setArea(null); }}>{targets.map(c => <option key={c.id} value={c.id}>{c.name} (Esq {c.esquiva})</option>)}</select></label>
          </div>
          <label className="field"><span className="field-label">MODO DE ATAQUE</span><select value={mode} onChange={e => { setMode(e.target.value as 'single' | 'full' | 'half'); setPending(null); setArea(null); }}><option value="single">Um alvo</option><option value="full">Todos os inimigos · dano total</option><option value="half">Todos os inimigos · metade do dano</option></select></label>
           {mode==='single'&&<label className="field"><span className="field-label">REAÇÃO DE {target.name.toUpperCase()} {reactionAvailable(target)?'':'· USADA NESTA RODADA'}</span><select value={chosenReaction} onChange={e=>{setChosenReaction(e.target.value as Reaction);setPending(null)}} disabled={!reactionAvailable(target)}><option value="esquivar">Esquivar · Esquiva {target.esquiva}</option><option value="bloquear">Bloquear · reduz {target.bloqueio} do dano</option><option value="contra-atacar">Contra-atacar · disputa de dano</option>{option?.nomenclature&&<><option value="parcial">Bloqueio Parcial · dado de Espírito + Bloqueio</option><option value="fluxo" disabled={!!fluxUsed[target.id]}>Bloqueio de Fluxo · 1d20 + {attrLabelFor('espirito', target.pc?.lineage)} {target.espirito}</option></>}</select></label>}
          <div className="grid grid-cols-1 gap-5 border-t border-border pt-4 sm:grid-cols-2">
            <div className="min-w-0"><h4 className="field-kicker mb-3">ARMAS</h4>
              <label className="field"><span className="field-label">ARMA</span><select aria-label="Arma de ataque" value={option && !option.nomenclature ? option.id : ''} onChange={e => selectOption(e.target.value)}><option value="" disabled>Selecionar arma</option>{weapons.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
              {option && !option.nomenclature && attackButtons()}
            </div>
            <div className="min-w-0"><h4 className="field-kicker mb-3">{nomenclatureLabel(lineage, true).toUpperCase()}</h4>
              <div className="grid max-h-60 gap-2 overflow-y-auto">{nomenclatures.map(o => { const n = attacker.pc?.nomenclatures[Number(o.id.slice(4))]; return <Button key={o.id} variant="outline" aria-pressed={option?.id === o.id} disabled={o.pfCost > attacker.pf && option?.id !== o.id} onClick={() => selectOption(o.id)} className={`h-auto min-w-0 justify-start whitespace-normal py-2 text-left ${option?.id === o.id ? 'border-primary bg-accent' : ''}`}><span className="grid min-w-0 gap-1"><strong className="break-words">{n?.name ?? o.label}</strong><span className="break-words text-xs">{nomenclatureLevelLabel(lineage, n?.kind)} · {o.dice[0]} · {o.pfCost} PF</span></span></Button>; })}{!nomenclatures.length && <p className="empty-copy">Nenhuma {skillName.toLowerCase()} criada na ficha.</p>}</div>
              {selectedSkill && attackButtons()}
            </div>
          </div>
          {option && option.dice.length > 1 && <label className="field"><span className="field-label">DADOS DE DANO (LIMITE DA TABELA)</span><select value={dice} onChange={e => { setDiceChoice(e.target.value); setPending(null); setArea(null); }}>{option.dice.map(d => <option key={d}>{d}</option>)}</select></label>}
          {option && <p className="weapon-summary">Acerto: <strong>1d20 + {attrLabelFor(option.hitAttr, lineage)} ({attacker[option.hitAttr]})</strong> vs Esquiva <strong>{target.esquiva}</strong> · Dano <strong>{dice}{option.damageAttr ? ` + ${attrLabelFor(option.damageAttr, lineage)} (${attacker[option.damageAttr]})` : ''}</strong>{option.karma ? <strong className="text-karma"> + {option.karma} Karma</strong> : null}{option.pfCost ? <> · Custo <strong className="text-flux">{option.pfCost} PF</strong> (tem <span className="text-flux">{attacker.pf}</span>)</> : null}</p>}
           {lostAction[attacker.id]&&<p className="empty-copy">{attacker.name} sacrificou a próxima ação padrão e o movimento ao usar Bloqueio de Fluxo.</p>}
          {mode !== 'single' ? <>
          {area && <div className={`combat-banner ${area.crit ? 'banner-crit' : area.results.some(x => x.hit) ? 'banner-hit' : 'banner-miss'}`}>
            <strong>{area.crit ? 'CRÍTICO! ' : ''}Acerto {area.total}</strong>
            <span>d20 [{area.d20}] + {attrLabelFor(area.option.hitAttr, combatants.find(c => c.id === area.attackerId)?.pc?.lineage)} {area.attrValue} = {area.total}</span>
            {area.results.map(x => <span key={x.id}>{x.name} · Esq {x.esquiva} → {x.hit ? (x.crit ? 'CRÍTICO' : 'ACERTOU') : 'ESQUIVOU'}</span>)}
            {area.damage && <span><Shield size={12} className="inline" /> Dano {area.damage.raw}{mode === 'half' ? ` → metade ${area.damage.applied}` : ''}: {area.damage.lines.join(' · ')}</span>}
          </div>}
          </> : <>
          {pending && <div className={`combat-banner ${pending.crit ? 'banner-crit' : pending.hit ? 'banner-hit' : 'banner-miss'}`}>
            <strong>{pending.crit ? 'CRÍTICO! ATAQUE ACERTOU' : pending.hit ? 'ATAQUE ACERTOU' : 'ALVO ESQUIVOU'}</strong>
            <span>d20 [{pending.d20}] + {attrLabelFor(pending.option.hitAttr, combatants.find(c => c.id === pending.attackerId)?.pc?.lineage)} {pending.attrValue} = {pending.total} vs {pending.reaction === 'fluxo' ? `Bloqueio de Fluxo ${pending.defense}` : `Esquiva ${pending.esquiva}`}</span>
             {pending.damage && <span><Shield size={12} className="inline" /> Dano {pending.damage.raw} ({pending.damage.dice.join(' + ')}{pending.damage.bonus ? ` + ${pending.damage.bonus}` : ''}) − Bloqueio {pending.damage.block} = <strong>{pending.damage.final}</strong>{pending.counterDamage!==undefined&&pending.reaction==='contra-atacar'?` · disputa: ${pending.counterDamage}`:''}</span>}
          </div>}
          </>}
        </div> : <p className="empty-copy">São necessários ao menos dois combatentes.</p>}
      </section>
    </div>
    <section className="game-panel"><div className="panel-head"><h3>Crônica do combate</h3></div>{campaign.log.length ? campaign.log.filter(l => !l.startsWith('☠KILL:')).slice(0, 30).map((l, i) => <p className={`log-entry ${l.includes('CRÍTICO') ? 'log-crit' : ''}`} key={i}><span>✦</span>{l}</p>) : <p className="empty-copy">Os acontecimentos da batalha aparecerão aqui.</p>}</section>
  </div>;
}
