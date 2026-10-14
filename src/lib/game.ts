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
/** Garante que o dado escolhido pertence à tabela da arma (nunca acima do limite). */
export function cappedWeaponDice(type: string, _dice?: string) { const w = weaponByKey(type); if (!w) return null; return w.dice[0]!; }

/** Escalas de Recitação (Cap. VI): dano, dano crítico e custo de PF são fixos. */
export const NOMENCLATURE_DICE: Record<NomenclatureKind, string> = { Direta: '1d6', Parcial: '2d8', Completa: '6d8' };
export const NOMENCLATURE_CRIT_DICE: Record<NomenclatureKind, string> = { Direta: '2d6', Parcial: '4d8', Completa: '12d8' };
export const NOMENCLATURE_COST: Record<NomenclatureKind, number> = { Direta: 2, Parcial: 5, Completa: 12 };
export const NOMENCLATURE_LABEL: Record<NomenclatureKind, string> = { Direta: 'Nomeação Direta (Nome Curto) · 1d6 · 2 PF', Parcial: 'Recitação Parcial (O Chamado) · 2d8 · 5 PF', Completa: 'Recitação Completa (Verdadeira) · 6d8 · 12 PF' };
const TECH_NOMENCLATURE_LABEL: Record<NomenclatureKind, string> = { Direta: 'Ativação Padrão · 1d6 · 2 PF', Parcial: 'Ativação Forçada · 2d8 · 5 PF', Completa: 'Liberação Total de Núcleo · 6d8 · 12 PF' };
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
/** Atributo PADRÃO do ataque com arma: humanos MENTE (vontade), demais linhagens CORPO. Humanos podem escolher outro. */
export const weaponAttrFor = (lineage: string): Attr => lineage === 'Humano' || isTechAgent(lineage) ? 'mente' : lineage === 'Arcadiano' ? 'espirito' : 'corpo';

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
export function forceFlux(espirito: number) {
  const dice = rollDice(Math.max(1, espirito), 20);
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

// Persistent rule state shares the existing JSON abilities field; no table changes.
export type SheetState = { excess: number; rounds: number; agony: boolean; failures: number; stable: boolean; dead: boolean; standard: boolean; agonyDt: number; coins: number; anchorBroken: boolean; weaponMode: 'linhagem' | 'comum'; path: 'arma' | 'nomenclatura' | ''; weaponRank: number; nomRank: number; milestones: string[]; milestoneChoices: Record<string, string>; techniqueUpgrades: Record<string, { improved?: 'dano' | 'alcance'; mastered?: boolean; favorite?: string }>; attributeFloor: Partial<Record<Attr, number>>; attributeBudget: number; highestStage: number; specialEffect: string };
export const emptySheetState: SheetState = { excess: 0, rounds: 0, agony: false, failures: 0, stable: false, dead: false, standard: false, agonyDt: 6, coins: 0, anchorBroken: false, weaponMode: 'linhagem', path: '', weaponRank: 0, nomRank: 0, milestones: [], milestoneChoices: {}, techniqueUpgrades: {}, attributeFloor: {}, attributeBudget: 0, highestStage: 0, specialEffect: '' };
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
/** Dados, custo e bônus de uma Nomenclatura conforme o caminho Nomenclatura (Aprimorada 5 GS · Dominada 7 GS · Favorita 10 GS). */
export function techniqueRules(c: Character, n: Nomenclature) {
  const kind = n.kind ?? 'Direta';
  const st = sheetState(c);
  const rank = st.nomRank;
  const upgrade = st.techniqueUpgrades[n.name] ?? {};
  const die = dieFor(c.espirito) ?? 4;
  return {
    kind, rank, upgrade,
    dice: NOMENCLATURE_DICE[kind], critDice: NOMENCLATURE_CRIT_DICE[kind],
    cost: Math.max(0, NOMENCLATURE_COST[kind] - (rank >= 2 && kind !== 'Direta' ? 2 : 0)),
    /** Aprimorada: dado de ESPÍRITO no dano. Dominada: dado + valor fixo. */
    extraDice: rank >= 1 ? [`1d${die}`] : [] as string[],
    bonus: rank >= 2 ? c.espirito : 0,
  };
}
/** Dano de uma Nomenclatura. Direta/Parcial: crítico dobra todos os dados (inclusive o de ESPÍRITO). Completa: crítico é sempre 12d8 puro. */
export function nomenclatureDamage(c: Character, n: Nomenclature, crit: boolean, extraBonus = 0, mult = 2) {
  const t = techniqueRules(c, n);
  if (crit && t.kind === 'Completa') return damageRoll(NOMENCLATURE_CRIT_DICE.Completa, extraBonus, false);
  return upgradedDamage(t.dice, t.bonus + extraBonus, crit, t.extraDice, mult);
}
/** Arma / Corpo: atributo da linhagem (Humano MENTE, Arcadiano ESPÍRITO, Gaki CORPO). Desarmado e arma comum somam sempre CORPO e nunca evoluem. */
export function weaponRules(c: Character, type = c.weapon_type, common = sheetState(c).weaponMode === 'comum') {
  const unarmed = weaponByKey(type)?.attr === 'corpo';
  const attr: Attr = unarmed || common ? 'corpo' : weaponAttrFor(c.lineage);
  const rank = common || unarmed ? 0 : sheetState(c).weaponRank;
  /** Sem evolução: valor fixo. Evoluído (rank 1): dado do atributo no lugar do fixo. Dominado (rank 2): dado + valor fixo. */
  return { attr, bonus: rank === 1 ? 0 : c[attr], extraDice: rank > 0 ? [`1d${dieFor(c[attr]) ?? 4}`] : [] as string[], rank };
}
/** Quem escolheu Arma / Corpo Estilizada no marco de 10 GS pode gastar 10 PF para Crítico Triplo. */
export function canTripleCrit(c: Character) {
  const st = sheetState(c);
  return Object.entries(st.milestoneChoices).some(([k, v]) => k.endsWith(':10') && v === 'arma');
}
export const TRIPLE_CRIT_COST = 10;
/** Arma / Corpo Estilizada (10 GS): por 10 PF, declarados ANTES de saber se acerta, a faixa de crítico do d20 desce 1 por ponto de MENTE (Mente 3 → crítico em 17+). Vale só para o d20, não para a soma. */
export const STYLIZED_CRIT_COST = 10;
export const stylizedCritThreshold = (mente: number) => Math.max(2, 20 - mente);
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
/** Opções de cada marco. Estágio 1: Arma / Corpo ou Nomenclatura, escolhido a cada marco (sem trava). Estágio 2: três temas livres. Depois: livre com o Mestre. */
export type MilestoneChoice = 'arma' | 'corpo' | 'nomenclatura' | 'mimetismo' | 'vinganca' | 'nomenclatura_avancada' | 'livre';
export const milestoneOptions = (stage: number): { id: MilestoneChoice; label: string }[] =>
  stage === 0 ? [{ id: 'arma', label: 'Arma' }, { id: 'corpo', label: 'Corpo Moldado' }, { id: 'nomenclatura', label: 'Nomenclatura' }]
  : stage === 1 ? [{ id: 'mimetismo', label: 'Mimetismo do Fluxo' }, { id: 'vinganca', label: 'Vingança Karmática' }, { id: 'nomenclatura_avancada', label: 'Nomenclatura Avançada' }]
  : [{ id: 'livre', label: 'Livre, combinado com o Mestre' }];
/** Marcos que exigem escolher uma Nomenclatura: Favorita (10 GS, estágio 1) e a segunda Favorita (5 GS, Nomenclatura Avançada). */
export function milestoneNeedsTechnique(c: Character, gs: 5 | 7 | 10, choice: string) {
  const stage = stageIndexFor(c.lineage, c.stage);
  return (stage === 0 && choice === 'nomenclatura' && gs === 10) || (stage === 1 && choice === 'nomenclatura_avancada' && gs === 5);
}
export function applyMilestone(c: Character, gs: 5 | 7 | 10, choice: string, technique?: string, effect = '') {
  const state = sheetState(c);
  const key = milestoneKey(c, gs);
  const stage = stageIndexFor(c.lineage, c.stage);
  if (c.gs < gs || state.milestones.includes(key) || !milestoneOptions(stage).some(o => o.id === choice)) return null;
  if (milestoneNeedsTechnique(c, gs, choice) && !c.nomenclatures.some(n => n.name === technique)) return null;
  const upgrades = { ...state.techniqueUpgrades };
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
