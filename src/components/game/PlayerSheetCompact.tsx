import { useState } from 'react';
import { BookOpen, Brain, ChevronRight, Dices, HeartPulse, ScrollText, Shield, Sparkles, Swords, UserRound, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Stepper, Meter } from './Controls';
import { attrLabelFor, attributeInfo, derived, dieFor, isTechAgent, karmaMaximum, LINEAGE_STAGES, nomenclatureLabel, splitStory, joinStory, stageIndexFor, weaponDiceFor, weaponAttrFor, type Character } from '@/lib/game';
import './sheet-redesign.css';

type Section = 'Resumo' | 'Identidade' | 'Atributos' | 'Recursos';
type SectionTab = 'Nomenclaturas' | 'Habilidades' | 'Inventário' | 'História';
const buttons: {id:Section, icon:typeof UserRound}[] = [
 { id:'Resumo',icon:UserRound }, {id:'Identidade',icon:ScrollText},{id:'Atributos',icon:Brain},{id:'Recursos',icon:HeartPulse},
];
const lineages = [{value:'Humano',label:'Humano · padrão'},{value:'Agente Tecnológico',label:'Humano · Agente Tecnológico'},{value:'Arcadiano',label:'Arcadiano'},{value:'Gaki',label:'Gaki'}];

export function PlayerSheetCompact({ character:c, onUpdate, onOpenDetail, onTab, onRoll, notice }: {
 character:Character;
 onUpdate:(p:Partial<Character>)=>void;
 onOpenDetail:()=>void;
 onTab:(tab:SectionTab)=>void;
 onRoll:(expression:string,source?:string)=>unknown;
 notice?:string;
}) {
 const [section,setSection]=useState<Section>('Resumo');
 const tech=isTechAgent(c.lineage);
 const derivedStats=derived(c.corpo);
 const attr=attributeInfo(c);
 const stage=LINEAGE_STAGES[c.lineage]?.[stageIndexFor(c.lineage,c.stage)];
 const fullName=c.lineage==='Agente Tecnológico'?'Humano · Agente Tecnológico':c.lineage;
 const resource=tech?'PN':'PF';
 const karmaLimit=karmaMaximum(c.mente,c.espirito);
 const abilityLabel=nomenclatureLabel(c.lineage,true);
 const asset=weaponDiceFor(c) || '—';
 function changeAttr(key:'corpo'|'mente'|'espirito', value:number) {
   const next={...c,[key]:value};
   const stats=derived(next.corpo);
   onUpdate({[key]:value,pv_max:stats.pv,pv_current:Math.min(c.pv_current,stats.pv),pf_max:next.espirito*20,pf_current:Math.min(c.pf_current,next.espirito*20)});
 }
 return <div className="h-sheet-compact">
   <nav className="h-sheet-compact-nav" aria-label="Seções da ficha">{buttons.map(({id,icon:Icon})=><button key={id} type="button" className={section===id?'active':''} aria-pressed={section===id} onClick={()=>setSection(id)}><Icon size={17}/>{id}</button>)}</nav>
   {section==='Resumo'&&<div className="h-sheet-compact-flow">
     <div className="h-sheet-summary-hero"><div><span className="h-sheet-kicker">PERSONAGEM · {c.stage || 'ESTÁGIO 1'}</span><h3>{c.name || 'Sem nome'}</h3><p>{fullName} · GS {c.gs}</p></div><div className="h-sheet-hero-glyph">{tech?<Zap size={30}/>:<Sparkles size={30}/>}</div></div>
     {c.pv_current<=0&&<div className="h-sheet-hint"><HeartPulse size={21}/><p><strong>Estado de Agonia.</strong> Abra a ficha detalhada para os testes, a ajuda de aliados e as regras de recuperação.</p><Button variant="outline" onClick={onOpenDetail}>Ver Agonia</Button></div>}
     <div className="h-sheet-compact-resources"><div><Meter label="PONTOS DE VIDA" current={c.pv_current} max={c.pv_max} tone="health"/></div><div><Meter label={tech?'PODER DO NÚCLEO · PN':'PONTOS DE FLUXO · PF'} current={c.pf_current} max={c.pf_max} tone={tech?'nucleo':'flux'}/></div></div>
     <div className="h-sheet-metrics"><div><small>CORPO</small><strong>{c.corpo}</strong></div><div><small>MENTE</small><strong>{c.mente}</strong></div><div><small>{tech?'TECNOLOGIA':'ESPÍRITO'}</small><strong>{c.espirito}</strong></div><div><small>ESQUIVA / BLOQUEIO</small><strong>{derivedStats.esquiva} / {derivedStats.bloqueio}</strong></div></div>
     <div className="h-sheet-summary-grid">
       <button type="button" onClick={()=>setSection('Identidade')}><UserRound size={20}/><span><strong>Identidade</strong><small>{c.concept || 'Nome, origem, conceito e estágio'}</small></span><ChevronRight size={17}/></button>
       <button type="button" onClick={()=>setSection('Atributos')}><Dices size={20}/><span><strong>Atributos</strong><small>{attr.free} ponto(s) disponível(is) · Deslocamento {derivedStats.deslocamento}m</small></span><ChevronRight size={17}/></button>
       <button type="button" onClick={()=>setSection('Recursos')}><HeartPulse size={20}/><span><strong>Vida e recursos</strong><small>PV · {resource} · Karma · Exaustão</small></span><ChevronRight size={17}/></button>
       <button type="button" onClick={onOpenDetail}><Swords size={20}/><span><strong>Arma e combate</strong><small>{c.weapon || 'Arma não definida'} · {asset}</small></span><ChevronRight size={17}/></button>
       <button type="button" onClick={()=>onTab('Nomenclaturas')}><Sparkles size={20}/><span><strong>{abilityLabel}</strong><small>{c.nomenclatures.length} versões cadastradas · abrir editor</small></span><ChevronRight size={17}/></button>
       <button type="button" onClick={()=>onTab('Habilidades')}><Shield size={20}/><span><strong>Habilidades e GS</strong><small>Passiva de linhagem, evoluções e efeitos</small></span><ChevronRight size={17}/></button>
       <button type="button" onClick={()=>onTab('Inventário')}><BookOpen size={20}/><span><strong>Inventário</strong><small>{c.inventory.length} item(ns) · equipamentos</small></span><ChevronRight size={17}/></button>
       <button type="button" onClick={()=>onTab('História')}><ScrollText size={20}/><span><strong>História e anotações</strong><small>Origem, escolhas e acontecimentos</small></span><ChevronRight size={17}/></button>
     </div>
     {stage&&<div className="h-sheet-passive"><span>PASSIVA · {stage.name.toUpperCase()}</span><strong>{stage.passive}</strong><p>{stage.desc}</p></div>}
   </div>}
   {section==='Identidade'&&<div className="h-sheet-compact-flow">
     <div className="h-sheet-section-title"><h3>Identidade</h3><p>Altere o essencial sem percorrer a ficha inteira.</p></div>
     <label className="h-sheet-field"><span>Nome do Herdeiro</span><input value={c.name} onChange={e=>onUpdate({name:e.target.value})}/></label>
     <div className="h-sheet-fields-two"><label className="h-sheet-field"><span>Linhagem</span><select value={c.lineage} onChange={e=>{const next=e.target.value;if(next!==c.lineage&&window.confirm('Trocar a linhagem altera as regras, recursos e passivas desta ficha. Continuar?'))onUpdate({lineage:next,stage:LINEAGE_STAGES[next]?.[0]?.name??''});}}>{lineages.map(x=><option value={x.value} key={x.value}>{x.label}</option>)}</select></label><label className="h-sheet-field"><span>Estágio</span><select value={c.stage} onChange={e=>onUpdate({stage:e.target.value})}>{(LINEAGE_STAGES[c.lineage]??[]).map((x,i)=><option key={x.name} value={x.name}>{i+1}. {x.name}</option>)}</select></label></div>
     <label className="h-sheet-field"><span>Conceito</span><input value={c.concept} onChange={e=>onUpdate({concept:e.target.value})} placeholder="Quem é esse Herdeiro?"/></label>
     <label className="h-sheet-field"><span>Modelo de arma</span><input value={c.weapon} onChange={e=>onUpdate({weapon:e.target.value})} placeholder={tech?'Arma de Núcleo':'Arma de Vínculo, Arma de Ego...'} /></label>
     <label className="h-sheet-field"><span>História resumida</span><textarea rows={3} value={splitStory(c.story).story} onChange={e=>onUpdate({story:joinStory(e.target.value,splitStory(c.story).notes)})}/></label>
     <Button variant="outline" onClick={onOpenDetail}>Abrir opções completas da ficha <ChevronRight/></Button>
   </div>}
   {section==='Atributos'&&<div className="h-sheet-compact-flow">
     <div className="h-sheet-section-title"><h3>Atributos</h3><p>Os limites de estágio e de evolução continuam valendo. Pontos distribuídos não podem ser retirados após serem confirmados.</p></div>
     <div className="h-sheet-points"><span>Pontos livres no estágio {attr.stage}</span><strong>{attr.free} <small>/ {attr.budget}</small></strong></div>
     {(['corpo','mente','espirito'] as const).map(key=><div className="h-sheet-attr-editor" key={key}><div><strong>{attrLabelFor(key,c.lineage)}</strong><small>Dado do atributo: 1d{dieFor(c[key])}</small></div><Stepper label="VALOR" value={c[key]} min={1} max={attr.cap} onChange={v=>changeAttr(key,v)}/><Button variant="outline" size="sm" onClick={()=>onRoll(`1d${dieFor(c[key])}`,`Teste de ${attrLabelFor(key,c.lineage)}`)}><Dices size={15}/> Rolar</Button></div>)}
     {notice&&<p className="h-sheet-error" role="alert">{notice}</p>}
     <div className="h-sheet-metrics"><div><small>PV BASE</small><strong>{derivedStats.pv}</strong></div><div><small>ESQUIVA</small><strong>{derivedStats.esquiva}</strong></div><div><small>BLOQUEIO</small><strong>{derivedStats.bloqueio}</strong></div><div><small>MOVIMENTO</small><strong>{derivedStats.deslocamento}m</strong></div></div>
   </div>}
   {section==='Recursos'&&<div className="h-sheet-compact-flow">
     <div className="h-sheet-section-title"><h3>Vida, Fluxo e condições</h3><p>Alterações aparecem na mesa pelo Supabase, usando o salvamento existente.</p></div>
     <div className="h-sheet-resource-edit"><Stepper label="PV ATUAL" value={c.pv_current} max={c.pv_max} tone="health" onChange={v=>onUpdate({pv_current:v})}/><Stepper label="PV MÁXIMO" value={c.pv_max} tone="health" onChange={v=>onUpdate({pv_max:v,pv_current:Math.min(c.pv_current,v)})}/><Stepper label={`${resource} ATUAL`} value={c.pf_current} max={c.pf_max} tone="flux" onChange={v=>onUpdate({pf_current:v})}/><Stepper label={`${resource} MÁXIMO`} value={c.pf_max} tone="flux" onChange={v=>onUpdate({pf_max:v,pf_current:Math.min(c.pf_current,v)})}/><Stepper label="KARMA" value={c.karma} max={karmaLimit} tone="karma" onChange={v=>onUpdate({karma:v})}/><Stepper label="EXAUSTÃO" value={c.exhaustion} max={6} onChange={v=>onUpdate({exhaustion:v})}/></div>
     <p className="h-sheet-help">O sistema mantém os cálculos especiais de Agonia, GS, absorção, Elo e evolução no modo detalhado.</p><Button variant="outline" onClick={onOpenDetail}>Abrir regras avançadas <ChevronRight/></Button>
   </div>}
 </div>;
}
