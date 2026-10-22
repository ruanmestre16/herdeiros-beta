import { useEffect, useState } from 'react';
import { Dices, Plus, Skull, Sparkles, Swords, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Stepper } from './Controls';
import {
  ELO_ACTIONS, LINEAGE_STAGES, NOMENCLATURE_COST, NOMENCLATURE_DICE, NOMENCLATURE_CRIT_DICE, REST_TYPES, TRIPLE_CRIT_COST, WEAPONS,
  attackRoll, absorbPf, canTripleCrit, combinedRoll, stylizedCritThreshold, nomenclatureDamage, nomenclatureLabel, nomenclatureLevelLabel, applyMilestone, milestoneKey, milestoneNeedsTechnique, milestoneOptions, milestoneOptionsFor, milestonePath, nomenclatureFamilies, techniqueKey, restRoll, stageIndexFor,
  damageRoll, dieFor, karmaDamageBonus, karmaMaximum, rollDice, weaponByKey, weaponRules, techniqueRules, upgradedDamage, isTechAgent, absorbActionLabel, attrLabelFor, sheetState, withSheetState,
  SHARE_MIN_SYNC, PROTECTION_MIN_ELO, syncLevelWith, pfShareBlock, pathLevels, mimicCapacity, FLUX_LINK_COST, MIMIC_RECORD_COST, mimicUseCost, vengeanceCost, ECO_COST, EXTRA_COST, EXTRA_REFINED_COST, CHAMADO_COST,
  agonyStatus, agonyEnter, agonyFailure, agonyUndo, agonyLeave, agonySacrifice, AGONY_MAX_FAILURES,
  type Attr, type Character, type NomenclatureKind, type RestType,
} from '@/lib/game';
import { milestoneText } from '@/lib/milestones';

export type RollEntry = { expression: string; dice: number[]; modifier: number; total: number; source?: string; crit?: boolean };
type Update = (partial: Partial<Character>) => void;
type AddRoll = (entry: RollEntry) => void;

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span className="field-label">{label}</span>{children}</label>; }

/** Elo: os laços entre aliados (Cap. VII). Salvo no campo `sync` da ficha (mesmo formato de antes). */
export function SyncEditor({ character, update }: { character: Character; update: Update }) {
  return <div className="sync-block">
    <div className="flex items-center justify-between"><span className="field-kicker">ELO — LAÇOS ENTRE ALIADOS</span><Button size="sm" variant="outline" onClick={() => update({ sync: [...character.sync, { name: '', level: 1 }] })}><Plus /> Adicionar Elo</Button></div>
    <p className="muted-copy text-xs">Elo {SHARE_MIN_SYNC}+ permite Partilhar PFs excedentes. Elo {PROTECTION_MIN_ELO}+ permite a Proteção Compartilhada (bloqueio contra Nomenclatura Completa). Ganhos: {ELO_ACTIONS.map(([a, v]) => `${a} (${v})`).join(' · ')}.</p>
    {character.sync.map((item, i) => <div className="sync-row" key={i}>
      <Field label="COM QUEM"><input value={item.name} placeholder="Nome da pessoa" onChange={e => update({ sync: character.sync.map((n, j) => j === i ? { ...n, name: e.target.value } : n) })} /></Field>
      <Stepper label="ELO" value={item.level} onChange={level => update({ sync: character.sync.map((n, j) => j === i ? { ...n, level } : n) })} />
      <Button size="icon" variant="ghost" title="Remover Elo" aria-label="Remover Elo" onClick={() => update({ sync: character.sync.filter((_, j) => j !== i) })}><Trash2 /></Button>
    </div>)}
    {!character.sync.length && <p className="empty-copy">Nenhum Elo registrado.</p>}
  </div>;
}

export const ANCHOR_NAME = 'Âncora Sentimental';
export const hasAnchor = (c: Character) => c.inventory.some(i => i.name.trim().toLowerCase() === ANCHOR_NAME.toLowerCase() && i.quantity > 0);

/**
 * Teste contra o Karma (MENTE contra a DT do Mestre).
 * Âncora Sentimental: o jogador a ergue e gasta Moedas do Destino (custo definido pelo Mestre) para "firmar a própria mente"; o Mestre decide quanto a DT cai.
 */
export function KarmaTest({ character, addRoll, update, initialDp = 10 }: { character: Character; addRoll: AddRoll; update?: Update; initialDp?: number }) {
  const [dp, setDp] = useState(initialDp);
  const [useAnchor, setUseAnchor] = useState(false);
  const [coinCost, setCoinCost] = useState(1);
  const [reduction, setReduction] = useState(2);
  const [result, setResult] = useState<{ roll: number; dp: number; success: boolean } | null>(null);
  const st = sheetState(character);
  const anchor = hasAnchor(character);
  const canAnchor = anchor && st.coins >= 1 && !!update;
  const anchored = canAnchor && useAnchor;
  const finalDp = Math.max(1, dp - (anchored ? reduction : 0));
  const die = dieFor(character.mente) ?? 4;
  return <div className="karma-test">
    <span className="field-kicker text-karma">TESTE CONTRA O KARMA (MENTE)</span>
    <div className="gaki-grid">
      <Stepper label="DT DO TESTE (MESTRE)" value={dp} min={1} max={40} tone="karma" onChange={setDp} />
      <Button variant="outline" className="action-karma" onClick={() => {
        const r = rollDice(1, die)[0]!; const success = r >= finalDp;
        if (anchored && update) update({ abilities: withSheetState(character, { coins: Math.max(0, st.coins - Math.min(coinCost, st.coins)) }) });
        setResult({ roll: r, dp: finalDp, success });
        addRoll({ expression: `1d${die}`, dice: [r], modifier: 0, total: r, source: `Teste de MENTE contra o Karma (DT ${finalDp}${anchored ? `, Âncora −${reduction}, ${Math.min(coinCost, st.coins)} moeda(s)` : ''}) — ${success ? 'sucesso' : 'falha'}` });
      }}><Dices />Rolar teste (1d{die} vs DT {finalDp})</Button>
    </div>
    {anchor ? <div className="anchor-row">
      <label className="anchor-toggle"><input type="checkbox" disabled={!canAnchor} checked={anchored} onChange={e => setUseAnchor(e.target.checked)} /> Erguer a <strong className="text-karma">{ANCHOR_NAME}</strong> (Moedas do Destino: {st.coins})</label>
      {anchored && <><Stepper label="MOEDAS GASTAS (MESTRE)" value={coinCost} min={1} max={Math.max(1, st.coins)} tone="karma" onChange={setCoinCost} /><Stepper label="REDUÇÃO DA DT (MESTRE)" value={reduction} min={1} max={10} tone="karma" onChange={setReduction} /></>}
      {!canAnchor && <p className="empty-copy">Sem Moedas do Destino para gastar. O Mestre concede 1 moeda a cada grande narração ou sacada.</p>}
    </div> : <p className="empty-copy">Sem {ANCHOR_NAME} no inventário.</p>}
    {result && <div className={`combat-banner ${result.success ? 'banner-hit' : 'banner-miss'}`}><strong>{result.success ? 'SUCESSO' : 'FALHA'}</strong><span>Resultado {result.roll} contra DT {result.dp}</span></div>}
  </div>;
}

/** Moedas do Destino e Âncora Sentimental (Cap. VII). */
export function CoinsPanel({ character, update }: { character: Character; update: Update }) {
  const st = sheetState(character);
  const set = (patch: Partial<typeof st>) => update({ abilities: withSheetState(character, patch) });
  return <div className="field-stack">
    <Stepper label="MOEDAS DO DESTINO" value={st.coins} min={0} max={999} tone="flux" onChange={coins => set({ coins })} />
    <p className="muted-copy text-xs">O Mestre concede 1 moeda quando você narra algo muito bem, tem uma grande sacada ou pensa fora da caixa. Não há limite. Para gastar, erga a {ANCHOR_NAME} (ela fica exposta e pode virar alvo) e escolha: forçar a rerrolagem de um aliado, auxiliar narrativamente (o Mestre reduz a DT) ou firmar a própria mente. O Mestre define o custo.</p>
    <label className="anchor-toggle"><input type="checkbox" checked={st.anchorBroken} onChange={e => set({ anchorBroken: e.target.checked })} /> {ANCHOR_NAME} quebrada (falhou no teste de MENTE do surto)</label>
    {st.anchorBroken && <p className="empty-copy">Todo Karma recebido a partir de agora é <strong className="text-karma">dobrado</strong> e reduzir o Karma fica mais difícil.</p>}
  </div>;
}

/** Descanso considerável: recupera PV e reduz Karma (Cap. IX). */
export function RestPanel({ character, update, addRoll }: { character: Character; update: Update; addRoll: AddRoll }) {
  const [type, setType] = useState<RestType>('padrao');
  const [last, setLast] = useState('');
  const st = sheetState(character);
  return <div className="field-stack">
    <Field label="TIPO DE DESCANSO"><select value={type} onChange={e => setType(e.target.value as RestType)}>{(Object.keys(REST_TYPES) as RestType[]).map(k => <option key={k} value={k}>{REST_TYPES[k].label} · {REST_TYPES[k].pv} PV · −{REST_TYPES[k].karma} Karma</option>)}</select></Field>
    <Button variant="outline" onClick={() => {
      const r = restRoll(type);
      update({ pv_current: Math.min(character.pv_max, character.pv_current + r.pv.total), karma: Math.max(0, character.karma - r.karma.total) });
      addRoll({ expression: r.pv.expression, dice: r.pv.dice, modifier: 0, total: r.pv.total, source: `Descanso: +${r.pv.total} PV` });
      addRoll({ expression: r.karma.expression, dice: r.karma.dice, modifier: 0, total: r.karma.total, source: `Descanso: −${r.karma.total} Karma` });
      setLast(`Descansou: +${r.pv.total} PV e −${r.karma.total} Karma.`);
    }}><Sparkles /> Descansar</Button>
    {last && <p role="status" className="auth-message">{last}</p>}
    {st.anchorBroken && <p className="empty-copy">Âncora quebrada: reduzir Karma fica mais difícil. O Mestre julga a qualidade do descanso e pode diminuir a recuperação.</p>}
    <p className="muted-copy text-xs">Descanso considerável é dormir, se acalmar, conversar sobre traumas ou passar tempo de qualidade fazendo algo que ama. O Mestre julga a cena e pode aumentar ou diminuir a cura.</p>
  </div>;
}

const GAKI_HEAL = [4, 7, 12];
/** Passiva do Gaki: consumir o Fluxo de um alvo após a luta recupera PV fixo por estágio + Teste de MENTE contra o Karma. */
export function GakiPassive({ character, update, addRoll }: { character: Character; update: Update; addRoll: AddRoll }) {
  const [defeated, setDefeated] = useState(1);
  const [dt, setDt] = useState(10);
  const [karmaGain, setKarmaGain] = useState(1);
  const [anchorOn, setAnchorOn] = useState(false);
  const [anchorCut, setAnchorCut] = useState(2);
  const [heal, setHeal] = useState<number | null>(null);
  const [test, setTest] = useState<{ roll: number; dt: number; success: boolean } | null>(null);
  const kMax = karmaMaximum(character.mente, character.espirito);
  const st = sheetState(character);
  const perTarget = GAKI_HEAL[stageIndexFor(character.lineage, character.stage)] ?? 4;
  const canAnchor = hasAnchor(character) && st.coins >= 1;
  return <div className="passive">
    <span className="field-kicker">PASSIVA DE LINHAGEM · GAKI</span>
    <p>Ao final de um combate, o Gaki consome o <span className="text-flux">Fluxo</span> restante dos alvos com os quais interagiu e recupera <strong>{perTarget} PV</strong> por alvo consumido. Ao consumir, faz um Teste de MENTE para não se submeter ao <span className="text-karma">Karma</span>: quanto mais machucado, maior a DT.</p>
    <div className="gaki-grid">
      <Stepper label="ALVOS CONSUMIDOS" value={defeated} min={0} max={30} onChange={setDefeated} />
      <Button variant="outline" disabled={defeated < 1} onClick={() => {
        const total = defeated * perTarget;
        setHeal(total); setTest(null);
        update({ pv_current: Math.min(character.pv_max, character.pv_current + total) });
        addRoll({ expression: `${defeated} × ${perTarget}`, dice: [], modifier: total, total, source: `Consumir Fluxo (+${total} PV)` });
      }} className="action-flux"><Sparkles /> Consumir Fluxo ({defeated} × {perTarget} PV)</Button>
    </div>
    {heal !== null && <div className="roll-result"><span>Recuperou <strong>{heal} PV</strong></span></div>}
    {heal !== null && <div className="gaki-grid">
      <Stepper label="DT DO TESTE (MESTRE)" value={dt} min={1} max={40} onChange={setDt} />
      {canAnchor && <label className="anchor-toggle"><input type="checkbox" checked={anchorOn} onChange={e => setAnchorOn(e.target.checked)} /> Âncora Sentimental (1 moeda, −{anchorCut})</label>}
      {canAnchor && anchorOn && <Stepper label="REDUÇÃO (MESTRE)" value={anchorCut} min={1} max={10} tone="karma" onChange={setAnchorCut} />}
      <Button variant="outline" onClick={() => {
        const anchored = canAnchor && anchorOn;
        const fdt = Math.max(1, dt - (anchored ? anchorCut : 0));
        const r = rollDice(1, dieFor(character.mente) ?? 4)[0]!; const success = r >= fdt;
        if (anchored) update({ abilities: withSheetState(character, { coins: Math.max(0, st.coins - 1) }) });
        setTest({ roll: r, dt: fdt, success });
        addRoll({ expression: `1d${dieFor(character.mente)}`, dice: [r], modifier: 0, total: r, source: `Teste de MENTE (DT ${fdt}) — ${success ? 'sem Karma' : 'acumula Karma'}` });
      }}><Dices /> Teste de MENTE (1d{dieFor(character.mente)})</Button>
    </div>}
    {test && <div className={`combat-banner ${test.success ? 'banner-hit' : 'banner-miss'}`}>
      <strong>{test.success ? 'SUCESSO — NÃO ACUMULA KARMA' : 'FALHA — ACUMULA KARMA'}</strong>
      <span>Resultado {test.roll} contra DT {test.dt}</span>
      {!test.success && <div className="gaki-grid mt-3">
        <Stepper label="KARMA ACUMULADO (MESTRE)" value={karmaGain} min={1} max={kMax} tone="karma" onChange={setKarmaGain} />
        <Button variant="outline" className="action-karma" onClick={() => { update({ karma: Math.min(kMax, character.karma + karmaGain) }); setTest(null); setHeal(null); }}><Skull /> Registrar Karma</Button>
      </div>}
    </div>}
  </div>;
}

const LINEAGE_WEAPON: Record<string, string> = { Humano: 'Arma de Vínculo (MENTE)', Arcadiano: 'Arma de Ego (ESPÍRITO)', Gaki: 'Corpo moldado (CORPO)', 'Agente Tecnológico': 'Arma de Núcleo (MENTE)' };
/**
 * Arma: o atributo vem da linhagem (Humano MENTE, Arcadiano ESPÍRITO, Gaki CORPO); arma comum, sem Vínculo nem Ego, soma sempre CORPO.
 * Dano = dado da tabela + atributo (fixo). Evoluído (5 GS): dado do atributo no lugar do fixo. Dominado (7 GS): dado + fixo.
 */
export function WeaponPanel({ character, update, addRoll }: { character: Character; update: Update; addRoll: AddRoll }) {
  const [last, setLast] = useState<{ d20: number; attrDie: number; attrRoll: number; total: number; crit: boolean; fumble: boolean; tripled: boolean } | null>(null);
  const [dmg, setDmg] = useState<{ total: number; dice: number[]; bonus: number; crit: boolean } | null>(null);
  const [triple, setTriple] = useState(false);
  const st = sheetState(character);
  const type = weaponByKey(character.weapon_type);
  const dice = type ? type.dice[0]! : '';
  const common = st.weaponMode === 'comum';
  const wr = weaponRules(character);
  const karma = karmaDamageBonus(character);
  const bonus = wr.bonus + karma;
  const tripleOk = !!type && type.attr !== 'corpo' && !common && canTripleCrit(character) && character.pf_current >= TRIPLE_CRIT_COST;
  const stylizedThreshold = stylizedCritThreshold(character[wr.attr]);
  const damageText = type ? [dice, ...wr.extraDice, ...(wr.bonus ? [`${attrLabelFor(wr.attr, character.lineage)} (${character[wr.attr]})`] : [])].join(' + ') : '';
  return <div className="weapon-block">
    <span className="field-kicker">{character.lineage === 'Humano' ? 'ARMA DE VÍNCULO · VONTADE, HISTÓRIA E IDENTIDADE' : 'ARMA'}</span>
    <div className="input-grid mt-3">
      <Field label="TIPO DE ARMA"><select value={character.weapon_type} onChange={e => { const w = weaponByKey(e.target.value); update({ weapon_type: e.target.value, weapon_dice: w?.dice[0] ?? '' }); setLast(null); setDmg(null); }}>
        <option value="">Escolher tipo</option>{WEAPONS.map(w => <option key={w.key} value={w.key}>{w.label}</option>)}
      </select></Field>
      <Field label="ORIGEM DA ARMA"><select value={common ? 'comum' : 'linhagem'} onChange={e => update({ abilities: withSheetState(character, { weaponMode: e.target.value as 'linhagem' | 'comum' }) })}>
        <option value="linhagem">{LINEAGE_WEAPON[character.lineage] ?? 'Arma da linhagem'}</option>
        <option value="comum">Arma comum (soma sempre CORPO)</option>
      </select></Field>
    </div>
    {type && <p className="weapon-summary">Ataque <strong>1d20 + 1d{dieFor(character[wr.attr]) ?? 4} ({attrLabelFor(wr.attr, character.lineage)})</strong> · Dano <strong>{damageText}</strong>{karma ? <strong className="text-karma"> + {karma} Karma</strong> : null}<br /><span>{type.note}{wr.rank === 1 ? ' Evoluída: o dado do atributo substitui o valor fixo.' : wr.rank >= 2 ? ' Dominada: dado + valor fixo do atributo.' : ''}{common && type.attr !== 'corpo' ? ' Arma comum não recebe evoluções.' : ''}</span></p>}
    {tripleOk && <label className="anchor-toggle mt-3"><input type="checkbox" checked={triple} onChange={e => setTriple(e.target.checked)} /> Crítico Triplo (−{TRIPLE_CRIT_COST} PF: dados ×3 no crítico e crítico no d20 a partir de {stylizedThreshold} — gasta antes de saber se acerta)</label>}
    <div className="quick-actions mt-3">
      <Button variant="outline" disabled={!type} onClick={() => {
        const tripled = triple && tripleOk;
        const r = attackRoll(character[wr.attr], undefined, tripled ? stylizedThreshold : 20);
        const cost = tripled ? TRIPLE_CRIT_COST : 0;
        if (cost) update({ pf_current: character.pf_current - cost });
        setLast({ ...r, tripled }); setDmg(null);
        addRoll({ expression: r.expression, dice: r.dice, modifier: r.modifier, total: r.total, source: `Ataque com arma${tripled ? ` (Crítico Triplo: crítico ${stylizedThreshold}+ no d20)` : ''}${r.fumble ? ' — FALHA CRÍTICA' : r.crit ? ' — CRÍTICO' : ''}`, crit: r.crit });
      }}><Swords /> Atacar (1d20 + 1d{dieFor(character[wr.attr]) ?? 4})</Button>
      <Button variant="outline" disabled={!type || !last || last.fumble} onClick={() => {
        const crit = !!last?.crit;
        const d = upgradedDamage(dice, bonus, crit, wr.extraDice, last?.tripled ? 3 : 2); setDmg({ total: d.total, dice: d.dice, bonus, crit });
        addRoll({ expression: d.expression, dice: d.dice, modifier: bonus, total: d.total, source: `Dano da arma${crit ? ` — CRÍTICO (dados ${last?.tripled ? '×3' : 'dobrados'})` : ''}`, crit });
      }} className={last?.crit ? 'action-critical' : ''}><Dices /> Rolar dano{last?.crit ? ' crítico' : ''}</Button>
    </div>
    {last && <div className={`combat-banner ${last.fumble ? 'banner-miss' : last.crit ? 'banner-crit' : 'banner-neutral'}`}><strong>{last.fumble ? 'FALHA CRÍTICA! 1 NATURAL' : last.crit ? `CRÍTICO! ${last.d20} NO D20` : `ATAQUE: ${last.total}`}</strong><span>1d20 [{last.d20}] + 1d{last.attrDie} [{last.attrRoll}] = {last.total}{last.fumble ? ' · erra sempre, qualquer que seja a soma' : last.crit ? ' · só é crítico se o total superar ou igualar a Esquiva do alvo; dados de dano dobrados' : ' · compare com a Esquiva do alvo (empate favorece quem ataca)'}</span></div>}
    {dmg && <div className={`roll-result ${dmg.crit ? 'result-critical' : ''}`}><span>Dano{dmg.crit ? ' CRÍTICO' : ''}: <strong>{dmg.total}</strong> ({dmg.dice.join(' + ')}{dmg.bonus ? ` + ${dmg.bonus}` : ''})</span></div>}
  </div>;
}

type ParsedTechnique = { name: string; kind: NomenclatureKind; effect: string };

/** Lê o texto no formato: "DIRETA — 2 PF" / nome / texto. Dano e custo vêm sempre da tabela do Códice (o texto só define tipo, nome e efeito). */
function parseNomenclatureText(text: string): ParsedTechnique[] {
  const kinds: Record<string, NomenclatureKind> = { direta: 'Direta', parcial: 'Parcial', completa: 'Completa' };
  const out: ParsedTechnique[] = [];
  let cur: ParsedTechnique | null = null;
  let needName = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const head = line.match(/^\W*(direta|parcial|completa)\b/i);
    if (head && /PF/i.test(line)) {
      cur = { name: '', kind: kinds[head[1]!.toLowerCase()]!, effect: '' };
      out.push(cur);
      needName = true;
      continue;
    }
    if (!cur) continue;
    if (/^dano\s*:/i.test(line)) continue;
    if (needName) { cur.name = line; needName = false; continue; }
    cur.effect = cur.effect ? `${cur.effect}\n${line}` : line;
  }
  return out.filter(p => p.name);
}

/** Nomenclaturas: nome e tipo. Dano, crítico e custo de PF seguem a escala de Recitação (Direta 1d6/2 PF · Parcial 2d8/5 PF · Completa 6d8/12 PF). */
export function NomenclaturesTab({ character, update, addRoll }: { character: Character; update: Update; addRoll: AddRoll }) {
  const [draft, setDraft] = useState<{ name: string; kind: NomenclatureKind; family: string } | null>(null);
  const families = nomenclatureFamilies(character);
  const [pasteText, setPasteText] = useState('');
  const [result, setResult] = useState<{ name: string; attack: number; d20: number; attrDie: number; attrRoll: number; crit: boolean; fumble: boolean; damage?: number; dice?: number[] } | null>(null);
  const parsed = draft ? parseNomenclatureText(pasteText) : [];
  const closeDraft = () => { setDraft(null); setPasteText(''); };
  const kinds: NomenclatureKind[] = ['Direta', 'Parcial', 'Completa'];
  return <div className="single-section">
    <div className="section-heading"><div className="flex items-center gap-3"><span className="section-number">01</span><h2>{nomenclatureLabel(character.lineage, true)}</h2></div><Button size="sm" onClick={() => setDraft({ name: '', kind: 'Direta', family: '' })}><Plus /> Nova {nomenclatureLabel(character.lineage)}</Button></div>
    {draft && <div className="game-panel mb-5">
      <div className="panel-head"><h3>Nova {nomenclatureLabel(character.lineage)}</h3></div>
      <div className="field-stack">
        <Field label="COLE O TEXTO COMPLETO (DIRETA, PARCIAL E COMPLETA)">
          <textarea rows={10} value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder={'⚡ DIRETA — 2 PF\nNOME DA TÉCNICA\ntexto...\n🌘 PARCIAL — 5 PF\n...'} />
        </Field>
        {pasteText.trim() && <p className="empty-copy">{parsed.length
          ? `Reconhecido: ${parsed.map(p => `${p.kind} · ${p.name} · ${NOMENCLATURE_DICE[p.kind]} (crítico ${NOMENCLATURE_CRIT_DICE[p.kind]}) · ${NOMENCLATURE_COST[p.kind]} PF`).join('  |  ')}`
          : 'Nada reconhecido ainda. Confira se cada versão começa com uma linha como "DIRETA — 2 PF".'}</p>}
        {parsed.length > 0 && <div className="flex gap-2"><Button onClick={() => {
          const family = draft!.family || (parsed.find(p => p.kind === 'Direta') ?? parsed[0]!).name;
          update({ nomenclatures: [...character.nomenclatures, ...parsed.map(p => ({ name: p.name, cost: NOMENCLATURE_COST[p.kind], kind: p.kind, family, ...(p.effect ? { effect: p.effect } : {}) }))] });
          closeDraft();
        }}><Plus /> Salvar {parsed.length} {parsed.length > 1 ? 'versões' : 'versão'} do texto</Button></div>}
        <Field label="NOME DA TÉCNICA"><input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Nome da técnica" /></Field>
        <Field label="FAZ PARTE DE"><select value={draft.family} onChange={e => setDraft({ ...draft, family: e.target.value })}><option value="">Nova nomenclatura</option>{families.map(f => <option key={f.key} value={f.key}>{f.name} (outra versão dela)</option>)}</select></Field>
        <Field label={`TIPO DE ${nomenclatureLabel(character.lineage).toUpperCase()}`}><select value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value as NomenclatureKind })}>
          {kinds.map(k => <option key={k} value={k}>{nomenclatureLevelLabel(character.lineage, k)}</option>)}
        </select></Field>
        <p className="empty-copy">Dano <strong>{NOMENCLATURE_DICE[draft.kind]}</strong> (crítico {NOMENCLATURE_CRIT_DICE[draft.kind]}) · custo <strong className="text-flux">{NOMENCLATURE_COST[draft.kind]} PF</strong>. Os valores são fixos pelo Códice.</p>
        <div className="flex gap-2"><Button disabled={!draft.name.trim()} onClick={() => { update({ nomenclatures: [...character.nomenclatures, { name: draft.name.trim(), cost: NOMENCLATURE_COST[draft.kind], kind: draft.kind, family: draft.family || draft.name.trim() }] }); closeDraft(); }}><Plus /> Salvar técnica</Button><Button variant="ghost" onClick={closeDraft}>Cancelar</Button></div>
      </div>
    </div>}
    {result && <div className={`combat-banner mb-5 ${result.fumble ? 'banner-miss' : result.crit ? 'banner-crit' : 'banner-neutral'}`}><strong>{result.fumble ? `FALHA CRÍTICA! ${result.name}` : result.crit ? `CRÍTICO! ${result.name}` : `${result.name}: ataque ${result.attack}`}</strong><span>1d20 [{result.d20}] + 1d{result.attrDie} [{result.attrRoll}] ({attrLabelFor('espirito', character.lineage)}) = {result.attack}{result.damage !== undefined ? ` · dano ${result.damage} (${result.dice?.join(' + ')})${result.crit ? ' — crítico' : ''}` : ''}</span></div>}
    <div className="item-list">{families.map(g => { const gFav = techniqueRules(character, g.items[0]!.item).upgrade.favorite; return <div className="nomen-family" key={g.key}><div className="nomen-head"><strong>{g.name}{gFav ? ' ★' : ''}</strong><span>uma nomenclatura · {g.items.length} {g.items.length > 1 ? 'versões' : 'versão'}</span></div>{gFav && <p className="empty-copy">★ Nomenclatura Favorita: {gFav}</p>}{g.items.map(({ item, index: i }) => {
      const t = techniqueRules(character, item);
      const parts = [t.dice, ...t.extraDice, ...(t.bonus ? [String(t.bonus)] : [])].join(' + ');
      return <div className="editable-row" key={i}>
        <div className="nomen-head"><strong>{item.name}</strong><span>{nomenclatureLevelLabel(character.lineage, t.kind)} · dano {parts} (crítico {t.kind === 'Completa' ? `${t.critDice} puro` : `${t.critDice}${t.extraDice.length ? ` + ${t.extraDice.map(e => `2${e.slice(1)}`).join(' + ')}` : ''}${t.bonus ? ` + ${t.bonus}` : ''}`}) · <span className="text-flux">{t.cost} PF</span></span></div>
        {item.effect && <p className="empty-copy" style={{ whiteSpace: 'pre-line' }}>{item.effect}</p>}
        <div className="row-actions">
          <Button size="sm" variant="outline" disabled={character.pf_current < t.cost} onClick={() => {
            const r = attackRoll(character.espirito); update({ pf_current: character.pf_current - t.cost });
            setResult({ name: item.name, attack: r.total, d20: r.d20, attrDie: r.attrDie, attrRoll: r.attrRoll, crit: r.crit, fumble: r.fumble });
            addRoll({ expression: r.expression, dice: r.dice, modifier: r.modifier, total: r.total, source: `${nomenclatureLabel(character.lineage)} · ${item.name} — ${nomenclatureLevelLabel(character.lineage, t.kind)} · acerto${r.fumble ? ' FALHA CRÍTICA' : r.crit ? ' CRÍTICO' : ''}`, crit: r.crit });
          }} className="action-flux"><Sparkles /> Usar ({t.cost} PF)</Button>
          <Button size="sm" variant="outline" disabled={!result || result.name !== item.name || result.damage !== undefined || result.fumble} onClick={() => {
            if (!result) return;
            const d = nomenclatureDamage(character, item, result.crit, karmaDamageBonus(character));
            setResult({ ...result, damage: d.total, dice: d.dice });
            addRoll({ expression: d.expression, dice: d.dice, modifier: d.bonus, total: d.total, source: `${nomenclatureLabel(character.lineage)} · ${item.name} — ${nomenclatureLevelLabel(character.lineage, t.kind)} · dano${result.crit ? ' CRÍTICO' : ''}`, crit: result.crit });
          }}><Dices /> Rolar dano</Button>
          <select aria-label="Nomenclatura a que esta versão pertence" value={techniqueKey(item)} onChange={e => update({ nomenclatures: character.nomenclatures.map((n, j) => j === i ? { ...n, family: e.target.value === '__own' ? n.name : e.target.value } : n) })}>{families.map(f => <option key={f.key} value={f.key}>Faz parte de: {f.name}</option>)}<option value="__own">Separar como nomenclatura própria</option></select>
          <Button size="icon" variant="ghost" title="Excluir técnica" aria-label="Excluir técnica" onClick={() => update({ nomenclatures: character.nomenclatures.filter((_, j) => j !== i) })}><Trash2 /></Button>
        </div>
        {character.pf_current < t.cost && <p className="empty-copy">PF insuficientes: use Forçar o Fluxo (ação livre) para gerar PF, ao custo de Karma.</p>}
      </div>;
    })}</div>; })}{!character.nomenclatures.length && <p className="empty-copy">Ainda não há {nomenclatureLabel(character.lineage, true).toLowerCase()} nesta ficha.</p>}</div>
  </div>;
}

/** Grau de Sincronia (GS) 0–10 e seus marcos de 5, 7 e 10 (Cap. VII). Cada marco é escolhido livremente pelo jogador. */
export function GsPanel({ character, update }: { character: Character; update: Update }) {
  const st = sheetState(character);
  const stage = stageIndexFor(character.lineage, character.stage);
  const stages = LINEAGE_STAGES[character.lineage] ?? [];
  const options = milestoneOptions(stage);
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [technique, setTechnique] = useState('');
  const [effect, setEffect] = useState('');
  const [msg, setMsg] = useState('');
  const canAdvance = character.gs === 0 && st.milestones.includes(milestoneKey(character, 10)) && stage < stages.length - 1;
  return <div className="field-stack">
    <div><div className="mb-2 flex items-center justify-between text-xs"><span className="field-kicker">GRAU DE SINCRONIA</span><span className="font-medium">{character.gs} <span className="text-muted-foreground">/ 10</span></span></div><div className="meter-track"><div className="meter-fill meter-flux" style={{ width: `${Math.min(100, character.gs * 10)}%` }} /></div></div>
    <p className="muted-copy text-xs">O Mestre concede GS ao final de sessões, após grandes feitos ou superação de traumas. Os pontos não são gastos: o GS acumula (6, 7, 8...) e, ao chegar a 5, 7 e 10, libera um marco. No marco de 5 GS você define o caminho; os marcos de 7 e 10 seguem esse mesmo caminho e os outros ficam fechados. Ao resolver o marco de 10, o GS zera.</p>
    {([5, 7, 10] as const).map(gs => {
      const key = milestoneKey(character, gs);
      const done = st.milestones.includes(key);
      const gsOptions = milestoneOptionsFor(character, gs);
      const pathLocked = !done && gs !== 5 && stage < 2 && !milestonePath(character);
      const ready = character.gs >= gs && !done && !pathLocked;
      const choice = done ? (st.milestoneChoices[key] ?? options[0]!.id) : (picks[gs] ?? gsOptions[0]?.id ?? options[0]!.id);
      const info = milestoneText(choice, gs);
      const needsTech = milestoneNeedsTechnique(character, gs, choice);
      const askEffect = needsTech || (gs === 10 && (choice === 'arma' || choice === 'corpo'));
      return <div key={gs} className={`passive ${ready ? 'passive-ready' : ''}`}>
        <span className="field-kicker">{gs} GS · {done ? 'RESOLVIDO' : ready ? 'DISPONÍVEL' : 'BLOQUEADO'}</span>
        {ready && gsOptions.length > 1 && <Field label={gs === 5 ? 'CAMINHO (DEFINIDO AQUI, VALE PARA 7 E 10 GS)' : 'O QUE EVOLUIR NESTE MARCO'}><select value={choice} onChange={e => setPicks({ ...picks, [gs]: e.target.value })}>{gsOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></Field>}
        {pathLocked ? <p>Resolva primeiro o marco de 5 GS: ele define o caminho deste ciclo.</p> : <><strong>{info.title}</strong>
        <p>{info.text}</p></>}
        {ready && <div className="field-stack mt-3">
          {needsTech && <Field label="NOMENCLATURA ESCOLHIDA"><select value={technique} onChange={e => setTechnique(e.target.value)}><option value="">Escolher</option>{nomenclatureFamilies(character).filter(f => !st.techniqueUpgrades[f.key]?.favorite).map(f => <option key={f.key} value={f.key}>{f.name} ({f.items.length} {f.items.length > 1 ? 'versões' : 'versão'})</option>)}</select></Field>}
          {askEffect && <Field label={needsTech ? 'O QUE A VERSÃO FAVORITA PASSA A FAZER (COM O MESTRE)' : 'EFEITO ESPECIAL (COM O MESTRE)'}><input value={effect} onChange={e => setEffect(e.target.value)} /></Field>}
          <Button variant="outline" disabled={needsTech && !technique} onClick={() => {
            const next = applyMilestone(character, gs, choice, technique, effect.trim());
            if (!next) { setMsg('Não foi possível aplicar este marco.'); return; }
            update({ gs: next.gs, abilities: next.abilities }); setTechnique(''); setEffect('');
            setMsg(gs === 10 ? 'Marco de 10 GS resolvido: o GS zerou. Quando a história pedir, avance de estágio.' : `Marco de ${gs} GS aplicado.`);
          }}><Sparkles /> Aplicar marco de {gs} GS</Button>
        </div>}
      </div>;
    })}
    {msg && <p role="status" className="auth-message">{msg}</p>}
    {canAdvance && <Button variant="outline" className="action-flux" onClick={() => { update({ stage: stages[stage + 1]!.name }); setMsg(character.lineage === 'Arcadiano' ? 'Avanço de estágio: ganhe +1 ponto de atributo (respeitando o teto do estágio) e aprenda duas novas Nomenclaturas.' : 'Avanço de estágio: ganhe +1 ponto de atributo (respeitando o teto do estágio) e aprenda uma nova Nomenclatura.'); }}><Sparkles /> Avançar para {stages[stage + 1]!.name}</Button>}
  </div>;
}

/** Caminhos de GS na ficha: Vínculo de Fluxo (liga por 2 PF e fica ligado até o fim da cena) e o registro do Mimetismo. As demais habilidades (Ataque Extra, O Chamado, Vingança, Fusão) têm botões no painel de combate. */
export function PathPanel({ character, update, addRoll }: { character: Character; update: Update; addRoll: AddRoll }) {
  const st = sheetState(character);
  const lv = pathLevels(character);
  const cap = mimicCapacity(character);
  const [name, setName] = useState('');
  const [effect, setEffect] = useState('');
  const [dt, setDt] = useState(10);
  const [replace, setReplace] = useState('');
  const [msg, setMsg] = useState('');
  const set = (patch: Partial<typeof st>, extra: Partial<Character> = {}) => update({ ...extra, abilities: withSheetState(character, patch) });
  const full = st.mimic.length >= cap;
  const closed = st.mimicClosed.some(n => n.toLowerCase() === name.trim().toLowerCase());
  if (!lv.arma && !lv.corpo && !lv.mimetismo && !lv.vinganca && !lv.avancada && !st.ecoUsed) return <p className="empty-copy">Os caminhos de GS aparecem aqui conforme você resolve os marcos.</p>;
  return <div className="field-stack">
    {lv.arma >= 1 && <div className={`passive ${st.fluxLink ? 'passive-ready' : ''}`}>
      <span className="field-kicker">VÍNCULO DE FLUXO · {st.fluxLink ? 'LIGADO' : 'DESLIGADO'}</span>
      <p>A Arma de Vínculo causa dano de Fluxo, que conta como dano normal contra Gakis. Ligar custa {FLUX_LINK_COST} PF e a arma fica ligada até o fim da cena. Desligada, Gakis resistem ao golpe (dano menor, definido pelo Mestre). Contra Humanos e Arcadianos o dano é o mesmo.</p>
      <div className="flex flex-wrap gap-2">
        {!st.fluxLink && <Button variant="outline" disabled={character.pf_current < FLUX_LINK_COST} onClick={() => set({ fluxLink: true }, { pf_current: character.pf_current - FLUX_LINK_COST })}><Sparkles /> Ligar Vínculo de Fluxo (−{FLUX_LINK_COST} PF)</Button>}
        {st.fluxLink && <Button variant="ghost" onClick={() => set({ fluxLink: false, ecoUsed: false })}>Encerrar cena (desligar)</Button>}
      </div>
    </div>}
    {lv.corpo >= 2 && <div className="passive"><span className="field-kicker">CORPO MOLDADO</span><p>Ataque Extra ({EXTRA_COST} PF){lv.corpo >= 3 ? `, Ataque Extra Refinado (${EXTRA_REFINED_COST} PF) e O Chamado (${CHAMADO_COST} PF)` : ''}: botões no painel de combate, perto do ataque.</p></div>}
    {lv.vinganca >= 1 && <div className="passive"><span className="field-kicker text-karma">VINGANÇA KARMÁTICA · NÍVEL {lv.vinganca}</span><p>Gasta {vengeanceCost(lv.vinganca)} PF antes do ataque e devolve {lv.vinganca >= 3 ? '100%' : lv.vinganca === 2 ? '1/2' : '1/3'} do dano recebido no combate. O contador aparece no combate assim que você toma dano.</p></div>}
    {lv.avancada >= 2 && <div className="passive"><span className="field-kicker">A VOZ E O ECO DA ARMA · {st.ecoUsed ? 'USADA NESTA CENA' : 'DISPONÍVEL'}</span><p>1x por cena, como ação livre e por {ECO_COST} PF, usa a habilidade inerente da Arma de Ego (ou possessão, ou poder especial), só até uma versão parcial da técnica. Se errar o ataque, o poder se desfaz e os PF são gastos. Botão no painel de combate.</p>{st.ecoUsed && <Button variant="ghost" onClick={() => set({ ecoUsed: false })}>Nova cena (liberar de novo)</Button>}</div>}
    {lv.avancada >= 3 && <div className="passive"><span className="field-kicker">FUSÃO DE NOMENCLATURAS</span><p>Botão no painel de combate, perto do ataque.</p></div>}
    {lv.mimetismo >= 1 && <div className="passive"><span className="field-kicker">MIMETISMO DO FLUXO · REGISTRO ({st.mimic.length} / {cap})</span>
      <p>Ao presenciar uma técnica, gaste {MIMIC_RECORD_COST} PF e faça um teste de MENTE + {attrLabelFor('espirito', character.lineage)} contra a DT do Mestre para gravá-la. Receber o ataque diretamente facilita (DT menor); técnicas de aliados exigem Elo alto ou dano proposital. Se falhar, a oportunidade se fecha para sempre para aquela técnica.</p>
      {st.mimic.map((m, i) => <div className="editable-row" key={i}><strong>{m.name}</strong>{m.effect && <p className="empty-copy">{m.effect}</p>}<Button size="icon" variant="ghost" title="Esquecer técnica" aria-label="Esquecer técnica" onClick={() => set({ mimic: st.mimic.filter((_, j) => j !== i) })}><Trash2 /></Button></div>)}
      {!st.mimic.length && <p className="empty-copy">Nenhuma técnica registrada.</p>}
      <Field label="TÉCNICA VISTA"><input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da técnica" /></Field>
      <Field label="O QUE ELA FAZ (VERSÃO ADAPTADA)"><input value={effect} onChange={e => setEffect(e.target.value)} placeholder="Ex.: raio elétrico" /></Field>
      <Stepper label="DT DO MESTRE" value={dt} min={1} max={60} onChange={setDt} />
      {full && <Field label="SUBSTITUIR QUAL TÉCNICA ANTIGA?"><select value={replace} onChange={e => setReplace(e.target.value)}><option value="">Escolher</option>{st.mimic.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}</select></Field>}
      {closed && <p className="empty-copy">A oportunidade de gravar esta técnica já se fechou.</p>}
      <Button variant="outline" disabled={!name.trim() || closed || (full && !replace) || character.pf_current < MIMIC_RECORD_COST} onClick={() => {
        const r = combinedRoll(character, ['mente', 'espirito']);
        const ok = r.total >= dt; const pf = character.pf_current - MIMIC_RECORD_COST;
        addRoll({ expression: r.expression, dice: r.dice, modifier: 0, total: r.total, source: `Mimetismo · gravar "${name.trim()}" (DT ${dt}) — ${ok ? 'gravada' : 'oportunidade fechada'}` });
        if (ok) { const list = full ? st.mimic.filter(m => m.name !== replace) : st.mimic; set({ mimic: [...list, { name: name.trim(), effect: effect.trim() }] }, { pf_current: pf }); setMsg(`Técnica "${name.trim()}" gravada (${r.total} contra DT ${dt}).`); setEffect(''); setReplace(''); }
        else { set({ mimicClosed: [...st.mimicClosed, name.trim()] }, { pf_current: pf }); setMsg(`Falhou (${r.total} contra DT ${dt}): a oportunidade se fechou permanentemente para "${name.trim()}".`); setEffect(''); }
        setName('');
      }}><Dices /> Gravar técnica (−{MIMIC_RECORD_COST} PF · MENTE + {attrLabelFor('espirito', character.lineage)})</Button>
      {msg && <p role="status" className="auth-message">{msg}</p>}
      {lv.mimetismo >= 2 && <p className="muted-copy text-xs">Em combate, junto com o ataque: {lv.mimetismo >= 3 ? `${mimicUseCost(3)} PF, sem testes, escala máxima.` : `${mimicUseCost(2)} PF e teste de MENTE + ESPÍRITO, escala reduzida.`}</p>}
    </div>}
  </div>;
}

/** Arma de Ego (Arcadiano): Arma Verdadeira (2 Reações por rodada), duelo mental contra a Possessão e a Relíquia que o Ego deixa ao morrer. */
export function EgoWeaponPanel({ character, update, addRoll }: { character: Character; update: Update; addRoll: AddRoll }) {
  const st = sheetState(character);
  const [weaponBonus, setWeaponBonus] = useState(0);
  const [duel, setDuel] = useState('');
  const set = (patch: Partial<typeof st>) => update({ abilities: withSheetState(character, patch) });
  const myDie = dieFor(character.mente) ?? 4; const egoDie = dieFor(character.espirito) ?? 4;
  return <div className="field-stack">
    <div className={`passive ${st.trueWeapon ? 'passive-ready' : ''}`}>
      <span className="field-kicker">ARMA VERDADEIRA · {st.trueWeapon ? 'ATIVA' : 'ADORMECIDA'}</span>
      <p>No estágio Narande o Ego assume forma física independente e luta ao seu lado como um segundo cérebro de combate, permitindo reações em dobro e suporte tático imediato. Ativa, você ganha uma segunda Reação por rodada no combate.</p>
      <label className="anchor-toggle"><input type="checkbox" checked={st.trueWeapon} onChange={e => set({ trueWeapon: e.target.checked })} /> Arma Verdadeira ativa (2 Reações por rodada)</label>
    </div>
    <div className="passive">
      <span className="field-kicker">POSSESSÃO · DUELO MENTAL</span>
      <p>Em conflito ético ou fraqueza, o Ego pode tentar a Possessão: você precisa vencer um duelo mental para não perder o controle do corpo. Aqui o duelo compara 1d20 + 1d{myDie} (MENTE) contra 1d20 + 1d{egoDie} (ESPÍRITO da arma) + o bônus que o Mestre der à arma. Empate favorece a arma.</p>
      <Stepper label="BÔNUS DA ARMA (MESTRE)" value={weaponBonus} min={-10} max={20} onChange={setWeaponBonus} />
      <Button variant="outline" onClick={() => {
        const mine = rollDice(1, 20)[0]! + (rollDice(1, myDie)[0] ?? 1); const ego = rollDice(1, 20)[0]! + (rollDice(1, egoDie)[0] ?? 1) + weaponBonus;
        const won = mine > ego;
        addRoll({ expression: `1d20 + 1d${myDie} contra 1d20 + 1d${egoDie}${weaponBonus ? ` + ${weaponBonus}` : ''}`, dice: [mine, ego], modifier: 0, total: mine, source: `Duelo mental · você ${mine} × Ego ${ego} — ${won ? 'venceu' : 'a Possessão tomou o controle'}` });
        setDuel(won ? `Você venceu o duelo (${mine} contra ${ego}) e mantém o controle do corpo.` : `A arma venceu (${ego} contra ${mine}): a Possessão tomou o controle. O Mestre narra o que acontece.`);
      }}><Dices /> Duelo mental contra a Possessão</Button>
      {duel && <p role="status" className="auth-message">{duel}</p>}
    </div>
    <div className="passive">
      <span className="field-kicker">RELÍQUIA · O QUE O EGO DEIXA</span>
      <p>Quando o Herdeiro morre, o Ego da arma pode virar uma Relíquia (Fênix, por exemplo, mantém a voz de sua antiga portadora). Registre aqui o legado da arma.</p>
      <Field label="NOME DA RELÍQUIA"><input value={st.relic.name} onChange={e => set({ relic: { ...st.relic, name: e.target.value } })} placeholder="Ex.: Fênix" /></Field>
      <Field label="LEGADO E VOZ DO EGO"><input value={st.relic.text} onChange={e => set({ relic: { ...st.relic, text: e.target.value } })} placeholder="O que ela guarda de quem a portou" /></Field>
    </div>
  </div>;
}

/** Habilidades Próprias (Cap. IX): teste MENTE + ESPÍRITO ou MENTE + CORPO (um dado de cada atributo); o Mestre define a DT. */
export function AbilitiesTab({ character, update, addRoll }: { character: Character; update: Update; addRoll?: AddRoll }) {
  const [draft, setDraft] = useState<{ name: string; description: string } | null>(null);
  const [scar, setScar] = useState<{name:string;description:string;benefit:string;scarType:string}|null>(null);
  const [dt, setDt] = useState(10);
  const [pair, setPair] = useState<'espirito'|'corpo'>('espirito');
  const [mode, setMode] = useState('Padrão');
  const [test, setTest] = useState('');
  return <div className="single-section">
    <div className="section-heading"><div className="flex items-center gap-3"><span className="section-number">02</span><h2>Habilidades</h2></div><Button size="sm" onClick={() => setDraft({ name: '', description: '' })}><Plus /> Nova Habilidade</Button></div>
    {draft && <div className="game-panel mb-5"><div className="panel-head"><h3>Nova Habilidade</h3></div><div className="field-stack">
      <Field label="NOME DA HABILIDADE"><input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Field>
      <Field label="O QUE A HABILIDADE FAZ"><textarea rows={4} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></Field>
      <div className="flex gap-2"><Button disabled={!draft.name.trim()} onClick={() => { update({ abilities: [...character.abilities, { name: draft.name.trim(), description: draft.description.trim() }] }); setDraft(null); }}><Plus /> Salvar habilidade</Button><Button variant="ghost" onClick={() => setDraft(null)}>Cancelar</Button></div>
    </div></div>}
    <div className="input-grid mb-4"><Field label="TESTE DE HABILIDADE"><select value={pair} onChange={e=>setPair(e.target.value as 'espirito'|'corpo')}><option value="espirito">MENTE + {attrLabelFor('espirito',character.lineage)}</option><option value="corpo">MENTE + CORPO</option></select></Field><Stepper label="DT DO MESTRE" value={dt} min={1} max={100} onChange={setDt}/><Field label="MODO"><select value={mode} onChange={e=>setMode(e.target.value)}><option>Padrão</option><option>Tempo Dedicado</option><option>Com Pressa</option></select></Field></div>
    <p className="muted-copy text-xs mb-4">{mode === 'Padrão' ? 'Padrão: a habilidade faz o que ela faz normalmente.' : mode === 'Tempo Dedicado' ? 'Tempo Dedicado: você sacrifica seu tempo de interlúdio com o grupo e, em troca, a habilidade ganha um efeito mais forte.' : 'Com Pressa (perseguição): a DT é maior e só sai uma habilidade de nível padrão. Se falhar, há risco ou o Mestre narra algo.'}</p>
    {test&&<p role="status" className="combat-banner mb-4">{test}</p>}
    <div className="item-list">{character.abilities.map((a, i) => a.kind ? null : <div className="editable-row" key={i}>
      <Field label="NOME"><input value={a.name} onChange={e => update({ abilities: character.abilities.map((n, j) => j === i ? { ...n, name: e.target.value } : n) })} /></Field>
      <Field label="DESCRIÇÃO"><textarea rows={3} value={a.description} onChange={e => update({ abilities: character.abilities.map((n, j) => j === i ? { ...n, description: e.target.value } : n) })} /></Field>
      <div className="row-actions"><Button size="sm" variant="outline" onClick={()=>{const r=combinedRoll(character,['mente',pair]);const margin=r.total-dt;setTest(`${a.name} · ${mode}: ${r.total} vs DT ${dt} — ${margin>=0?'sucesso':'falha'} · Rastro Residual ${margin>=5?'mínimo':margin>=0?'reduzido':'intenso'}.${mode==='Com Pressa'&&margin<0?' Risco ou narração do Mestre.':''}`);addRoll?.({expression:r.expression,dice:r.dice,modifier:0,total:r.total,source:`${a.name} · ${mode} vs DT ${dt}`});}}><Dices/> Usar</Button><Button size="icon" variant="ghost" title="Excluir habilidade" aria-label="Excluir habilidade" onClick={() => update({ abilities: character.abilities.filter((_, j) => j !== i) })}><Trash2 /></Button></div>
    </div>)}{!character.abilities.some(a=>!a.kind) && <p className="empty-copy">Nenhuma habilidade registrada.</p>}</div>
    <div className="section-heading mt-8"><h2>Cicatrizes do Fluxo</h2><Button size="sm" onClick={()=>setScar({name:'',description:'',benefit:'',scarType:'Física'})}><Plus/> Nova cicatriz</Button></div>
    <p className="muted-copy text-xs mb-3">O Mestre concede uma Cicatriz quando o Herdeiro ultrapassa os próprios limites. Toda cicatriz traz um efeito positivo e um limite ou risco.</p>
    {scar&&<div className="field-stack mb-4"><Field label="TIPO"><select value={scar.scarType} onChange={e=>setScar({...scar,scarType:e.target.value})}>{['Física','Mental','Espiritual','Existencial'].map(t=><option key={t}>{t}</option>)}</select></Field><Field label="NOME"><input value={scar.name} onChange={e=>setScar({...scar,name:e.target.value})}/></Field><Field label="BENEFÍCIO"><input value={scar.benefit} onChange={e=>setScar({...scar,benefit:e.target.value})}/></Field><Field label="LIMITE / RISCO"><textarea value={scar.description} onChange={e=>setScar({...scar,description:e.target.value})}/></Field><Button disabled={!scar.name.trim()} onClick={()=>{update({abilities:[...character.abilities,{kind:'scar',...scar}]});setScar(null)}}>Salvar cicatriz</Button></div>}
    <div className="item-list">{character.abilities.map((a,i)=>a.kind==='scar'?<div className="editable-row" key={i}><strong>{a.scarType} · {a.name}</strong><p>Benefício: {a.benefit}</p><p>Limite / risco: {a.description}</p><Button size="icon" variant="ghost" title="Excluir cicatriz" aria-label="Excluir cicatriz" onClick={()=>update({abilities:character.abilities.filter((_,j)=>j!==i)})}><Trash2/></Button></div>:null)}</div>
  </div>;
}

/** Ação rápida: Absorver PF. d20 = Espírito; cada dado convertido individualmente; + Espírito no total. */
export function AbsorbPfAction({ character, update, addRoll, tablemates = [], onShare }: { character: Character; update: Update; addRoll: AddRoll; tablemates?: Character[]; onShare?: (toId: string) => Promise<{ error: string | null; amount: number }> }) {
  const [res, setRes] = useState<ReturnType<typeof absorbPf> | null>(null);
  const [open, setOpen] = useState(false);
  const [choice,setChoice]=useState<'Partilhar'|'Manter'>('Manter');
  const [target,setTarget]=useState('');
  const [dt,setDt]=useState(10);
  const [outcome,setOutcome]=useState('');
  const state=sheetState(character);
  const [busy,setBusy]=useState(false);
  /** Alvos elegíveis: mesma mesa (tablemates) e 2 ou mais de Elo, identificados pelo começo do nome. */
  const eligible=tablemates.filter(t=>t.id!==character.id&&syncLevelWith(character,t)>=SHARE_MIN_SYNC);
  const chosen=eligible.find(t=>t.id===target)??eligible[0]??null;
  const shareBlock=(state.standard?pfShareBlock(character,null,true):null)
    ??(!tablemates.length?'Nenhum outro personagem na sua mesa.'
    :!eligible.length?'Ninguém da mesa tem 2 ou mais de Elo com você. Registre o Elo pelo começo do nome do personagem (ex.: "Ego").'
    :pfShareBlock(character,chosen,true));
  return <>
    <Button variant="outline" onClick={() => {
      const r = absorbPf(character.espirito); setRes(r); setOpen(true); setOutcome('');
       const capacity=character.espirito*20;
       update({ pf_current: Math.min(capacity, character.pf_current + r.total), abilities: withSheetState(character,{excess:Math.max(0,character.pf_current+r.total-capacity),rounds:0}) });
      addRoll({ expression: `${r.count}d20 (soma ${r.sum}, maior ${r.highest}) + ${r.espirito}`, dice: r.dice, modifier: r.espirito, total: r.total, source: `${absorbActionLabel(character.lineage)}${r.crit ? ' — CRÍTICO' : ''}`, crit: r.crit });
    }} className={isTechAgent(character.lineage)?"action-nucleo-power":"action-flux"}><Sparkles /> {absorbActionLabel(character.lineage)}</Button>
    {open && res && <div className="game-panel flux-result" style={{ gridColumn: '1 / -1' }}>
      <div className="panel-head"><h3>{absorbActionLabel(character.lineage)} · {res.count}d20 ({isTechAgent(character.lineage)?"Tecnologia":"Espírito"} {res.espirito})</h3><Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Fechar</Button></div>
      <p className="text-sm">Dados: <strong>{res.dice.join(' + ')}</strong> = soma <strong>{res.sum}</strong></p>
      <p className="text-sm mt-2">Maior dado: <strong>{res.highest}</strong> → faixa <strong>{res.band}</strong>{res.crit ? ' · CRÍTICO!' : ''}</p>
      <p className="text-sm mt-2">Aplicado à soma inteira: <strong>{res.diceTotal} PF</strong></p>
      <p className="text-sm mt-3">PF dos dados: <strong>{res.diceTotal}</strong> + Espírito: <strong>{res.espirito}</strong> = <strong>{res.total} PF absorvidos</strong>{res.crit ? ' · houve crítico (20)' : ''}</p>
       <p className="muted-copy text-xs mt-1">PF atual limitado a {character.espirito*20} (Espírito × 20). Excedente: {state.excess} PF.</p>
    </div>}
    {state.excess>0&&<div className="game-panel flux-result col-span-full"><strong>{state.excess} PF excedentes {state.rounds>0?`· ${state.rounds} rodadas restantes`:''}</strong><div className="flex items-center gap-2 flex-wrap mt-2"><span className="field-kicker">AÇÃO PADRÃO: {state.standard?'GASTA':'DISPONÍVEL'}</span>{state.standard&&<Button size="sm" variant="ghost" onClick={()=>update({abilities:withSheetState(character,{standard:false})})}>Renovar Ação Padrão</Button>}</div><div className="field-stack mt-3"><Field label="DESTINO"><select value={choice} onChange={e=>setChoice(e.target.value as 'Partilhar'|'Manter')}><option>Manter</option><option>Partilhar</option></select></Field>{choice==='Partilhar'?<><Field label="ALVO (ELO 2 OU MAIS, MESMA MESA)"><select value={chosen?.id??''} onChange={e=>setTarget(e.target.value)} disabled={!eligible.length}>{!eligible.length&&<option value="">Nenhum alvo elegível</option>}{eligible.map(t=><option key={t.id} value={t.id}>{t.name} · Elo {syncLevelWith(character,t)}</option>)}</select></Field>{shareBlock&&<p className="empty-copy">{shareBlock}</p>}<Button disabled={!!shareBlock||busy||!chosen||!onShare} onClick={async()=>{if(!chosen||!onShare||busy)return;setBusy(true);const r=await onShare(chosen.id);setBusy(false);setOutcome(r.error??`Você transferiu ${r.amount} PF para ${chosen.name}. A Ação Padrão foi gasta.`)}}>{busy?'Transferindo...':'Partilhar PF (Ação Padrão)'}</Button></>:<><Button onClick={()=>{const rounds=rollDice(1,4)[0]??1;update({abilities:withSheetState(character,{rounds})});setOutcome(`${rounds} rodadas para usar ou desperdiçar os PF excedentes.`)}}><Dices/> Rolar 1d4 rodadas</Button><Button disabled={!state.rounds} onClick={()=>{setOutcome(`Expele ${state.excess} PF. Ação padrão: efeito positivo ou negativo a critério do Mestre.`);update({abilities:withSheetState(character,{excess:0,rounds:0})})}}>Expelir Fluxo</Button><Stepper label="DT DO MESTRE" value={dt} min={1} max={40} onChange={setDt}/><Button disabled={!state.rounds||!character.nomenclatures.length} onClick={()=>{const dice=rollDice(1,dieFor(character.espirito)??4);const success=(dice[0]??0)>=dt;setOutcome(`Teste de Espírito ${dice[0]} vs DT ${dt}: ${success?'PF somados à Nomenclatura':'falha; PF gastos sem efeito'}.`);update({abilities:withSheetState(character,{excess:0,rounds:0})})}}>Somar à Nomenclatura</Button></>}</div></div>}
    {outcome&&<p role="status" className="auth-message col-span-full">{outcome}</p>}
  </>;
}

/**
 * Agonia (Cap. IX): 0 PV (automático) ou quando o Mestre manda. DT inicial 6, que cai com a boa narração.
 * Três tentativas: 1ª sozinho · 2ª com socorro de UM aliado · 3ª escolha final (tentar sair ou Nomenclatura do Sacrifício). Três falhas = Morte Definitiva.
 */
export function AgonyPanel({ character, update, addRoll, isMaster }: { character: Character; update: Update; addRoll: AddRoll; isMaster: boolean }) {
  const [dt, setDt] = useState(6);
  const [attr, setAttr] = useState<'corpo' | 'espirito' | 'mente'>('corpo');
  const [allyDie, setAllyDie] = useState(6);
  const [last, setLast] = useState<{ roll: number; die: number; dt: number; success: boolean; died: boolean } | null>(null);
  const a = agonyStatus(character);
  const apply = (next: Character) => update({ abilities: next.abilities, pv_current: next.pv_current });
  useEffect(() => { if (a.active) setLast(prev => prev?.success ? null : prev); }, [a.active]);
  useEffect(() => { if (!a.active && !a.dead) setDt(6); }, [a.active, a.dead]);
  if (!a.active && !a.dead) {
    const survived = last?.success;
    if (!isMaster && !survived) return null;
    return <div className="agony-idle">
      {survived && last && <div className="combat-banner banner-hit agony-survived" role="status">
        <strong>PASSOU NO TESTE DE AGONIA</strong>
        <span>Resultado {last.roll} (1d{last.die}) contra DT {last.dt}. Voltou à vida com 1 PV.</span>
        <Button size="sm" variant="ghost" onClick={() => setLast(null)}>Fechar</Button>
      </div>}
      {isMaster && <Button size="sm" variant="outline" className="action-agony" onClick={() => { setLast(null); apply(agonyEnter(character)); }}><Skull /> Entrar em Agonia</Button>}
    </div>;
  }
  const attempt = Math.min(AGONY_MAX_FAILURES, a.failures + 1);
  const die = attempt === 2 ? allyDie : dieFor(character[attr]) ?? 4;
  const rollTest = () => {
    const roll = rollDice(1, die)[0]!; const success = roll >= dt;
    const after = success ? agonyLeave(character) : agonyFailure(character);
    const died = !success && agonyStatus(after).dead;
    apply(after);
    setLast({ roll, die, dt, success, died });
    addRoll({ expression: `1d${die}`, dice: [roll], modifier: 0, total: roll, source: `Teste de Agonia (tentativa ${attempt}, DT ${dt}) — ${success ? 'sucesso, volta com 1 PV' : died ? 'falha, MORTE' : 'falha'}` });
  };
  const attemptText = attempt === 1 ? '1ª tentativa: sozinho. Escolha como quer sair (Corpo: forçar o corpo a se levantar · Mente: lembrar de algo que dá forças · Espírito: explodir todo o Fluxo restante de uma vez).'
    : attempt === 2 ? '2ª tentativa: socorro de UM aliado. Ele narra o que faz e testa com o atributo que a narração pedir (informe o dado dele). O Mestre mantém ou reduz a DT; as reduções conquistadas passam para o próximo teste mesmo que falhe.'
    : '3ª tentativa: a escolha final. Tente sair narrando o que sente (outra pessoa pode auxiliar narrando para baixar a DT) ou faça a Nomenclatura do Sacrifício e deixe a morte vir com propósito.';
  return <section className={`agony-panel${a.dead ? ' agony-dead' : ''}`} aria-live="polite">
    <div className="agony-head">
      <div className="agony-title"><span className="field-kicker">{a.dead ? 'MORTE DEFINITIVA' : `AGONIA · TENTATIVA ${attempt} DE ${AGONY_MAX_FAILURES}`}</span><strong>{a.dead ? '☠ O personagem morreu' : 'Em Agonia'}</strong></div>
      <div className="agony-marks" role="img" aria-label={`${a.failures} de ${AGONY_MAX_FAILURES} falhas no teste de Agonia`}>
        {Array.from({ length: AGONY_MAX_FAILURES }, (_, i) => <span key={i} className={`agony-mark${i < a.failures ? ' filled' : ''}`} />)}
      </div>
    </div>
    <p className="muted-copy">{a.dead ? `${AGONY_MAX_FAILURES} falhas no teste de Agonia: a vida se encerra e vem a Morte Definitiva.` : attemptText}</p>
    {!a.dead && <div className="gaki-grid">
      {attempt === 2
        ? <Field label="DADO DO ALIADO (ATRIBUTO DA NARRAÇÃO)"><select value={allyDie} onChange={e => setAllyDie(Number(e.target.value))}>{[4, 6, 8, 10, 12].map(d => <option key={d} value={d}>d{d}</option>)}</select></Field>
        : <Field label="COMO SAI DA AGONIA (ATRIBUTO)"><select value={attr} onChange={e => setAttr(e.target.value as 'corpo' | 'espirito' | 'mente')}><option value="corpo">{attrLabelFor('corpo', character.lineage)} · 1d{dieFor(character.corpo) ?? 4}</option><option value="espirito">{attrLabelFor('espirito', character.lineage)} · 1d{dieFor(character.espirito) ?? 4}</option><option value="mente">{attrLabelFor('mente', character.lineage)} · 1d{dieFor(character.mente) ?? 4}</option></select></Field>}
      <Stepper label="DT (COMEÇA EM 6; CAI COM A NARRAÇÃO)" value={dt} min={1} max={20} onChange={setDt} />
      <Button variant="outline" className="action-agony" onClick={rollTest}><Dices /> Rolar teste de Agonia (1d{die} vs DT {dt})</Button>
      {attempt === 3 && <Button variant="outline" className="action-agony" onClick={() => { if (confirm('Nomenclatura do Sacrifício: sucesso garantido, mas termina em Morte Definitiva. Confirmar?')) { apply(agonySacrifice(character)); addRoll({ expression: 'Sacrifício', dice: [], modifier: 0, total: 0, source: 'Nomenclatura do Sacrifício — Morte Definitiva com propósito' }); } }}><Skull /> Nomenclatura do Sacrifício</Button>}
    </div>}
    {last && !last.success && <div className="combat-banner banner-miss">
      <strong>{last.died ? 'FALHA — TERCEIRA TENTATIVA: MORTE' : 'FALHA — MARCAÇÃO PREENCHIDA'}</strong>
      <span>Resultado {last.roll} (1d{last.die}) contra DT {last.dt}. {last.died ? '' : 'A DT que a narração já reduziu continua para o próximo teste.'}</span>
    </div>}
    {isMaster && <div className="agony-master">
      <span className="field-kicker">MESTRE</span>
      <div className="agony-master-actions">
        <Button size="sm" variant="outline" className="action-agony" disabled={a.dead} onClick={() => apply(agonyFailure(character))}>+ Falha</Button>
        <Button size="sm" variant="outline" disabled={!a.failures && !a.dead} onClick={() => apply(agonyUndo(character))}>− Falha (desfazer)</Button>
        {!a.dead && <Button size="sm" variant="ghost" onClick={() => apply(agonyLeave(character))}>Sair da Agonia</Button>}
      </div>
      {!a.dead && <small className="muted-copy">Ao sair da Agonia (teste ou botão), o personagem sempre volta com 1 PV e as marcações zeram. Se morrer com Karma alto (acima de 50%), o Mestre decide se desperta como Gaki Irracional.</small>}
    </div>}
  </section>;
}
