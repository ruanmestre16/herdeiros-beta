import { useState } from 'react';
import { Activity, Dices, Plus, Sparkles, Swords, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Meter, SectionHeading, Stepper } from './Controls';
import {
  derived, dieFor, rollDice, initiativeRoll, karmaMaximum, karmaStage, isTechAgent, attrLabelFor, nomenclatureLabel, resourceBarLabel, resourceStageLabel, forceActionLabel,
  splitStory, joinStory, stageIndexFor, LINEAGE_STAGES, type Character,
} from '@/lib/game';
import { SyncEditor, GakiPassive, WeaponPanel, NomenclaturesTab, AbilitiesTab, AbsorbPfAction, KarmaTest, AgonyPanel, hasAnchor, ANCHOR_NAME, type RollEntry } from './SheetExtras';
import { isMonster } from './npcSheet';
import { threatTier, type MonsterSheet } from './NewNpcDialog';

const TABS = ['Geral', 'Nomenclaturas', 'Habilidades', 'Inventário', 'História'] as const;
type Tab = (typeof TABS)[number];

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (s: string) => void; placeholder?: string }) { return <label className="field"><span className="field-label">{label}</span><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></label>; }
function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) { return <section className={`game-panel ${className}`}><div className="panel-head"><h3>{title}</h3></div>{children}</section>; }

/** Ficha completa de um NPC: tudo o que a ficha de jogador tem (Geral, Nomenclaturas, Habilidades, Inventário, História). */
export function NpcFullSheet({ character, update, addRoll, setInitiative }: { character: Character; update: (p: Partial<Character>) => void; addRoll: (e: RollEntry) => void; setInitiative: (n: number) => void }) {
  const [tab, setTab] = useState<Tab>('Geral');
  const monster = isMonster(character);
  const gaki = (character as MonsterSheet).gaki;
  const kMax = karmaMaximum(character.mente, character.espirito);
  const stage = karmaStage(character.karma, kMax);
  const test = (attr: 'corpo' | 'mente' | 'espirito') => { const die = dieFor(character[attr]); if (die === undefined) return; const v = rollDice(1, die)[0]; if (v === undefined) return; addRoll({ expression: `1d${die}`, dice: [v], modifier: 0, total: v, source: `Teste de ${attrLabelFor(attr, character.lineage)}: ${character.name}` }); };
  const karmaBox = monster
    ? <div className="karma-alert karma-gaki"><strong>GAKI · {gaki?.style.toUpperCase()}</strong><span>Ameaça {gaki?.threat} ({gaki ? threatTier(gaki.threat) : ''}) · Karma ∞</span></div>
    : <div className={`karma-alert karma-${stage}${isTechAgent(character.lineage) ? ` nucleo-${stage}` : ''}`}><strong>{resourceStageLabel(character.lineage, stage)}</strong><span>{Math.round(character.karma / kMax * 100)}% · limite {kMax}</span></div>;

  return <div className="field-stack mt-4">
    {!monster && <div className="overview-strip"><Meter label="PONTOS DE VIDA" current={character.pv_current} max={character.pv_max} tone="health" /><Meter label="PONTOS DE FLUXO" current={character.pf_current} max={character.pf_max} tone="flux" /><Meter label={resourceBarLabel(character.lineage)} current={character.karma} max={kMax} tone={isTechAgent(character.lineage) ? 'nucleo' : 'karma'} /></div>}
    {monster && <div className="overview-strip"><Meter label="PONTOS DE VIDA" current={character.pv_current} max={character.pv_max} tone="health" /><Meter label="PONTOS DE FLUXO" current={character.pf_current} max={character.pf_max} tone="flux" /></div>}
    <AgonyPanel character={character} update={update} addRoll={addRoll} isMaster={true} />
    <div className="tabbar" role="tablist">{TABS.map(t => <Button key={t} role="tab" aria-selected={tab === t} variant="ghost" onClick={() => setTab(t)} className={`tab ${tab === t ? 'tab-active' : ''}`}>{t === 'Nomenclaturas' ? nomenclatureLabel(character.lineage, true) : t}</Button>)}</div>

    {tab === 'Geral' && <div className="two-col"><div className="stack">
      <Panel title="Identidade"><div className="field-stack">
        <TextInput label="Nome" value={character.name} onChange={name => update({ name })} />
        <div className="input-grid">
          <label className="field"><span className="field-label">Linhagem</span><select value={character.lineage} onChange={e => update({ lineage: e.target.value, stage: LINEAGE_STAGES[e.target.value]?.[0]?.name ?? '' })}>{['Humano', 'Arcadiano', 'Gaki', 'Agente Tecnológico'].map(x => <option key={x}>{x}</option>)}</select></label>
          <label className="field"><span className="field-label">Caminho / Estágio</span><select value={(LINEAGE_STAGES[character.lineage] ?? [])[stageIndexFor(character.lineage, character.stage)]?.name ?? ''} onChange={e => update({ stage: e.target.value })}>{(LINEAGE_STAGES[character.lineage] ?? []).map((s, i) => <option key={s.name} value={s.name}>{i + 1}. {s.name}</option>)}</select></label>
        </div>
        <TextInput label="Conceito" value={character.concept} onChange={concept => update({ concept })} placeholder="Quem é este personagem?" />
        <TextInput label="Modelo de arma" value={character.weapon} onChange={weapon => update({ weapon })} placeholder="Arma de vínculo, relíquia..." />
        <Stepper label="GS (NÍVEL)" value={character.gs} min={1} onChange={gs => update({ gs })} />
        <SyncEditor character={character} update={update} />
      </div>
      {(() => { const st = (LINEAGE_STAGES[character.lineage] ?? [])[stageIndexFor(character.lineage, character.stage)]; return st ? <div className={`passive ${isTechAgent(character.lineage) ? 'passive-tech' : ''}`}><span className="field-kicker">PASSIVA DE LINHAGEM · {st.name.toUpperCase()}</span><strong>{st.passive}</strong><p>{st.desc}</p></div> : null; })()}
      {character.lineage === 'Gaki' && <GakiPassive character={character} update={update} addRoll={addRoll} />}
      <WeaponPanel character={character} update={update} addRoll={addRoll} />
      </Panel>
      <Panel title="Atributos"><div className="attributes-grid">{(['corpo', 'mente', 'espirito'] as const).map(attr => <div className="attribute" key={attr}><span>{attrLabelFor(attr, character.lineage)}</span><strong>{character[attr]}</strong><small>1d{dieFor(character[attr])}</small><Button size="sm" variant="ghost" onClick={() => test(attr)}><Dices size={13} /> Rolar</Button></div>)}</div>
        <div className="step-grid">{(['corpo', 'mente', 'espirito'] as const).map(attr => <Stepper key={attr} label={attrLabelFor(attr, character.lineage)} value={character[attr]} min={1} max={5} onChange={value => { const next = { ...character, [attr]: value }; const stats = derived(next.corpo); update({ [attr]: value, pv_max: stats.pv, pv_current: Math.min(next.pv_current, stats.pv), pf_max: next.espirito * 20, pf_current: Math.min(next.pf_current, next.espirito * 20) }); }} />)}</div>
        <div className="defense-row">{[['ESQUIVA', derived(character.corpo).esquiva], ['BLOQUEIO', derived(character.corpo).bloqueio], ['DESLOCAMENTO', `${derived(character.corpo).deslocamento}m`]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      </Panel>
    </div><div className="stack">
      <Panel title="Recursos"><div className="resource-grid">
        <Stepper label="PV ATUAL" value={character.pv_current} max={character.pv_max} tone="health" onChange={pv_current => update({ pv_current })} />
        <Stepper label="PV MÁXIMO" value={character.pv_max} tone="health" onChange={pv_max => update({ pv_max, pv_current: Math.min(character.pv_current, pv_max) })} />
        <Stepper label="PF ATUAL" value={character.pf_current} max={character.pf_max} tone="flux" onChange={pf_current => update({ pf_current })} />
        <Stepper label="PF MÁXIMO" value={character.pf_max} tone="flux" onChange={pf_max => update({ pf_max, pf_current: Math.min(character.pf_current, pf_max) })} />
        {!monster && <Stepper label={resourceBarLabel(character.lineage)} value={character.karma} max={kMax} tone={isTechAgent(character.lineage) ? 'nucleo' : 'karma'} onChange={karma => update({ karma })} />}
        <Stepper label="EXAUSTÃO" value={character.exhaustion} max={6} onChange={exhaustion => update({ exhaustion })} />
      </div>{karmaBox}</Panel>
      <Panel title="Ações rápidas"><div className="quick-actions">
        <Button variant="outline" onClick={() => { const d = rollDice(1, 20)[0]; if (d === undefined) return; addRoll({ expression: '1d20', dice: [d], modifier: 0, total: d, source: `Ataque de ${character.name}` }); }}><Swords /> Ataque d20</Button>
        <Button variant="outline" onClick={() => { const r = initiativeRoll(character.corpo); setInitiative(r.total); addRoll({ expression: `${character.corpo}d20 (maior) + ${character.corpo}`, dice: r.dice, modifier: character.corpo, total: r.total, source: `Iniciativa: ${character.name}` }); }}><Activity /> Iniciativa</Button>
        <Button variant="outline" className={isTechAgent(character.lineage) ? 'action-force-nucleo' : 'action-force-karma'} onClick={() => {
          const dice = rollDice(Math.max(1, character.espirito), 20); const total = dice.reduce((a, b) => a + b, 0); const gained = Math.floor(total / 2);
          addRoll({ expression: `${dice.length}d20`, dice, modifier: 0, total, source: `${forceActionLabel(character.lineage)}: ${character.name} (+${gained} PF)` });
          update({ pf_current: Math.min(character.pf_max, character.pf_current + gained), ...(monster ? {} : { karma: Math.min(kMax, character.karma + Math.ceil(gained / 2)) }) });
        }}><Sparkles /> {forceActionLabel(character.lineage)}</Button>
        <AbsorbPfAction character={character} update={update} addRoll={addRoll} />
      </div>{!monster && <KarmaTest character={character} addRoll={addRoll} />}</Panel>
    </div></div>}

    {tab === 'Nomenclaturas' && <NomenclaturesTab character={character} update={update} addRoll={addRoll} />}
    {tab === 'Habilidades' && <AbilitiesTab character={character} update={update} addRoll={addRoll} />}

    {tab === 'Inventário' && <div className="single-section"><SectionHeading number="03" title="Inventário" aside={<div className="flex gap-2 flex-wrap">
      {!hasAnchor(character) && <Button size="sm" variant="outline" className="action-karma" onClick={() => update({ inventory: [...character.inventory, { name: ANCHOR_NAME, quantity: 1 }] })}><Sparkles /> {ANCHOR_NAME}</Button>}
      <Button size="sm" onClick={() => update({ inventory: [...character.inventory, { name: 'Novo item', quantity: 1 }] })}><Plus /> Adicionar item</Button></div>} />
      <div className="item-list">{character.inventory.map((item, i) => <div className="inventory-row" key={i}>
        <TextInput label="ITEM" value={item.name} onChange={name => update({ inventory: character.inventory.map((n, j) => j === i ? { ...n, name } : n) })} />
        <Stepper label="QUANTIDADE" value={item.quantity} onChange={quantity => update({ inventory: character.inventory.map((n, j) => j === i ? { ...n, quantity } : n) })} />
        <Button size="icon" variant="ghost" title="Excluir item" aria-label="Excluir item" onClick={() => update({ inventory: character.inventory.filter((_, j) => j !== i) })}><Trash2 /></Button>
      </div>)}{!character.inventory.length && <p className="empty-copy">Nenhum item.</p>}</div></div>}

    {tab === 'História' && <div className="single-section"><SectionHeading number="04" title="História" />
      <label className="field"><span className="field-label">ORIGEM, CICATRIZES E MEMÓRIAS</span><textarea rows={8} value={splitStory(character.story).story} onChange={e => update({ story: joinStory(e.target.value, splitStory(character.story).notes) })} /></label>
      <div className="mt-8"><SectionHeading number="05" title="Anotações" /><label className="field"><span className="field-label">ACONTECIMENTOS, PISTAS, OBJETIVOS E NOTAS</span><textarea rows={6} value={splitStory(character.story).notes} onChange={e => update({ story: joinStory(splitStory(character.story).story, e.target.value) })} /></label></div></div>}
  </div>;
}
