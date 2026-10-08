import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Stepper } from './Controls';
import { derived, normalizeCharacter, karmaMaximum, LINEAGE_STAGES, type Character, type Npc } from '@/lib/game';

/** Dados do Gaki-monstro, guardados dentro da ficha embutida do NPC (não vai para o banco de fichas). */
export type GakiMonster = { style: 'Animalístico' | 'Humano'; threat: number };
export type MonsterSheet = Character & { gaki?: GakiMonster };
export const GAKI_STYLES: GakiMonster['style'][] = ['Animalístico', 'Humano'];
/** Ameaça: 1–4 normal, 5–8 forte, 9–10 ameaça muito grande. */
export const threatTier = (t: number) => t >= 9 ? 'Ameaça muito grande' : t >= 5 ? 'Forte' : 'Normal';

type Step = 'choose' | 'monster' | 'lineage';
export type NewNpcResult = { npc: Partial<Npc>; sheet: MonsterSheet };
const LINEAGES = ['Humano', 'Arcadiano', 'Gaki'] as const;
const defaultAttr = (threat: number) => Math.min(5, Math.max(1, Math.ceil(threat / 2)));

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span className="field-label">{label}</span>{children}</label>; }

/** Botão "Novo" em NPCs e inimigos: escolher entre Gaki (monstro) ou Linhagem (ficha completa). */
export function NewNpcDialog({ close, create }: { close: () => void; create: (r: NewNpcResult) => void }) {
  const [step, setStep] = useState<Step>('choose');
  const [name, setName] = useState('');
  const [style, setStyle] = useState<GakiMonster['style']>('Animalístico');
  const [threat, setThreat] = useState(1);
  const [pv, setPv] = useState(25);
  const [attrs, setAttrs] = useState({ corpo: defaultAttr(1), mente: defaultAttr(1), espirito: defaultAttr(1) });
  const [note, setNote] = useState('');
  const [lineage, setLineage] = useState<(typeof LINEAGES)[number]>('Humano');
  const [stageIdx, setStageIdx] = useState(0);
  const [lAttrs, setLAttrs] = useState({ corpo: 1, mente: 1, espirito: 1 });
  const [concept, setConcept] = useState('');
  const [lName, setLName] = useState('');

  const finish = (sheet: MonsterSheet) => {
    const d = derived(sheet.corpo);
    create({ sheet, npc: { name: sheet.name, kind: 'inimigo', hidden: true, pv_current: sheet.pv_current, pv_max: sheet.pv_max, pf_current: sheet.pf_current, pf_max: sheet.pf_max, corpo: sheet.corpo, mente: sheet.mente, espirito: sheet.espirito, esquiva: d.esquiva, bloqueio: d.bloqueio } });
  };
  const saveMonster = () => {
    const sheet: MonsterSheet = normalizeCharacter({ id: crypto.randomUUID(), name: name.trim() || 'Gaki sem nome', lineage: 'Gaki', stage: LINEAGE_STAGES['Gaki']?.[0]?.name ?? '', concept: note, ...attrs, pv_current: pv, pv_max: pv, pf_max: attrs.espirito * 20, pf_current: attrs.espirito * 20 });
    sheet.karma = karmaMaximum(sheet.mente, sheet.espirito);
    sheet.gaki = { style, threat };
    finish(sheet);
  };
  const saveLineage = () => {
    const d = derived(lAttrs.corpo);
    finish(normalizeCharacter({ id: crypto.randomUUID(), name: lName.trim() || 'Novo personagem', lineage, stage: LINEAGE_STAGES[lineage]?.[stageIdx]?.name ?? '', concept, ...lAttrs, pv_current: d.pv, pv_max: d.pv, pf_max: lAttrs.espirito * 20, pf_current: lAttrs.espirito * 20 }));
  };

  return <div className="modal-backdrop" onMouseDown={close}>
    <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Novo NPC ou inimigo" style={{ maxHeight: '90vh', overflowY: 'auto' }} onMouseDown={e => e.stopPropagation()}>
      <Button variant="ghost" size="icon" className="modal-close" onClick={close} aria-label="Fechar"><X /></Button>
      <span className="eyebrow subtle">MESTRE / NOVO</span>

      {step === 'choose' && <>
        <h2>O que você quer criar?</h2>
        <div className="field-stack mt-5">
          <Button className="w-full" onClick={() => setStep('monster')}>Criar um Gaki (monstro)</Button>
          <Button className="w-full" variant="outline" onClick={() => setStep('lineage')}>Criar uma linhagem</Button>
        </div>
      </>}

      {step === 'monster' && <>
        <h2>Novo Gaki</h2>
        <div className="field-stack mt-5">
          <Field label="NOME DO GAKI"><input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do monstro" /></Field>
          <Field label="ESTILO"><select value={style} onChange={e => setStyle(e.target.value as GakiMonster['style'])}>{GAKI_STYLES.map(s => <option key={s}>{s}</option>)}</select></Field>
          <Stepper label={`NÍVEL DE AMEAÇA — ${threatTier(threat).toUpperCase()}`} hint="1–4 normal · 5–8 forte · 9–10 muito grande" value={threat} min={1} max={10} onChange={t => { setThreat(t); setAttrs({ corpo: defaultAttr(t), mente: defaultAttr(t), espirito: defaultAttr(t) }); }} />
          <Stepper label="PV" value={pv} min={1} max={999} tone="health" onChange={setPv} />
          <div className="npc-stats">
            {(['corpo', 'mente', 'espirito'] as const).map(a => <Stepper key={a} label={a.toUpperCase()} value={attrs[a]} min={1} max={5} onChange={v => setAttrs({ ...attrs, [a]: v })} />)}
          </div>
          <p className="empty-copy">Karma: <strong className="text-karma">∞ (infinito)</strong>. O Gaki ataca usando o Karma, conforme as habilidades ou o corpo a corpo.</p>
          <Field label="OBSERVAÇÕES / HABILIDADES (OPCIONAL)"><textarea rows={3} value={note} onChange={e => setNote(e.target.value)} /></Field>
          <div className="flex gap-2"><Button onClick={saveMonster}>Salvar</Button><Button variant="ghost" onClick={() => setStep('choose')}>Voltar</Button></div>
        </div>
      </>}

      {step === 'lineage' && <>
        <h2>Nova linhagem</h2>
        <div className="field-stack mt-5">
          <Field label="NOME"><input value={lName} onChange={e => setLName(e.target.value)} placeholder="Nome do personagem" /></Field>
          <div className="input-grid">
            <Field label="LINHAGEM"><select value={lineage} onChange={e => { setLineage(e.target.value as (typeof LINEAGES)[number]); setStageIdx(0); }}>{LINEAGES.map(l => <option key={l}>{l}</option>)}</select></Field>
            <Field label="ESTÁGIO"><select value={stageIdx} onChange={e => setStageIdx(Number(e.target.value))}>{(LINEAGE_STAGES[lineage] ?? []).map((s, i) => <option key={s.name} value={i}>{i + 1}. {s.name}</option>)}</select></Field>
          </div>
          <div className="npc-stats">
            {(['corpo', 'mente', 'espirito'] as const).map(a => <Stepper key={a} label={a.toUpperCase()} value={lAttrs[a]} min={1} max={5} onChange={v => setLAttrs({ ...lAttrs, [a]: v })} />)}
          </div>
          <p className="empty-copy">PV {derived(lAttrs.corpo).pv} · PF máx. {lAttrs.espirito * 20}. Nomenclaturas, habilidades, arma e passiva ficam na ficha completa, depois de salvar.</p>
          <Field label="CONCEITO (OPCIONAL)"><input value={concept} onChange={e => setConcept(e.target.value)} /></Field>
          <div className="flex gap-2"><Button onClick={saveLineage}>Salvar</Button><Button variant="ghost" onClick={() => setStep('choose')}>Voltar</Button></div>
        </div>
      </>}
    </div>
  </div>;
}
