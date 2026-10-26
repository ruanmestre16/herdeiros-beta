import { useState } from 'react';
import { ArrowLeft, BookOpen, Search, X, UserRound, Skull, Zap, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Stepper } from './Controls';
import { derived, normalizeCharacter, karmaMaximum, LINEAGE_STAGES, type Character, type Npc } from '@/lib/game';
import { BESTIARY, BESTIARY_CATEGORIES, BESTIARY_PDF, type BestiaryTemplate } from '@/lib/bestiary';
import { mkConfigFor, mkCampaignCards, mkCampaignValues, mkNucleusProtocols, nucleusAsNomenclatures, splitBestiaryAbilities, type MasterAbility, type MkEdition, type MkPreset } from '@/lib/master-bestiary';
import { MasterAbilityCards } from './MasterAbilityCards';

/** Os dados especiais pertencem à ficha embutida do NPC: nenhuma migração no Supabase. */
export type GakiMonster = { style: 'Animalístico' | 'Humano'; threat: number };
export type BestiaryMeta = {
  templateId: string; category: string; threat: number; deslocamento: string;
  ataques: string; habilidades: string; dt: string; observacoes: string;
  pdfPage: number; esquiva: number; bloqueio: number;
  attackOverrides?: Record<string, { damage?: string; critical?: string; damageType?: string }>;
  abilityCards?: MasterAbility[];
  nucleusCards?: MasterAbility[];
  gsCards?: MasterAbility[];
  mkPreset?: MkPreset;
};
export type MonsterSheet = Character & { gaki?: GakiMonster; bestiary?: BestiaryMeta };
export const GAKI_STYLES: GakiMonster['style'][] = ['Animalístico', 'Humano'];
export const threatTier = (t: number) => t >= 20 ? 'Lendário' : t >= 10 ? 'Temível' : t >= 7 ? 'Mortal' : t >= 3 ? 'Perigoso' : 'Fraco';
type Step = 'choose' | 'templates' | 'monster' | 'lineage';
export type NewNpcResult = { npc: Partial<Npc>; sheet: MonsterSheet };
const LINEAGES = ['Humano', 'Agente Tecnológico', 'Arcadiano', 'Gaki'] as const;
const defaultAttr = (threat: number) => threat >= 20 ? 5 : threat >= 10 ? 4 : threat >= 5 ? 3 : threat >= 3 ? 2 : 1;
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span className="field-label">{label}</span>{children}</label>; }

/** Criar uma ficha de monstro (modelo de livro ou original) ou Herdeiro (linhagem). */
export function NewNpcDialog({ close, create, initialStep = 'choose' }: { close: () => void; create: (r: NewNpcResult) => void; initialStep?:Step }) {
  const [step, setStep] = useState<Step>(initialStep);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [templateId, setTemplateId] = useState('');
  const [category, setCategory] = useState('Monstro original');
  const [name, setName] = useState('');
  const [style, setStyle] = useState<GakiMonster['style']>('Animalístico');
  const [threat, setThreat] = useState(1);
  const [pv, setPv] = useState(25);
  const [pf, setPf] = useState(0);
  const [esquiva, setEsquiva] = useState(10);
  const [bloqueio, setBloqueio] = useState(3);
  const [deslocamento, setDeslocamento] = useState('9 m');
  const [attrs, setAttrs] = useState({ corpo: 1, mente: 1, espirito: 1 });
  const [note, setNote] = useState('');
  const [attacks, setAttacks] = useState('');
  const [abilities, setAbilities] = useState('');
  const [dts, setDts] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [page, setPage] = useState(0);
  const [abilityCards, setAbilityCards] = useState<MasterAbility[]>([]);
  const [gsCards, setGsCards] = useState<MasterAbility[]>([]);
  const [nucleusCards,setNucleusCards] = useState<MasterAbility[]>([]);
  const [edition,setEdition] = useState<MkEdition>('livro');
  const [templateSource,setTemplateSource] = useState<BestiaryTemplate|null>(null);
  const [lineage, setLineage] = useState<(typeof LINEAGES)[number]>('Humano');
  const [stageIdx, setStageIdx] = useState(0);
  const [lAttrs, setLAttrs] = useState({ corpo: 1, mente: 1, espirito: 1 });
  const [concept, setConcept] = useState('');
  const [lName, setLName] = useState('');
  const [lineageAbilities,setLineageAbilities] = useState<MasterAbility[]>([]);
  const [lineageNucleus,setLineageNucleus] = useState<MasterAbility[]>([
    {id:'lineage-rapid',name:'Ativação Rápida',description:'Defina o primeiro protocolo do Núcleo (1d6 de base).',type:'nucleo',cost:'2 PN'},
    {id:'lineage-calibrated',name:'Ativação Calibrada',description:'Defina o protocolo intermediário do Núcleo (2d8 de base).',type:'nucleo',cost:'5 PN'},
    {id:'lineage-full',name:'Ativação Plena',description:'Defina a autorização total (6d8 de base).',type:'nucleo',cost:'12 PN'},
  ]);

  const applyEdition=(t:BestiaryTemplate,nextEdition:MkEdition) => {
    const values=mkCampaignValues(t,nextEdition);
    setPv(values.pv);setPf(values.pf);setThreat(values.na);setEdition(nextEdition);
    setAbilityCards(splitBestiaryAbilities(t.habilidades));
    setGsCards(nextEdition==='campanha'?mkCampaignCards(t.id):[]);
    setNucleusCards(nextEdition==='campanha'?mkNucleusProtocols(t.id):[]);
  };
  const loadTemplate = (t: BestiaryTemplate) => {
    setTemplateSource(t);setTemplateId(t.id);setCategory(t.category);setName(t.name);
    setEsquiva(t.esquiva);setBloqueio(t.bloqueio);
    setDeslocamento(t.deslocamento);setAttrs({ corpo: t.corpo, mente: t.mente, espirito: t.espirito });
    setNote(t.descricao);setAttacks(t.ataques);setAbilities(t.habilidades);setDts(t.dt);
    setObservacoes(t.observacoes);setPage(t.page);
    setStyle(t.category.startsWith('Gakis') || t.category.startsWith('Mutagênicos') ? 'Humano' : 'Animalístico');
    applyEdition(t,mkConfigFor(t.id)?'campanha':'livro');
    setStep('monster');
  };
  const startBlankMonster = () => {
    setTemplateId(''); setCategory('Monstro original'); setName(''); setThreat(1); setPv(25); setPf(0);
    setAttrs({ corpo: 1, mente: 1, espirito: 1 }); setEsquiva(10); setBloqueio(3);
    setDeslocamento('9 m'); setAttacks(''); setAbilities(''); setDts(''); setNote(''); setObservacoes(''); setPage(0);
    setTemplateSource(null);setEdition('livro');setAbilityCards([]);setGsCards([]);setNucleusCards([]);
    setStep('monster');
  };
  const finish = (sheet: MonsterSheet, kind: 'npc'|'inimigo'='inimigo') => {
    const d = derived(sheet.corpo);
    create({ sheet, npc: {
      name: sheet.name, kind, hidden: true, pv_current: sheet.pv_current, pv_max: sheet.pv_max,
      pf_current: sheet.pf_current, pf_max: sheet.pf_max, corpo: sheet.corpo, mente: sheet.mente, espirito: sheet.espirito,
      esquiva: sheet.bestiary?.esquiva ?? d.esquiva, bloqueio: sheet.bestiary?.bloqueio ?? d.bloqueio,
    } });
  };
  const saveMonster = () => {
    const sheet: MonsterSheet = normalizeCharacter({
      id: crypto.randomUUID(), name: name.trim() || 'Monstro sem nome',
      lineage: category === 'Agentes do Consórcio' ? 'Agente Tecnológico' : category.startsWith('Gakis') || category.startsWith('Mutagênicos') ? 'Gaki' : 'Criatura',
      stage: category === 'Agentes do Consórcio' ? (LINEAGE_STAGES['Agente Tecnológico']?.[Math.max(0,(mkConfigFor(templateId)?.stage??1)-1)]?.name ?? '') : (LINEAGE_STAGES['Gaki']?.[0]?.name ?? ''),
      gs: edition==='campanha'&&mkConfigFor(templateId)?10:0, concept: note, ...attrs,
      pv_current: pv, pv_max: pv, pf_max: pf, pf_current: pf,
    });
    sheet.karma = karmaMaximum(sheet.mente, sheet.espirito);
    if (nucleusCards.length) sheet.nomenclatures=nucleusAsNomenclatures(nucleusCards);
    // O campo gaki só identifica Gakis; bestiary identifica qualquer tipo de monstro.
    if (category.startsWith('Gakis') || category.startsWith('Mutagênicos') || !templateId) sheet.gaki = { style, threat };
    sheet.bestiary = { templateId, category, threat, deslocamento, ataques: attacks, habilidades: abilities,
      dt: dts, observacoes, pdfPage: page, esquiva, bloqueio, abilityCards, nucleusCards, gsCards,
      ...(templateSource && mkConfigFor(templateSource.id) ? {mkPreset: {edition,stage: edition==='campanha'?mkConfigFor(templateSource.id)!.stage:0, path: edition==='campanha'?mkConfigFor(templateSource.id)!.path:'Modelo do livro',description:edition==='campanha'?mkConfigFor(templateSource.id)!.description:'Valores oficiais do Bestiário'}} : {}) };
    finish(sheet);
  };
  const saveLineage = () => {
    const d = derived(lAttrs.corpo);
    finish(normalizeCharacter({
      id: crypto.randomUUID(), name: lName.trim() || 'Novo Herdeiro', lineage,
      stage: LINEAGE_STAGES[lineage]?.[stageIdx]?.name ?? '', concept, ...lAttrs,
      pv_current: d.pv, pv_max: d.pv, pf_max: lAttrs.espirito * 20, pf_current: lAttrs.espirito * 20,
      abilities: lineageAbilities.map(a=>({name:a.name,description:`${a.cost?`Custo ${a.cost}: `:''}${a.description}`})),
      nomenclatures: lineage==='Agente Tecnológico' ? nucleusAsNomenclatures(lineageNucleus) : [],
    }),'npc');
  };
  const filtered = BESTIARY.filter(t =>
    (categoryFilter === 'Todas' || categoryFilter === t.category) &&
    `${t.name} ${t.category}`.toLocaleLowerCase('pt-BR').includes(filter.toLocaleLowerCase('pt-BR')),
  );

  return <div className="modal-backdrop" onMouseDown={close}>
    <div className="auth-modal hm-dialog" role="dialog" aria-modal="true" aria-label="Criar ficha para a mesa" style={{maxHeight:'94dvh',overflowY:'auto',width:'min(94vw,720px)',paddingBottom:12}} onMouseDown={e=>e.stopPropagation()}>
      <Button variant="ghost" size="icon" className="modal-close" onClick={close} aria-label="Fechar"><X/></Button>
      <span className="eyebrow subtle">MESTRE / FICHAS DA MESA</span>
      {step==='choose'&&<>
        <h2>Quem entra na história?</h2>
        <p className="empty-copy">Escolha um tipo de ficha. Depois de criada, ela aparece automaticamente na sua lista de NPCs e inimigos e pode ser exportada para suas fichas pessoais.</p>
        <div className="hm-choices">
          <button className="hm-choice" type="button" onClick={()=>setStep('templates')}><Skull size={24}/><strong>Bestiário</strong><small>Escolher um monstro do livro. Todos os valores continuam editáveis.</small></button>
          <button className="hm-choice" type="button" onClick={()=>setStep('lineage')}><UserRound size={24}/><strong>Herdeiro ou NPC</strong><small>Humano, Agente Tecnológico, Arcadiano ou Gaki com ficha completa.</small></button>
          <button className="hm-choice" type="button" onClick={startBlankMonster}><Plus size={24}/><strong>Monstro original</strong><small>Criar um inimigo do zero, com DT, ataques e habilidades próprias.</small></button>
        </div>
      </>}
      {step==='templates'&&<>
        <h2>Escolha uma criatura</h2>
        <p className="empty-copy">Modelos do Bestiário para usar como ponto de partida. O Mestre poderá modificar qualquer campo.</p>
        <div className="field-stack mt-4">
          <Field label="BUSCAR NO BESTIÁRIO"><div className="flex gap-2 items-center"><Search size={18}/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Nome do monstro..."/></div></Field>
          <Field label="CATEGORIA"><select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option>Todas</option>{BESTIARY_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></Field>
          <div className="mb-catalog-grid">{filtered.map(t=><button className="mb-catalog-card" type="button" key={t.id} onClick={()=>loadTemplate(t)}>
             <span className="mb-catalog-chip">{t.category}</span><strong>{t.name}</strong><div className="mb-catalog-values"><span>NA {t.na}</span><span>{t.pv} PV</span><span>Esquiva {t.esquiva}</span></div>
             {mkConfigFor(t.id)&&<small>✦ Também disponível como versão reforçada</small>}
           </button>)}</div>
          {!filtered.length&&<p className="empty-copy">Nenhum resultado.</p>}
          <a href={BESTIARY_PDF} target="_blank" rel="noreferrer" className="text-flux"><BookOpen size={15} style={{display:'inline'}}/> Ler PDF completo</a>
          <Button variant="outline" onClick={()=>setStep('choose')}><ArrowLeft size={16}/> Voltar</Button>
        </div>
      </>}
      {step==='monster'&&<>
        <h2>{templateId?'Monstro do Bestiário':'Monstro original'}</h2>
        <p className="empty-copy">Preencha o essencial primeiro; clique nas outras seções somente quando precisar. Nada será perdido na ficha.</p>
        {templateSource && mkConfigFor(templateSource.id) && <div className="mb-quick-banner mt-4">
          <div style={{flex:1,minWidth:190}}><strong>Agente Tecnológico · MK</strong><br/><small>Escolha os números oficiais ou a versão de campanha com os marcos de GS.</small></div>
          <div className="mb-edition-picker" style={{flex:2}}>
            <button type="button" aria-pressed={edition==='livro'} onClick={()=>applyEdition(templateSource,'livro')}><strong>Original do livro</strong><br/>PV {templateSource.pv} · PN {templateSource.pf}</button>
            <button type="button" aria-pressed={edition==='campanha'} onClick={()=>applyEdition(templateSource,'campanha')}><strong>Reforçado · Campanha</strong><br/>PV {mkCampaignValues(templateSource,'campanha').pv} · PN {mkCampaignValues(templateSource,'campanha').pf}</button>
          </div>
          <small>{mkConfigFor(templateSource.id)?.description} O Mestre pode editar todos os dados.</small>
        </div>}
        <div className="hu-hero-stats mt-4"><div><small>PV</small><strong>{pv}</strong></div><div><small>PF / PN</small><strong>{pf}</strong></div><div><small>ESQUIVA</small><strong>{esquiva}</strong></div><div><small>BLOQUEIO</small><strong>{bloqueio}</strong></div></div>
        <div className="field-stack mt-4">
          <details className="hm-step-section" open>
            <summary>01 · Identidade, ameaça e atributos</summary>
            <div className="hm-step-body">
              <Field label="NOME"><input value={name} onChange={e=>setName(e.target.value)}/></Field>
              <Field label="CATEGORIA"><input value={category} onChange={e=>setCategory(e.target.value)}/></Field>
              <Stepper label={`NÍVEL DE AMEAÇA · ${threatTier(threat).toUpperCase()}`} value={threat} min={1} max={99} onChange={setThreat}/>
              <div className="npc-stats"><Stepper label="PV MÁXIMO" value={pv} min={1} max={9999} tone="health" onChange={setPv}/><Stepper label="PF / NÚCLEO" value={pf} min={0} max={9999} tone="flux" onChange={setPf}/></div>
              <div className="npc-stats">{(['corpo','mente','espirito'] as const).map(a=><Stepper key={a} label={a.toUpperCase()} value={attrs[a]} min={1} max={12} onChange={v=>setAttrs({...attrs,[a]:v})}/>)}</div>
            </div>
          </details>
          <details className="hm-step-section"><summary>02 · Defesa, deslocamento e DTs</summary>
            <div className="hm-step-body"><div className="npc-stats"><Stepper label="ESQUIVA" value={esquiva} min={0} max={99} onChange={setEsquiva}/><Stepper label="BLOQUEIO" value={bloqueio} min={0} max={99} onChange={setBloqueio}/></div>
              <Field label="DESLOCAMENTO"><input value={deslocamento} onChange={e=>setDeslocamento(e.target.value)} placeholder="Ex.: 12 m"/></Field>
              <Field label="DT / TESTES"><textarea rows={3} value={dts} onChange={e=>setDts(e.target.value)} placeholder="Ex.: Corpo DT 5 para resistir ao veneno"/></Field>
            </div>
          </details>
          <details className="hm-step-section"><summary>03 · Ataques, dano e habilidades</summary>
            <div className="hm-step-body"><Field label="ATAQUES · ACERTO · DANO · CRÍTICO"><textarea rows={5} value={attacks} onChange={e=>setAttacks(e.target.value)}/></Field>
              <MasterAbilityCards title="Habilidades e protocolos" abilities={abilityCards} onChange={setAbilityCards}/>
              {templateId && <details className="hm-step-section"><summary>Texto original do Bestiário (referência)</summary><div className="hm-step-body">
                <p className="empty-copy">Os cartões são editáveis e independentes. O texto original é preservado para consulta.</p>
                <textarea rows={5} value={abilities} onChange={e=>setAbilities(e.target.value)}/>
              </div></details>}
              {!templateId && <p className="empty-copy">Adicione habilidades pelos cartões acima, sem precisar escrever um texto corrido.</p>}
              {nucleusCards.length>0&&<MasterAbilityCards title="Habilidades de Núcleo · 3 ativações" abilities={nucleusCards} onChange={setNucleusCards} type="nucleo"/>}
              {gsCards.length>0 && <MasterAbilityCards title="Caminho de GS · versão reforçada" abilities={gsCards} onChange={setGsCards} type="gs"/>}
            </div>
          </details>
          <details className="hm-step-section"><summary>04 · Lore e anotações do Mestre</summary>
            <div className="hm-step-body"><Field label="DESCRIÇÃO"><textarea rows={3} value={note} onChange={e=>setNote(e.target.value)}/></Field>
              <Field label="NOTAS PRIVADAS"><textarea rows={3} value={observacoes} onChange={e=>setObservacoes(e.target.value)}/></Field>
              {page>0&&<a href={`${BESTIARY_PDF}#page=${page}`} target="_blank" rel="noreferrer" className="text-flux"><BookOpen size={15} style={{display:'inline'}}/> Livro, página {page}</a>}
            </div>
          </details>
          <div className="hm-sticky-actions"><Button onClick={saveMonster}><Check size={17}/> Criar ficha para a mesa</Button><Button variant="outline" onClick={()=>setStep(templateId?'templates':'choose')}>Trocar modelo</Button></div>
        </div>
      </>}
      {step==='lineage'&&<>
        <h2>Novo Herdeiro ou NPC</h2>
        <p className="empty-copy">O Agente Tecnológico é uma variação dos Humanos. Use TECNOLOGIA no lugar de ESPÍRITO e PN no lugar de PF.</p>
        <div className="field-stack mt-4">
          <Field label="NOME"><input value={lName} onChange={e=>setLName(e.target.value)} placeholder="Nome do personagem"/></Field>
          <div className="h-sheet-lineage-group"><strong>HUMANOS</strong><div className="hm-choices" style={{marginTop:0}}>
            {(['Humano','Agente Tecnológico'] as const).map(l=><button key={l} type="button" className={`hm-choice ${lineage===l?'selected':''}`} aria-pressed={lineage===l} onClick={()=>{setLineage(l);setStageIdx(0)}}>{l==='Humano'?<UserRound size={21}/>:<Zap size={21}/>}<strong>{l==='Humano'?'Humano padrão':'Agente Tecnológico'}</strong><small>{l==='Humano'?'MENTE · Arma de Vínculo · PF':'TECNOLOGIA · Arma de Núcleo · PN'}</small></button>)}
          </div></div>
          <div className="h-sheet-lineage-group"><strong>OUTRAS LINHAGENS</strong><div className="hm-choices" style={{marginTop:0}}>{(['Arcadiano','Gaki'] as const).map(l=><button key={l} type="button" className={`hm-choice ${lineage===l?'selected':''}`} aria-pressed={lineage===l} onClick={()=>{setLineage(l);setStageIdx(0)}}><UserRound size={21}/><strong>{l}</strong><small>{l==='Arcadiano'?'ESPÍRITO · Arma de Ego':'CORPO · Corpo moldado'}</small></button>)}</div></div>
          <details open className="hm-step-section"><summary>01 · Atributos e estágio</summary><div className="hm-step-body">
            <Field label="ESTÁGIO"><select value={stageIdx} onChange={e=>setStageIdx(Number(e.target.value))}>{(LINEAGE_STAGES[lineage]??[]).map((s,i)=><option key={s.name} value={i}>{i+1}. {s.name}</option>)}</select></Field>
            <div className="npc-stats">{(['corpo','mente','espirito'] as const).map(a=><Stepper key={a} label={lineage==='Agente Tecnológico'&&a==='espirito'?'TECNOLOGIA':a.toUpperCase()} value={lAttrs[a]} min={1} max={5} onChange={v=>setLAttrs({...lAttrs,[a]:v})}/>)}</div>
            <p className="empty-copy">PV {derived(lAttrs.corpo).pv} · {lineage==='Agente Tecnológico'?'PN':'PF'} máximo {lAttrs.espirito*20}. Como Mestre, você pode ajustar os números da ficha depois de criá-la.</p>
          </div></details>
          <details className="hm-step-section"><summary>02 · Conceito e história</summary><div className="hm-step-body"><Field label="CONCEITO"><input value={concept} onChange={e=>setConcept(e.target.value)}/></Field></div></details>
          <details className="hm-step-section"><summary>03 · Habilidades e poderes iniciais</summary><div className="hm-step-body">
            <MasterAbilityCards title="Habilidades do NPC" abilities={lineageAbilities} onChange={setLineageAbilities}/>
            {lineage==='Agente Tecnológico'&&<MasterAbilityCards title="Ativações do Núcleo · nomes editáveis" abilities={lineageNucleus} onChange={setLineageNucleus} type="nucleo"/>}
            <p className="empty-copy">Esses poderes entram na ficha da mesa e podem ser editados depois. As três Ativações usam os custos oficiais de 2, 5 e 12 PN.</p>
          </div></details>
          <div className="hm-sticky-actions"><Button onClick={saveLineage}><Check size={17}/> Criar ficha na mesa</Button><Button variant="outline" onClick={()=>setStep('choose')}>Voltar</Button></div>
        </div>
      </>}
    </div>
  </div>;
}
