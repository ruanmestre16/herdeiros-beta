import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, Cpu, Eye, Minus, Plus, ShieldCheck, Sparkles, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LINEAGE_STAGES, TECH_CORE_DICE, TECH_GS_DESCRIPTIONS, TECH_GS_PATHS,
  activateTechCore, applyTechCoreMilestone, applyTechGsMilestone,
  isTechAgent, nomenclatureFamilies, sheetState, stageIndexFor,
  techCoreActivation, techCoreCanClaim, techCoreRank, techCoreStage,
  techEyeRules, techGsCanClaim, techGsLevel, techGsPath,
  withSheetState,
  type Character, type TechCoreConcept, type TechCoreMount, type TechCoreTier,
  type TechGsPath, type TechSighting,
} from '@/lib/game';
import './tech-agent-gs.css';

type Props = { character: Character; update: (patch: Partial<Character>) => void; readOnly?: boolean };
const GS_MARKS = [5, 7, 10] as const;
const EMPTY_CONCEPT: TechCoreConcept = {name:'',effect:'',damage:'',masterpieceEffect:'',masterpieceDamage:''};

/** Estágio 1: só caminhos oficiais do Agente. Estágio 2: somente Engenharia de Obra-Prima.
 * Ao concluir 10 GS o ciclo zera. O avanço de estágio é uma ação separada.
 * Não mantém nenhuma trilha geral/espiritual adicional para o Agente. */
export function TechAgentGsPanel({character, update, readOnly = false}: Props) {
  const st=sheetState(character);
  const stage=stageIndexFor(character.lineage,character.stage);
  const selected=techGsPath(character);
  const [draftPath,setDraftPath]=useState<TechGsPath>('arma_nucleo');
  const [favorite,setFavorite]=useState('');
  const [note,setNote]=useState('');
  const [concept,setConcept]=useState<TechCoreConcept>({...EMPTY_CONCEPT});
  const [feedback,setFeedback]=useState('');
  useEffect(()=>{setDraftPath('arma_nucleo');setFavorite('');setNote('');setFeedback('');},[character.id]);
  useEffect(()=>{setConcept({...EMPTY_CONCEPT,...sheetState(character).techCoreConcept});},[character.id,character.abilities]);
  if(!isTechAgent(character.lineage)) return null;
  const selectedPath=selected??draftPath;
  const claimed=selected ? techGsLevel(character,selected) : 0;
  const coreMarks=st.techCoreMarks??[];
  const coreRank=techCoreRank(character);
  const auxMount: TechCoreMount=st.techCoreMount??'arma';
  const finished=st.milestones.includes(`${stage}:10`) && character.gs===0;
  const canAdvance=stage<2 && finished;
  const families=nomenclatureFamilies(character).filter(f=>!st.techniqueUpgrades[f.key]?.favorite);
  const markTech=(gs:5|7|10)=>{
    const next=applyTechGsMilestone(character,gs,selectedPath,{note,favorite});
    if(!next){setFeedback('Marco indisponível: verifique o GS, o caminho e a Habilidade Favorita.');return;}
    update({gs:next.gs,abilities:next.abilities});setFeedback(gs===10?'10 GS concluído! O contador zerou. Avance de estágio quando a história permitir.':`Marco tecnológico ${gs} GS conquistado.`);
    setFavorite('');setNote('');
  };
  const markCore=(gs:5|7|10)=>{
    const next=applyTechCoreMilestone(character,gs,concept);
    if(!next){setFeedback('Confira os requisitos: GS suficiente e nome/efeito do conceito definidos com o Mestre.');return;}
    update({gs:next.gs,abilities:next.abilities});setFeedback(gs===10?'Obra-Prima conquistada! GS voltou a zero.':`Marco ${gs} GS registrado na Engenharia de Obra-Prima.`);
  };
  const saveConcept=()=>{
    if(!concept.name.trim()||!concept.effect.trim()||!TECH_CORE_DICE.includes(concept.damage as typeof TECH_CORE_DICE[number])||!TECH_CORE_DICE.includes(concept.masterpieceDamage as typeof TECH_CORE_DICE[number])){setFeedback('Informe um nome e um efeito, com dado de dano permitido ou nenhum.');return;}
    update({abilities:withSheetState(character,{techCoreConcept:concept})});setFeedback('Conceito e efeitos atualizados na ficha.');
  };
  const activate=(tier:TechCoreTier)=>{
    const next=activateTechCore(character,tier);
    if(!next){setFeedback('Não foi possível ativar: confira os PN disponíveis e descarte uma ativação anterior, se houver.');return;}
    update({pf_current:next.pf_current,abilities:next.abilities});
    setFeedback(`${techCoreActivation(character,tier)?.cost} PN gastos. Efeito armado para o próximo ataque compatível.`);
  };
  const advance=()=>{
    const stageName=LINEAGE_STAGES[character.lineage]?.[stage+1]?.name;
    if(!stageName||readOnly)return;
    update({stage:stageName});
    setFeedback(stage===0?'Estágio 2 liberado: +1 atributo, +1 Habilidade de Núcleo e Núcleo auxiliar (sem duplicar o limite de PN).':'Estágio 3 liberado: +1 atributo e +1 Habilidade de Núcleo. Novas evoluções de GS são narrativas.');
  };
  return <section className="hu-tech-gs hu-section-card" aria-label="Trilhas exclusivas do Agente Tecnológico">
    <header className="hu-tech-header"><span className="hu-tech-emblem"><Cpu size={23}/></span><div><span className="hu-tech-eyebrow">HUMANO · AGENTE TECNOLÓGICO</span><h3>{stage===0?'Despertar do Núcleo':stage===1?'Engenharia de Obra-Prima':'Tecnologia Mestra'}</h3><p>{stage===0?'Trilhas tecnológicas oficiais do Estágio 1.':stage===1?'Trilha exclusiva do Estágio 2, criada para a campanha.':'A evolução seguinte é definida narrativamente com o Mestre.'}</p></div></header>
    <div className="hu-tech-summary"><span>ESTÁGIO {stage+1} · GS {character.gs}/10</span><strong>{stage===0?TECH_GS_PATHS.find(p=>p.id===selectedPath)?.name:stage===1?'Núcleo Auxiliar · Engenharia de Obra-Prima':'Tecnologia Mestra'}</strong><small>Os marcos 5, 7 e 10 desta trilha são sua evolução de GS. Não existem marcos gerais cumulativos para o Agente.</small></div>
    {stage===0 && <>
      <p className="hu-tech-guidance">Ao alcançar 5 GS, escolha seu caminho: <b>Arma de Núcleo, Corpo Modular ou Habilidade de Núcleo</b>. A escolha segue nos marcos de 7 e 10 GS. Ao resolver o marco 10, o GS zera. Os poderes são permanentes.</p>
      <div className="hu-tech-path-grid" role="group" aria-label="Escolher caminho tecnológico">
        {TECH_GS_PATHS.map(item=><button key={item.id} type="button" aria-pressed={selectedPath===item.id} className={`hu-tech-path ${selectedPath===item.id?'selected':''}`} disabled={readOnly||!!selected} onClick={()=>{setDraftPath(item.id);setNote('');setFavorite('')}}><span className="hu-tech-path-head"><Cpu size={18}/>{selectedPath===item.id&&<CheckCircle2 size={18}/>}</span><strong>{item.name}</strong><small>{item.summary}</small></button>)}
      </div>
      <div className="hu-tech-marks">{GS_MARKS.map(gs=>{
        const done=!!st.techGsMarks?.[`0:${gs}`];
        const ready=techGsCanClaim(character,gs);
        const data=TECH_GS_DESCRIPTIONS[selectedPath][gs];
        return <div key={gs} className={`hu-tech-mark ${done?'done':ready?'ready':'locked'}`}>
          <div className="hu-tech-mark-title"><span className="hu-tech-gs-number">{gs} GS</span><div><strong>{data.title}</strong><small>{done?'Conquistado':ready?'Disponível':'Bloqueado'}</small></div>{done?<CheckCircle2 size={20}/>:ready?<Sparkles size={20}/>:<ShieldCheck size={19}/>}</div>
          <p>{data.text}</p>{done&&!!st.techGsNotes?.[`0:${gs}`]&&<p className="hu-tech-note">{st.techGsNotes[`0:${gs}`]}</p>}
          {ready&&<div className="hu-tech-claim">{gs===10&&selectedPath==='habilidade_nucleo'&&<label>Habilidade Favorita<select value={favorite} onChange={e=>setFavorite(e.target.value)}><option value="">Escolher</option>{families.map(f=><option key={f.key} value={f.key}>{f.name}</option>)}</select></label>}{gs===10&&<label>Personalização aprovada pelo Mestre<textarea rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="Efeito, alcance ou característica do poder" maxLength={700}/></label>}<Button type="button" disabled={readOnly||(gs===10&&selectedPath==='habilidade_nucleo'&&!favorite)} onClick={()=>markTech(gs)}><Sparkles size={16}/> Aplicar {gs} GS</Button></div>}
        </div>;
      })}</div>
      {selected==='corpo_modular'&&claimed>0&&<label className="hu-tech-switch"><input type="checkbox" disabled={readOnly} checked={!!st.techModularEquipped} onChange={e=>update({abilities:withSheetState(character,{techModularEquipped:e.target.checked})})}/><span><strong>Implantes do Corpo Modular equipados</strong><small>Somente ataques feitos pelos implantes usam essa evolução; armas comuns continuam usando CORPO.</small></span></label>}
    </>}
    {stage===1 && <>
      <div className="hu-tech-aux"><strong>Segundo Núcleo · Núcleo auxiliar</strong><p>Você recebe +1 ponto de atributo, +1 Habilidade de Núcleo e um Núcleo auxiliar ao passar de estágio. Ele usa a mesma reserva de PN: não aumenta o PN máximo.</p><div className="hu-tech-mounts" role="group" aria-label="Instalação do Núcleo auxiliar"><button className={auxMount==='arma'?'selected':''} type="button" disabled={readOnly||!!st.techCorePending} onClick={()=>update({abilities:withSheetState(character,{techCoreMount:'arma'})})}><Zap size={16}/> Na arma <small>Amplifica ataques da Arma de Núcleo</small></button><button className={auxMount==='corpo'?'selected':''} type="button" disabled={readOnly||!!st.techCorePending} onClick={()=>update({abilities:withSheetState(character,{techCoreMount:'corpo'})})}><Cpu size={16}/> No corpo <small>Amplifica Habilidades de Núcleo</small></button></div><small>Troque a instalação apenas entre cenas, com autorização do Mestre. Na ficha, a troca é manual e fica bloqueada enquanto houver efeito ativado.</small></div>
      <div className="hu-tech-marks">
        {GS_MARKS.map(gs=>{
          const done=coreMarks.includes(gs);
          const ready=techCoreCanClaim(character,gs);
          const needsPrevious = gs === 7 && !coreMarks.includes(5) || gs === 10 && !coreMarks.includes(7);
          const desc=gs===5?'Amplificação de Núcleo: gastar 3 PN para acrescentar +1d8 ao próximo ataque tecnológico compatível. Substitui o impulso básico de +1d6, não acumula.':gs===7?'Conceito Experimental: personalize nome, efeito e dano opcional. Ative por 5 PN antes do ataque. Efeitos narrativos ou de controle dependem da decisão e da DT do Mestre.':'Conceito de Obra-Prima: evolui o conceito anterior. Custa 12 PN por ativação, sem limite fixo por cena. Pode ampliar área, controle, gravidade ou dano conforme a descrição aprovada pelo Mestre.';
          return <div key={gs} className={`hu-tech-mark ${done?'done':ready?'ready':'locked'}`}>
            <div className="hu-tech-mark-title"><span className="hu-tech-gs-number">{gs} GS</span><div><strong>{gs===5?'Amplificação de Núcleo':gs===7?'Conceito Experimental':'Conceito de Obra-Prima'}</strong><small>{done?'Conquistado':ready?'Disponível para conquistar':needsPrevious?'Conquiste o marco anterior primeiro':character.gs<gs?`Requer ${gs} GS`:'Bloqueado'}</small></div>{done?<CheckCircle2 size={20}/>:ready?<Sparkles size={20}/>:<ShieldCheck size={19}/>}</div><p>{desc}</p>
            {((ready || done) && (gs===5 || gs===7 || gs===10))&&<div className="hu-tech-claim">
              {gs===7&&<><label>Nome do conceito<input maxLength={90} placeholder="Ex.: Gravidade, Fenda, Magnetismo" value={concept.name} onChange={e=>setConcept({...concept,name:e.target.value})}/></label><label>Descrição do efeito<textarea rows={3} maxLength={1500} placeholder="Explique o alcance, o deslocamento do alvo, a DT de CORPO ou outro efeito aprovado pelo Mestre." value={concept.effect} onChange={e=>setConcept({...concept,effect:e.target.value})}/></label><label>Dado de dano adicional (opcional)<select value={concept.damage} onChange={e=>setConcept({...concept,damage:e.target.value})}>{TECH_CORE_DICE.map(d=><option value={d} key={d}>{d||'Sem dano — só efeito'}</option>)}</select></label></>}
              {gs===10&&<><label>Efeito elevado à Obra-Prima<textarea rows={4} maxLength={2000} placeholder="Ex.: disparo gravitacional de área que imobiliza ou suspende os alvos por uma rodada; teste de CORPO e DT definidos pelo Mestre." value={concept.masterpieceEffect} onChange={e=>setConcept({...concept,masterpieceEffect:e.target.value})}/></label><label>Dado de dano adicional de Obra-Prima (opcional)<select value={concept.masterpieceDamage} onChange={e=>setConcept({...concept,masterpieceDamage:e.target.value})}>{TECH_CORE_DICE.map(d=><option key={d} value={d}>{d||'Sem dano — só efeito'}</option>)}</select></label></>}
              {ready&&<Button type="button" className="hu-tech-claim-btn" disabled={readOnly||(gs===7&&(!concept.name.trim()||!concept.effect.trim()))||(gs===10&&!concept.masterpieceEffect.trim())} onClick={()=>markCore(gs)}><Sparkles size={16}/> {gs===5?'Conquistar Amplificação · 5 GS':gs===7?'Conquistar Conceito Experimental · 7 GS':'Conquistar Obra-Prima · 10 GS'}</Button>}
              {done&&<Button type="button" variant="outline" disabled={readOnly} onClick={saveConcept}>Salvar conceito e efeitos</Button>}
            </div>}
          </div>;
        })}
      </div>
      <div className="hu-tech-activation"><strong>Ativar Núcleo auxiliar</strong><p>Gasta PN na hora e prepara um único efeito para o próximo ataque compatível. O efeito não é somado duas vezes e dados extras não multiplicam no crítico.</p><div className="hu-tech-activation-actions">{([0,5,7,10] as TechCoreTier[]).filter(x=>x===0||coreRank>=x).map(tier=>{const a=techCoreActivation(character,tier);return a&&<button key={tier} type="button" disabled={readOnly||!!st.techCorePending||character.pf_current<a.cost} onClick={()=>activate(tier)}><Zap size={16}/><span><b>{tier===0?'Impulso':tier===5?'Amplificação':tier===7?'Conceito Experimental':'Obra-Prima'}</b><small>{a.cost} PN{a.damage?` · +${a.damage}`:' · efeito especial'}</small></span></button>})}</div>
        {st.techCorePending&&<div className="hu-tech-pending"><strong>ATIVADO · {st.techCorePending.name}</strong><span>{st.techCorePending.damage?`+${st.techCorePending.damage} no ataque · `:''}{st.techCorePending.effect}</span><small>PN já descontados. Acesse Combate → Arma e dano ou Habilidades de Núcleo para usar. Se errar, o custo continua gasto.</small><Button variant="outline" type="button" disabled={readOnly} onClick={()=>update({abilities:withSheetState(character,{techCorePending:null})})}>Descartar efeito (sem reembolso de PN)</Button></div>}
      </div>
    </>}
    {stage>=2&&<>
      <div className="hu-tech-history"><strong>Terceiro estágio: Tecnologia Mestra</strong><p>Não há uma árvore fixa de terceiro estágio no Códice. O Mestre decide novas evoluções na narrativa. O Núcleo auxiliar e os marcos anteriores permanecem disponíveis.</p></div>
      <div className="hu-tech-activation"><strong>Núcleo auxiliar preservado · Estágio 2</strong><p>Os aprimoramentos anteriores continuam utilizáveis. Escolha a posição do Núcleo e ative um efeito por ataque.</p>
        <div className="hu-tech-mounts"><button type="button" className={auxMount==='arma'?'selected':''} disabled={readOnly||!!st.techCorePending} onClick={()=>update({abilities:withSheetState(character,{techCoreMount:'arma'})})}>Na arma</button><button type="button" className={auxMount==='corpo'?'selected':''} disabled={readOnly||!!st.techCorePending} onClick={()=>update({abilities:withSheetState(character,{techCoreMount:'corpo'})})}>No corpo</button></div>
        <div className="hu-tech-activation-actions">{([0,5,7,10] as TechCoreTier[]).filter(x=>x===0||coreRank>=x).map(tier=>{const a=techCoreActivation(character,tier);return a&&<button type="button" key={tier} disabled={readOnly||!!st.techCorePending||character.pf_current<a.cost} onClick={()=>activate(tier)}><Zap size={16}/><span><b>{a.name}</b><small>{a.cost} PN{a.damage?` · +${a.damage}`:' · efeito narrativo'}</small></span></button>})}</div>
        {st.techCorePending&&<div className="hu-tech-pending"><strong>{st.techCorePending.name} · ATIVADO</strong><span>{st.techCorePending.effect}</span><small>PN já descontados.</small><Button variant="outline" disabled={readOnly} onClick={()=>update({abilities:withSheetState(character,{techCorePending:null})})}>Descartar efeito sem reembolso</Button></div>}
      </div>
    </>}
    {stage>=1 && selected && <div className="hu-tech-history"><strong>Herança do Estágio 1 · {TECH_GS_PATHS.find(p=>p.id===selected)?.name}</strong><span>{claimed} marco(s) preservado(s)</span><p>Os marcos tecnológicos conquistados no Despertar continuam disponíveis nos estágios seguintes.</p></div>}
    {canAdvance&&<div className="hu-tech-claim"><Button type="button" disabled={readOnly} onClick={advance}><Sparkles size={17}/> Avançar para {LINEAGE_STAGES[character.lineage]?.[stage+1]?.name}</Button><p className="hu-tech-hint">Avançar adiciona o ponto ao orçamento de atributos; escolha onde gastá-lo na ficha e cadastre sua nova Habilidade de Núcleo.</p></div>}
    <TechEyePanel character={character} update={update} readOnly={readOnly}/>
    {feedback&&<p className="hu-tech-feedback" role="status">{feedback}</p>}
  </section>;
}

/** Passiva de estágio. O registro abaixo é um auxílio visual manual;
 * o bônus NÃO é injetado automaticamente na resolução de combate. */
export function TechEyePanel({ character, update, readOnly = false }: Props) {
  const st = sheetState(character);
  const rules = techEyeRules(character);
  const sightings = st.techSightings ?? [];
  const [entry,setEntry]=useState('');
  const [source,setSource]=useState('');
  const [expanded,setExpanded]=useState(false);
  if (!isTechAgent(character.lineage)) return null;
  const save = (next: TechSighting[]) => update({ abilities: withSheetState(character, { techSightings: next }) });
  const add = () => {
    const name=entry.trim().slice(0,120);if (!name) return;
    save([...sightings,{name,source:source.trim().slice(0,120),repeats:0}]);
    setEntry('');setSource('');
  };
  const bonus = (n: number) => Math.min(rules.max, rules.seen + rules.increment * n);
  return <div className="hu-tech-eye">
    <button type="button" className="hu-tech-eye-toggle" aria-expanded={expanded} onClick={()=>setExpanded(x=>!x)}><Eye size={22}/><span><strong>Passiva: Olho Tecnológico · {rules.name}</strong><small>Estágio {stageIndexFor(character.lineage,character.stage)+1} · avistar não gasta ação</small></span><span className="hu-tech-eye-bonus">+{rules.seen} Bloqueio</span></button>
    <div className="hu-tech-eye-metrics">
      <div><small>AO AVISTAR</small><strong>+{rules.seen}</strong><span>Bloqueio</span></div>
      <div><small>POR REPETIÇÃO</small><strong>{rules.increment?`+${rules.increment}`:'Anular'}</strong><span>{rules.increment?'até o máximo':'3 PN / teste'}</span></div>
      <div><small>LIMITE</small><strong>+{rules.max}</strong><span>Bloqueio extra</span></div>
      <div><small>CALIBRAGEM</small><strong>+{rules.damage}</strong><span>Dano fixo</span></div>
    </div>
    {expanded&&<div className="hu-tech-eye-details">
      <p>Ao <strong>ver</strong> uma habilidade usada, registre-a nesta cena. O Bloqueio extra só se aplica quando essa habilidade registrada for usada posteriormente contra você. A Calibragem é contra a criatura que executou a habilidade, até o fim da cena. Esses bônus não acumulam entre habilidades.</p>
      {rules.canCancel && <p><strong>Anulação:</strong> ao ver a mesma habilidade registrada ser usada contra você, gaste 3 PN como Reação e faça um teste do dado de TECNOLOGIA contra DT 5 (Rápida), 7 (Calibrada) ou 9 (Plena), ajustável pelo Mestre. Se falhar, os PN são gastos e o Bloqueio extra permanece.</p>}
      <div className="hu-tech-eye-entry"><input value={entry} onChange={e=>setEntry(e.target.value)} placeholder="Técnica avistada nesta cena" aria-label="Nome da habilidade avistada" maxLength={120}/><input value={source} onChange={e=>setSource(e.target.value)} placeholder="Criatura que usou (opcional)" aria-label="Origem da técnica" maxLength={120}/><Button type="button" onClick={add} disabled={readOnly||!entry.trim()}><Plus size={16}/> Registrar</Button></div>
      {sightings.length>0&&<div className="hu-tech-eye-list">{sightings.map((t,i)=><div className="hu-tech-eye-record" key={`${i}:${t.name}`}><div><strong>{t.name}</strong><small>{t.source||'Origem não identificada'} · {t.repeats} repetição(ões)</small><span>Bloqueio extra: +{bonus(t.repeats)} · Calibragem: +{rules.damage}</span></div><div className="hu-tech-eye-buttons"><button type="button" title="Diminuir repetições" aria-label={`Diminuir repetições de ${t.name}`} disabled={readOnly||t.repeats===0} onClick={()=>save(sightings.map((s,j)=>j===i?{...s,repeats:Math.max(0,s.repeats-1)}:s))}><Minus size={16}/></button><button type="button" title="Registrar repetição" aria-label={`Registrar repetição de ${t.name}`} disabled={readOnly} onClick={()=>save(sightings.map((s,j)=>j===i?{...s,repeats:Math.min(99,s.repeats+1)}:s))}><Plus size={16}/></button><button type="button" title="Remover registro" aria-label={`Remover registro de ${t.name}`} disabled={readOnly} onClick={()=>save(sightings.filter((_,j)=>j!==i))}><X size={16}/></button></div></div>)}</div>}
      {sightings.length>0&&<Button type="button" variant="outline" disabled={readOnly} onClick={()=>{if(window.confirm('Limpar os registros do Olho Tecnológico desta cena?'))save([])}}>Encerrar cena e limpar registros</Button>}
      <p className="hu-tech-hint"><Activity size={14}/> Registro manual de acompanhamento. A passiva ainda não aplica bônus automaticamente no painel de combate.</p>
    </div>}
  </div>;
}
