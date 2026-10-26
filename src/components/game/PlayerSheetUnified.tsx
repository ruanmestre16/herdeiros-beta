import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, BookOpen, Brain, Eye, ChevronDown, Dices, Heart, HeartPulse, Minus, Package, Plus, ScrollText, Shield, Sparkles, Swords, UserRound, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  attackRoll, derived, dieFor, isTechAgent, joinStory, nomenclatureFamilies,
  nomenclatureLabel, rollDice, splitStory, weaponAttackAttrFor, sheetState, techCoreConsumed, type Character,
} from '@/lib/game';
import {
  ANCHOR_NAME, AbsorbPfAction, AbilitiesTab, AgonyPanel, CoinsPanel, EffectEditor,
  EgoWeaponPanel, FluxLinkToggle, GakiPassive, GsPanel, KarmaTest,
  NomenclaturesTab, PathPanel, RestPanel, SyncEditor, WeaponPanel, hasAnchor,
  type RollEntry,
} from './SheetExtras';
import { PlayerSheetCompact } from './PlayerSheetCompact';
import { GsControl } from './GsControl';
import { TechAgentGsPanel, TechEyePanel } from './TechAgentGsPanel';
import { TechCoreStability } from './TechCoreStability';
import { ForceFluxAction } from './ForceFluxAction';
import './sheet-unified.css';

type Section = 'Ficha' | 'Combate' | 'Nomenclaturas' | 'Habilidades' | 'Inventário' | 'História' | 'Evolução';
type CharacterUpdate = (patch: Partial<Character>) => void;
type Tab = 'Nomenclaturas' | 'Habilidades' | 'Inventário' | 'História';
const NAV: { id: Section; icon: typeof UserRound; tip: string }[] = [
  { id:'Ficha',icon:UserRound,tip:'Resumo e atributos' },
  { id:'Combate',icon:Swords,tip:'Ataques e reações' },
  { id:'Nomenclaturas',icon:Sparkles,tip:'Técnicas e graus' },
  { id:'Habilidades',icon:Zap,tip:'Dons e passivas' },
  { id:'Inventário',icon:Package,tip:'Itens e recursos' },
  { id:'História',icon:ScrollText,tip:'Lore e anotações' },
  { id:'Evolução',icon:Brain,tip:'GS, Elo, Karma e descanso' },
];

function Block({ title, icon: Icon, summary, children, initiallyOpen = false }: {
 title: string; icon: typeof UserRound; summary?: string; children: React.ReactNode; initiallyOpen?: boolean;
}) {
 return <details className="hu-block" open={initiallyOpen ? true : undefined}>
   <summary><Icon size={20}/><span><strong>{title}</strong>{summary&&<small>{summary}</small>}</span><ChevronDown className="hu-block-caret" size={19}/></summary>
   <div className="hu-block-body">{children}</div>
 </details>;
}

function StoryPanel({ character, update }: { character: Character; update: CharacterUpdate }) {
 const [tab,setTab] = useState<'historia'|'notas'>('historia');
 const [draft,setDraft] = useState(()=>splitStory(character.story));
 const [editing,setEditing] = useState(false);
 useEffect(()=>{ if(!editing)setDraft(splitStory(character.story)); },[character.id,character.story,editing]);
 const dirty = joinStory(draft.story,draft.notes)!==character.story;
 function save(){ if(dirty)update({story:joinStory(draft.story,draft.notes)});setEditing(false); }
 return <section className="hu-section-card">
   <header className="hu-section-head"><div><span>DIÁRIO DO HERDEIRO</span><h3>História e crônica</h3><p>Uma jornada para ler e editar sem páginas intermináveis.</p></div><ScrollText size={23}/></header>
   <div className="hu-inline-tabs" role="tablist" aria-label="Caderno do personagem">
     <button type="button" role="tab" aria-selected={tab==='historia'} className={tab==='historia'?'active':''} onClick={()=>setTab('historia')}>História</button>
     <button type="button" role="tab" aria-selected={tab==='notas'} className={tab==='notas'?'active':''} onClick={()=>setTab('notas')}>Anotações da sessão</button>
   </div>
   {!editing?<>
     <div className="hu-story-preview">{(tab==='historia'?draft.story:draft.notes).trim()||'Nada registrado ainda. Sua história pode começar aqui.'}</div>
     <Button className="hu-primary-action" onClick={()=>setEditing(true)}><ScrollText size={17}/> {tab==='historia'?'Editar história':'Editar anotações'}</Button>
   </>:<>
     <label className="hu-input-label">{tab==='historia'?'Origem, memórias, motivações e cicatrizes':'Anotações da aventura'}
       <textarea rows={7} value={tab==='historia'?draft.story:draft.notes} onChange={e=>{const next={...draft,[tab==='historia'?'story':'notes']:e.target.value};setDraft(next);update({story:joinStory(next.story,next.notes)})}} placeholder="Escreva sua história..."/>
     </label>
     <div className="hu-card-actions"><Button onClick={save}>Concluir edição</Button><span className="hu-muted">Salvo automaticamente enquanto você digita.</span></div>
   </>}
   <p className="hu-muted">Os textos são salvos no campo de História já existente da ficha. Nada é apagado ao trocar de seção.</p>
 </section>;
}

function InventoryPanel({ character, update }: { character: Character; update: CharacterUpdate }) {
 const [editing,setEditing]=useState<number|null>(null);
 const change=(i:number,patch:Partial<Character['inventory'][number]>)=>update({inventory:character.inventory.map((it,j)=>j===i?{...it,...patch}:it)});
 return <section className="hu-section-card">
   <header className="hu-section-head"><div><span>EQUIPAMENTOS E RELÍQUIAS</span><h3>Inventário</h3><p>{character.inventory.length} itens · clique para abrir, editar ou ajustar quantidades.</p></div><Package size={23}/></header>
   <div className="hu-card-actions">
     <Button onClick={()=>{update({inventory:[...character.inventory,{name:'Novo item',quantity:1}]});setEditing(character.inventory.length)}}><Plus size={17}/> Adicionar item</Button>
     {!hasAnchor(character)&&<Button variant="outline" onClick={()=>update({inventory:[...character.inventory,{name:ANCHOR_NAME,quantity:1}]})}><Sparkles size={16}/> Âncora sentimental</Button>}
   </div>
   <div className="hu-item-list">
     {character.inventory.map((it,i)=><div className="hu-inventory-item" key={i}>
       <button type="button" className="hu-item-opener" onClick={()=>setEditing(v=>v===i?null:i)} aria-expanded={editing===i}>
         <Package size={17}/><span><strong>{it.name||'Novo item'}</strong><small>Quantidade: {it.quantity}</small></span><ChevronDown size={17}/>
       </button>
       {editing===i&&<div className="hu-inventory-edit">
         <label className="hu-input-label">Nome do item<input value={it.name} onChange={e=>change(i,{name:e.target.value})}/></label>
         <div className="hu-quantity"><span>Quantidade</span><Button size="icon" variant="outline" aria-label="Diminuir quantidade" onClick={()=>change(i,{quantity:Math.max(0,it.quantity-1)})}><Minus size={15}/></Button><strong>{it.quantity}</strong><Button size="icon" variant="outline" aria-label="Aumentar quantidade" onClick={()=>change(i,{quantity:it.quantity+1})}><Plus size={15}/></Button></div>
         <Button variant="outline" onClick={()=>{if(window.confirm(`Remover ${it.name||'item'}?`)){update({inventory:character.inventory.filter((_,j)=>j!==i)});setEditing(null)}}}>Remover item</Button>
       </div>}
     </div>)}
     {!character.inventory.length&&<div className="hu-empty">Seu inventário está vazio. Adicione o primeiro item.</div>}
   </div>
 </section>;
}

export function PlayerSheetUnified({ character, update, addRoll, onRoll, tablemates, onShare, notice, onCombat, externalTab, onTabChange, isMaster = false, readOnly = false }: {
 character: Character; update: CharacterUpdate; addRoll: (entry:RollEntry)=>void; onRoll:(expression:string,source?:string)=>unknown;
 tablemates: Character[]; onShare?: (toId:string)=>Promise<{error:string|null;amount:number}>;
 notice?:string; onCombat?:(()=>void)|undefined; externalTab?:'Geral'|Tab; onTabChange?:(tab:'Geral'|Tab)=>void; isMaster?:boolean; readOnly?:boolean;
}) {
 const [section,setSection]=useState<Section>(()=>externalTab&&externalTab!=='Geral'?externalTab:'Ficha');
 const [editPowers,setEditPowers]=useState(false);
 const [editAbilities,setEditAbilities]=useState(false);
 const [lastRoll,setLastRoll]=useState('');
 useEffect(()=>{ if(externalTab&&externalTab!=='Geral')setSection(externalTab); },[externalTab]);
 useEffect(()=>{setSection('Ficha');setEditPowers(false);setEditAbilities(false)},[character.id]);
 const tech=isTechAgent(character.lineage);
 const resource=tech?'PN':'PF';
 const corePending=tech?sheetState(character).techCorePending:null;
 const defenses=derived(character.corpo);
 const groups=useMemo(()=>nomenclatureFamilies(character),[character.nomenclatures]);
 const rawAbilities=character.abilities.filter(a=>!a.kind);
 const label = nomenclatureLabel(character.lineage,true);
 const select=(next:Section)=>{setSection(next);if(next==='Nomenclaturas'||next==='Habilidades'||next==='Inventário'||next==='História')onTabChange?.(next);else onTabChange?.('Geral')};
 const attributes=[{name:'CORPO',value:character.corpo},{name:'MENTE',value:character.mente},{name:tech?'TECNOLOGIA':'ESPÍRITO',value:character.espirito}];
 function hitRoll() {if(techCoreConsumed(character)&&sheetState(character).weaponMode!=='comum')return;const attr=weaponAttackAttrFor(character);const r=attackRoll(character[attr]);addRoll({expression:r.expression,dice:r.dice,modifier:0,total:r.total,crit:r.crit,source:`Ataque · ${character.name}${r.fumble?' — FALHA CRÍTICA':r.crit?' — CRÍTICO':''}`});setLastRoll(`Ataque: ${r.total} (${r.expression})${r.fumble?' · falha crítica':r.crit?' · crítico':''}`);}
 function initiativeRoll(){const dice=rollDice(Math.max(1,character.corpo),20);const total=Math.max(...dice)+character.corpo;addRoll({expression:`${character.corpo}d20 (maior) + ${character.corpo}`,dice,modifier:character.corpo,total,source:`Iniciativa · ${character.name}`});update({initiative:total});setLastRoll(`Iniciativa: ${total}`);}
 return <div className="hu-sheet" data-sheet="unificada">
   <div className="hu-hero">
     <div className="hu-hero-title"><span>HERDEIROS · FICHA VIVA</span><h2>{character.name||'Herdeiro sem nome'}</h2><p>{tech?'Humano · Agente Tecnológico':character.lineage} · {character.stage} · GS {character.gs}</p></div>
     <div className="hu-hero-stats"><div><small>PV</small><strong>{character.pv_current}<em>/{character.pv_max}</em></strong></div><div><small>{resource}</small><strong>{character.pf_current}<em>/{character.pf_max}</em></strong></div><div><small>ESQUIVA</small><strong>{defenses.esquiva}</strong></div><div><small>BLOQUEIO</small><strong>{defenses.bloqueio}</strong></div></div>
   </div>
   <nav className="hu-nav" aria-label="Áreas da ficha completa">{NAV.map(({id,icon:Icon,tip})=><button type="button" key={id} className={section===id?'hu-nav-active':''} aria-current={section===id?'page':undefined} title={tip} onClick={()=>select(id)}><Icon size={18}/><span>{id==='Nomenclaturas'?label:id}</span></button>)}</nav>
   <fieldset disabled={readOnly} className="hu-edit-scope">
   {section==='Ficha'&&<PlayerSheetCompact character={character} onUpdate={update} onRoll={onRoll} addRoll={addRoll} {...(notice!==undefined?{notice}:{})} onOpenDetail={()=>select('Combate')} onTab={tab=>select(tab)}/>}
   {section==='Combate'&&<div className="hu-content">
     <section className="hu-section-card">
       <header className="hu-section-head"><div><span>CONTROLES DE COMBATE</span><h3>Pronto para agir</h3><p>Rolagens rápidas e acesso às regras completas da arma.</p></div><Swords size={25}/></header>
       <div className="hu-stat-pills">{attributes.map(s=><span key={s.name}>{s.name} <strong>{s.value}</strong> · d{dieFor(s.value)}</span>)}</div>
       <div className="hu-action-grid"><button type="button" disabled={!!corePending || (techCoreConsumed(character) && sheetState(character).weaponMode !== 'comum')} onClick={hitRoll}><Swords size={24}/><strong>Rolar acerto</strong><small>{techCoreConsumed(character) ? 'Núcleo consumido: Arma de Núcleo indisponível' : corePending ? 'Conceito ativado: use a rolagem detalhada abaixo' : '1d20 + dado do atributo'}</small></button><button type="button" onClick={initiativeRoll}><Dices size={24}/><strong>Iniciativa</strong><small>Maior d20 de CORPO + CORPO</small></button>{onCombat&&<button type="button" onClick={onCombat}><Activity size={24}/><strong>Combate ao vivo</strong><small>Abrir painel de turno e reações</small></button>}</div>
       {corePending&&<p className="hu-result" role="status">Núcleo preparado: {corePending.name}. {corePending.mount==='arma'?'Use “Arma e dano” abaixo para aplicar o conceito e rolar o dano.':'Abra Habilidades de Núcleo para aplicar o conceito e rolar o dano.'}</p>}
       {lastRoll&&<p className="hu-result" role="status">{lastRoll}</p>}
       <p className="hu-muted">Quando você for atacado, suas reações continuam no painel de combate. Esta ficha não gasta sua reação automaticamente.</p>
     </section>
     <Block title="Arma e dano" icon={Swords} summary={`${character.weapon||'Arma não definida'} · editar tipo e dados`} initiallyOpen><WeaponPanel character={character} update={update} addRoll={addRoll}/></Block>
     <Block title="Fluxo e carga" icon={Zap} summary={tech ? "Absorver PN, partilhar e gerir o Núcleo" : "Absorver PF · Forçar o Fluxo · partilhar"}><FluxLinkToggle character={character} update={update}/><AbsorbPfAction character={character} update={update} addRoll={addRoll} tablemates={tablemates} {...(onShare?{onShare}:{})}/>{!tech&&<ForceFluxAction character={character} update={update} addRoll={addRoll}/>}</Block>
     <Block title="Agonia e recuperação" icon={HeartPulse} summary="Regras de 0 PV, testes e retorno"><AgonyPanel character={character} update={update} addRoll={addRoll} isMaster={isMaster}/></Block>
   </div>}
   {section==='Nomenclaturas'&&<div className="hu-content"><section className="hu-section-card">
     <header className="hu-section-head"><div><span>{tech?'ENERGIA DO NÚCLEO':'O NOME DO FLUXO'}</span><h3>{label}</h3><p>{groups.length} famílias · {character.nomenclatures.length} versões cadastradas</p></div><Sparkles size={23}/></header>
     <div className="hu-collection-grid">{groups.map((g,i)=><button key={i} type="button" onClick={()=>setEditPowers(true)} className="hu-collection-card"><Sparkles size={19}/><strong>{g.name}</strong><small>{g.items.map(v=>v.item.kind).filter(Boolean).join(' · ')||`${g.items.length} versões`}</small><ArrowRight size={16}/></button>)}{!groups.length&&<div className="hu-empty">Nenhuma técnica cadastrada ainda. Você pode importar um texto com os três graus.</div>}</div>
     <Button className="hu-primary-action" onClick={()=>setEditPowers(v=>!v)}><Plus size={17}/>{editPowers?'Fechar editor':'Criar, importar ou editar técnicas'}</Button>
   </section>{editPowers&&<div className="hu-legacy-wrapper"><NomenclaturesTab character={character} update={update} addRoll={addRoll}/></div>}</div>}
   {section==='Habilidades'&&<div className="hu-content">{tech && <section className="hu-section-card"><header className="hu-section-head"><div><span>PASSIVA DA LINHAGEM</span><h3>Olho Tecnológico</h3><p>Varredura, Predição e Anulação conforme o estágio.</p></div><Eye size={23}/></header><TechEyePanel character={character} update={update} readOnly={readOnly}/></section>}<section className="hu-section-card">
     <header className="hu-section-head"><div><span>DONS E CICATRIZES</span><h3>Habilidades</h3><p>Habilidades próprias, especiais e cicatrizes do Fluxo.</p></div><Shield size={23}/></header>
     <div className="hu-collection-grid">{rawAbilities.map((a,i)=><button key={i} type="button" onClick={()=>setEditAbilities(true)} className="hu-collection-card"><Zap size={19}/><strong>{a.name}</strong><small>{a.description?.slice(0,130)||'Toque para ler ou editar'}</small><ArrowRight size={16}/></button>)}{!rawAbilities.length&&<div className="hu-empty">Nenhuma habilidade própria registrada.</div>}</div>
     <Button className="hu-primary-action" onClick={()=>setEditAbilities(v=>!v)}><Plus size={17}/>{editAbilities?'Fechar editor':'Adicionar, usar ou editar habilidades'}</Button>
   </section>{editAbilities&&<div className="hu-legacy-wrapper"><AbilitiesTab character={character} update={update} addRoll={addRoll}/></div>}</div>}
   {section==='Inventário'&&<InventoryPanel character={character} update={update}/>}
   {section==='História'&&<StoryPanel character={character} update={update}/>}
   {section==='Evolução'&&<div className="hu-content">
     <section className="hu-section-card"><header className="hu-section-head"><div><span>JORNADA E DESPERTAR</span><h3>Seu caminho</h3><p>Ajuste seu GS e acompanhe a liberação dos marcos de evolução.</p></div><BookOpen size={23}/></header><GsControl character={character} onChange={gs=>update({gs})} disabled={readOnly}/></section>
     {tech && <TechAgentGsPanel character={character} update={update} readOnly={readOnly}/>}
     {!tech && <Block title="Grau de Sincronia (GS)" icon={Sparkles} summary="Marcos de evolução, atributos e bônus" initiallyOpen><GsPanel character={character} update={update}/></Block>}
     {!tech && <Block title="Caminhos de evolução" icon={Brain} summary="Nomenclatura, corpo, arma e estágios"><PathPanel character={character} update={update} addRoll={addRoll}/><EffectEditor character={character} update={update}/>{character.lineage==='Arcadiano'&&<EgoWeaponPanel character={character} update={update} addRoll={addRoll}/>}{character.lineage==='Gaki'&&<GakiPassive character={character} update={update} addRoll={addRoll}/>}</Block>}
     <Block title="Laços e Elo" icon={Heart} summary={`${character.sync.length} relações registradas`}><SyncEditor character={character} update={update}/></Block>
     <Block title="Moedas do Destino e Âncora" icon={Sparkles} summary="Resgates, rerrolagens e proteções"><CoinsPanel character={character} update={update}/></Block>
     {tech?<Block title="Integridade e destruição do Núcleo" icon={Shield} summary="Forçar Núcleo, 50%, 70% e 100% · consequência narrativa" initiallyOpen><TechCoreStability character={character} update={update} addRoll={addRoll}/></Block>:<Block title="Karma e riscos" icon={Shield} summary="Forçar o Fluxo, testes de MENTE e consequências"><ForceFluxAction character={character} update={update} addRoll={addRoll}/><KarmaTest character={character} update={update} addRoll={addRoll}/></Block>}
     <Block title="Descanso" icon={HeartPulse} summary={tech?"Recuperação de PV · manutenção do Núcleo com o Mestre":"Recuperação de PV e redução de Karma"}><RestPanel character={character} update={update} addRoll={addRoll}/></Block>
   </div>}
   </fieldset>
   <footer className="hu-sheet-footer"><span>✦ HERDEIROS · O DESPERTAR</span><span>Ficha integrada ao salvamento e à mesa existentes.</span></footer>
 </div>;
}
