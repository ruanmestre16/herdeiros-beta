import { useState } from 'react';
import { Activity, BookOpen, ChevronDown, Dices, Minus, Plus, Shield, Skull, Sparkles, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Stepper } from './Controls';
import { attackRoll, attrLabelFor, derived, dieFor, initiativeRoll, isTechAgent, rollDice, splitStory, joinStory, type Character } from '@/lib/game';
import { BESTIARY_PDF, readBestiaryAttacks } from '@/lib/bestiary';
import { parseDamageFormula, rollDamageFormula } from '@/lib/weapon-damage';
import { splitBestiaryAbilities, nucleusAsNomenclatures } from '@/lib/master-bestiary';
import { MasterAbilityCards } from './MasterAbilityCards';
import { NpcFullSheet } from './NpcFullSheet';
import { threatTier, type BestiaryMeta, type MonsterSheet } from './NewNpcDialog';
import type { RollEntry } from './SheetExtras';
import './monster-dashboard.css';

type MonsterTab = 'combate' | 'poderes' | 'dados' | 'historia';
type Attr = 'corpo' | 'mente' | 'espirito';
const tabs: {key: MonsterTab; label: string; icon: typeof Swords}[] = [
  {key:'combate',label:'Combate',icon:Swords},
  {key:'poderes',label:'Poderes',icon:Sparkles},
  {key:'dados',label:'Atributos',icon:Shield},
  {key:'historia',label:'História',icon:BookOpen},
];
const limit = (value:number, low:number, high:number)=>Math.min(high,Math.max(low,Number.isFinite(value)?value:low));

/** Ficha de sessão: os mesmos metadados e funções do NPC original, sem novas colunas no banco. */
export function MonsterDashboard({character,update,addRoll,setInitiative,notesText,onNotesChange,npcKind,onKindChange}:{
 character:Character;
 notesText?:string;
 onNotesChange?:(value:string)=>void;
 npcKind?:string;
 onKindChange?:(value:string)=>void;
 update:(patch:Partial<Character>)=>void;
 addRoll:(entry:RollEntry)=>void;
 setInitiative:(value:number)=>void;
}) {
  const [tab,setTab] = useState<MonsterTab>('combate');
  const [expandedAttack,setExpandedAttack] = useState<number|null>(null);
  const [lastResult,setLastResult] = useState('');
  const [advanced,setAdvanced] = useState(false);
  const monster = character as MonsterSheet;
  const meta=monster.bestiary;
  const tech=isTechAgent(character.lineage);
  const resource=tech?'PN':'PF';
  const defenses=derived(character.corpo);
  const attacks=meta?readBestiaryAttacks(meta.ataques):[];
  const cards=meta?.abilityCards??splitBestiaryAbilities(meta?.habilidades??'');
  const nucleus=meta?.nucleusCards??[];
  const milestone=meta?.gsCards??[];
  const saveMeta=(partial:Partial<BestiaryMeta>)=>{
    if(!meta)return;
    const next={...meta,...partial};
    update({bestiary:next,...(partial.nucleusCards?{nomenclatures:nucleusAsNomenclatures(partial.nucleusCards)}:{})} as Partial<Character>);
  };
  const rollAndShow=(r:RollEntry)=>{addRoll(r);setLastResult(`${r.source??'Rolagem'}: ${r.total}`);};
  const rollAttack=(name:string,attribute:number)=>{
    const r=attackRoll(attribute);
    rollAndShow({expression:r.expression,dice:r.dice,modifier:0,total:r.total,
      source:`${character.name} · ${name}${r.fumble?' · FALHA CRÍTICA':r.crit?' · CRÍTICO':''}`,crit:r.crit});
  };
  const rollDamage=(name:string,expression:string,critical:boolean,explicit:boolean,type:string)=>{
    const dmg=rollDamageFormula(expression,0,critical&&!explicit);
    if(dmg.expression==='Dano inválido')return;
    rollAndShow({expression:dmg.expression,dice:dmg.dice,modifier:dmg.bonus,total:dmg.total,
      source:`${character.name} · ${critical?'Crítico':'Dano'} · ${name}${type?` (${type})`:''}`,crit:critical});
  };
  const adjust=(which:'pv_current'|'pf_current', delta:number)=>{
    update({[which]:limit(character[which]+delta,0,which==='pv_current'?character.pv_max:character.pf_max)} as Partial<Character>);
  };
  const editAttack=(i:number,partial:{damage?:string;critical?:string;damageType?:string})=>{
    if(!meta)return;
    saveMeta({attackOverrides:{...meta.attackOverrides,[String(i)]:{...meta.attackOverrides?.[String(i)],...partial}}});
  };
  const rollAttr=(key:Attr)=>{
    const sides=dieFor(character[key]);
    if(!sides)return;
    const dice=rollDice(1,sides);
    rollAndShow({expression:`1d${sides}`,dice,modifier:0,total:dice[0]??0,source:`${character.name} · ${attrLabelFor(key,character.lineage)}`});
  };
  const rollInitiative=()=>{
    const r=initiativeRoll(character.corpo);setInitiative(r.total);
    rollAndShow({expression:`${character.corpo}d20 (maior) + ${character.corpo}`,dice:r.dice,modifier:character.corpo,total:r.total,source:`Iniciativa · ${character.name}`});
  };
  const lore=splitStory(character.story);

  return <section className="hm-monster" aria-label={`Ficha interativa de ${character.name}`}>
    <header className="hm-monster-top">
      <div>
        <span className="hm-monster-kicker"><Skull size={15}/> FICHA DE MONSTRO · MESA VIVA</span>
        <h3>{character.name}</h3>
        <div className="hm-monster-chips"><span>{meta?.category??`Gaki · ${monster.gaki?.style??'Criatura'}`}</span>
          <span>NA {meta?.threat??monster.gaki?.threat??'—'} · {threatTier(meta?.threat??monster.gaki?.threat??1)}</span>
          {!!meta?.mkPreset&&<span>{meta.mkPreset.edition==='campanha'?'MK reforçado':'Versão do livro'}</span>}</div>
      </div>
      {!!meta?.pdfPage&&<a className="hm-monster-reference" href={`${BESTIARY_PDF}#page=${meta.pdfPage}`} target="_blank" rel="noreferrer"><BookOpen size={16}/> Livro · p. {meta.pdfPage}</a>}
    </header>

    <div className="hm-monster-resources">
      {([{key:'pv_current',label:'Pontos de Vida',current:character.pv_current,max:character.pv_max,tone:'life'},
        {key:'pf_current',label:`Energia · ${resource}`,current:character.pf_current,max:character.pf_max,tone:'energy'}] as const).map(r=><div key={r.key} className={`hm-monster-resource hm-monster-${r.tone}`}>
        <div className="hm-monster-resource-head"><span>{r.label}</span><strong>{r.current}<small> / {r.max}</small></strong></div>
        <div className="hm-monster-meter" role="progressbar" aria-label={r.label} aria-valuenow={r.current} aria-valuemin={0} aria-valuemax={Math.max(1,r.max)}><span style={{width:`${r.max>0?limit(r.current/r.max*100,0,100):0}%`}} /></div>
        <div className="hm-monster-adjust">
          <button type="button" aria-label={`Reduzir 5 de ${r.label}`} disabled={r.current<=0} onClick={()=>adjust(r.key,-5)}>−5</button>
          <button type="button" aria-label={`Reduzir 1 de ${r.label}`} disabled={r.current<=0} onClick={()=>adjust(r.key,-1)}><Minus size={16}/></button>
          <button type="button" aria-label={`Aumentar 1 de ${r.label}`} disabled={r.current>=r.max} onClick={()=>adjust(r.key,1)}><Plus size={16}/></button>
          <button type="button" aria-label={`Aumentar 5 de ${r.label}`} disabled={r.current>=r.max} onClick={()=>adjust(r.key,5)}>+5</button>
        </div>
      </div>)}
    </div>
    <div className="hm-monster-defense" aria-label="Defesas e movimento">
      <div><span>ESQUIVA</span><strong>{meta?.esquiva??defenses.esquiva}</strong></div>
      <div><span>BLOQUEIO</span><strong>{meta?.bloqueio??defenses.bloqueio}</strong></div>
      <div><span>DESLOCAMENTO</span><strong>{meta?.deslocamento??`${defenses.deslocamento} m`}</strong></div>
    </div>

    <nav className="hm-monster-nav" aria-label="Seções do monstro">
      {tabs.map(t=><button key={t.key} type="button" aria-current={tab===t.key?'page':undefined} onClick={()=>setTab(t.key)}><t.icon size={17}/>{t.label}</button>)}
    </nav>
    {!!lastResult&&<div className="hm-monster-result" role="status"><Dices size={15}/><span>{lastResult}</span><button type="button" onClick={()=>setLastResult('')} aria-label="Dispensar resultado">×</button></div>}

    {tab==='combate'&&<div className="hm-monster-content">
      <div className="hm-monster-heading"><div><span>EXECUÇÃO RÁPIDA</span><h4>Ataques e rolagens</h4></div><Button variant="outline" size="sm" onClick={rollInitiative}><Activity size={16}/> Iniciativa</Button></div>
      {attacks.length?<div className="hm-monster-attacks">{attacks.map((a,i)=>{
        const over=meta?.attackOverrides?.[String(i)];
        const damage=over?.damage||a.damage;
        const explicitCritical=over?.critical||(!over?.damage?a.critical:'');
        const invalidDamage=!!damage&&!parseDamageFormula(damage);
        const canDamage=!!damage&&!invalidDamage;
        const type=over?.damageType??'';
        return <article className="hm-monster-attack" key={`${i}-${a.name}`}>
          <div className="hm-monster-attack-header"><div><span>ATAQUE {i+1}</span><h5>{a.name}</h5><small>Acerto: {a.hit||`1d20 + dado`}</small></div>
            <button className="hm-monster-inline" type="button" onClick={()=>setExpandedAttack(v=>v===i?null:i)} aria-expanded={expandedAttack===i}>Editar <ChevronDown size={16}/></button></div>
          <div className="hm-monster-roll-grid">
            <button type="button" onClick={()=>rollAttack(a.name,a.attribute)}><Swords size={17}/><span>Acerto</span><small>{a.hit||'Rolar'}</small></button>
            <button type="button" disabled={!canDamage} onClick={()=>rollDamage(a.name,damage,false,false,type)}><Dices size={17}/><span>Dano</span><small>{damage||'Ver livro'}</small></button>
            <button type="button" disabled={!canDamage||!!explicitCritical&&!parseDamageFormula(explicitCritical)} onClick={()=>rollDamage(a.name,explicitCritical||damage,true,!!explicitCritical,type)}><Sparkles size={17}/><span>Crítico</span><small>{explicitCritical||'Dados × 2'}</small></button>
          </div>
          {expandedAttack===i&&<div className="hm-monster-attack-edit">
            <label className="field"><span className="field-label">DANO PERSONALIZADO</span><input value={over?.damage??a.damage} onChange={e=>editAttack(i,{damage:e.target.value})} placeholder="Ex.: 1d10 + 1d6 + 3" /></label>
            <label className="field"><span className="field-label">CRÍTICO ESPECIAL (OPCIONAL)</span><input value={over?.critical??(!over?.damage?a.critical:'')} onChange={e=>editAttack(i,{critical:e.target.value})} placeholder="Vazio = dobrar os dados" /></label>
            <label className="field"><span className="field-label">TIPO DE DANO</span><input value={type} onChange={e=>editAttack(i,{damageType:e.target.value})} placeholder="Ex.: Elétrico, Karma, Cortante" /></label>
            {invalidDamage&&<p className="hm-monster-warning">Fórmula inválida. Use 1d8, 2d6 + 3 ou 1d10 + 1d6.</p>}
            <div className="hm-monster-edit-actions"><Button variant="ghost" size="sm" onClick={()=>editAttack(i,{damage:'',critical:'',damageType:''})}>Restaurar dados do livro</Button><small>Editar aqui não altera o modelo original do Bestiário.</small></div>
          </div>}
        </article>;
      })}</div>:<div className="hm-monster-empty"><p>Este monstro não tem uma fórmula de ataque reconhecida automaticamente.</p><Button variant="outline" size="sm" onClick={()=>setTab('dados')}>Ver atributos e detalhes</Button></div>}
      {!!meta?.dt&&<details className="hm-monster-detail"><summary><Shield size={16}/> DTs e resistências <ChevronDown size={16}/></summary><p>{meta.dt}</p></details>}
      {!!meta?.ataques&&<details className="hm-monster-detail"><summary><BookOpen size={16}/> Texto original dos ataques <ChevronDown size={16}/></summary><p>{meta.ataques}</p></details>}
      <p className="hm-monster-footnote">Rolagens enviadas ao histórico da Mesa. Dano é rolado separadamente do acerto; o Mestre aplica o dano ao alvo.</p>
    </div>}

    {tab==='poderes'&&<div className="hm-monster-content hm-monster-powers">
      <div className="hm-monster-heading"><div><span>BESTIÁRIO VIVO</span><h4>Habilidades e protocolos</h4></div></div>
      {meta ? <MasterAbilityCards title="Habilidades da criatura" abilities={cards.filter(c=>c.type!=='nucleo')} onChange={next=>saveMeta({abilityCards:[...next,...cards.filter(c=>c.type==='nucleo')]})}/> : <p className="hm-monster-footnote">Ficha antiga sem metadados de Bestiário. Abra a ficha detalhada para editar habilidades.</p>}
      {cards.some(c=>c.type==='nucleo')&&<MasterAbilityCards title="Poderes tecnológicos" abilities={cards.filter(c=>c.type==='nucleo')} type="nucleo" onChange={next=>saveMeta({abilityCards:[...cards.filter(c=>c.type!=='nucleo'),...next]})}/>}
      {nucleus.length>0&&<MasterAbilityCards title="Ativações de Núcleo" abilities={nucleus} type="nucleo" onChange={nucleusCards=>saveMeta({nucleusCards})}/>}
      {milestone.length>0&&<MasterAbilityCards title="Evoluções de GS" abilities={milestone} type="gs" onChange={gsCards=>saveMeta({gsCards})}/>}
      {!!meta?.habilidades&&<details className="hm-monster-detail"><summary><BookOpen size={16}/> Consultar texto original <ChevronDown size={16}/></summary><p>{meta.habilidades}</p></details>}
    </div>}

    {tab==='dados'&&<div className="hm-monster-content">
      <div className="hm-monster-heading"><div><span>AJUSTAR NA MESA</span><h4>Atributos e defesas</h4></div></div>
      <div className="hm-monster-attributes">{(['corpo','mente','espirito'] as Attr[]).map(a=><div key={a} className="hm-monster-attribute"><span>{attrLabelFor(a,character.lineage)}</span><strong>{character[a]}</strong><small>d{dieFor(character[a])}</small><Button size="sm" variant="outline" onClick={()=>rollAttr(a)}><Dices size={15}/> Rolar</Button><Stepper label="Ajustar" value={character[a]} min={1} max={12} onChange={v=>update({[a]:v} as Partial<Character>)}/></div>)}</div>
      <div className="hm-monster-edit-grid">
        <Stepper label="PV MÁXIMO" value={character.pv_max} min={1} max={9999} onChange={pv_max=>update({pv_max,pv_current:Math.min(pv_max,character.pv_current)})}/>
        <Stepper label={`${resource} MÁXIMO`} value={character.pf_max} min={0} max={9999} onChange={pf_max=>update({pf_max,pf_current:Math.min(pf_max,character.pf_current)})}/>
        {!!meta&&<><Stepper label="ESQUIVA" value={meta.esquiva} min={0} max={99} onChange={esquiva=>saveMeta({esquiva})}/><Stepper label="BLOQUEIO" value={meta.bloqueio} min={0} max={99} onChange={bloqueio=>saveMeta({bloqueio})}/>
          <Stepper label="NÍVEL DE AMEAÇA" value={meta.threat} min={1} max={99} onChange={threat=>saveMeta({threat})}/></>}
      </div>
      {npcKind!==undefined&&onKindChange&&<label className="field"><span className="field-label">TIPO NA MESA</span><select value={npcKind} onChange={e=>onKindChange(e.target.value)}><option value="inimigo">Inimigo</option><option value="npc">NPC</option></select></label>}
      {!!meta&&<div className="hm-monster-edit-grid">
        <label className="field"><span className="field-label">CATEGORIA</span><input value={meta.category} onChange={e=>saveMeta({category:e.target.value})}/></label>
        <label className="field"><span className="field-label">DESLOCAMENTO</span><input value={meta.deslocamento} onChange={e=>saveMeta({deslocamento:e.target.value})}/></label>
        <label className="field"><span className="field-label">DTs / TESTES</span><textarea rows={3} value={meta.dt} onChange={e=>saveMeta({dt:e.target.value})}/></label>
      </div>}
      {!!meta&&<details className="hm-monster-detail"><summary>Editar texto bruto de ataques <ChevronDown size={16}/></summary><label className="field"><span className="field-label">ATAQUES DO BESTIÁRIO</span><textarea rows={6} value={meta.ataques} onChange={e=>saveMeta({ataques:e.target.value})}/></label><small>Ao alterar este texto, os cartões de ataques são reconstruídos; confira os modificadores personalizados.</small></details>}
      <section className="hm-monster-advanced"><button type="button" aria-expanded={advanced} onClick={()=>setAdvanced(v=>!v)}><BookOpen size={16}/> {advanced?'Fechar edição completa':'Mais opções · ficha detalhada'} <ChevronDown size={17}/></button>
        {advanced&&<NpcFullSheet character={character} update={update} addRoll={addRoll} setInitiative={setInitiative}/>}
      </section>
    </div>}

    {tab==='historia'&&<div className="hm-monster-content">
      <div className="hm-monster-heading"><div><span>CONTEXTO NARRATIVO</span><h4>História e observações</h4></div></div>
      <label className="field"><span className="field-label">DESCRIÇÃO DA CRIATURA</span><textarea rows={4} value={character.concept} onChange={e=>update({concept:e.target.value})} placeholder="Aparência, comportamento, origem..."/></label>
      {!!meta&&<label className="field"><span className="field-label">ANOTAÇÕES DO MESTRE</span><textarea rows={4} value={meta.observacoes} onChange={e=>saveMeta({observacoes:e.target.value})} placeholder="Tática, segredos, gatilhos, relações..."/></label>}
      {onNotesChange&&<label className="field"><span className="field-label">OBSERVAÇÕES RÁPIDAS DA MESA</span><textarea rows={3} value={notesText??''} onChange={e=>onNotesChange(e.target.value)} placeholder="Anotações associadas a este NPC..."/></label>}
      <label className="field"><span className="field-label">CRÔNICA</span><textarea rows={4} value={lore.story} onChange={e=>update({story:joinStory(e.target.value,lore.notes)})}/></label>
      <label className="field"><span className="field-label">NOTAS DE SESSÃO</span><textarea rows={3} value={lore.notes} onChange={e=>update({story:joinStory(lore.story,e.target.value)})}/></label>
      {!!meta?.pdfPage&&<a href={`${BESTIARY_PDF}#page=${meta.pdfPage}`} className="hm-monster-reference" target="_blank" rel="noreferrer"><BookOpen size={16}/> Abrir referência original do monstro</a>}
    </div>}
  </section>;
}
