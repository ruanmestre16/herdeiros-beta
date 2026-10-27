import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Dices, Heart, Minus, Plus, Shield, Sparkles, UserRound, WandSparkles, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { derived, dieFor, LINEAGE_STAGES, WEAPONS, type Character } from '@/lib/game';
import { parseDamageFormula } from '@/lib/weapon-damage';
import './sheet-redesign.css';

type AttrKey = 'corpo' | 'mente' | 'espirito';
type Kind = 'Humano' | 'Arcadiano' | 'Gaki' | 'Agente Tecnológico';
type Attributes = Record<AttrKey, number>;
const INITIAL: Attributes = { corpo: 1, mente: 1, espirito: 1 };
const STEPS = ['Identidade', 'Atributos', 'Arma e poder', 'Revisão'] as const;
const options: { key: Kind; title: string; sub: string; info: string; icon: typeof UserRound }[] = [
  { key: 'Humano', title: 'Humano', sub: 'O Libertado', info: 'Arma de Vínculo · MENTE · Fluxo (PF)', icon: UserRound },
  { key: 'Agente Tecnológico', title: 'Agente Tecnológico', sub: 'Variação humana', info: 'Arma de Núcleo · TECNOLOGIA · Núcleo (PN)', icon: Zap },
  { key: 'Arcadiano', title: 'Arcadiano', sub: 'O Puro', info: 'Arma de Ego · ESPÍRITO · Fluxo (PF)', icon: Sparkles },
  { key: 'Gaki', title: 'Gaki', sub: 'O Corrompido', info: 'Corpo moldado · CORPO · Fluxo (PF)', icon: Shield },
];
const attrText: Record<AttrKey, string> = { corpo:'CORPO', mente:'MENTE', espirito:'ESPÍRITO' };
const attrExplanations: Record<AttrKey, string> = { corpo:'Força, movimento e resistência', mente:'Raciocínio, memória e estratégia', espirito:'Fluxo e poder espiritual' };

export function CharacterCreationWizard({ onClose, onCreate, initialLineage = 'Humano' }: {onClose: () => void; onCreate: (values: Partial<Character>) => Promise<boolean>; initialLineage?: Kind}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [lineage, setLineage] = useState<Kind>(initialLineage);
  const [attrs, setAttrs] = useState<Attributes>(INITIAL);
  const [concept, setConcept] = useState('');
  const [story, setStory] = useState('');
  const [weaponName, setWeaponName] = useState('');
  const [weaponType, setWeaponType] = useState('');
  const [weaponDice, setWeaponDice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const tech = lineage === 'Agente Tecnológico';
  const available = 6 - (attrs.corpo + attrs.mente + attrs.espirito);
  const secondary = derived(attrs.corpo);
  const initialStage = LINEAGE_STAGES[lineage]?.[0]?.name ?? '';
  const weaponOfficial = WEAPONS.find(w => w.key === weaponType)?.dice[0] ?? '';
  const validDamage = !weaponType || !!parseDamageFormula(weaponDice || weaponOfficial);
  const canFinish = !!name.trim() && available === 0 && validDamage;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);
  function selectLineage(next: Kind) { setLineage(next); setAttrs(INITIAL); }
  function changeAttribute(key: AttrKey, change: number) {
    setAttrs(current => {
      const proposed = { ...current, [key]: current[key] + change };
      if (proposed[key] < 1 || proposed[key] > 3) return current;
      if (proposed.corpo + proposed.mente + proposed.espirito > 6) return current;
      if (Object.values(proposed).filter(v => v === 3).length > 1) return current;
      if (lineage === 'Gaki' && proposed.mente !== 1) return current;
      return proposed;
    });
  }
  async function finish() {
    if (!canFinish || saving) return;
    setSaving(true); setError('');
    try {
      const values: Partial<Character> = {
        name: name.trim(), lineage, stage: initialStage, concept: concept.trim(),
        story: story.trim(), ...attrs,
        pv_max: secondary.pv, pv_current: secondary.pv,
        pf_max: attrs.espirito * 20, pf_current: 0,
        weapon: weaponName.trim(), weapon_type: weaponType,
        weapon_dice: weaponType ? (parseDamageFormula(weaponDice || weaponOfficial)?.normalized ?? weaponOfficial) : '',
      };
      if (!(await onCreate(values))) setError('Não foi possível salvar a ficha. Confira a conexão e tente novamente.');
    } catch { setError('Não foi possível criar a ficha. Tente novamente.'); }
    finally { setSaving(false); }
  }
  return <div className="h-sheet-overlay" onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
    <div className="h-sheet-wizard" role="dialog" aria-modal="true" aria-label="Criar ficha de Herdeiro">
      <header className="h-sheet-wizard-head">
        <div><span className="h-sheet-kicker">HERDEIROS · O DESPERTAR</span><h2>Criar um Herdeiro</h2><p>Uma etapa de cada vez. Tudo poderá ser consultado depois.</p></div>
        <Button type="button" variant="ghost" size="icon" aria-label="Fechar criação" onClick={onClose} disabled={saving}><X/></Button>
      </header>
      <nav className="h-sheet-progress" aria-label="Etapas da criação">
        {STEPS.map((label, i) => <button type="button" key={label} className={`h-sheet-progress-step ${step === i ? 'active' : ''} ${step > i ? 'done' : ''}`} onClick={() => setStep(i)} aria-current={step === i ? 'step' : undefined}>
          <span>{i < step ? <Check size={14}/> : i+1}</span><small>{label}</small>
        </button>)}
      </nav>
      <div className="h-sheet-wizard-body">
      {step === 0 && <section className="h-sheet-flow">
        <div className="h-sheet-section-title"><h3>Quem é seu personagem?</h3><p>Escolha a origem e a história. O Agente Tecnológico é uma variação de Humano — não precisa pertencer ao Consórcio.</p></div>
        <label className="h-sheet-field"><span>Nome do personagem</span><input autoFocus maxLength={70} value={name} onChange={e => setName(e.target.value)} placeholder="Como seu Herdeiro é chamado?" /></label>
        <div className="h-sheet-field"><span>Escolha a linhagem</span>
          <div className="h-sheet-lineage-group"><strong>HUMANOS</strong><p>Você pode ser um Humano padrão ou um Agente Tecnológico, independentemente de pertencer ao Consórcio.</p><div className="h-sheet-lineage-grid">{options.slice(0,2).map(({key,title,sub,info,icon:Icon}) => <button type="button" key={key} className={`h-sheet-choice ${lineage === key ? 'selected' : ''}`} aria-pressed={lineage === key} onClick={() => selectLineage(key)}><Icon size={23}/><strong>{title}</strong><small>{sub}</small><span>{info}</span>{lineage === key && <Check className="h-sheet-picked" size={16}/>}</button>)}</div></div>
          <div className="h-sheet-lineage-group"><strong>OUTRAS LINHAGENS</strong><div className="h-sheet-lineage-grid">{options.slice(2).map(({key,title,sub,info,icon:Icon}) => <button type="button" key={key} className={`h-sheet-choice ${lineage === key ? 'selected' : ''}`} aria-pressed={lineage === key} onClick={() => selectLineage(key)}><Icon size={23}/><strong>{title}</strong><small>{sub}</small><span>{info}</span>{lineage === key && <Check className="h-sheet-picked" size={16}/>}</button>)}</div></div>
        </div>
        <label className="h-sheet-field"><span>Conceito do personagem <small>(opcional)</small></span><input maxLength={250} value={concept} onChange={e=>setConcept(e.target.value)} placeholder="Ex.: curandeira, mercenário, pesquisador..."/></label>
        <label className="h-sheet-field"><span>Um pedaço da história <small>(opcional)</small></span><textarea value={story} onChange={e=>setStory(e.target.value)} rows={3} placeholder="O que o trouxe até o Despertar?" /></label>
      </section>}
      {step === 1 && <section className="h-sheet-flow">
        <div className="h-sheet-section-title"><h3>Distribua seus atributos</h3><p>Todos começam com 1 em cada atributo. Distribua mais 3 pontos; somente um atributo pode alcançar 3.</p></div>
        <div className={`h-sheet-points ${available === 0 ? 'complete' : ''}`}><span>Pontos restantes</span><strong>{available} <small>/ 3</small></strong></div>
        {(['corpo','mente','espirito'] as const).map(key => <div className="h-sheet-attr-editor" key={key}><div><strong>{tech && key === 'espirito' ? 'TECNOLOGIA' : attrText[key]}</strong><small>{tech && key === 'espirito' ? 'Controle e potência do Núcleo' : attrExplanations[key]}</small></div><span className="h-sheet-dice-label">d{dieFor(attrs[key])}</span><div className="h-sheet-step-buttons"><Button type="button" variant="outline" size="icon" aria-label={`Diminuir ${key}`} disabled={attrs[key] <= 1} onClick={()=>changeAttribute(key,-1)}><Minus/></Button><strong>{attrs[key]}</strong><Button type="button" variant="outline" size="icon" aria-label={`Aumentar ${key}`} disabled={available === 0 || attrs[key] >= 3 || (lineage === 'Gaki' && key === 'mente') || (attrs[key]===2 && Object.entries(attrs).some(([k,v])=>k!==key && v===3))} onClick={()=>changeAttribute(key,1)}><Plus/></Button></div></div>)}
        {lineage==='Gaki'&&<p className="h-sheet-help">Gaki no estágio inicial mantém MENTE 1, conforme a regra de criação.</p>}
        <div className="h-sheet-metrics"><div><small>PV</small><strong>{secondary.pv}</strong></div><div><small>ESQUIVA</small><strong>{secondary.esquiva}</strong></div><div><small>BLOQUEIO</small><strong>{secondary.bloqueio}</strong></div><div><small>DESLOCAMENTO</small><strong>{secondary.deslocamento}m</strong></div></div>
      </section>}
      {step === 2 && <section className="h-sheet-flow">
        <div className="h-sheet-section-title"><h3>Sua arma e seu poder</h3><p>{tech ? 'Sua Arma de Núcleo e suas Habilidades de Núcleo usam TECNOLOGIA e PN.' : lineage === 'Humano' ? 'Sua Arma de Vínculo usa MENTE.' : lineage==='Arcadiano'?'Sua Arma de Ego usa ESPÍRITO.':'Seu corpo moldado ataca com CORPO.'} Você pode completar poderes e habilidades depois de criar a ficha.</p></div>
        <label className="h-sheet-field"><span>Nome ou forma da arma <small>(opcional)</small></span><input value={weaponName} onChange={e=>setWeaponName(e.target.value)} maxLength={100} placeholder={tech?'Ex.: Lâmina de Núcleo':'Ex.: Espada de Vínculo'}/></label>
        <label className="h-sheet-field"><span>Categoria de dano</span><select value={weaponType} onChange={e => { const key=e.target.value;setWeaponType(key);setWeaponDice(WEAPONS.find(w=>w.key===key)?.dice[0]??''); }}><option value="">Definir depois</option>{WEAPONS.map(w=><option key={w.key} value={w.key}>{w.label} · {w.dice[0]}</option>)}</select></label>
        {weaponType && <><div className="h-sheet-official"><Dices size={18}/><div><small>Dano base do Códice</small><strong>{weaponOfficial}</strong></div><Button variant="outline" size="sm" type="button" onClick={()=>setWeaponDice(weaponOfficial)}>Restaurar</Button></div><label className="h-sheet-field"><span>Dano personalizado <small>(opcional)</small></span><input value={weaponDice} onChange={e=>setWeaponDice(e.target.value)} placeholder="Ex.: 1d10 + 1d6"/>{!validDamage&&<small role="alert" className="h-sheet-error">Use dados válidos, como 1d10 + 1d6.</small>}</label></>}
        <div className="h-sheet-hint"><BookOpen size={20}/><p>Após criar: abra <strong>{tech ? 'Habilidades de Núcleo' : 'Nomenclaturas'}</strong>, Habilidades, GS, Elo, Inventário e História nas abas da ficha. Nenhum desses recursos será removido.</p></div>
      </section>}
      {step === 3 && <section className="h-sheet-flow">
        <div className="h-sheet-section-title"><h3>Revise seu Herdeiro</h3><p>O modelo será salvo como uma ficha de verdade no Supabase. Você poderá editar os detalhes depois.</p></div>
        <div className="h-sheet-preview"><div><span className="h-sheet-kicker">HERDEIRO · ESTÁGIO 1</span><h3>{name || 'Sem nome'}</h3><p>{lineage === 'Agente Tecnológico' ? 'Humano · Agente Tecnológico' : lineage} · {initialStage}</p></div><div className="h-sheet-metrics"><div><small>PV</small><strong>{secondary.pv}</strong></div><div><small>{tech?'PN MÁX.':'PF MÁX.'}</small><strong>{attrs.espirito*20}</strong></div><div><small>ESQUIVA</small><strong>{secondary.esquiva}</strong></div><div><small>BLOQUEIO</small><strong>{secondary.bloqueio}</strong></div></div><div className="h-sheet-preview-attrs">{(['corpo','mente','espirito'] as const).map(key=><span key={key}>{tech&&key==='espirito'?'TECNOLOGIA':attrText[key]} <strong>{attrs[key]}</strong></span>)}</div>{weaponType&&<p>Arma: {weaponName||'Sem nome'} · {weaponDice||weaponOfficial}</p>}{concept&&<p>Conceito: {concept}</p>}</div>
        {!name.trim()&&<p className="h-sheet-error">Informe o nome do personagem na primeira etapa.</p>}
        {available!==0&&<p className="h-sheet-error">Ainda faltam distribuir {available} ponto(s) de atributo.</p>}
        {error&&<p role="alert" className="h-sheet-error">{error}</p>}
      </section>}
      </div>
      <footer className="h-sheet-wizard-footer"><Button variant="outline" type="button" disabled={step === 0 || saving} onClick={()=>setStep(s=>Math.max(0,s-1))}><ArrowLeft/> Voltar</Button><span>{step+1} / {STEPS.length}</span>{step < 3 ? <Button type="button" onClick={()=>setStep(s=>Math.min(3,s+1))}>Continuar <ChevronRight/></Button> : <Button type="button" disabled={!canFinish||saving} onClick={()=>void finish()}>{saving?'Criando...':'Criar ficha'} <ArrowRight/></Button>}</footer>
    </div>
  </div>;
}
