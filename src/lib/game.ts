export type Character = {
  id: string; name: string; lineage: string; stage: string; concept: string; weapon: string;
  corpo: number; mente: number; espirito: number; pv_current: number; pv_max: number;
  pf_current: number; pf_max: number; karma: number; gs: number; exhaustion: number;
  sync: { name: string; level: number }[]; nomenclatures: Nomenclature[];
  inventory: { name: string; quantity: number }[]; story: string;
   abilities: { name: string; description: string; kind?: 'scar' | 'state'; scarType?: string; benefit?: string }[]; weapon_type: string; weapon_dice: string; initiative: number | null;
};
export type NomenclatureKind = 'Direta' | 'Parcial' | 'Completa';
export type Nomenclature = { name: string; cost: number; effect?: string; kind?: NomenclatureKind; dice?: number };
export type Npc = { id: string; name: string; kind: string; hidden: boolean; pv_current: number; pv_max: number; pf_current: number; pf_max: number; corpo: number; mente: number; espirito: number; esquiva: number; bloqueio: number; notes: string; initiative: number | null };
export type Campaign = { id: string; name: string; code: string; scene: string; round: number; turn_index: number; combat_active: boolean; log: string[] };
export const dieFor = (n: number) => [0, 4, 6, 8, 10, 12][Math.max(1, Math.min(5, n))];
export const derived = (corpo: number) => ({ pv: [0,25,32,42,52,60][corpo] ?? 25, esquiva: [0,10,12,14,15,16][corpo] ?? 10, bloqueio: [0,3,5,7,10,12][corpo] ?? 3, deslocamento: [0,7,9,11,12,13][corpo] ?? 7 });
export const makeCharacter = (): Character => ({ id: crypto.randomUUID(), name: 'Novo Herdeiro', lineage: 'Humano', stage: 'Libertado', concept: '', weapon: '', corpo: 1, mente: 1, espirito: 1, pv_current: 25, pv_max: 25, pf_current: 0, pf_max: 20, karma: 0, gs: 1, exhaustion: 0, sync: [], nomenclatures: [], inventory: [], story: '', abilities: [], weapon_type: '', weapon_dice: '', initiative: null });
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

/* ---------- Tabelas do documento "Resumo de Mecânicas" (valores capados) ---------- */
export type WeaponType = { key: string; label: string; dice: string[]; attr: 'corpo' | 'atributo' | null; note: string };
/** Dano base: exatamente a tabela do documento. Nenhuma arma pode exceder estes dados. */
export const WEAPONS: WeaponType[] = [
  { key: 'desarmado_leve', label: 'Desarmado leve', dice: ['1d6'], attr: 'corpo', note: 'Golpes rápidos, socos e chutes. 1d6 + CORPO.' },
  { key: 'desarmado_pesado', label: 'Desarmado médio/pesado', dice: ['2d8', '3d8'], attr: 'corpo', note: 'Exige foco ou preparação. 2d8 a 3d8 + CORPO.' },
  { key: 'cortante_leve', label: 'Cortante leve', dice: ['1d8'], attr: 'atributo', note: 'Facas, adagas. 1d8 + Atributo.' },
  { key: 'media_pesada', label: 'Média / pesada', dice: ['1d12', '2d10'], attr: 'atributo', note: 'Espadas longas, machados. 1d12 a 2d10 + Atributo.' },
  { key: 'fogo', label: 'Armas à distância (fogo, arco, besta)', dice: ['1d10', '2d12'], attr: 'atributo', note: '1d10 a 2d12 + atributo da linhagem; arma comum soma CORPO.' },
];
export const weaponByKey = (key: string) => WEAPONS.find(w => w.key === key);
/** Garante que o dado escolhido pertence à tabela da arma (nunca acima do limite). */
export function cappedWeaponDice(type: string, dice: string) { const w = weaponByKey(type); if (!w) return null; return w.dice.includes(dice) ? dice : w.dice[0]!; }

export const NOMENCLATURE_RANGES: Record<NomenclatureKind, number[]> = { Direta: [1, 2], Parcial: [3, 4, 5], Completa: [6] };
export const NOMENCLATURE_LABEL: Record<NomenclatureKind, string> = { Direta: 'Nomeação Direta · 1d8 a 2d8', Parcial: 'Recitação Parcial · 3d8 a 5d8', Completa: 'Recitação Completa · 6d8' };
const TECH_NOMENCLATURE_LABEL: Record<NomenclatureKind, string> = { Direta: 'Ativação Padrão · 1d8 a 2d8', Parcial: 'Ativação Forçada · 3d8 a 5d8', Completa: 'Liberação Total de Núcleo · 6d8' };
export function nomenclatureLabel(lineage: string, plural = false) {
  return isTechAgent(lineage) ? (plural ? 'Habilidades de Núcleo' : 'Habilidade de Núcleo') : (plural ? 'Nomenclaturas' : 'Nomenclatura');
}
export function nomenclatureLevelLabel(lineage: string, kind: NomenclatureKind | undefined) {
  return (isTechAgent(lineage) ? TECH_NOMENCLATURE_LABEL : NOMENCLATURE_LABEL)[kind ?? 'Direta'];
}
export function cappedNomenclatureDice(kind: NomenclatureKind | undefined, dice: number | undefined) { const r = NOMENCLATURE_RANGES[kind ?? 'Direta']; return r.includes(dice ?? 0) ? dice! : r[0]!; }

export type Attr = 'corpo' | 'mente' | 'espirito';
export const ATTR_LABEL: Record<Attr, string> = { corpo: 'CORPO', mente: 'MENTE', espirito: 'ESPÍRITO' };
/** Agente Tecnológico usa o campo espirito como Tecnologia (mesmo valor no banco). */
export const isTechAgent = (lineage: string) => lineage === 'Agente Tecnológico';
export const attrLabelFor = (attr: Attr, lineage?: string) => {
  if (lineage && isTechAgent(lineage) && attr === 'espirito') return 'TECNOLOGIA';
  return ATTR_LABEL[attr];
};
/** Atributo PADRÃO do ataque com arma: humanos MENTE (vontade), demais linhagens CORPO. Humanos podem escolher outro. */
export const weaponAttrFor = (lineage: string): Attr => lineage === 'Humano' || isTechAgent(lineage) ? 'mente' : lineage === 'Arcadiano' ? 'espirito' : 'corpo';

export function rollDice(count: number, sides: number) { return Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides)); }
export function parseDice(expr: string) { const m = expr.match(/^(\d+)d(\d+)$/); return m ? { count: Number(m[1]), sides: Number(m[2]) } : null; }

/** Acerto: 1d20 + dado do atributo do atacante vs Esquiva (empate favorece o atacante). 20 natural acerta criticamente; 1 natural sempre falha. */
export function attackRoll(attrValue: number, esquiva?: number) {
  const d20 = 1 + Math.floor(Math.random() * 20);
  const attrDie = dieFor(attrValue) ?? 4;
  const attrRoll = 1 + Math.floor(Math.random() * attrDie);
  const total = d20 + attrRoll;
  const crit = d20 === 20;
  const fumble = d20 === 1;
  const hit = crit ? true : fumble ? false : esquiva === undefined ? null : total >= esquiva;
  return { d20, attrDie, attrRoll, dice: [d20, attrRoll], expression: `1d20 + 1d${attrDie}`, modifier: 0, total, hit, crit, fumble };
}
/** Dano: no crítico dobra apenas os dados; o atributo é somado uma única vez. */
export function damageRoll(dice: string, bonus: number, crit: boolean) {
  const p = parseDice(dice); if (!p) return { dice: [] as number[], bonus, total: bonus, expression: dice };
  const count = crit ? p.count * 2 : p.count; const rolled = rollDice(count, p.sides);
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
export function normalizeCharacter(c: Partial<Character> & { id: string }): Character { return { ...makeCharacter(), ...c, abilities: Array.isArray(c.abilities) ? c.abilities : [], sync: Array.isArray(c.sync) ? c.sync : [], nomenclatures: Array.isArray(c.nomenclatures) ? c.nomenclatures : [], inventory: Array.isArray(c.inventory) ? c.inventory : [], weapon_type: c.weapon_type ?? '', weapon_dice: c.weapon_dice ?? '', initiative: c.initiative ?? null } as Character; }

// Persistent rule state shares the existing JSON abilities field; no table changes.
export type SheetState = { excess: number; rounds: number; agony: boolean; failures: number; stable: boolean; dead: boolean; standard: boolean; agonyDt: number; coins: number; anchorBroken: boolean; weaponMode: 'linhagem' | 'comum'; path: 'arma' | 'nomenclatura' | ''; weaponRank: number; milestones: string[]; techniqueUpgrades: Record<string, { improved?: 'dano' | 'alcance'; mastered?: boolean; favorite?: string }>; attributeFloor: Partial<Record<Attr, number>>; attributeBudget: number; highestStage: number; specialEffect: string };
export const emptySheetState: SheetState = { excess: 0, rounds: 0, agony: false, failures: 0, stable: false, dead: false, standard: false, agonyDt: 6, coins: 0, anchorBroken: false, weaponMode: 'linhagem', path: '', weaponRank: 0, milestones: [], techniqueUpgrades: {}, attributeFloor: {}, attributeBudget: 0, highestStage: 0, specialEffect: '' };
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
  if (st.excess <= 0) return 'Você não tem PF excedentes para partilhar.';
  if (st.standard) return 'Você já gastou a Ação Padrão.';
  if (!to || to.id === from.id) return 'Escolha um alvo.';
  if (!sameTable) return 'O alvo não está na mesma mesa.';
  if (syncLevelWith(from, to) < SHARE_MIN_SYNC) return 'Elo insuficiente: é preciso 2 ou mais de Elo com o alvo.';
  if (to.pf_current >= to.pf_max) return 'O alvo está com os PF cheios e não pode receber o excedente.';
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
export function absorbPf(espirito: number) {
  const count = Math.max(1, espirito);
  const dice = rollDice(count, 20);
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
    { name: 'Senshi', passive: 'Despertar do Ego', desc: 'Ao acertar um ataque, recupera 2 PF. A Arma de Ego desperta como catalisador elemental.' },
    { name: 'Shoji / Harmonia', passive: 'Ressonância Elemental', desc: 'Ao acertar um ataque, recupera 4 PF. Conexão profunda com a arma; risco de possessão se o foco vacilar.' },
    { name: 'Narande', passive: 'Ego Supremo', desc: 'Ao acertar um ataque, recupera 8 PF. A Arma Verdadeira age como um segundo cérebro.' },
  ],
  'Humano': [
    { name: 'Libertado', passive: 'Leitura do Fluxo', desc: 'Ao ler parcialmente o Fluxo de um alvo, recebe +3 de Dano e +3 de Bloqueio contra ele.' },
    { name: 'Moldador / Arquiteto', passive: 'Manipulação Direta', desc: 'Ao ler o Fluxo de um alvo, recebe +5 de Dano e +5 de Bloqueio contra ele.' },
    { name: 'Mestre / Domínio', passive: 'Soberania Humana', desc: 'Ao ler o Fluxo de um alvo, recebe +8 de Dano e +8 de Bloqueio contra ele.' },
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


// v8 upgrades are layered over capped base dice, never replace the base tables.
export const NOMENCLATURE_COST: Record<NomenclatureKind, number> = { Direta: 2, Parcial: 5, Completa: 12 };
export function techniqueRules(c: Character, n: Nomenclature) {
  const kind = n.kind ?? 'Direta';
  const upgrade = sheetState(c).techniqueUpgrades[n.name] ?? {};
  return { cost: Math.max(0, (Number.isFinite(n.cost) ? n.cost : NOMENCLATURE_COST[kind]) - (upgrade.mastered && kind !== 'Direta' ? 2 : 0)), bonus: upgrade.mastered && kind !== 'Direta' ? c.espirito : 0, extraDice: upgrade.improved === 'dano' ? ['1d6'] : [], upgrade };
}
export function weaponRules(c: Character, type = c.weapon_type, common = sheetState(c).weaponMode === 'comum') {
  const unarmed = weaponByKey(type)?.attr === 'corpo';
  const attr: Attr = unarmed || common ? 'corpo' : weaponAttrFor(c.lineage);
  const rank = common || unarmed ? 0 : sheetState(c).weaponRank;
  return { attr, bonus: rank === 1 ? 0 : c[attr], extraDice: rank > 0 ? [`1d${dieFor(c[attr]) ?? 4}`] : [], rank };
}
export function upgradedDamage(dice: string, bonus: number, crit: boolean, extraDice: string[] = []) {
  const base = damageRoll(dice, bonus, crit);
  const extras = extraDice.map(expr => damageRoll(expr, 0, crit));
  return { ...base, dice: [...base.dice, ...extras.flatMap(r => r.dice)], total: base.total + extras.reduce((sum, r) => sum + r.total, 0), expression: [base.expression, ...extras.map(r => r.expression)].join(' + ') };
}
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
export function applyMilestone(c: Character, gs: 5 | 7 | 10, path: 'arma' | 'nomenclatura', technique?: string, improvement: 'dano' | 'alcance' = 'dano', effect = '') {
  const state = sheetState(c);
  const key = milestoneKey(c, gs);
  if (c.gs < gs || state.milestones.includes(key) || (state.path && state.path !== path) || (path === 'nomenclatura' && !c.nomenclatures.some(n => n.name === technique))) return null;
  const upgrades = { ...state.techniqueUpgrades };
  if (path === 'nomenclatura' && technique) upgrades[technique] = { ...upgrades[technique], ...(gs === 5 ? { improved: improvement } : gs === 7 ? { mastered: true } : { favorite: effect }) };
  return { ...c, gs: gs === 10 ? 0 : c.gs, abilities: withSheetState(c, { path, weaponRank: path === 'arma' ? Math.max(state.weaponRank, gs === 5 ? 1 : 2) : state.weaponRank, milestones: [...state.milestones, key], techniqueUpgrades: upgrades, specialEffect: gs === 10 && path === 'arma' ? effect : state.specialEffect }) };
}
