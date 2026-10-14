import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Crosshair, Dices, RotateCcw, Shield, Skull, Sparkles, Swords, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  NOMENCLATURE_CRIT_DICE, PROTECTION_MIN_ELO, TRIPLE_CRIT_COST, WEAPONS,
  attackRoll, canTripleCrit, counterRoll, damageRoll, danceStep, derived, dieFor, forceFlux, initiativeRoll, nomenclatureLabel, nomenclatureLevelLabel, attrLabelFor,
  karmaDamageBonus, karmaMaximum, weaponByKey, weaponRules, techniqueRules, upgradedDamage, protectRoll, syncLevelWith, stageIndexFor, isHuman, agonyStatus, agonyLabel, forceActionLabel, isTechAgent,
  type Attr, type Campaign, type Character, type NomenclatureKind, type Npc,
} from '@/lib/game';
import { AbsorbPfAction, type RollEntry } from './SheetExtras';
import { npcSheet, isMonster, applyNpcSheetPatch } from './npcSheet';
import { supabase } from '@/integrations/supabase/client';

type Combatant = {
  id: string; kind: 'pc' | 'npc'; name: string; pv: number; pvMax: number; pf: number; pfMax: number;
  corpo: number; mente: number; espirito: number; esquiva: number; bloqueio: number; initiative: number | null;
  pc?: Character; npc?: Npc;
};
/** Opção de ataque: dado base + valor fixo + dados extras (evoluções) + bônus de Karma. Tudo vem das tabelas do Códice (game.ts). */
type AttackOption = {
  id: string; label: string; hitAttr: Attr; dice: string[]; fixed: number; extra: string[]; pfCost: number; karma: number;
  nomenclature: boolean; nomKind?: NomenclatureKind; melee: boolean; critFlat?: string;
};
type Reaction = 'esquivar' | 'bloquear' | 'contra-atacar' | 'danca' | 'parcial' | 'completa';
type LostKind = 'standard' | 'all';
type Dance = { round: number; enemies: number; evaded: number; broken: boolean };
type Pending = {
  attackerId: string; targetId: string; option: AttackOption; dice: string; d20: number; attrDie: number; attrRoll: number; total: number; esquiva: number;
  hit: boolean; crit: boolean; fumble: boolean; reaction: Reaction | 'nenhuma'; block: number; blockText: string; triple: boolean;
  countered?: { total: number; text: string };
  damage?: { raw: number; dice: number[]; bonus: number; block: number; final: number };
};
type AttackIntent = {
  requestId: string;
  campaignId: string;
  attackerId: string;
  targetId: string;
  optionId: string;
  dice: string;
  mode: 'single';
  triple?: boolean;
  senderUserId: string;
  senderName: string;
  createdAt: number;
};

const REACTION_NAME: Record<Reaction | 'nenhuma', string> = {
  esquivar: 'Esquivar', bloquear: 'Bloquear', 'contra-atacar': 'Contra-atacar', danca: 'Dança de Batalha',
  parcial: 'Bloqueio Parcial', completa: 'Bloqueio contra Nomenclatura Completa', nenhuma: 'sem Reação disponível',
};

function toCombatants(party: Character[], npcs: Npc[]): Combatant[] {
  const pcs = party.map<Combatant>(c => { const d = derived(c.corpo); return { id: c.id, kind: 'pc', name: c.name, pv: c.pv_current, pvMax: c.pv_max, pf: c.pf_current, pfMax: c.pf_max, corpo: c.corpo, mente: c.mente, espirito: c.espirito, esquiva: d.esquiva, bloqueio: d.bloqueio, initiative: c.initiative, pc: c }; });
  const ns = npcs.map<Combatant>(n => ({ id: n.id, kind: 'npc', name: n.name, pv: n.pv_current, pvMax: n.pv_max, pf: n.pf_current, pfMax: n.pf_max, corpo: n.corpo, mente: n.mente, espirito: n.espirito, esquiva: n.esquiva, bloqueio: n.bloqueio, initiative: n.initiative ?? null, npc: n }));
  return [...pcs, ...ns].sort((a, b) => (b.initiative ?? -999) - (a.initiative ?? -999));
}

/** Monta uma opção de arma: PC usa weaponRules (atributo da linhagem + evolução de GS); NPC ataca com CORPO. */
function weaponOption(c: Combatant, id: string, prefix: string, key: string): AttackOption | null {
  const w = weaponByKey(key); if (!w) return null;
  const karma = c.pc ? karmaDamageBonus(c.pc) : 0;
  const rules = c.pc ? weaponRules(c.pc, key) : { attr: 'corpo' as Attr, bonus: c.corpo, extraDice: [] as string[], rank: 0 };
  const parts = [w.dice[0]!, ...rules.extraDice, ...(rules.bonus ? [attrLabelFor(rules.attr, c.pc?.lineage)] : [])];
  return { id, label: `${prefix} (${parts.join(' + ')})`, hitAttr: rules.attr, dice: [w.dice[0]!], fixed: rules.bonus, extra: rules.extraDice, pfCost: 0, karma, nomenclature: false, melee: key !== 'fogo' };
}
function optionsFor(c: Combatant): AttackOption[] {
  const opts: AttackOption[] = [];
  const add = (o: AttackOption | null) => { if (o) opts.push(o); };
  add(weaponOption(c, 'desarmado_leve', 'Físico · Desarmado leve', 'desarmado_leve'));
  add(weaponOption(c, 'desarmado_pesado', 'Físico · Desarmado médio/pesado', 'desarmado_pesado'));
  if (c.pc) {
    const pc = c.pc; const w = weaponByKey(pc.weapon_type);
    if (w && w.attr !== 'corpo') add(weaponOption(c, 'arma', `Arma · ${pc.weapon || w.label}`, w.key));
    const karma = karmaDamageBonus(pc);
    pc.nomenclatures.forEach((n, i) => {
      const t = techniqueRules(pc, n);
      const parts = [t.dice, ...t.extraDice, ...(t.bonus ? [attrLabelFor('espirito', pc.lineage)] : [])];
      opts.push({ id: `nom-${i}`, label: `${nomenclatureLabel(pc.lineage)} · ${n.name} · ${nomenclatureLevelLabel(pc.lineage, n.kind)} (dano ${parts.join(' + ')} · ${t.cost} PF)`, hitAttr: 'espirito', dice: [t.dice], fixed: t.bonus, extra: t.extraDice, pfCost: t.cost, karma, nomenclature: true, nomKind: t.kind, melee: false, ...(t.kind === 'Completa' ? { critFlat: NOMENCLATURE_CRIT_DICE.Completa } : {}) });
    });
  } else {
    WEAPONS.filter(w => w.attr !== 'corpo').forEach(w => add(weaponOption(c, `npc-${w.key}`, `Arma · ${w.label}`, w.key)));
  }
  return opts;
}
/** Dano de uma opção. Crítico dobra todos os dados (triplica com Crítico Triplo); Completa crítica é 12d8 puro. */
function optionDamage(o: AttackOption, dice: string, crit: boolean, extraFixed = 0, mult = 2) {
  if (crit && o.critFlat) return damageRoll(o.critFlat, o.karma + extraFixed, false);
  return upgradedDamage(dice, o.fixed + o.karma + extraFixed, crit, o.extra, mult);
}
const READ_BONUS = [3, 5, 8];
const ARCADIAN_PF = [2, 4, 8];

export function CombatPanel({ campaign, party, npcs, saveCampaign, saveNpc, updateSheet, addRoll, setPcInitiative, resetStandard, enterAgony, isMaster = false, userId = null, myCharacterId = null, openSheet }: {
  campaign: Campaign; party: Character[]; npcs: Npc[];
  saveCampaign: (c: Campaign) => void; saveNpc: (n: Npc) => void;
  updateSheet: (id: string, pv: number | null, pf: number | null, clearInitiative?: boolean) => void;
  addRoll: (r: RollEntry) => void;
  setPcInitiative?: (id: string, total: number) => void;
  /** Devolve a Ação Padrão de um personagem (usado quando o turno dele começa). */
  resetStandard?: (c: Character) => void;
  /** Mestre manda um personagem entrar em Agonia (inclusive após sofrer dano, mesmo com PV acima de 0). */
  enterAgony?: (c: Character) => void;
  /** Permite ao Mestre abrir qualquer ficha e ao jogador abrir somente a própria ficha. */
  isMaster?: boolean;
  userId?: string | null;
  myCharacterId?: string | null;
  openSheet?: (combatant: Combatant) => void;
}) {
  const combatants = useMemo(() => toCombatants(party, npcs), [party, npcs]);
  const current = campaign.combat_active && combatants.length ? combatants[campaign.turn_index % combatants.length] : undefined;
  const [attackerId, setAttackerId] = useState('');
  const [optionId, setOptionId] = useState('desarmado_leve');
  const [targetId, setTargetId] = useState('');
  /** Rodada em que cada combatente já usou a Reação (1 por rodada; volta quando chega a vez dele). */
  const [reactions, setReactions] = useState<Record<string, number>>({});
  /** Bloqueio contra Completa não pode ser usado consecutivamente. */
  const [completaLast, setCompletaLast] = useState<Record<string, boolean>>({});
  /** Ação sacrificada por Bloqueio Parcial (padrão) ou Bloqueio contra Completa (ação inteira): vale no próximo turno do combatente. */
  const [lostAction, setLostAction] = useState<Record<string, LostKind>>({});
  const [chosenReaction, setChosenReaction] = useState<Reaction>('esquivar');
  const [guardianId, setGuardianId] = useState('');
  const [danceEnemies, setDanceEnemies] = useState(2);
  const [dance, setDance] = useState<Record<string, Dance>>({});
  /** Passiva do Humano: fluxo parcial lido (atacante>alvo). */
  const [read, setRead] = useState<Record<string, boolean>>({});
  const [triple, setTriple] = useState(false);
  const [notice, setNotice] = useState('');
  const [mode, setMode] = useState<'single' | 'full' | 'half'>('single');
  const [area, setArea] = useState<null | { attackerId: string; option: AttackOption; dice: string; d20: number; attrDie: number; attrRoll: number; total: number; crit: boolean; fumble: boolean; results: { id: string; name: string; esquiva: number; hit: boolean; crit: boolean }[]; damage?: { raw: number; applied: number; lines: string[] } }>(null);
  const [pending, setPending] = useState<null | Pending>(null);
  const [incomingIntents, setIncomingIntents] = useState<AttackIntent[]>([]);
  const [sentIntentId, setSentIntentId] = useState<string | null>(null);

  const masterMode = isMaster || !userId;
  const attacker = masterMode
    ? (combatants.find(c => c.id === (attackerId || current?.id)) ?? combatants[0])
    : combatants.find(c => c.id === myCharacterId) ?? undefined;
  const options = attacker ? optionsFor(attacker) : [];
  const weapons = options.filter(o => !o.nomenclature);
  const nomenclatures = options.filter(o => o.nomenclature);
  const option = options.find(o => o.id === optionId) ?? weapons[0];
  const dice = option?.dice[0] ?? '';
  const targets = combatants.filter(c => c.id !== attacker?.id);
  const target = targets.find(c => c.id === targetId) ?? targets[0];
  const isMyTurn = !!attacker && !!myCharacterId && attacker.id === myCharacterId && current?.id === myCharacterId && campaign.combat_active;
  const attackerLost = !!attacker && !!lostAction[attacker.id];
  const playerCanChooseAttack = !masterMode && isMyTurn && attacker?.kind === 'pc' && !attackerLost;

  const areaTargets = attacker ? combatants.filter(c => c.id !== attacker.id && c.kind !== attacker.kind) : [];
  const lineage = attacker?.pc?.lineage ?? '';
  const skillName = nomenclatureLabel(lineage);
  const selectedSkill = option?.nomenclature ? attacker?.pc?.nomenclatures[Number(option.id.slice(4))] : undefined;
  const reactionAvailable = (c: Combatant) => reactions[c.id] !== campaign.round;
  const tripleAvailable = !!attacker?.pc && !option?.nomenclature && canTripleCrit(attacker.pc) && attacker.pf >= TRIPLE_CRIT_COST + (option?.pfCost ?? 0);
  const humanReadBonus = (a: Combatant, t: Combatant) => a.pc && isHuman(a.pc.lineage) && read[`${a.id}>${t.id}`] ? (READ_BONUS[stageIndexFor(a.pc.lineage, a.pc.stage)] ?? 3) : 0;

  /** Reações possíveis do alvo contra este ataque (Cap. V): Parcial só contra Parcial, Completa só contra Completa, Dança só no corpo a corpo. */
  function reactionChoices(o: AttackOption | undefined, t: Combatant) {
    const list: { value: Reaction; label: string; disabled?: boolean }[] = [
      { value: 'esquivar', label: `Esquivar · compara com Esquiva ${t.esquiva}` },
      { value: 'bloquear', label: `Bloquear · anula ${t.bloqueio} de dano` },
      { value: 'contra-atacar', label: 'Contra-atacar · 1d20 + dado do maior atributo precisa superar o ataque' },
    ];
    if (o?.melee) list.push({ value: 'danca', label: `Dança de Batalha · corpo a corpo, ${danceEnemies} inimigos` });
    if (o?.nomKind === 'Parcial') list.push({ value: 'parcial', label: 'Bloqueio Parcial · 4 PF · perde a ação padrão da próxima rodada', disabled: t.pf < 4 });
    if (o?.nomKind === 'Completa') list.push({ value: 'completa', label: 'Bloqueio contra Nomenclatura Completa · perde a próxima ação inteira', disabled: !!completaLast[t.id] });
    return list;
  }
  /** Aliados com Elo suficiente podem fazer o Bloqueio contra Completa por você (Proteção Compartilhada). */
  function guardiansFor(o: AttackOption | undefined, t: Combatant, a: Combatant | undefined) {
    if (o?.nomKind !== 'Completa' || !t.pc) return [] as Combatant[];
    const tp = t.pc;
    return combatants.filter(g => g.pc && g.id !== t.id && g.id !== a?.id && g.pv > 0 && reactionAvailable(g) && !lostAction[g.id] && !completaLast[g.id] && syncLevelWith(g.pc, tp) >= PROTECTION_MIN_ELO);
  }
  const reactionOptions = option && target ? reactionChoices(option, target) : [];
  const reactionValid = reactionOptions.some(r => r.value === chosenReaction && !r.disabled) ? chosenReaction : 'esquivar';
  const guardianOptions = option && target && attacker ? guardiansFor(option, target, attacker) : [];
  const guardian = guardianOptions.find(g => g.id === guardianId);

  useEffect(() => {
    if (!userId || !campaign.id) return;
    const channel = supabase.channel(`herdeiros-combat-actions-${campaign.id}`)
      .on('broadcast', { event: 'combat_attack_intent' }, ({ payload }) => {
        const intent = payload as AttackIntent;
        if (!intent?.requestId || intent.campaignId !== campaign.id || intent.senderUserId === userId) return;
        if (masterMode) {
          setIncomingIntents(prev => prev.some(item => item.requestId === intent.requestId) ? prev : [...prev, intent]);
        }
      })
      .on('broadcast', { event: 'combat_attack_resolved' }, ({ payload }) => {
        const resolved = payload as { requestId?: string };
        if (resolved?.requestId) setSentIntentId(current => current === resolved.requestId ? null : current);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [campaign.id, masterMode, userId]);

  async function sendAttackIntent() {
    if (!playerCanChooseAttack || !attacker || !target || !option || option.pfCost > attacker.pf || sentIntentId) return;
    const requestId = crypto.randomUUID();
    const intent: AttackIntent = {
      requestId, campaignId: campaign.id, attackerId: attacker.id, targetId: target.id, optionId: option.id,
      dice, mode: 'single', triple: triple && tripleAvailable, senderUserId: userId!, senderName: attacker.name, createdAt: Date.now(),
    };
    const channel = supabase.channel(`herdeiros-combat-actions-${campaign.id}`);
    await channel.subscribe();
    await channel.send({ type: 'broadcast', event: 'combat_attack_intent', payload: intent });
    await supabase.removeChannel(channel);
    setSentIntentId(requestId);
    setPending(null);
  }
  function selectOption(id: string) {
    setOptionId(id); setPending(null); setArea(null); setNotice('');
  }
  function attackButtons() {
    if (!option) return null;
    return <div className="mt-3 flex flex-wrap gap-2">
      {mode !== 'single' ? <>
        <Button disabled={option.pfCost > (attacker?.pf ?? 0) || !areaTargets.length || attackerLost} onClick={rollAreaAttack}><Swords /> Atacar todos ({areaTargets.length})</Button>
        <Button variant="outline" className={area?.crit ? 'action-critical' : ''} disabled={!area?.results.some(x => x.hit) || !!area?.damage} onClick={rollAreaDamage}><Dices /> Rolar dano em área{area?.crit ? ' CRÍTICO!' : ''}</Button>
      </> : <>
        <Button disabled={option.pfCost > (attacker?.pf ?? 0) || attackerLost} onClick={rollAttack}><Swords /> Rolar ataque</Button>
        <Button variant="outline" className={pending?.crit ? 'action-critical' : ''} disabled={!(pending?.hit || pending?.countered) || !!pending?.damage} onClick={rollDamage}><Dices /> {pending?.countered ? 'Rolar dano do contra-ataque' : `Rolar dano ${option.nomenclature ? `da ${skillName.toLowerCase()}` : 'da arma'}`}{pending?.crit ? ' CRÍTICO!' : ''}</Button>
      </>}
    </div>;
  }
  const log = (lines: string[]) => saveCampaign({ ...campaign, log: [...lines.reverse(), ...campaign.log] });
  function setResources(c: Combatant, pv: number | null, pf: number | null) {
    if (c.npc) saveNpc({ ...c.npc, pv_current: pv === null ? c.npc.pv_current : Math.max(0, Math.min(c.pvMax, pv)), pf_current: pf === null ? c.npc.pf_current : Math.max(0, Math.min(c.pfMax, pf)) });
    else updateSheet(c.id, pv, pf);
  }
  /** Passiva Arcadiana: ao ter êxito em um acerto, recupera 2/4/8 PF no ataque. */
  const arcadianGain = (a: Combatant) => a.pc?.lineage === 'Arcadiano' ? (ARCADIAN_PF[stageIndexFor(a.pc.lineage, a.pc.stage)] ?? 2) : 0;

  function rollAreaAttack() {
    if (!attacker || !option || !areaTargets.length || option.pfCost > attacker.pf || attackerLost) return;
    const r = attackRoll(attacker[option.hitAttr]);
    const results = areaTargets.map(t => { const hit = !r.fumble && r.total >= t.esquiva; return { id: t.id, name: t.name, esquiva: t.esquiva, hit, crit: hit && r.nat20 }; });
    const crit = results.some(x => x.crit);
    const gain = results.some(x => x.hit) ? arcadianGain(attacker) : 0;
    if (option.pfCost || gain) setResources(attacker, null, Math.min(attacker.pfMax, attacker.pf - option.pfCost + gain));
    setPending(null); setArea({ attackerId: attacker.id, option, dice, d20: r.d20, attrDie: r.attrDie, attrRoll: r.attrRoll, total: r.total, crit, fumble: r.fumble, results });
    addRoll({ expression: r.expression, dice: r.dice, modifier: r.modifier, total: r.total, source: `${attacker.name} → todos (${mode === 'half' ? 'metade' : 'dano total'})${r.fumble ? ' — FALHA CRÍTICA' : crit ? ' — CRÍTICO!' : ''}`, crit });
    log([`${attacker.name} ataca TODOS os inimigos (${option.label}, ${mode === 'half' ? 'metade do dano' : 'dano total'}): ${r.fumble ? 'FALHA CRÍTICA! ' : crit ? 'CRÍTICO! ' : ''}d20 [${r.d20}] + 1d${r.attrDie} [${r.attrRoll}] (${attrLabelFor(option.hitAttr, lineage)}) = ${r.total} → ${results.map(x => `${x.name} (Esq ${x.esquiva}): ${x.hit ? (x.crit ? 'CRÍTICO!' : 'acertou') : 'errou'}`).join('; ')}${gain ? ` · +${gain} PF (passiva Arcadiana)` : ''}`]);
  }
  function rollAreaDamage() {
    if (!area || area.damage) return;
    const a = combatants.find(c => c.id === area.attackerId); if (!a) return;
    const d = optionDamage(area.option, area.dice, area.results.some(x => x.crit));
    const applied = mode === 'half' ? Math.floor(d.total / 2) : d.total;
    const lines: string[] = [];
    area.results.filter(x => x.hit).forEach(x => { const t = combatants.find(c => c.id === x.id); if (!t) return; const pv = Math.max(0, t.pv - applied); setResources(t, pv, null); lines.push(`${t.name}: ${applied} → ${pv} PV${pv === 0 ? ' (AGONIA)' : ''}`); });
    setArea({ ...area, damage: { raw: d.total, applied, lines } });
    addRoll({ expression: d.expression, dice: d.dice, modifier: d.bonus, total: d.total, source: `Dano em área${mode === 'half' ? ' (metade)' : ''}` });
    log([`Dano em área${area.crit ? ' CRÍTICO! (dados dobrados)' : ''}: ${d.expression} = ${d.total}${mode === 'half' ? ` → metade ${applied}` : ''}. ${lines.join('; ')}`]);
  }

  /**
   * Resolve um ataque contra a reação escolhida pelo alvo (Cap. V).
   * Sem Reação disponível o alvo não consegue se defender: o ataque acerta (1 natural continua sendo falha crítica).
   */
  function resolveAttack(a: Combatant, t: Combatant, o: AttackOption, diceToResolve: string, requested: Reaction, requestId?: string, wantTriple = false) {
    setNotice('');
    const fail = (msg: string) => { setNotice(msg); return false; };
    if (o.pfCost > a.pf) return fail('PF insuficientes para esta técnica.');
    if (lostAction[a.id]) return fail(`${a.name} sacrificou ${lostAction[a.id] === 'all' ? 'a ação inteira' : 'a ação padrão'} neste turno (Bloqueio usado na rodada anterior).`);
    const tripleOn = wantTriple && !o.nomenclature && !!a.pc && canTripleCrit(a.pc) && a.pf - o.pfCost >= TRIPLE_CRIT_COST;
    const dn = dance[t.id];
    const dancing = !!dn && dn.round === campaign.round && !dn.broken && o.melee;
    const available = reactionAvailable(t);
    let reaction: Reaction | 'nenhuma' = 'nenhuma';
    if (dancing) reaction = 'danca';
    else if (available) {
      reaction = requested;
      if (reaction === 'danca' && !o.melee) return fail('A Dança de Batalha só vale contra ataques corpo a corpo.');
      if (reaction === 'parcial' && (o.nomKind !== 'Parcial' || t.pf < 4)) return fail('Bloqueio Parcial: só contra Nomenclatura Parcial e exige 4 PF.');
      if (reaction === 'completa' && (o.nomKind !== 'Completa' || completaLast[t.id])) return fail('Bloqueio contra Completa: só contra Nomenclatura Completa e não pode ser consecutivo.');
    }
    const esqEff = t.esquiva - (reaction === 'danca' && dn && dn.round === campaign.round ? danceStep(dn.enemies) * dn.evaded : 0);
    const r = attackRoll(a[o.hitAttr], esqEff);
    let hit = false; let countered: Pending['countered'];
    if (!r.fumble) {
      if (reaction === 'nenhuma' || reaction === 'bloquear' || reaction === 'parcial' || reaction === 'completa') hit = true;
      else if (reaction === 'esquivar' || reaction === 'danca') hit = r.total >= esqEff;
      else { const c = counterRoll(t); if (c.total > r.total) countered = { total: c.total, text: `d20 [${c.d20}] + 1d${c.attrDie} [${c.attrRoll}] (${attrLabelFor(c.attr, t.pc?.lineage)}) = ${c.total}` }; else hit = true; }
    }
    const crit = hit && r.nat20 && r.total >= esqEff;
    // Custos e bloqueios
    let block = 0; let blockText = '';
    const readBlock = humanReadBonus(t, a);
    if (hit) {
      if (reaction === 'bloquear') { block = t.bloqueio + readBlock; blockText = `Bloqueio ${t.bloqueio}${readBlock ? ` + ${readBlock} (leitura do fluxo)` : ''}`; }
      if (reaction === 'parcial') { const p = protectRoll(t.espirito, t.bloqueio, 'Parcial'); block = p.total + readBlock; blockText = `${p.expression} [${p.dice.join(', ')}] = ${p.total}${readBlock ? ` + ${readBlock}` : ''}`; }
      if (reaction === 'completa') {
        const p = protectRoll(t.espirito, t.bloqueio, 'Completa'); const g = guardian ? protectRoll(guardian.espirito, guardian.bloqueio, 'Completa') : null;
        block = p.total + (g?.total ?? 0) + readBlock;
        blockText = `${p.expression} [${p.dice.join(', ')}] = ${p.total}${g && guardian ? ` + Proteção Compartilhada de ${guardian.name} (${g.expression} [${g.dice.join(', ')}] = ${g.total})` : ''}${readBlock ? ` + ${readBlock}` : ''}`;
      }
    }
    if (reaction !== 'nenhuma' && !(reaction === 'danca' && dancing)) setReactions(prev => ({ ...prev, [t.id]: campaign.round }));
    if (reaction !== 'nenhuma') setCompletaLast(prev => ({ ...prev, [t.id]: reaction === 'completa' }));
    if (reaction === 'parcial') { setResources(t, null, t.pf - 4); setLostAction(prev => ({ ...prev, [t.id]: prev[t.id] ?? 'standard' })); }
    if (reaction === 'completa') {
      setLostAction(prev => ({ ...prev, [t.id]: 'all', ...(guardian ? { [guardian.id]: 'all' as LostKind } : {}) }));
      if (guardian) { setReactions(prev => ({ ...prev, [guardian.id]: campaign.round })); setCompletaLast(prev => ({ ...prev, [guardian.id]: true })); }
    }
    if (reaction === 'danca') setDance(prev => { const cur = dn && dn.round === campaign.round ? dn : { round: campaign.round, enemies: danceEnemies, evaded: 0, broken: false }; return { ...prev, [t.id]: hit ? { ...cur, broken: true } : { ...cur, evaded: cur.evaded + 1 } }; });
    const gain = hit ? arcadianGain(a) : 0;
    const spent = o.pfCost + (tripleOn ? TRIPLE_CRIT_COST : 0);
    if (spent || gain) setResources(a, null, Math.min(a.pfMax, a.pf - spent + gain));
    setPending({ attackerId: a.id, targetId: t.id, option: o, dice: diceToResolve, d20: r.d20, attrDie: r.attrDie, attrRoll: r.attrRoll, total: r.total, esquiva: esqEff, hit, crit, fumble: r.fumble, reaction, block, blockText, triple: tripleOn, ...(countered ? { countered } : {}) });
    addRoll({ expression: r.expression, dice: r.dice, modifier: r.modifier, total: r.total, source: `${a.name} → ${t.name}${r.fumble ? ' — FALHA CRÍTICA' : crit ? ' — CRÍTICO' : ''}`, crit });
    const outcome = r.fumble ? 'FALHA CRÍTICA (1 natural)' : countered ? `CONTRA-ATACADO (${countered.text} supera ${r.total})` : hit ? (crit ? 'CRÍTICO! ATAQUE ACERTOU' : 'ATAQUE ACERTOU') : (reaction === 'danca' ? 'ALVO EVITOU (Dança de Batalha)' : 'ALVO ESQUIVOU');
    log([`${a.name} ataca ${t.name} (${o.label}${spent ? `, −${spent} PF` : ''}): d20 [${r.d20}] + 1d${r.attrDie} [${r.attrRoll}] (${attrLabelFor(o.hitAttr, a.pc?.lineage)}) = ${r.total}; reação: ${REACTION_NAME[reaction]}${reaction === 'esquivar' || reaction === 'danca' ? ` (Esquiva ${esqEff})` : ''}${blockText ? ` — ${blockText}` : ''} → ${outcome}${gain ? ` · +${gain} PF (passiva Arcadiana)` : ''}${tripleOn ? ' · Crítico Triplo preparado' : ''}`]);
    if (requestId && userId) {
      const channel = supabase.channel(`herdeiros-combat-actions-${campaign.id}`);
      void channel.subscribe().then(async () => {
        await channel.send({ type: 'broadcast', event: 'combat_attack_resolved', payload: { requestId, campaignId: campaign.id, userId } });
        await supabase.removeChannel(channel);
      });
    }
    return true;
  }

  function rollAttack() {
    if (!masterMode || !attacker || !target || !option) return;
    resolveAttack(attacker, target, option, dice, reactionValid, undefined, triple && tripleAvailable);
  }

  function resolveIncomingIntent(intent: AttackIntent, reaction: Reaction) {
    const a = combatants.find(c => c.id === intent.attackerId);
    const t = combatants.find(c => c.id === intent.targetId);
    if (!a || !t || !a.pc || a.id !== current?.id || !campaign.combat_active) return;
    const selected = optionsFor(a).find(o => o.id === intent.optionId);
    if (!selected) return;
    const resolved = resolveAttack(a, t, selected, intent.dice, reaction, intent.requestId, !!intent.triple);
    if (resolved) setIncomingIntents(prev => prev.filter(item => item.requestId !== intent.requestId));
  }

  function rollDamage() {
    if (!pending || pending.damage) return;
    const a = combatants.find(c => c.id === pending.attackerId); const t = combatants.find(c => c.id === pending.targetId);
    if (!a || !t) return;
    if (pending.countered) {
      // Contra-ataque vencedor: ataque livre do alvo contra quem atacou (arma da linhagem, ou golpe desarmado).
      const opts = optionsFor(t); const co = opts.find(o => o.id === 'arma') ?? opts[0];
      if (!co) return;
      const free = optionDamage(co, co.dice[0]!, false, humanReadBonus(t, a));
      const pv = Math.max(0, a.pv - free.total);
      setResources(a, pv, null);
      setPending({ ...pending, damage: { raw: free.total, dice: free.dice, bonus: free.bonus, block: 0, final: free.total } });
      addRoll({ expression: free.expression, dice: free.dice, modifier: free.bonus, total: free.total, source: `Contra-ataque de ${t.name} em ${a.name}` });
      log([`Contra-ataque: ${t.name} devolve ${free.expression} = ${free.total} em ${a.name}: ${a.pv} → ${pv} PV${pv === 0 ? ' — entra em AGONIA' : ''}`]);
      return;
    }
    const extra = humanReadBonus(a, t);
    const d = optionDamage(pending.option, pending.dice, pending.crit, extra, pending.triple && pending.crit ? 3 : 2);
    const final = Math.max(0, d.total - pending.block); const pv = Math.max(0, t.pv - final);
    setPending({ ...pending, damage: { raw: d.total, dice: d.dice, bonus: d.bonus, block: pending.block, final } });
    setResources(t, pv, null);
    addRoll({ expression: d.expression, dice: d.dice, modifier: d.bonus, total: d.total, source: `Dano em ${t.name}${pending.crit ? ' — CRÍTICO' : ''}`, crit: pending.crit });
    log([`Dano${pending.crit ? ` CRÍTICO! (dados ${pending.triple ? 'triplicados' : 'dobrados'})` : ''}: ${d.expression} = ${d.total}${pending.block ? ` − bloqueio ${pending.block}` : ''} = ${final}. ${t.name}: ${t.pv} → ${pv} PV${pv === 0 ? ' — entra em AGONIA' : ''}`]);
  }

  function rollNpcInitiative(n: Npc) {
    const r = initiativeRoll(n.corpo); saveNpc({ ...n, initiative: r.total });
    addRoll({ expression: `${n.corpo}d20 (maior) + ${n.corpo}`, dice: r.dice, modifier: n.corpo, total: r.total, source: `Iniciativa: ${n.name}` });
  }

  /** Forçar o Fluxo de um NPC/inimigo com ficha completa (mesma regra da ficha de jogador). */
  function npcForceFlux(n: Npc) {
    const sheet = npcSheet(n); if (!sheet) return;
    const f = forceFlux(sheet.espirito);
    const patch: Partial<Character> = { pf_current: Math.min(sheet.pf_max, sheet.pf_current + f.pf) };
    if (!isMonster(sheet)) patch.karma = Math.min(karmaMaximum(sheet.mente, sheet.espirito), sheet.karma + f.karma);
    saveNpc(applyNpcSheetPatch(n, patch));
    addRoll({ expression: f.expression, dice: f.dice, modifier: 0, total: f.total, source: `${forceActionLabel(sheet.lineage)}: ${n.name} (+${f.pf} PF${isMonster(sheet) ? '' : `, +${f.karma} Karma`})` });
  }
  function rollPcInitiative(c: Combatant) {
    const r = initiativeRoll(c.corpo);
    setPcInitiative?.(c.id, r.total);
    addRoll({ expression: `${c.corpo}d20 (maior) + ${c.corpo}`, dice: r.dice, modifier: c.corpo, total: r.total, source: `Iniciativa: ${c.name}` });
  }
  function toggleCombat() {
    combatants.forEach(c => { if (c.pc) resetStandard?.(c.pc); });
    setReactions({}); setLostAction({}); setCompletaLast({}); setDance({}); setPending(null); setNotice('');
    saveCampaign({ ...campaign, combat_active: !campaign.combat_active, round: 1, turn_index: 0, log: [`${campaign.combat_active ? 'Combate encerrado' : 'Combate iniciado'} — ${new Date().toLocaleTimeString('pt-BR')}`, ...campaign.log] });
  }
  function nextTurn() {
    const next = campaign.turn_index + 1; const nextFighter = combatants[next % Math.max(1, combatants.length)];
    // A Reação volta quando chega a vez do personagem; a ação sacrificada vale no turno dele e some quando esse turno termina.
    setLostAction(prev => { const copy = { ...prev }; if (current) delete copy[current.id]; return copy; });
    if (nextFighter) { setReactions(prev => ({ ...prev, [nextFighter.id]: 0 })); if (nextFighter.pc) resetStandard?.(nextFighter.pc); }
    setAttackerId(''); setPending(null); setNotice('');
    const sacrificed = nextFighter ? lostAction[nextFighter.id] : undefined;
    saveCampaign({ ...campaign, turn_index: next % Math.max(1, combatants.length), round: next >= combatants.length ? campaign.round + 1 : campaign.round, log: [`Turno de ${nextFighter?.name ?? '—'}${sacrificed ? (sacrificed === 'all' ? ' (ação inteira sacrificada: padrão, deslocamento e fala)' : ' (ação padrão sacrificada)') : ''}`, ...campaign.log] });
  }

  const readKey = attacker && target ? `${attacker.id}>${target.id}` : '';
  const canRead = masterMode && !!attacker?.pc && isHuman(attacker.pc.lineage) && !!target;
  return <div className="combat-layout">
    <div className="stack">
      <section className="game-panel"><div className="panel-head"><h3>Ordem de iniciativa</h3><span className="field-kicker">RODADA {campaign.round}</span></div>
        <div className="combat-list">{combatants.map((c, i) => <div key={c.id} className={`combatant ${current?.id === c.id ? 'current' : ''}`}>
          <span className="combatant-number">{c.initiative ?? '—'}</span>
          <span className="combatant-icon">{c.kind === 'npc' ? <Skull /> : <Users />}</span>
          <span className="flex-1"><strong>{c.name}</strong><small>{c.pv} / {c.pvMax} PV · <span className="text-flux">{c.pf} / {c.pfMax} PF</span> · Esq {c.esquiva} · Bloq {c.bloqueio}{c.pc ? agonyLabel(c.pc) : (c.pv === 0 ? ' · AGONIA' : '')}{campaign.combat_active ? (reactionAvailable(c) ? ' · Reação ✓' : ' · Reação usada') : ''}{lostAction[c.id] ? (lostAction[c.id] === 'all' ? ' · sem ação' : ' · sem ação padrão') : ''}</small></span>
          <Button variant="outline" size="sm" title="Rolar iniciativa" aria-label={`Rolar iniciativa de ${c.name}`} onClick={() => c.npc ? rollNpcInitiative(c.npc) : rollPcInitiative(c)}><Dices /> Iniciativa</Button>
          {(() => { const ns = c.npc ? npcSheet(c.npc) : null; if (!c.npc || !ns) return null; const npc = c.npc; return <>
            <Button variant="outline" size="sm" className={isTechAgent(ns.lineage) ? 'action-force-nucleo' : 'action-force-karma'} title="Forçar o Fluxo" aria-label={`Forçar o Fluxo de ${c.name}`} onClick={() => npcForceFlux(npc)}><Sparkles /> {forceActionLabel(ns.lineage)}</Button>
            <AbsorbPfAction character={ns} update={p => saveNpc(applyNpcSheetPatch(npc, p))} addRoll={addRoll} />
          </>; })()}
          {openSheet && (!masterMode ? c.id === myCharacterId : true) && <Button variant="outline" size="sm" title={masterMode ? 'Editar ficha' : 'Abrir ficha'} aria-label={`${masterMode ? 'Editar' : 'Abrir'} ficha de ${c.name}`} onClick={() => openSheet(c)}>{masterMode ? 'Editar ficha' : 'Abrir ficha'}</Button>}
          {c.pc && enterAgony && masterMode && !agonyStatus(c.pc).active && !agonyStatus(c.pc).dead && <Button variant="outline" size="sm" className="action-agony" title="Entrar em Agonia" aria-label={`Entrar em Agonia: ${c.name}`} onClick={() => enterAgony(c.pc!)}><Skull /> Agonia</Button>}
          <span className="sr-only">{i}</span>
        </div>)}{!combatants.length && <p className="empty-copy">Os jogadores entram pela Mesa escolhendo sua ficha. Adicione NPCs para o combate.</p>}</div>
        <div className="combat-controls">
          <Button disabled={!combatants.length} onClick={toggleCombat}>{campaign.combat_active ? 'Encerrar combate' : 'Iniciar combate'}</Button>
          <Button variant="outline" disabled={!campaign.combat_active} onClick={nextTurn}>Próximo turno <ArrowRight /></Button>
          <Button variant="ghost" title="Limpar iniciativas para uma nova rolagem" onClick={() => { combatants.forEach(c => c.npc ? saveNpc({ ...c.npc, initiative: null }) : updateSheet(c.id, null, null, true)); }}><RotateCcw /> Limpar iniciativas</Button>
        </div>
      </section>

      <section className="game-panel"><div className="panel-head"><h3>Ação de ataque</h3><Crosshair size={15} /></div>
        {notice && <div className="combat-banner banner-miss mb-4" role="alert"><strong>Não foi possível resolver</strong><span>{notice}</span></div>}
        {!masterMode && incomingIntents.length > 0 && <div className="combat-banner banner-hit mb-4"><strong>O Mestre recebeu {incomingIntents.length} ação(ões)</strong><span>Escolha a reação para resolver cada ataque.</span>{incomingIntents.map(intent => { const a = combatants.find(c => c.id === intent.attackerId); const t = combatants.find(c => c.id === intent.targetId); const o = a ? optionsFor(a).find(x => x.id === intent.optionId) : undefined; return <span key={intent.requestId}>{intent.senderName} → {t?.name ?? intent.targetId} · {o?.label ?? intent.optionId}</span>; })}</div>}
        {masterMode && incomingIntents.length > 0 && <div className="game-panel mb-5"><div className="panel-head"><h3>Ações dos jogadores</h3><span className="field-kicker">TEMPO REAL</span></div><div className="stack">{incomingIntents.map(intent => { const a = combatants.find(c => c.id === intent.attackerId); const t = combatants.find(c => c.id === intent.targetId); const o = a ? optionsFor(a).find(x => x.id === intent.optionId) : undefined; if (!a || !t || !o) return null; const choices = reactionChoices(o, t); const available = reactionAvailable(t) || (o.melee && !!dance[t.id] && dance[t.id]!.round === campaign.round && !dance[t.id]!.broken); return <div key={intent.requestId} className="combat-banner banner-hit"><strong>{a.name} quer atacar {t.name}</strong><span>{o.label} · {intent.dice}{intent.triple ? ' · Crítico Triplo' : ''}</span>{!available && <span>{t.name} já usou a Reação: o ataque acerta sem defesa.</span>}<div className="flex flex-wrap gap-2 pt-2">{available ? choices.map(c => <Button key={c.value} size="sm" variant="outline" disabled={c.disabled} onClick={() => resolveIncomingIntent(intent, c.value)}>{REACTION_NAME[c.value]}</Button>) : <Button size="sm" variant="outline" onClick={() => resolveIncomingIntent(intent, 'esquivar')}>Resolver sem Reação</Button>}</div></div>; })}</div></div>}
        {!masterMode && !isMyTurn && campaign.combat_active && <p className="empty-copy">Aguarde seu turno. Quando ele chegar, escolha o alvo e o ataque; o Mestre decidirá a reação.</p>}
        {!masterMode && isMyTurn && attackerLost && <p className="empty-copy">Você sacrificou {lostAction[attacker!.id] === 'all' ? 'a ação inteira' : 'a ação padrão'} neste turno por causa do Bloqueio.</p>}
        {attacker && target ? <div className="field-stack">
          <div className="input-grid">
            {masterMode ? <label className="field"><span className="field-label">ATACANTE</span><select value={attacker.id} onChange={e => { setAttackerId(e.target.value); selectOption('desarmado_leve'); }}>{combatants.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label> : <div className="field"><span className="field-label">ATACANTE</span><strong>{attacker.name} · {isMyTurn ? 'SEU TURNO' : 'AGUARDE'}</strong></div>}
            <label className="field"><span className="field-label">ALVO</span><select value={target.id} onChange={e => { setTargetId(e.target.value); setPending(null); setArea(null); }} disabled={!masterMode && !isMyTurn}>{targets.map(c => <option key={c.id} value={c.id}>{c.name} (Esq {c.esquiva})</option>)}</select></label>
          </div>
          {masterMode && <label className="field"><span className="field-label">MODO DE ATAQUE</span><select value={mode} onChange={e => { setMode(e.target.value as 'single' | 'full' | 'half'); setPending(null); setArea(null); }}><option value="single">Um alvo</option><option value="full">Todos os inimigos · dano total</option><option value="half">Todos os inimigos · metade do dano</option></select></label>}
          {masterMode && mode === 'single' && <label className="field"><span className="field-label">REAÇÃO DE {target.name.toUpperCase()} {reactionAvailable(target) ? '' : '· JÁ USADA NESTA RODADA (ataque acerta sem defesa)'}</span><select value={reactionValid} onChange={e => { setChosenReaction(e.target.value as Reaction); setPending(null); }} disabled={!reactionAvailable(target)}>{reactionOptions.map(r => <option key={r.value} value={r.value} disabled={r.disabled}>{r.label}</option>)}</select></label>}
          {masterMode && mode === 'single' && reactionValid === 'danca' && <label className="field"><span className="field-label">INIMIGOS ATACANDO (PRESSÃO DE COMBATE)</span><select value={danceEnemies} onChange={e => setDanceEnemies(Number(e.target.value))}><option value={2}>2 inimigos · sem penalidade</option><option value={3}>3 ou 4 inimigos · −1 Esquiva por ataque evitado</option><option value={5}>5 ou mais · −2 Esquiva por ataque evitado</option></select></label>}
          {masterMode && mode === 'single' && reactionValid === 'completa' && <label className="field"><span className="field-label">PROTEÇÃO COMPARTILHADA (ELO {PROTECTION_MIN_ELO}+)</span><select value={guardian?.id ?? ''} onChange={e => setGuardianId(e.target.value)}><option value="">Sem aliado protegendo</option>{guardianOptions.map(g => <option key={g.id} value={g.id}>{g.name} · gasta a Reação e a próxima ação inteira</option>)}</select></label>}
          {masterMode && mode === 'single' && dance[target.id]?.round === campaign.round && !dance[target.id]!.broken && <div className="combat-banner banner-hit"><strong>Dança de Batalha em andamento</strong><span>{target.name} já evitou {dance[target.id]!.evaded} ataque(s). Esquiva atual: {target.esquiva - danceStep(dance[target.id]!.enemies) * dance[target.id]!.evaded}. Se qualquer ataque acertar, o ritmo se quebra.</span></div>}
          <div className="grid grid-cols-1 gap-5 border-t border-border pt-4 sm:grid-cols-2">
            <div className="min-w-0"><h4 className="field-kicker mb-3">ARMAS</h4>
              <label className="field"><span className="field-label">ARMA</span><select aria-label="Arma de ataque" value={option && !option.nomenclature ? option.id : ''} onChange={e => selectOption(e.target.value)} disabled={!masterMode && !isMyTurn}><option value="" disabled>Selecionar arma</option>{weapons.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
              {canRead && <Button className="mt-3" variant="outline" disabled={!!read[readKey]} onClick={() => { setRead(prev => ({ ...prev, [readKey]: true })); log([`${attacker.name} gasta a ação padrão e lê o fluxo parcial de ${target.name}: +${READ_BONUS[stageIndexFor(attacker.pc!.lineage, attacker.pc!.stage)] ?? 3} de dano e de bloqueio contra ele.`]); }}><Sparkles /> {read[readKey] ? 'Fluxo do alvo já lido' : 'Ler fluxo parcial (ação padrão)'}</Button>}
              {tripleAvailable && <label className="anchor-toggle mt-3"><input type="checkbox" checked={triple} onChange={e => setTriple(e.target.checked)} /> Crítico Triplo (−{TRIPLE_CRIT_COST} PF, dados ×3 se crítico)</label>}
              {option && !option.nomenclature && (masterMode ? attackButtons() : <Button className="mt-3" disabled={!playerCanChooseAttack || !!sentIntentId || option.pfCost > attacker.pf} onClick={() => void sendAttackIntent()}><Swords /> {sentIntentId ? 'Ataque enviado ao Mestre' : 'Enviar ataque ao Mestre'}</Button>)}
            </div>
            <div className="min-w-0"><h4 className="field-kicker mb-3">{nomenclatureLabel(lineage, true).toUpperCase()}</h4>
              <div className="grid max-h-60 gap-2 overflow-y-auto">{nomenclatures.map(o => { const n = attacker.pc?.nomenclatures[Number(o.id.slice(4))]; return <Button key={o.id} variant="outline" aria-pressed={option?.id === o.id} disabled={(masterMode ? false : !isMyTurn) || (o.pfCost > attacker.pf && option?.id !== o.id)} onClick={() => selectOption(o.id)} className={`h-auto min-w-0 justify-start whitespace-normal py-2 text-left ${option?.id === o.id ? 'border-primary bg-accent' : ''}`}><span className="grid min-w-0 gap-1"><strong className="break-words">{n?.name ?? o.label}</strong><span className="break-words text-xs">{nomenclatureLevelLabel(lineage, n?.kind)} · {o.dice[0]}{o.extra.length ? ` + ${o.extra.join(' + ')}` : ''}{o.fixed ? ` + ${o.fixed}` : ''} · {o.pfCost} PF</span></span></Button>; })}{!nomenclatures.length && <p className="empty-copy">Nenhuma {skillName.toLowerCase()} criada na ficha.</p>}</div>
              {selectedSkill && (masterMode ? attackButtons() : <Button className="mt-3" disabled={!playerCanChooseAttack || !!sentIntentId || (option?.pfCost ?? 0) > attacker.pf} onClick={() => void sendAttackIntent()}><Swords /> {sentIntentId ? 'Ataque enviado ao Mestre' : 'Enviar ataque ao Mestre'}</Button>)}
            </div>
          </div>
          {option && <p className="weapon-summary">Acerto: <strong>1d20 + 1d{dieFor(attacker[option.hitAttr]) ?? 4} ({attrLabelFor(option.hitAttr, lineage)})</strong> vs Esquiva <strong>{target.esquiva}</strong> · Dano <strong>{dice}{option.extra.length ? ` + ${option.extra.join(' + ')}` : ''}{option.fixed ? ` + ${option.fixed}` : ''}</strong>{option.karma ? <strong className="text-karma"> + {option.karma} Karma</strong> : null}{option.pfCost ? <> · Custo <strong className="text-flux">{option.pfCost} PF</strong> (tem <span className="text-flux">{attacker.pf}</span>)</> : null}{option.critFlat ? <> · crítico: <strong>{option.critFlat}</strong> puro</> : null}</p>}
          {mode !== 'single' ? <>
          {area && <div className={`combat-banner ${area.crit ? 'banner-crit' : area.results.some(x => x.hit) ? 'banner-hit' : 'banner-miss'}`}>
            <strong>{area.fumble ? 'FALHA CRÍTICA! ' : area.crit ? 'CRÍTICO! ' : ''}Acerto {area.total}</strong>
            <span>d20 [{area.d20}] + 1d{area.attrDie} [{area.attrRoll}] ({attrLabelFor(area.option.hitAttr, combatants.find(c => c.id === area.attackerId)?.pc?.lineage)}) = {area.total}</span>
            {area.results.map(x => <span key={x.id}>{x.name} · Esq {x.esquiva} → {x.hit ? (x.crit ? 'CRÍTICO' : 'ACERTOU') : 'ERROU'}</span>)}
            {area.damage && <span><Shield size={12} className="inline" /> Dano {area.damage.raw}{mode === 'half' ? ` → metade ${area.damage.applied}` : ''}: {area.damage.lines.join(' · ')}</span>}
          </div>}
          </> : <>
          {pending && <div className={`combat-banner ${pending.crit ? 'banner-crit' : pending.hit || pending.countered ? 'banner-hit' : 'banner-miss'}`}>
            <strong>{pending.fumble ? 'FALHA CRÍTICA — 1 NATURAL' : pending.countered ? 'CONTRA-ATAQUE VENCEU — ATAQUE ANULADO' : pending.crit ? 'CRÍTICO! ATAQUE ACERTOU' : pending.hit ? 'ATAQUE ACERTOU' : pending.reaction === 'danca' ? 'ALVO EVITOU (DANÇA DE BATALHA)' : 'ALVO ESQUIVOU'}</strong>
            <span>d20 [{pending.d20}] + 1d{pending.attrDie} [{pending.attrRoll}] ({attrLabelFor(pending.option.hitAttr, combatants.find(c => c.id === pending.attackerId)?.pc?.lineage)}) = {pending.total} vs Esquiva {pending.esquiva} · reação: {REACTION_NAME[pending.reaction]}</span>
            {pending.countered && <span>Contra-ataque: {pending.countered.text} supera {pending.total}. O defensor narra um ataque livre; role o dano.</span>}
            {pending.blockText && <span>{pending.blockText}</span>}
            {pending.damage && <span><Shield size={12} className="inline" /> Dano bruto {pending.damage.raw} ({pending.damage.dice.join(' + ')}{pending.damage.bonus ? ` + ${pending.damage.bonus}` : ''}){pending.damage.block ? ` − bloqueio ${pending.damage.block}` : ''} = <strong>Dano final {pending.damage.final}</strong></span>}
          </div>}
          </>}
        </div> : <p className="empty-copy">São necessários ao menos dois combatentes.</p>}
      </section>
    </div>
    <section className="game-panel"><div className="panel-head"><h3>Crônica do combate</h3></div>{campaign.log.length ? campaign.log.filter(l => !l.startsWith('☠KILL:')).slice(0, 30).map((l, i) => <p className={`log-entry ${l.includes('CRÍTICO') ? 'log-crit' : ''}`} key={i}><span>✦</span>{l}</p>) : <p className="empty-copy">Os acontecimentos da batalha aparecerão aqui.</p>}</section>
  </div>;
}
