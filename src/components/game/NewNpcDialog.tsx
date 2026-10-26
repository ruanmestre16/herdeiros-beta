import { useState } from 'react';
import { ArrowLeft, BookOpen, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Stepper } from './Controls';
import { derived, normalizeCharacter, karmaMaximum, LINEAGE_STAGES, type Character, type Npc } from '@/lib/game';
import { BESTIARY, BESTIARY_CATEGORIES, BESTIARY_PDF, type BestiaryTemplate } from '@/lib/bestiary';

/** Os dados especiais pertencem à ficha embutida do NPC: nenhuma migração no Supabase. */
export type GakiMonster = { style: 'Animalístico' | 'Humano'; threat: number };
export type BestiaryMeta = {
  templateId: string; category: string; threat: number; deslocamento: string;
  ataques: string; habilidades: string; dt: string; observacoes: string;
  pdfPage: number; esquiva: number; bloqueio: number;
  attackOverrides?: Record<string, { damage?: string; critical?: string; damageType?: string }>;
};
export type MonsterSheet = Character & { gaki?: GakiMonster; bestiary?: BestiaryMeta };
export const GAKI_STYLES: GakiMonster['style'][] = ['Animalístico', 'Humano'];
export const threatTier = (t: number) => t >= 20 ? 'Lendário' : t >= 10 ? 'Temível' : t >= 7 ? 'Mortal' : t >= 3 ? 'Perigoso' : 'Fraco';
type Step = 'choose' | 'templates' | 'monster' | 'lineage';
export type NewNpcResult = { npc: Partial<Npc>; sheet: MonsterSheet };
const LINEAGES = ['Humano', 'Arcadiano', 'Gaki', 'Agente Tecnológico'] as const;
const defaultAttr = (threat: number) => threat >= 20 ? 5 : threat >= 10 ? 4 : threat >= 5 ? 3 : threat >= 3 ? 2 : 1;
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span className="field-label">{label}</span>{children}</label>; }

/** Criar uma ficha de monstro (modelo de livro ou original) ou Herdeiro (linhagem). */
export function NewNpcDialog({ close, create }: { close: () => void; create: (r: NewNpcResult) => void }) {
  const [step, setStep] = useState<Step>('choose');
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
  const [lineage, setLineage] = useState<(typeof LINEAGES)[number]>('Humano');
  const [stageIdx, setStageIdx] = useState(0);
  const [lAttrs, setLAttrs] = useState({ corpo: 1, mente: 1, espirito: 1 });
  const [concept, setConcept] = useState('');
  const [lName, setLName] = useState('');

  const loadTemplate = (t: BestiaryTemplate) => {
    setTemplateId(t.id); setCategory(t.category); setName(t.name);
    setThreat(t.na); setPv(t.pv); setPf(t.pf); setEsquiva(t.esquiva); setBloqueio(t.bloqueio);
    setDeslocamento(t.deslocamento); setAttrs({ corpo: t.corpo, mente: t.mente, espirito: t.espirito });
    setNote(t.descricao); setAttacks(t.ataques); setAbilities(t.habilidades); setDts(t.dt);
    setObservacoes(t.observacoes); setPage(t.page);
    setStyle(t.category.startsWith('Gakis') || t.category.startsWith('Mutagênicos') ? 'Humano' : 'Animalístico');
    setStep('monster');
  };
  const startBlankMonster = () => {
    setTemplateId(''); setCategory('Monstro original'); setName(''); setThreat(1); setPv(25); setPf(0);
    setAttrs({ corpo: 1, mente: 1, espirito: 1 }); setEsquiva(10); setBloqueio(3);
    setDeslocamento('9 m'); setAttacks(''); setAbilities(''); setDts(''); setNote(''); setObservacoes(''); setPage(0);
    setStep('monster');
  };
  const finish = (sheet: MonsterSheet) => {
    const d = derived(sheet.corpo);
    create({ sheet, npc: {
      name: sheet.name, kind: 'inimigo', hidden: true, pv_current: sheet.pv_current, pv_max: sheet.pv_max,
      pf_current: sheet.pf_current, pf_max: sheet.pf_max, corpo: sheet.corpo, mente: sheet.mente, espirito: sheet.espirito,
      esquiva: sheet.bestiary?.esquiva ?? d.esquiva, bloqueio: sheet.bestiary?.bloqueio ?? d.bloqueio,
    } });
  };
  const saveMonster = () => {
    const sheet: MonsterSheet = normalizeCharacter({
      id: crypto.randomUUID(), name: name.trim() || 'Monstro sem nome',
      lineage: category === 'Agentes do Consórcio' ? 'Agente Tecnológico' : category.startsWith('Gakis') || category.startsWith('Mutagênicos') ? 'Gaki' : 'Criatura',
      stage: LINEAGE_STAGES['Gaki']?.[0]?.name ?? '', concept: note, ...attrs,
      pv_current: pv, pv_max: pv, pf_max: pf, pf_current: pf,
    });
    sheet.karma = karmaMaximum(sheet.mente, sheet.espirito);
    // O campo gaki só identifica Gakis; bestiary identifica qualquer tipo de monstro.
    if (category.startsWith('Gakis') || category.startsWith('Mutagênicos') || !templateId) sheet.gaki = { style, threat };
    sheet.bestiary = { templateId, category, threat, deslocamento, ataques: attacks, habilidades: abilities,
      dt: dts, observacoes, pdfPage: page, esquiva, bloqueio };
    finish(sheet);
  };
  const saveLineage = () => {
    const d = derived(lAttrs.corpo);
    finish(normalizeCharacter({
      id: crypto.randomUUID(), name: lName.trim() || 'Novo Herdeiro', lineage,
      stage: LINEAGE_STAGES[lineage]?.[stageIdx]?.name ?? '', concept, ...lAttrs,
      pv_current: d.pv, pv_max: d.pv, pf_max: lAttrs.espirito * 20, pf_current: lAttrs.espirito * 20,
    }));
  };
  const filtered = BESTIARY.filter(t =>
    (categoryFilter === 'Todas' || categoryFilter === t.category) &&
    `${t.name} ${t.category}`.toLocaleLowerCase('pt-BR').includes(filter.toLocaleLowerCase('pt-BR')),
  );

  return <div className="modal-backdrop" onMouseDown={close}>
    <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Criar ficha de combate" style={{ maxHeight: '92vh', overflowY: 'auto', width: 'min(92vw, 670px)' }} onMouseDown={e => e.stopPropagation()}>
      <Button variant="ghost" size="icon" className="modal-close" onClick={close} aria-label="Fechar"><X /></Button>
      <span className="eyebrow subtle">MESTRE / NOVA FICHA DE COMBATE</span>

      {step === 'choose' && <><h2>Qual ficha deseja criar?</h2><div className="field-stack mt-5">
        <Button onClick={() => setStep('templates')}>Criar ficha de monstro · Bestiário</Button>
        <Button variant="outline" onClick={() => setStep('lineage')}>Criar ficha de Herdeiro</Button>
        <Button variant="ghost" onClick={startBlankMonster}>Criar monstro original (em branco)</Button>
      </div></>}

      {step === 'templates' && <><h2>Escolher criatura do Bestiário</h2>
        <p className="empty-copy">26 modelos oficiais · todos os campos poderão ser alterados pelo Mestre.</p>
        <div className="field-stack mt-4">
          <Field label="BUSCAR CRIATURA"><div className="flex gap-2 items-center"><Search size={18}/><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Nome ou categoria..." /></div></Field>
          <Field label="CATEGORIA"><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option>Todas</option>{BESTIARY_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
          <div style={{ maxHeight: 350, overflowY: 'auto', display: 'grid', gap: 8 }}>
            {filtered.map(t => <Button key={t.id} className="w-full" variant="outline" onClick={() => loadTemplate(t)}>
              <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'normal' }}>{t.name} · NA {t.na} · {t.pv} PV</span>
            </Button>)}
            {!filtered.length && <p className="empty-copy">Nenhuma criatura encontrada.</p>}
          </div>
          <a href={BESTIARY_PDF} target="_blank" rel="noreferrer" className="text-flux"><BookOpen size={15} style={{ display: 'inline' }} /> Consultar o PDF completo</a>
          <Button variant="ghost" onClick={() => setStep('choose')}><ArrowLeft /> Voltar</Button>
        </div>
      </>}

      {step === 'monster' && <><h2>{templateId ? 'Ficha baseada no Bestiário' : 'Monstro original'}</h2>
        <p className="empty-copy">Edite à vontade. Os números do livro são apenas o ponto de partida, inclusive para criaturas com atributos acima dos limites de Herdeiros.</p>
        <div className="field-stack mt-5">
          <Field label="NOME DO MONSTRO"><input value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label="CATEGORIA / TIPO"><input value={category} onChange={e => setCategory(e.target.value)} /></Field>
          <Stepper label={`NÍVEL DE AMEAÇA — ${threatTier(threat).toUpperCase()}`} value={threat} min={1} max={99} onChange={setThreat}/>
          <div className="npc-stats">
            <Stepper label="PV MÁXIMO" value={pv} min={1} max={9999} tone="health" onChange={setPv}/>
            <Stepper label="PF / NÚCLEO" value={pf} min={0} max={9999} tone="flux" onChange={setPf}/>
          </div>
          <div className="npc-stats">
            {(['corpo','mente','espirito'] as const).map(a => <Stepper key={a} label={a.toUpperCase()} value={attrs[a]} min={1} max={12} onChange={v => setAttrs({ ...attrs, [a]: v })}/>)}
          </div>
          <div className="npc-stats"><Stepper label="ESQUIVA" value={esquiva} min={0} max={99} onChange={setEsquiva}/><Stepper label="BLOQUEIO" value={bloqueio} min={0} max={99} onChange={setBloqueio}/></div>
          <Field label="DESLOCAMENTO"><input value={deslocamento} onChange={e => setDeslocamento(e.target.value)} placeholder="Ex.: 12 m / 8 m" /></Field>
          <Field label="DT / TESTES"><textarea rows={2} value={dts} onChange={e => setDts(e.target.value)} placeholder="Ex.: Corpo DT 5 (±) para resistir ao veneno" /></Field>
          <Field label="ATAQUES · ACERTO · DANO · CRÍTICO"><textarea rows={6} value={attacks} onChange={e => setAttacks(e.target.value)} /></Field>
          <Field label="HABILIDADES · EFEITOS · REGRAS"><textarea rows={8} value={abilities} onChange={e => setAbilities(e.target.value)} /></Field>
          <Field label="DESCRIÇÃO"><textarea rows={3} value={note} onChange={e => setNote(e.target.value)} /></Field>
          <Field label="OBSERVAÇÕES DO MESTRE"><textarea rows={3} value={observacoes} onChange={e => setObservacoes(e.target.value)} /></Field>
          {page > 0 && <a href={`${BESTIARY_PDF}#page=${page}`} target="_blank" rel="noreferrer" className="text-flux"><BookOpen size={15} style={{ display: 'inline' }} /> Ver página {page} do Bestiário</a>}
          <div className="flex gap-2 flex-wrap"><Button onClick={saveMonster}>Criar ficha editável</Button><Button variant="ghost" onClick={() => setStep('templates')}>Trocar modelo</Button></div>
        </div>
      </>}

      {step === 'lineage' && <><h2>Nova ficha de Herdeiro</h2><div className="field-stack mt-5">
        <Field label="NOME"><input value={lName} onChange={e => setLName(e.target.value)} placeholder="Nome do personagem" /></Field>
        <div className="input-grid">
          <Field label="LINHAGEM"><select value={lineage} onChange={e => {setLineage(e.target.value as (typeof LINEAGES)[number]);setStageIdx(0)}}>{LINEAGES.map(l => <option key={l}>{l}</option>)}</select></Field>
          <Field label="ESTÁGIO"><select value={stageIdx} onChange={e => setStageIdx(Number(e.target.value))}>{(LINEAGE_STAGES[lineage] ?? []).map((s,i) => <option key={s.name} value={i}>{i+1}. {s.name}</option>)}</select></Field>
        </div>
        <div className="npc-stats">{(['corpo','mente','espirito'] as const).map(a => <Stepper key={a} label={a.toUpperCase()} value={lAttrs[a]} min={1} max={5} onChange={v => setLAttrs({...lAttrs,[a]:v})}/>)}</div>
        <p className="empty-copy">PV {derived(lAttrs.corpo).pv} · PF máx. {lAttrs.espirito * 20}. Nomenclaturas e habilidades podem ser alteradas após salvar.</p>
        <Field label="CONCEITO (OPCIONAL)"><input value={concept} onChange={e => setConcept(e.target.value)} /></Field>
        <div className="flex gap-2"><Button onClick={saveLineage}>Criar Herdeiro</Button><Button variant="ghost" onClick={() => setStep('choose')}>Voltar</Button></div>
        </div>
      </>}
    </div>
  </div>;
}
