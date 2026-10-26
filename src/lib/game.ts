import { parseDamageFormula } from './weapon-damage';

export type Character = {
  id: string; name: string; lineage: string; stage: string; concept: string; weapon: string;
  corpo: number; mente: number; espirito: number; pv_current: number; pv_max: number;
  pf_current: number; pf_max: number; karma: number; gs: number; exhaustion: number;
  sync: { name: string; level: number }[]; nomenclatures: Nomenclature[];
  inventory: { name: string; quantity: number }[]; story: string;
   abilities: { name: string; description: string; kind?: 'scar' | 'state'; scarType?: string; benefit?: string }[]; weapon_type: string; weapon_dice: string; initiative: number | null;
};
export type NomenclatureKind = 'Direta' | 'Parcial' | 'Completa';
/** Uma nomenclatura tem até três versões (Direta, Parcial, Completa). `family` liga as versões à mesma nomenclatura; sem ela, a versão é uma nomenclatura própria (chave = nome). */
export type Nomenclature = { name: string; cost: number; effect?: string; kind?: NomenclatureKind; dice?: number; family?: string };
export type Npc = { id: string; name: string; kind: string; hidden: boolean; pv_current: number; pv_max: number; pf_current: number; pf_max: number; corpo: number; mente: number; espirito: number; esquiva: number; bloqueio: number; notes: string; initiative: number | null; /** O Mestre decide o que os jogadores veem do NPC (padrão: tudo; precisa da migração 20261021120000). */ show_name?: boolean; show_hp?: boolean; show_sheet?: boolean };
export const UNKNOWN_NPC_NAME = 'Criatura desconhecida';
export const npcShows = (n: Pick<Npc, 'show_name' | 'show_hp' | 'show_sheet'>, what: 'name' | 'hp' | 'sheet') => n[`show_${what}` as const] !== false;
/** Troca o nome real de NPCs com nome oculto por um nome genérico (registro, crônica e rolagens que os jogadores veem). */
export function hideNpcNames(text: string, npcs: Npc[]) {
  return npcs.filter(n => !npcShows(n, 'name') && n.name.trim().length > 1).sort((a, b) => b.name.length - a.name.length).reduce((t, n) => t.split(n.name).join(UNKNOWN_NPC_NAME), text);
}
export type Campaign = { id: string; name: string; code: string; scene: string; round: number; turn_index: number; combat_active: boolean; log: string[] };
export const dieFor = (n: number) => [0, 4, 6, 8, 10, 12][Math.max(1, Math.min(5, n))];
export const derived = (corpo: number) => ({ pv: [0,25,32,42,52,60][corpo] ?? 25, esquiva: [0,10,12,14,15,16][corpo] ?? 10, bloqueio: [0,3,5,7,10,12][corpo] ?? 3, deslocamento: [0,7,9,11,12,13][corpo] ?? 7 });
export const makeCharacter = (): Character => ({ id: crypto.randomUUID(), name: 'Novo Herdeiro', lineage: 'Humano', stage: 'Libertado', concept: '', weapon: '', corpo: 1, mente: 1, espirito: 1, pv_current: 25, pv_max: 25, pf_current: 0, pf_max: 20, karma: 0, gs: 0, exhaustion: 0, sync: [], nomenclatures: [], inventory: [], story: '', abilities: [], weapon_type: '', weapon_dice: '', initiative: null });
export const makeNpc = (): Npc => ({ id: crypto.randomUUID(), name: 'Novo inimigo', kind: 'inimigo', hidden: true, pv_current: 25, pv_max: 25, pf_current: 0, pf_max: 20, corpo: 1, mente: 1, espirito: 1, esquiva: 10, bloqueio: 3, notes: '', initiative: null });
export const makeCampaign = (): Campaign => ({ id: crypto.randomUUID(), name: 'A primeira travessia', code: 'DM3JUT', scene: 'O limiar', round: 1, turn_index: 0, combat_active: false, log: [] });
export function roll(expression: string) {
  const match = expression.replace(/\s/g, '').match(/^(\d*)d(4|6|8|10|12|20|100)([+-]\d+)?$/i);
  if (!match) return null;
  const quantity = Number(match[1] || 1), sides = Number(match[2]), modifier = Number(match[3] || 0);
  if (quantity < 1 || quantity > 30) return null;
  const dice = Array.from({ length: quantity }, () => 1 + Math.floor(Math.random() * sides));
  return { dice, modifier, total: dice.reduce((a, b) => a + b, modifier), expression: `${quantity}d${sides}${modifier ? (modifier > 0 ? '+' : '') + modifier : ''}` };
}

export function karmaMaximum(mente:number,espirito:number){ return Math.max(1,Math.floor((mente*20)/2+(espirito*20)/4)); }
export function karmaStage(value:number,max:number){const percent=value/Math.max(1,max)*100;return percent>=100?"consumido":percent>=70?"berserker":percent>=50?"gaki":"normal";}

/* ---------- Tabelas do Códice Supremo (valores fixos) ---------- */
export type WeaponType = { key: string; label: string; dice: string[]; attr: 'corpo' | 'atributo' | null; note: string };
/** Dano base: exatamente a tabela do Códice. Cada tipo de arma tem UM dado (o crítico dobra os dados). */
export const WEAPONS: WeaponType[] = [
  { key: 'desarmado_leve', label: 'Desarmado leve', dice: ['1d6'], attr: 'corpo', note: 'Golpes rápidos, socos e chutes. 1d6 + CORPO (crítico 2d6 + CORPO).' },
  { key: 'desarmado_pesado', label: 'Desarmado médio/pesado', dice: ['2d8'], attr: 'corpo', note: 'Exige foco ou preparação. 2d8 + CORPO (crítico 4d8 + CORPO).' },
  { key: 'cortante_leve', label: 'Cortante leve', dice: ['1d8'], attr: 'atributo', note: 'Facas e adagas. 1d8 + atributo (crítico 2d8 + atributo).' },
  { key: 'media_pesada', label: 'Média / pesada', dice: ['1d10'], attr: 'atributo', note: 'Espadas, machados, martelos grandes e porretes. 1d10 + atributo (crítico 2d10 + atributo).' },
  { key: 'fogo', label: 'Armas à distância (fogo, arco, besta)', dice: ['1d12'], attr: 'atributo', note: '1d12 + atributo (crítico 2d12 + atributo). Varia com tipo, calibre, manutenção, munição e pressão emocional do disparo.' },
];
export const weaponByKey = (key: string) => WEAPONS.find(w => w.key === key);
/** Dado próprio da ficha. Para golpes genéricos e outras armas, usa sempre a tabela. */
export function weaponDiceFor(c: Pick<Character, 'weapon_type' | 'weapon_dice'>, type = c.weapon_type) {
  const official = weaponByKey(type)?.dice[0] ?? '';
  if (type !== c.weapon_type || !official) return official;
  return parseDamageFormula(c.weapon_dice)?.normalized ?? official;
}

/** Garante que o dado escolhido pertence à tabela da arma (nunca acima do limite). */
export function cappedWeaponDice(type: string, _dice?: string) { const w = weaponByKey(type); if (!w) return null; return w.dice[0]!; }

/** Escalas de Recitação (Cap. VI): dano, dano crítico e custo de PF são fixos. */
export const NOMENCLATURE_DICE: Record<NomenclatureKind, string> = { Direta: '1d6', Parcial: '2d8', Completa: '6d8' };
export const NOMENCLATURE_CRIT_DICE: Record<NomenclatureKind, string> = { Direta: '2d6', Parcial: '4d8', Completa: '12d8' };
export const NOMENCLATURE_COST: Record<NomenclatureKind, number> = { Direta: 2, Parcial: 5, Completa: 12 };
export const NOMENCLATURE_LABEL: Record<NomenclatureKind, string> = { Direta: 'Nomeação Direta (Nome Curto) · 1d6 · 2 PF', Parcial: 'Recitação Parcial (O Chamado) · 2d8 · 5 PF', Completa: 'Recitação Completa (Verdadeira) · 6d8 · 12 PF' };
const TECH_NOMENCLATURE_LABEL: Record<NomenclatureKind, string> = { Direta: 'Ativação Rápida · 1d6 · 2 PN', Parcial: 'Ativação Calibrada · 2d8 · 5 PN', Completa: 'Ativação Plena · 6d8 · 12 PN' };
export function nomenclatureLabel(lineage: string, plural = false) {
  return isTechAgent(lineage) ? (plural ? 'Habilidades de Núcleo' : 'Habilidade de Núcleo') : (plural ? 'Nomenclaturas' : 'Nomenclatura');
}
export function nomenclatureLevelLabel(lineage: string, kind: NomenclatureKind | undefined) {
  return (isTechAgent(lineage) ? TECH_NOMENCLATURE_LABEL : NOMENCLATURE_LABEL)[kind ?? 'Direta'];
}

export type Attr = 'corpo' | 'mente' | 'espirito';
export const ATTR_LABEL: Record<Attr, string> = { corpo: 'CORPO', mente: 'MENTE', espirito: 'ESPÍRITO' };
/** Agente Tecnológico usa o campo espirito como Tecnologia (mesmo valor no banco). */
export const isTechAgent = (lineage: string) => lineage === 'Agente Tecnológico';
export const attrLabelFor = (attr: Attr, lineage?: string) => {
  if (lineage && isTechAgent(lineage) && attr === 'espirito') return 'TECNOLOGIA';
  return ATTR_LABEL[attr];
};
/** Arma de Núcleo e Habilidades de Núcleo do Agente usam TECNOLOGIA, armazenada no campo espirito por compatibilidade com Supabase.
 * Armas comuns e ataques desarmados usam CORPO, independentemente da linhagem (Códice, cap. II/V). */
export const weaponAttrFor = (lineage: string): Attr => isTechAgent(lineage) ? 'espirito' : lineage === 'Humano' ? 'mente' : lineage === 'Arcadiano' ? 'espirito' : 'corpo';

export function rollDice(count: number, sides: number) { return Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides)); }
export function parseDice(expr: string) { const m = expr.match(/^(\d+)d(\d+)$/); return m ? { count: Number(m[1]), sides: Number(m[2]) } : null; }

/**
 * Acerto: 1d20 + dado do atributo do atacante vs Esquiva (empate favorece o atacante).
 * 1 natural é SEMPRE falha crítica. 20 natural só é crítico se o total superar ou igualar a Esquiva (senão não acerta).
 * Sem Esquiva informada (rolagem solta na ficha), o 20 natural vem como crítico provisório.
 */
export function attackRoll(attrValue: number, esquiva?: number, critThreshold = 20) {
  const d20 = 1 + Math.floor(Math.random() * 20);
  const attrDie = dieFor(attrValue) ?? 4;
  const attrRoll = 1 + Math.floor(Math.random() * attrDie);
  const total = d20 + attrRoll;
  const nat20 = d20 === 20;
  const fumble = d20 === 1;
  const reaches = esquiva === undefined ? null : total >= esquiva;
  const crit = !fumble && d20 >= critThreshold && (reaches === null || reaches);
  const hit = fumble ? false : reaches;
  return { d20, attrDie, attrRoll, dice: [d20, attrRoll], expression: `1d20 + 1d${attrDie}`, modifier: 0, total, hit, crit, nat20, fumble, critThreshold };
}
/** Dano: no crítico dobra (ou triplica) apenas os dados; valores fixos entram uma única vez. */
export function damageRoll(dice: string, bonus: number, crit: boolean, mult = 2) {
  const p = parseDice(dice); if (!p) return { dice: [] as number[], bonus, total: bonus, expression: dice };
  const count = crit ? p.count * mult : p.count; const rolled = rollDice(count, p.sides);
  return { dice: rolled, bonus, total: rolled.reduce((a, b) => a + b, 0) + bonus, expression: `${count}d${p.sides}${bonus ? ` + ${bonus}` : ''}` };
}
/** Bônus de dano do Karma: 50% = +3, 70% = +5 em todo ataque. */
export function karmaDamageBonus(c: Pick<Character, 'karma' | 'mente' | 'espirito'>) { const st = karmaStage(c.karma, karmaMaximum(c.mente, c.espirito)); return st === 'berserker' || st === 'consumido' ? 5 : st === 'gaki' ? 3 : 0; }
/** Rótulos da barra de Karma / Destruição de Núcleo conforme linhagem e estágio. */
export function resourceStageLabel(lineage: string, stage: ReturnType<typeof karmaStage>) {
  if (isTechAgent(lineage)) {
    if (stage === 'consumido') return 'NÚCLEO CONSUMIDO';
    if (stage === 'berserker') return 'AUTODESTRUIÇÃO IMINENTE';
    if (stage === 'gaki') return 'NÚCLEO INSTÁVEL (50%)';
    return 'NÚCLEO ESTÁVEL';
  }
  if (stage === 'consumido') return 'CONSUMIDO PELO KARMA';
  if (stage === 'berserker') return 'MODO BERSERKER';
  if (stage === 'gaki') return 'DISTORÇÃO';
  return 'KARMA ESTÁVEL';
}
export function resourceBarLabel(lineage: string) {
  return isTechAgent(lineage) ? 'DESTRUIÇÃO DE NÚCLEO' : 'KARMA';
}
export function forceActionLabel(lineage: string) {
  return isTechAgent(lineage) ? 'Forçar Núcleo' : 'Forçar o Fluxo';
}
export function absorbActionLabel(lineage: string) {
  return isTechAgent(lineage) ? 'Poder do Núcleo' : 'Absorver PF';
}
export function initiativeRoll(corpo: number) { const dice = rollDice(Math.max(1, corpo), 20); return { dice, total: Math.max(...dice) + corpo }; }
/** Forçar o Fluxo (ação livre): rola de novo os d20 de Espírito; ganha PF = metade da soma (para baixo) e recebe Karma = metade dos PF gerados. */
export function forceFlux(espirito: number) { return forceFluxFromDice(rollDice(Math.max(1, espirito), 20)); }
/** Mesma regra de forceFlux, mas a partir de d20 já rolados. */
export function forceFluxFromDice(dice: number[]) {
  const total = dice.reduce((a, b) => a + b, 0);
  const pf = Math.floor(total / 2);
  return { dice, total, pf, karma: Math.floor(pf / 2), expression: `${dice.length}d20` };
}
/** Descanso considerável (Cap. IX): recupera PV e reduz Karma. */
export const REST_TYPES = {
  padrao: { label: 'Padrão (dormir, se acalmar, tempo de qualidade)', pv: '2d8', karma: '2d6' },
  vida: { label: 'Focado em vida (ala médica, tratamento)', pv: '2d12', karma: '1d6' },
  karma: { label: 'Focado em Karma (psiquiátrico, conversa, conversão)', pv: '1d8', karma: '3d6' },
} as const;
export type RestType = keyof typeof REST_TYPES;
/** Sofrimento de Karma só sobe de duas formas: Nomenclatura que reduza Karma ou descanso. */
export function restRoll(type: RestType) {
  const r = REST_TYPES[type];
  const pv = roll(r.pv)!; const karma = roll(r.karma)!;
  return { pv, karma, label: r.label };
}
/** Pressão de Combate: penalidade na Esquiva por ataque evitado na Dança de Batalha (2 inimigos: 0 · 3 ou 4: 1 · 5 ou mais: 2). */
export const danceStep = (enemies: number) => enemies >= 5 ? 2 : enemies >= 3 ? 1 : 0;
/** Elo mínimo: Partilhar PFs (2) e Proteção Compartilhada (3). */
export const PROTECTION_MIN_ELO = 3;
export const ELO_ACTIONS: [string, string][] = [['Proteger o aliado de um perigo real', '+1'], ['Dividir um segredo ou trauma', '+1'], ['Salvar o aliado de morte ou Agonia', '+2'], ['Luta em dupla ou combo marcante', '+1']];
/** Reação Contra-atacar: 1d20 + dado do atributo escolhido (normalmente o maior). */
export function counterRoll(c: { corpo: number; mente: number; espirito: number }) {
  const attr = (['corpo', 'mente', 'espirito'] as const).reduce((best, a) => c[a] > c[best] ? a : best, 'corpo' as Attr);
  const r = attackRoll(c[attr]);
  return { ...r, attr };
}
export function normalizeCharacter(c: Partial<Character> & { id: string }): Character { return { ...makeCharacter(), ...c, abilities: Array.isArray(c.abilities) ? c.abilities : [], sync: Array.isArray(c.sync) ? c.sync : [], nomenclatures: Array.isArray(c.nomenclatures) ? c.nomenclatures : [], inventory: Array.isArray(c.inventory) ? c.inventory : [], weapon_type: c.weapon_type ?? '', weapon_dice: c.weapon_dice ?? '', initiative: c.initiative ?? null } as Character; }

/** Estágio 1: os marcos tecnológicos oficiais substituem os genéricos do Agente.
 * Estágio 2: Engenharia de Obra-Prima é uma trilha EXCLUSIVA da campanha. */
export type TechGsPath = 'arma_nucleo' | 'corpo_modular' | 'habilidade_nucleo';
export type TechSighting = { name: string; source: string; repeats: number };
export const TECH_GS_PATHS: { id: TechGsPath; name: string; summary: string }[] = [
  { id: 'arma_nucleo', name: 'Arma de Núcleo', summary: 'Energia tecnológica, dano evoluído e crítico triplo.' },
  { id: 'corpo_modular', name: 'Corpo Modular', summary: 'Implantes, ataque extra e aprimoramentos de combate.' },
  { id: 'habilidade_nucleo', name: 'Habilidade de Núcleo', summary: 'Ativações aprimoradas, dominadas e favorita.' },
];
export const TECH_GS_DESCRIPTIONS: Record<TechGsPath, Record<5 | 7 | 10, { title: string; text: string }>> = {
  arma_nucleo: {
    5: { title: 'Núcleo Energizado', text: 'O dano da Arma de Núcleo passa a ser de Núcleo. Gastando 2 PN, conta como dano normal contra Gakis. O dado de TECNOLOGIA substitui o bônus fixo no dano.' },
    7: { title: 'Arma Dominada', text: 'Dano base da Arma de Núcleo + dado de TECNOLOGIA + valor fixo de TECNOLOGIA.' },
    10: { title: 'Arma Estilizada e Crítico Triplo', text: 'Efeito da arma escolhido com o Mestre. Antes de atacar, 10 PN permitem crítico em 20 menos TECNOLOGIA no d20, com dados de dano triplicados se acertar criticamente.' },
  },
  corpo_modular: {
    5: { title: 'Corpo Evoluído', text: 'Os implantes de combate acertam com TECNOLOGIA; o dado de TECNOLOGIA substitui o bônus fixo no dano de implantes.' },
    7: { title: 'Ataque Extra', text: 'Dano dos implantes + dado e valor fixo de TECNOLOGIA. Após acertar, gaste 3 PN para ataque extra com 2d20 (menor) + dado de TECNOLOGIA, uma vez por rodada.' },
    10: { title: 'O Chamado e Ataque Extra Refinado', text: 'O Chamado: 5 PN, alvos próximos testam ESPÍRITO (ou MENTE quando não possuem ESPÍRITO). Ataque Extra Refinado: 10 PN, dois ataques normais, uma vez por rodada.' },
  },
  habilidade_nucleo: {
    5: { title: 'Habilidade Aprimorada', text: 'O dado de TECNOLOGIA passa a integrar o dano das Ativações Rápida, Calibrada e Plena.' },
    7: { title: 'Habilidade Dominada', text: 'Soma dado + valor fixo de TECNOLOGIA ao dano. Calibrada custa 3 PN; Plena, 10 PN; Rápida, 2 PN.' },
    10: { title: 'Habilidade Favorita', text: 'Escolha uma Habilidade de Núcleo para evoluir com novos efeitos, dano ou alcance. Custo adicional definido pelo Mestre.' },
  },
};
export function techGsPath(c: Character): TechGsPath | null {
  if (!isTechAgent(c.lineage)) return null;
  return sheetState(c).techGsMarks?.['0:5'] ?? null;
}
export function techGsLevel(c: Character, path: TechGsPath): number {
  if (!isTechAgent(c.lineage) || techGsPath(c) !== path) return 0;
  const marks = sheetState(c).techGsMarks ?? {};
  return ([5, 7, 10] as const).reduce((rank, gs, i) => marks[`0:${gs}`] === path ? i + 1 : rank, 0);
}
/** Pode aplicar depois que o GS foi alcançado. Se o marco geral de 10 já zerou
 * o GS, ele ainda atesta o progresso de 5, 7 e 10 deste mesmo estágio. */
export function techGsCanClaim(c: Character, gs: 5 | 7 | 10): boolean {
  if (!isTechAgent(c.lineage) || stageIndexFor(c.lineage, c.stage) !== 0) return false;
  const st = sheetState(c);
  if (st.techGsMarks?.[`0:${gs}`]) return false;
  if (!(c.gs >= gs || st.milestones.includes('0:10'))) return false;
  if (gs === 7 && !st.techGsMarks?.['0:5']) return false;
  if (gs === 10 && !st.techGsMarks?.['0:7']) return false;
  return true;
}
export function applyTechGsMilestone(c: Character, gs: 5 | 7 | 10, path: TechGsPath, opts: { note?: string; favorite?: string } = {}): Character | null {
  if (!techGsCanClaim(c, gs) || !TECH_GS_PATHS.some(p => p.id === path)) return null;
  const st = sheetState(c);
  if (gs !== 5 && techGsPath(c) !== path) return null;
  const fav = (opts.favorite ?? '').trim();
  if (gs === 10 && path === 'habilidade_nucleo' && !c.nomenclatures.some(n => techniqueKey(n) === fav)) return null;
  const key = `0:${gs}`;
  const upgrades = { ...st.techniqueUpgrades };
  if (gs === 10 && path === 'habilidade_nucleo' && fav) {
    if (upgrades[fav]?.favorite) return null;
    upgrades[fav] = { ...upgrades[fav], favorite: opts.note?.trim() || 'Versão Favorita' };
  }
  return { ...c, gs: gs === 10 ? 0 : c.gs, abilities: withSheetState(c, {
    milestones: gs === 10 ? [...new Set([...st.milestones, '0:10'])] : st.milestones,
    techGsMarks: { ...(st.techGsMarks ?? {}), [key]: path },
    techGsNotes: { ...(st.techGsNotes ?? {}), [key]: opts.note?.trim() ?? '' },
    techGsFavorite: gs === 10 && fav ? fav : (st.techGsFavorite ?? ''),
    specialEffect: gs === 10 && path === 'arma_nucleo' && opts.note?.trim() ? opts.note.trim() : st.specialEffect,
    techniqueUpgrades: upgrades,
  }) };
}
/** Trilha exclusiva do segundo estágio do Agente Tecnológico: regras de campanha.
 * Um Núcleo auxiliar usa a reserva comum de PN, não duplica os PN máximos.
 * 5 GS amplifica; 7 GS cria um conceito personalizado; 10 GS eleva esse conceito a Obra-Prima. */
export type TechCoreMount = 'arma' | 'corpo';
export type TechCoreTier = 0 | 5 | 7 | 10;
export type TechCoreConcept = { name: string; effect: string; damage: string; masterpieceEffect: string; masterpieceDamage: string };
export type TechCorePending = { tier: 0 | 5 | 7 | 10; cost: number; name: string; effect: string; damage: string; mount: TechCoreMount };
export const TECH_CORE_DICE = ['', '1d4', '1d6', '1d8', '2d6', '2d8'] as const;
export const techCoreStage = (c: Character) => isTechAgent(c.lineage) && stageIndexFor(c.lineage, c.stage) >= 1;
export const techCoreRank = (c: Character): TechCoreTier => {
  if (!isTechAgent(c.lineage)) return 0;
  const marks = sheetState(c).techCoreMarks ?? [];
  return marks.includes(10) ? 10 : marks.includes(7) ? 7 : marks.includes(5) ? 5 : 0;
};
export function techCoreCanClaim(c: Character, tier: 5 | 7 | 10) {
  if (!techCoreStage(c) || stageIndexFor(c.lineage, c.stage) !== 1 || c.gs < tier) return false;
  const marks = sheetState(c).techCoreMarks ?? [];
  return !marks.includes(tier) && (tier === 5 || marks.includes(tier === 7 ? 5 : 7));
}
export function applyTechCoreMilestone(c: Character, tier: 5 | 7 | 10, next?: Partial<TechCoreConcept>): Character | null {
  if (!techCoreCanClaim(c, tier)) return null;
  const st = sheetState(c);
  const old = st.techCoreConcept ?? { name: '', effect: '', damage: '', masterpieceEffect: '', masterpieceDamage: '' };
  const concept = { ...old, ...next };
  if (tier === 7 && (!concept.name.trim() || !concept.effect.trim())) return null;
  if (tier === 10 && (!concept.name.trim() || !concept.masterpieceEffect.trim())) return null;
  if (![concept.damage, concept.masterpieceDamage].every(x => (TECH_CORE_DICE as readonly string[]).includes(x))) return null;
  return { ...c, gs: tier === 10 ? 0 : c.gs, abilities: withSheetState(c, {
    techCoreMarks: [...(st.techCoreMarks ?? []), tier],
    techCoreConcept: concept,
    milestones: tier === 10 ? [...new Set([...st.milestones, '1:10'])] : st.milestones,
  }) };
}
/** Oferece as alternativas sem acumular amplificações: os PN são consumidos ao ATIVAR.
 * O efeito fica armado na ficha para o próximo ataque tecnológico compatível. */
export function techCoreActivation(c: Character, tier: TechCoreTier): TechCorePending | null {
  if (!techCoreStage(c) || (tier !== 0 && techCoreRank(c) < tier)) return null;
  const st = sheetState(c);
  const co = st.techCoreConcept ?? { name: '', effect: '', damage: '', masterpieceEffect: '', masterpieceDamage: '' };
  const mount = st.techCoreMount ?? 'arma';
  if (tier === 0) return { tier, cost: 3, name: 'Impulso do Núcleo Auxiliar', effect: 'Impulso tecnológico básico', damage: '1d6', mount };
  if (tier === 5) return { tier, cost: 3, name: 'Amplificação de Núcleo', effect: 'Dano potencializado pelo Núcleo auxiliar', damage: '1d8', mount };
  if (tier === 7) return { tier, cost: 5, name: co.name, effect: co.effect, damage: co.damage, mount };
  return { tier, cost: 12, name: `${co.name} · Obra-Prima`, effect: co.masterpieceEffect, damage: co.masterpieceDamage, mount };
}
export function activateTechCore(c: Character, tier: TechCoreTier): Character | null {
  const st = sheetState(c), pending = techCoreActivation(c, tier);
  if (!pending || st.techCorePending || c.pf_current < pending.cost) return null;
  return { ...c, pf_current: c.pf_current - pending.cost, abilities: withSheetState(c, { techCorePending: pending }) };
}
export function techCoreCompatible(c: Character, category: 'arma' | 'habilidade'): boolean {
  const pending = sheetState(c).techCorePending;
  if (!pending || !techCoreStage(c)) return false;
  if (category === 'habilidade') return pending.mount === 'corpo';
  return pending.mount === 'arma' && sheetState(c).weaponMode !== 'comum' && weaponByKey(c.weapon_type)?.attr !== 'corpo';
}
/** Efeito extra em dados: NUNCA multiplica em críticos, nem em Habilidade Plena. */
export function techCoreExtraDamage(pending: TechCorePending | null | undefined) {
  if (!pending?.damage) return { total: 0, dice: [] as number[], expression: '' };
  return damageRoll(pending.damage, 0, false);
}

/** Olho Tecnológico evolui com o ESTÁGIO, independentemente do caminho de GS. */
export function techEyeRules(c: Character) {
  const stage = Math.max(0, Math.min(2, stageIndexFor(c.lineage, c.stage)));
  const config = [
    { name: 'Varredura', seen: 3, increment: 1, max: 6, damage: 2, canCancel: false },
    { name: 'Predição', seen: 4, increment: 2, max: 10, damage: 3, canCancel: false },
    { name: 'Anulação', seen: 6, increment: 0, max: 6, damage: 4, canCancel: true },
  ] as const;
  return config[stage]!;
}

// Persistent rule state shares the existing JSON abilities field; no table changes.
export type SheetState = { excess: number; rounds: number; agony: boolean; failures: number; stable: boolean; dead: boolean; standard: boolean; agonyDt: number; coins: number; anchorBroken: boolean; weaponDamageType: string; weaponHistory?: { at: string; from: string; to: string; damageType: string }[]; weaponMode: 'linhagem' | 'comum'; path: 'arma' | 'nomenclatura' | ''; weaponRank: number; nomRank: number; milestones: string[]; milestoneChoices: Record<string, string>; techGsMarks?: Record<string, TechGsPath>; techCoreMarks?: number[]; techCoreMount?: TechCoreMount; techCoreConcept?: TechCoreConcept; techCorePending?: TechCorePending | null; techGsNotes?: Record<string, string>; techGsFavorite?: string; techModularEquipped?: boolean; techSightings?: TechSighting[]; techniqueUpgrades: Record<string, { improved?: 'dano' | 'alcance'; mastered?: boolean; favorite?: string }>; attributeFloor: Partial<Record<Attr, number>>; attributeBudget: number; highestStage: number; specialEffect: string; fluxLink: boolean; mimic: { name: string; effect: string }[]; mimicClosed: string[]; ecoUsed: boolean; trueWeapon: boolean; relic: { name: string; text: string } };
export const emptySheetState: SheetState = { excess: 0, rounds: 0, agony: false, failures: 0, stable: false, dead: false, standard: false, agonyDt: 6, coins: 0, anchorBroken: false, weaponDamageType: '', weaponMode: 'linhagem', path: '', weaponRank: 0, nomRank: 0, milestones: [], milestoneChoices: {}, techGsMarks: {}, techCoreMarks: [], techCoreMount: 'arma', techCoreConcept: {name:'',effect:'',damage:'',masterpieceEffect:'',masterpieceDamage:''}, techCorePending: null, techGsNotes: {}, techGsFavorite: '', techModularEquipped: false, techSightings: [], techniqueUpgrades: {}, attributeFloor: {}, attributeBudget: 0, highestStage: 0, specialEffect: '', fluxLink: false, mimic: [], mimicClosed: [], ecoUsed: false, trueWeapon: false, relic: { name: '', text: '' } };
export function sheetState(c: Character): SheetState {
  try { return { ...emptySheetState, ...JSON.parse(c.abilities.find(a => a.kind === 'state')?.description ?? '{}') } as SheetState; }
  catch { return { ...emptySheetState }; }
}
export function withSheetState(c: Character, patch: Partial<SheetState>): Character['abilities'] {
  return [...c.abilities.filter(a => a.kind !== 'state'), { kind: 'state', name: '__rule_state__', description: JSON.stringify({ ...sheetState(c), ...patch }) }];
}
/* ---------- Partilhar PF excedentes ---------- */
/** "Mais de 2 pontos" de Sincronia = nível 3 ou maior. */
export const SHARE_MIN_SYNC = 2;
/** Primeiro nome, em minúsculas: "Ego Aurefield" → "ego". Mesma regra usada pela função share_excess_pf no banco. */
export const firstName = (name: string) => (name ?? '').trim().split(' ')[0]!.toLowerCase();
/** Maior nível de Sincronia que `from` tem com o alvo, identificado pelo começo do nome. */
export function syncLevelWith(from: Character, target: Pick<Character, 'name'>) {
  const key = firstName(target.name);
  if (!key) return 0;
  return from.sync.reduce((best, s) => firstName(s.name) === key ? Math.max(best, Number(s.level) || 0) : best, 0);
}
/** Motivo pelo qual Partilhar não pode ser usado agora (ou null se liberado). `sameTable` = alvo na mesma mesa. */
export function pfShareBlock(from: Character, to: Character | null, sameTable: boolean): string | null {
  const st = sheetState(from);
  if (st.excess <= 0) return `Você não tem ${isTechAgent(from.lineage) ? 'PN' : 'PF'} excedentes para partilhar.`;
  if (st.standard) return 'Você já gastou a Ação Padrão.';
  if (!to || to.id === from.id) return 'Escolha um alvo.';
  if (!sameTable) return 'O alvo não está na mesma mesa.';
  if (isTechAgent(from.lineage) && !isTechAgent(to.lineage)) return 'PN só podem ser transferidos para outro Agente Tecnológico ou dispositivo compatível.';
  if (!isTechAgent(from.lineage) && isTechAgent(to.lineage)) return 'PF não podem carregar o Núcleo de um Agente Tecnológico.';
  if (syncLevelWith(from, to) < SHARE_MIN_SYNC) return 'Elo insuficiente: é preciso 2 ou mais de Elo com o alvo.';
  if (to.pf_current >= to.pf_max) return `O alvo está com os ${isTechAgent(to.lineage) ? 'PN' : 'PF'} cheios e não pode receber o excedente.`;
  return null;
}
/** Resultado da transferência: o alvo recebe até o que cabe nos PF máximos; o que sobrar continua como excedente. Gasta a Ação Padrão. */
export function applyPfShare(from: Character, to: Character) {
  const st = sheetState(from);
  const amount = Math.min(st.excess, Math.max(0, to.pf_max - to.pf_current));
  const left = st.excess - amount;
  return {
    amount,
    from: { ...from, abilities: withSheetState(from, { excess: left, rounds: left > 0 ? st.rounds : 0, standard: true }) } as Character,
    to: { ...to, pf_current: to.pf_current + amount } as Character,
  };
}
/* ---------- Agonia ---------- */
export const AGONY_MAX_FAILURES = 3;
/**
 * Agonia: ativa automaticamente com 0 PV, ou quando o Mestre manda o personagem entrar (mesmo com PV acima de 0).
 * Cada falha no teste de Agonia preenche uma marcação; 3 falhas = morte definitiva.
 */
export function agonyStatus(c: Character) {
  const st = sheetState(c);
  const failures = Math.max(0, Math.min(AGONY_MAX_FAILURES, Math.floor(Number(st.failures) || 0)));
  const dead = !!st.dead || failures >= AGONY_MAX_FAILURES;
  const active = !dead && (!!st.agony || c.pv_current <= 0);
  return { active, dead, failures };
}
export const agonyMarks = (failures: number) => '●'.repeat(failures) + '○'.repeat(Math.max(0, AGONY_MAX_FAILURES - failures));
/** Texto curto para listas: " · AGONIA ●○○", " · ☠ MORTO" ou "". */
export function agonyLabel(c: Character) {
  const a = agonyStatus(c);
  return a.dead ? ' · ☠ MORTO' : a.active ? ` · AGONIA ${agonyMarks(a.failures)}` : '';
}
/** Mestre manda entrar em Agonia (não zera falhas já marcadas). */
export function agonyEnter(c: Character): Character {
  if (agonyStatus(c).dead) return c;
  return { ...c, abilities: withSheetState(c, { agony: true, agonyDt: 6 }) };
}
/** Preenche uma marcação; na terceira, o personagem morre de vez. */
export function agonyFailure(c: Character): Character {
  const a = agonyStatus(c);
  if (a.dead) return c;
  const failures = Math.min(AGONY_MAX_FAILURES, a.failures + 1);
  return { ...c, abilities: withSheetState(c, { agony: true, failures, dead: failures >= AGONY_MAX_FAILURES }) };
}
/** Desfaz a última marcação (correção de engano do Mestre; também desfaz uma morte marcada por engano). */
export function agonyUndo(c: Character): Character {
  const a = agonyStatus(c);
  if (!a.failures && !a.dead) return c;
  return { ...c, abilities: withSheetState(c, { failures: Math.max(0, a.failures - 1), dead: false }) };
}
/** Sair da Agonia (passou no teste ou o Mestre encerrou): zera as marcações e volta SEMPRE com 1 PV, qualquer que fosse o PV antes (inclusive Agonia forçada pelo Mestre com PV alto). */
export function agonyLeave(c: Character): Character {
  if (agonyStatus(c).dead) return c;
  return { ...c, pv_current: 1, abilities: withSheetState(c, { agony: false, failures: 0, agonyDt: 6 }) };
}
/** Nomenclatura do Sacrifício: só na 3ª tentativa da Agonia (ou quando a morte é a única saída). Sucesso garantido, Morte Definitiva. */
export function agonySacrifice(c: Character): Character {
  return { ...c, pv_current: 0, abilities: withSheetState(c, { agony: true, failures: AGONY_MAX_FAILURES, dead: true }) };
}
/** Ao curar de 0 PV para mais de 0, a Agonia termina e as marcações zeram. Morte nunca é desfeita aqui. */
export function reconcileAgony(prev: Character | undefined, next: Character): Character {
  if (!prev || prev.pv_current > 0 || next.pv_current <= 0) return next;
  const st = sheetState(next);
  if (st.dead || st.failures >= AGONY_MAX_FAILURES) return next;
  if (!st.agony && st.failures === 0) return next;
  return { ...next, abilities: withSheetState(next, { agony: false, failures: 0, agonyDt: 6 }) };
}

export function attributeAllowed(c: Character, attr: Attr, value: number) {
  const stage = stageIndexFor(c.lineage, c.stage);
  const values = { corpo: c.corpo, mente: c.mente, espirito: c.espirito, [attr]: value };
  const nums = Object.values(values);
  return value >= c[attr] && value <= stage + 3 && nums.filter(n => n === stage + 3).length <= 1 && (stage !== 2 || nums.filter(n => n === 4).length <= 2);
}

/* ---------- Absorver PF ---------- */
/** Faixa definida pelo MAIOR d20: 1–7 → 1/3, 8–14 → metade, 15–19 → valor cheio, 20 → dobro. */
export function absorbBand(highest: number) {
  if (highest >= 20) return { band: '20 · crítico (dobro)', apply: (v: number) => v * 2, crit: true };
  if (highest >= 15) return { band: '15–19 · valor completo', apply: (v: number) => v, crit: false };
  if (highest >= 8) return { band: '8–14 · metade', apply: (v: number) => Math.floor(v / 2), crit: false };
  return { band: '1–7 · 1/3', apply: (v: number) => Math.floor(v / 3), crit: false };
}
/** d20 = Espírito. Soma todos os dados; o maior dado define a faixa aplicada à soma inteira; depois + Espírito. */
export function absorbPf(espirito: number) { return absorbFromDice(rollDice(Math.max(1, espirito), 20), espirito); }
/** Mesma regra de absorbPf, mas a partir de d20 já rolados (ex.: a janela de dados da mesa). */
export function absorbFromDice(dice: number[], espirito: number) {
  const count = dice.length;
  const sum = dice.reduce((a, b) => a + b, 0);
  const highest = Math.max(...dice);
  const band = absorbBand(highest);
  const diceTotal = band.apply(sum);
  return { count, dice, sum, highest, band: band.band, crit: band.crit, diceTotal, espirito, total: diceTotal + espirito };
}

/* ---------- Arma de Vínculo (Humano) ---------- */
/** Humano: Arma de Vínculo. Ataque = 1d20 + dado do atributo à escolha (MENTE por padrão; pode ser CORPO ou ESPÍRITO); dano = dados da arma + MENTE (+ bônus de Karma). */
export const isHuman = (lineage: string) => lineage === 'Humano';
/** Notas livres guardadas junto à história da ficha (sem mudar o formato salvo). */
export const NOTES_MARK = '\n\n<<<ANOTACOES>>>\n';
export function splitStory(story: string) { const i = story.indexOf(NOTES_MARK); return i < 0 ? { story, notes: '' } : { story: story.slice(0, i), notes: story.slice(i + NOTES_MARK.length) }; }
export function joinStory(story: string, notes: string) { return notes ? `${story}${NOTES_MARK}${notes}` : story; }

/* ---------- Estágios de linhagem e passivas ---------- */
export type LineageStage = { name: string; passive: string; desc: string };
export const LINEAGE_STAGES: Record<string, LineageStage[]> = {
  'Arcadiano': [
    { name: 'Senshi', passive: 'Despertar do Ego', desc: 'Quando tem êxito em um acerto, recupera 2 PF no ataque. A Arma de Ego desperta como catalisador elemental.' },
    { name: 'Shoji / Harmonia', passive: 'Ressonância Elemental', desc: 'Quando tem êxito em um acerto, recupera 4 PF no ataque. Surge o Eco da arma; risco de Possessão se houver conflito ético ou fraqueza.' },
    { name: 'Narande', passive: 'Ego Supremo', desc: 'Quando tem êxito em um acerto, recupera 8 PF no ataque. A Arma Verdadeira age como um segundo cérebro de combate.' },
  ],
  'Humano': [
    { name: 'Libertado', passive: 'Leitura do Fluxo', desc: 'Gasta uma ação padrão para ler o fluxo parcial de um alvo (uma vez por alvo, sem acumular): +3 de dano e +3 de bloqueio contra ele.' },
    { name: 'Moldador / Arquiteto', passive: 'Manipulação Direta', desc: 'Ação padrão para ler o fluxo parcial do alvo (uma vez por alvo, sem acumular): +5 de dano e +5 de bloqueio contra ele.' },
    { name: 'Mestre / Domínio', passive: 'Soberania Humana', desc: 'Ação padrão para ler o fluxo parcial do alvo (uma vez por alvo, sem acumular): +8 de dano e +8 de bloqueio contra ele.' },
  ],
  'Gaki': [
    { name: 'Senciente', passive: 'Fome de Karma', desc: 'Recupera 4 PV por alvo consumido após a luta. Teste de Mente contra o Karma; ferimentos aumentam a DT definida pelo Mestre.' },
    { name: 'Inteligente', passive: 'Comando das Sombras', desc: 'Recupera 7 PV por alvo consumido após a luta e comanda Gakis inferiores próximos.' },
    { name: 'Velho', passive: 'Mimetismo Predatório', desc: 'Recupera 12 PV por alvo consumido após a luta. Metamorfose e camuflagem completa entre humanos.' },
  ],
  'Agente Tecnológico': [
    { name: 'Libertado Forçado', passive: 'Olho Tecnológico — Varredura', desc: 'Analisa o Fluxo de habilidades vistas: +3 de Bloqueio contra uma habilidade já vista. Se ela se repetir, ganha +1 de Bloqueio na próxima rodada.' },
    { name: 'Moldador de Energia', passive: 'Olho Tecnológico — Predição', desc: '+4 de Bloqueio contra uma habilidade já vista. Se ela se repetir, ganha +2 de Bloqueio contra ela.' },
    { name: 'Tecnologia Mestra', passive: 'Olho Tecnológico — Anulação', desc: '+6 de Bloqueio contra uma habilidade já vista. Se ela se repetir, pode fazer um teste de TECNOLOGIA para anular a habilidade.' },
  ],
};
export function stageIndexFor(lineage: string, stage: string) {
  const list = LINEAGE_STAGES[lineage] ?? [];
  const i = list.findIndex(s => stage && (stage.toLowerCase().startsWith(s.name.toLowerCase().split(' ')[0]!) ));
  return i < 0 ? 0 : i;
}


// Evoluções do Códice (GS 5/7/10) entram por cima da tabela fixa de dano; nunca a substituem.
/** Chave da nomenclatura: todas as versões (Direta, Parcial, Completa) da mesma nomenclatura compartilham a chave. */
export const techniqueKey = (n: Nomenclature) => (n.family?.trim() || n.name);
const KIND_ORDER: Record<NomenclatureKind, number> = { Direta: 0, Parcial: 1, Completa: 2 };
/** Agrupa as versões por nomenclatura: Direta + Parcial + Completa contam como UMA nomenclatura com três estágios. */
export function nomenclatureFamilies(c: Pick<Character, 'nomenclatures'>) {
  const map = new Map<string, { key: string; name: string; items: { item: Nomenclature; index: number }[] }>();
  c.nomenclatures.forEach((item, index) => {
    const key = techniqueKey(item);
    const group = map.get(key) ?? { key, name: key, items: [] };
    group.items.push({ item, index }); map.set(key, group);
  });
  return [...map.values()].map(g => ({ ...g, items: [...g.items].sort((a, b) => KIND_ORDER[a.item.kind ?? 'Direta'] - KIND_ORDER[b.item.kind ?? 'Direta']) }));
}
/** Dados, custo e bônus de uma Nomenclatura conforme o caminho Nomenclatura (Aprimorada 5 GS · Dominada 7 GS · Favorita 10 GS). */
/** Efeito escrito pelo jogador no 10 GS (Arma/Corpo Estilizada e Nomenclatura Favorita), lido como regra de jogo.
 * Reconhece: dados extras de dano ("mais 1d6 de dano", "+1d8"), dano fixo ("+2 de dano") e bloqueio ignorado
 * ("ignora 3 de bloqueio"; sem número, "ignora o bloqueio" ignora tudo). Cláusulas com veneno, sangramento ou "por rodada"
 * não viram dado de dano: aparecem como nota no resultado. O texto fica salvo exatamente como foi escrito. */
export function parseEffect(text: string) {
  const raw = (text ?? '').trim();
  const dice: string[] = []; const notes: string[] = []; let flat = 0; let ignoreBlock = 0;
  const lower = raw.toLowerCase();
  const ign = /(?:ignor\w*|perfur\w*|atravess\w*)\s+(?:mais\s+)?(\d+)\s*(?:pontos?\s+)?(?:de|do|da)?\s*bloqueio/.exec(lower);
  if (ign) ignoreBlock = Number(ign[1]);
  else if (/(?:ignor\w*|perfur\w*|atravess\w*)\s+(?:todo\s+|todos\s+)?(?:o\s+|os\s+)?bloqueio/.test(lower)) ignoreBlock = 999;
  for (const clause of lower.split(/[;,.\n]|\se\s/)) {
    const c = clause.trim(); if (!c) continue;
    if (/bloqueio/.test(c)) continue;
    if (/veneno|sangr|queim|por rodada|por turno|a cada rodada|cont[ií]nu|paralis|atordo|lent|congel|corro/.test(c)) { notes.push(c); continue; }
    const withoutDice = c.replace(/(\d+)\s*d\s*(\d+)/g, (m, n, s) => { const sides = Number(s), count = Number(n); if ([4, 6, 8, 10, 12, 20].includes(sides) && count >= 1 && count <= 6) dice.push(`${count}d${sides}`); return ' '; });
    const f = /(?:\+|mais|causa|d[aá]|adiciona|soma)\s*(\d+)\s*(?:pontos?\s+)?(?:de\s+)?dano/.exec(withoutDice);
    if (f) flat += Number(f[1]);
  }
  return { raw, dice, flat, ignoreBlock, notes };
}
/** Resumo legível do que o jogo entendeu do texto (mostrado ao salvar e junto do dano). */
export function describeEffect(text: string) {
  const p = parseEffect(text); const parts: string[] = [];
  if (p.dice.length) parts.push(`+${p.dice.join(' + ')} de dano`);
  if (p.flat) parts.push(`+${p.flat} de dano fixo`);
  if (p.ignoreBlock) parts.push(p.ignoreBlock >= 999 ? 'ignora todo o bloqueio' : `ignora ${p.ignoreBlock} de bloqueio`);
  if (p.notes.length) parts.push(`nota: ${p.notes.join('; ')}`);
  return parts;
}
export function techniqueRules(c: Character, n: Nomenclature) {
  const kind = n.kind ?? 'Direta';
  const st = sheetState(c);
  const rank = Math.max(st.nomRank, Math.min(2, techGsLevel(c, 'habilidade_nucleo')));
  const upgrade = st.techniqueUpgrades[techniqueKey(n)] ?? st.techniqueUpgrades[n.name] ?? {};
  const die = dieFor(c.espirito) ?? 4;
  const fav = parseEffect(upgrade.favorite && upgrade.favorite !== 'Versão Favorita' ? upgrade.favorite : '');
  return {
    kind, rank, upgrade,
    /** Efeito da versão Favorita escrito pelo jogador: bloqueio ignorado e nota que acompanham o dano. */
    ignoreBlock: fav.ignoreBlock, effectNote: fav.raw,
    dice: NOMENCLATURE_DICE[kind], critDice: NOMENCLATURE_CRIT_DICE[kind],
    cost: Math.max(0, NOMENCLATURE_COST[kind] - (rank >= 2 && kind !== 'Direta' ? 2 : 0)),
    /** Aprimorada: dado de ESPÍRITO no dano. Dominada: dado + valor fixo. */
    extraDice: [...(rank >= 1 ? [`1d${die}`] : []), ...fav.dice] as string[],
    bonus: (rank >= 2 ? c.espirito : 0) + fav.flat,
  };
}
/** Dano de uma Nomenclatura. Direta/Parcial: crítico dobra todos os dados (inclusive o de ESPÍRITO). Completa: crítico é sempre 12d8 puro. */
export function nomenclatureDamage(c: Character, n: Nomenclature, crit: boolean, extraBonus = 0, mult = 2) {
  const t = techniqueRules(c, n);
  if (crit && t.kind === 'Completa') return damageRoll(NOMENCLATURE_CRIT_DICE.Completa, extraBonus, false);
  return upgradedDamage(t.dice, t.bonus + extraBonus, crit, t.extraDice, mult);
}
/** Arma / Corpo: Humano MENTE, Arcadiano ESPÍRITO, Gaki CORPO, Agente Tecnológico TECNOLOGIA.
 * Armas comuns e desarmado: CORPO, sem evoluções, também para agentes. */
export function weaponRules(c: Character, type = c.weapon_type, common = sheetState(c).weaponMode === 'comum') {
  const unarmed = weaponByKey(type)?.attr === 'corpo';
  const attr: Attr = unarmed || common ? 'corpo' : weaponAttrFor(c.lineage);
  const techRank = isTechAgent(c.lineage) ? Math.max(techGsLevel(c, 'arma_nucleo'), sheetState(c).techModularEquipped ? techGsLevel(c, 'corpo_modular') : 0) : 0;
  const rank = common || unarmed ? 0 : Math.max(sheetState(c).weaponRank, Math.min(2, techRank));
  /** Sem evolução: valor fixo. Evoluído (rank 1): dado do atributo no lugar do fixo. Dominado (rank 2): dado + valor fixo. */
  const eff = unarmed || common ? parseEffect('') : parseEffect(sheetState(c).specialEffect);
  return { attr, bonus: (rank === 1 ? 0 : c[attr]) + eff.flat, extraDice: [...(rank > 0 ? [`1d${dieFor(c[attr]) ?? 4}`] : []), ...eff.dice] as string[], rank, ignoreBlock: eff.ignoreBlock, effectNote: eff.raw };
}
/** Atributo efetivo de acerto da arma equipada, incluindo a escolha 'arma comum' (CORPO). */
export const weaponAttackAttrFor = (character: Character): Attr => weaponRules(character).attr;
/** Unidade do recurso no combate. O campo pf_current/pf_max guarda PF ou PN sem migração de banco. */
export const energyUnitFor = (lineage: string) => isTechAgent(lineage) ? 'PN' : 'PF';
/** Quem escolheu Arma / Corpo Estilizada no marco de 10 GS pode gastar 10 PF para o efeito único de crítico: dados ×3 no crítico E margem de crítico reduzida. */
export function canTripleCrit(c: Character) {
  const st = sheetState(c);
  if (st.weaponMode === 'comum' || weaponByKey(c.weapon_type)?.attr === 'corpo') return false;
  return Object.entries(st.milestoneChoices).some(([k, v]) => k.endsWith(':10') && v === 'arma') || techGsLevel(c, 'arma_nucleo') >= 3;
}
/** Custo ÚNICO (10 PF) do Crítico Triplo + margem de crítico, declarado ANTES de saber se acerta. */
export const TRIPLE_CRIT_COST = 10;
/** Parte do mesmo efeito: a faixa de crítico do d20 desce 1 por ponto do ATRIBUTO DE ATAQUE da linhagem (MENTE no Humano, ESPÍRITO no Arcadiano, CORPO no Gaki; valor 3 → crítico em 17+). Vale só para o d20, não para a soma. */
export const stylizedCritThreshold = (attackAttrValue: number) => Math.max(2, 20 - attackAttrValue);
/** Ataque Extra do Corpo Moldado (7 GS): 2d20 ficando com o MENOR + dado do atributo; qualquer 1 natural nos d20 é falha crítica. Refinado (10 GS): um d20 normal. */
export function extraAttackRoll(attrValue: number, esquiva?: number, refined = false, critThreshold = 20) {
  const d20s = rollDice(refined ? 1 : 2, 20);
  const d20 = Math.min(...d20s);
  const attrDie = dieFor(attrValue) ?? 4;
  const attrRoll = rollDice(1, attrDie)[0] ?? 1;
  const total = d20 + attrRoll;
  const fumble = d20s.some(d => d === 1);
  const reaches = esquiva === undefined ? null : total >= esquiva;
  const hit = fumble ? false : reaches;
  const crit = !fumble && d20 >= critThreshold && (reaches === null || reaches);
  return { d20, d20s, attrDie, attrRoll, dice: [...d20s, attrRoll], expression: refined ? `1d20 + 1d${attrDie}` : `2d20 (menor) + 1d${attrDie}`, modifier: 0, total, hit, crit, nat20: d20 === 20, fumble, critThreshold };
}
/** Nível (0 a 3) de cada caminho de GS: 1 = marco de 5 GS, 2 = 7 GS, 3 = 10 GS. Estágio 1 (arma/corpo/nomenclatura) e Estágio 2 (mimetismo/vingança/avançada). */
export function pathLevels(c: Character) {
  const st = sheetState(c);
  const lvl = (stage: number, choice: string) => { let n = 0; ([5, 7, 10] as const).forEach((g, i) => { if (st.milestoneChoices[`${stage}:${g}`] === choice) n = i + 1; }); return n; };
  return { arma: lvl(0, 'arma'), corpo: Math.max(lvl(0, 'corpo'), sheetState(c).techModularEquipped ? techGsLevel(c, 'corpo_modular') : 0), nomenclatura: Math.max(lvl(0, 'nomenclatura'), techGsLevel(c, 'habilidade_nucleo')), mimetismo: lvl(1, 'mimetismo'), vinganca: lvl(1, 'vinganca'), avancada: lvl(1, 'nomenclatura_avancada') };
}
/** Custos fixos das habilidades de caminho (PF). */
export const ECO_COST = 5; export const FLUX_LINK_COST = 2; export const EXTRA_COST = 3; export const EXTRA_REFINED_COST = 10; export const CHAMADO_COST = 5; export const FUSION_COST = 12; export const MIMIC_RECORD_COST = 5;
export const mimicUseCost = (level: number) => level >= 3 ? 12 : 3;
/** Vingança Karmática: 5 GS devolve 1/3 do dano recebido (3 PF) · 7 GS devolve 1/2 (5 PF) · 10 GS devolve 100% (12 PF, sem teste) e aplica Karma = metade do dano devolvido. */
export const vengeanceCost = (level: number) => level >= 3 ? 12 : level === 2 ? 5 : 3;
export const vengeanceShares = (taken: number) => ({ third: Math.floor(taken / 3), half: Math.floor(taken / 2), full: taken });
export const vengeanceBonus = (level: number, taken: number) => level >= 3 ? taken : level === 2 ? Math.floor(taken / 2) : level === 1 ? Math.floor(taken / 3) : 0;
export const mimicCapacity = (c: Pick<Character, 'mente' | 'espirito'>) => c.mente + c.espirito;
export function upgradedDamage(dice: string, bonus: number, crit: boolean, extraDice: string[] = [], mult = 2) {
  const base = damageRoll(dice, bonus, crit, mult);
  const extras = extraDice.map(expr => damageRoll(expr, 0, crit, mult));
  return { ...base, dice: [...base.dice, ...extras.flatMap(r => r.dice)], total: base.total + extras.reduce((sum, r) => sum + r.total, 0), expression: [base.expression, ...extras.map(r => r.expression)].join(' + ') };
}
/** Bloqueio Parcial: 1 dado de ESPÍRITO + Bloqueio. Bloqueio contra Completa: d20 × ESPÍRITO (maior) + Bloqueio. */
export function protectRoll(espirito: number, bloqueio: number, kind: NomenclatureKind) {
  const dice = rollDice(kind === 'Completa' ? Math.max(1, espirito) : 1, kind === 'Completa' ? 20 : dieFor(espirito) ?? 4);
  return { dice, modifier: bloqueio, total: (kind === 'Completa' ? Math.max(...dice) : dice[0] ?? 0) + bloqueio, expression: kind === 'Completa' ? `${dice.length}d20 (maior) + ${bloqueio}` : `1d${dieFor(espirito) ?? 4} + ${bloqueio}` };
}
export function combinedRoll(c: Character, attrs: Attr[]) {
  const dice = attrs.map(attr => rollDice(1, dieFor(c[attr]) ?? 4)[0] ?? 1);
  return { dice, modifier: 0, total: dice.reduce((a, b) => a + b, 0), expression: attrs.map(attr => `1d${dieFor(c[attr]) ?? 4}`).join(' + ') };
}
export function v8SheetPatch(c: Character, patch: Partial<Character>): Partial<Character> {
  const state = sheetState(c);
  const next = { ...c, ...patch };
  const oldStage = stageIndexFor(c.lineage, c.stage);
  const stage = stageIndexFor(next.lineage, next.stage);
  const highestStage = Math.max(state.highestStage, oldStage, stage);
  const budget = state.attributeBudget || Math.max(6 + oldStage, c.corpo + c.mente + c.espirito);
  const newBudget = budget + Math.max(0, stage - Math.max(state.highestStage, oldStage));
  const changedAttrs = (['corpo', 'mente', 'espirito'] as const).filter(attr => patch[attr] !== undefined);
  for (const attr of changedAttrs) {
    const floor = state.attributeFloor[attr] ?? c[attr];
    if (next[attr] < floor || !attributeAllowed(c, attr, next[attr]) || next.corpo + next.mente + next.espirito > newBudget) return {};
  }
  if (changedAttrs.length || patch.stage) {
    const floor = { ...state.attributeFloor };
    for (const attr of changedAttrs) floor[attr] = next[attr];
    const baseState = patch.abilities ? sheetState({ ...c, abilities: patch.abilities }) : state;
    patch = { ...patch, abilities: withSheetState(c, { ...baseState, attributeFloor: floor, attributeBudget: newBudget, highestStage }) };
  }
  if (patch.karma !== undefined && patch.karma > c.karma && state.anchorBroken) patch.karma = Math.min(karmaMaximum(next.mente, next.espirito), c.karma + (patch.karma - c.karma) * 2);
  return patch;
}
export function milestoneKey(c: Character, gs: number) { return `${stageIndexFor(c.lineage, c.stage)}:${gs}`; }
/** Caminhos de cada estágio. Estágio 1: Arma, Corpo ou Nomenclatura. Estágio 2: Mimetismo, Vingança ou Nomenclatura Avançada. O caminho é definido no marco de 5 GS (ver milestoneOptionsFor). Depois do Estágio 3: livre com o Mestre. */
export type MilestoneChoice = 'arma' | 'corpo' | 'nomenclatura' | 'mimetismo' | 'vinganca' | 'nomenclatura_avancada' | 'livre';
export const milestoneOptions = (stage: number): { id: MilestoneChoice; label: string }[] =>
  stage === 0 ? [{ id: 'arma', label: 'Arma' }, { id: 'corpo', label: 'Corpo Moldado' }, { id: 'nomenclatura', label: 'Nomenclatura' }]
  : stage === 1 ? [{ id: 'mimetismo', label: 'Mimetismo do Fluxo' }, { id: 'vinganca', label: 'Vingança Karmática' }, { id: 'nomenclatura_avancada', label: 'Nomenclatura Avançada' }]
  : [{ id: 'livre', label: 'Livre, combinado com o Mestre' }];
/** Caminho definido no marco de 5 GS do estágio atual (null se o marco de 5 ainda não foi resolvido). */
export function milestonePath(c: Character): MilestoneChoice | null {
  const st = sheetState(c); const stage = stageIndexFor(c.lineage, c.stage);
  return (st.milestoneChoices[`${stage}:5`] as MilestoneChoice | undefined) ?? null;
}
/** Opções válidas de cada marco: no 5 GS o jogador escolhe o caminho; nos de 7 e 10 só vale o caminho já definido (os outros ficam fechados). Depois do Estágio 3 é livre. */
export function milestoneOptionsFor(c: Character, gs: 5 | 7 | 10) {
  const stage = stageIndexFor(c.lineage, c.stage); if (isTechAgent(c.lineage)) return []; const all = milestoneOptions(stage);
  if (stage >= 2 || gs === 5) return all;
  const path = milestonePath(c);
  return path ? all.filter(o => o.id === path) : [];
}
/** Marcos que exigem escolher uma Nomenclatura: Favorita (10 GS, estágio 1) e a segunda Favorita (5 GS, Nomenclatura Avançada). */
export function milestoneNeedsTechnique(c: Character, gs: 5 | 7 | 10, choice: string) {
  const stage = stageIndexFor(c.lineage, c.stage);
  return (stage === 0 && choice === 'nomenclatura' && gs === 10) || (stage === 1 && choice === 'nomenclatura_avancada' && gs === 5);
}
export function applyMilestone(c: Character, gs: 5 | 7 | 10, choice: string, technique?: string, effect = '') {
  const state = sheetState(c);
  const key = milestoneKey(c, gs);
  const stage = stageIndexFor(c.lineage, c.stage);
  if (isTechAgent(c.lineage) || c.gs < gs || state.milestones.includes(key) || !milestoneOptionsFor(c, gs).some(o => o.id === choice)) return null;
  if (milestoneNeedsTechnique(c, gs, choice) && !c.nomenclatures.some(n => techniqueKey(n) === technique)) return null;
  const upgrades = { ...state.techniqueUpgrades };
  if (milestoneNeedsTechnique(c, gs, choice) && technique && upgrades[technique]?.favorite) return null; // uma nomenclatura só pode ser Favorita uma vez
  if (milestoneNeedsTechnique(c, gs, choice) && technique) upgrades[technique] = { ...upgrades[technique], favorite: effect || upgrades[technique]?.favorite || 'Versão Favorita' };
  const rank = gs === 5 ? 1 : 2;
  const armaRank = choice === 'arma' || choice === 'corpo' ? Math.max(state.weaponRank, rank) : state.weaponRank;
  const nomRank = choice === 'nomenclatura' ? Math.max(state.nomRank, rank) : state.nomRank;
  return { ...c, gs: gs === 10 ? 0 : c.gs, abilities: withSheetState(c, { weaponRank: armaRank, nomRank, milestones: [...state.milestones, key], milestoneChoices: { ...state.milestoneChoices, [key]: choice }, techniqueUpgrades: upgrades, specialEffect: gs === 10 && (choice === 'arma' || choice === 'corpo') && effect ? effect : state.specialEffect }) };
}
/** Limites de atributo do estágio atual (Cap. II): teto 3/4/5, pontos totais e quantos podem estar no teto. */
export function attributeInfo(c: Character) {
  const st = sheetState(c); const stage = stageIndexFor(c.lineage, c.stage);
  const spent = c.corpo + c.mente + c.espirito;
  const budget = st.attributeBudget || Math.max(6 + stage, spent);
  return { cap: stage + 3, stage: stage + 1, spent, budget, free: Math.max(0, budget - spent) };
}
