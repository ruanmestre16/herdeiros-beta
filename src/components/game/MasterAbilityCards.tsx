import { useState } from 'react';
import { ChevronDown, Plus, Sparkles, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { makeAbility, type MasterAbility } from '@/lib/master-bestiary';
import './master-bestiary.css';

const labels:Record<MasterAbility['type'],string> = { habilidade:'Habilidade',nucleo:'Núcleo / Protocolo',gs:'Marco de GS',tática:'Tática',nota:'Regra especial' };

/** Cartões editáveis e colapsáveis; usados tanto na criação quanto na ficha salva. */
export function MasterAbilityCards({ title, abilities, onChange, type='habilidade', emptyMessage='Nenhuma habilidade cadastrada.', readOnly=false }: {
 title:string; abilities:MasterAbility[]; onChange?:(next:MasterAbility[])=>void; type?:MasterAbility['type']; emptyMessage?:string; readOnly?:boolean;
}) {
 const [expanded,setExpanded]=useState<string|null>(null);
 const update=(idx:number,patch:Partial<MasterAbility>)=>onChange?.(abilities.map((a,i)=>i===idx?{...a,...patch}:a));
 return <section className="mb-ability-group" aria-label={title}>
   <div className="mb-section-head"><div><span className="mb-kicker">FICHA VIVA / PODERES</span><h3>{title} <small>{abilities.length}</small></h3></div>
     {!readOnly&&onChange&&<Button type="button" size="sm" variant="outline" onClick={()=>{const a=makeAbility('Nova habilidade',type);onChange([...abilities,a]);setExpanded(a.id)}}><Plus size={15}/> Adicionar</Button>}</div>
   <div className="mb-ability-grid">
    {abilities.map((a,i)=><article key={a.id||i} className={`mb-ability-card ${expanded===a.id?'mb-card-open':''}`}>
      <button type="button" className="mb-ability-trigger" aria-expanded={expanded===a.id} onClick={()=>setExpanded(s=>s===a.id?null:a.id)}>
        <span className={`mb-ability-icon ${a.type==='gs'?'mb-gs':''}`}>{a.type==='nucleo'?<Zap size={18}/>:<Sparkles size={18}/>}</span>
        <span className="mb-ability-title"><strong>{a.name||'Habilidade sem nome'}</strong><small>{labels[a.type]}{a.cost?` · ${a.cost}`:''}</small></span>
        <ChevronDown size={17} className="mb-chevron" />
      </button>
      {expanded===a.id&&<div className="mb-ability-body">
        {readOnly ? <p className="mb-ability-text">{a.description||'Sem descrição.'}</p> : <>
          <label className="field"><span className="field-label">NOME DA HABILIDADE</span><input value={a.name} onChange={e=>update(i,{name:e.target.value})}/></label>
          <div className="mb-edit-grid"><label className="field"><span className="field-label">TIPO</span><select value={a.type} onChange={e=>update(i,{type:e.target.value as MasterAbility['type']})}>{Object.entries(labels).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
          <label className="field"><span className="field-label">CUSTO (SE EXISTIR)</span><input value={a.cost??''} onChange={e=>update(i,{cost:e.target.value})} placeholder="Ex.: 3 PN"/></label></div>
          <label className="field"><span className="field-label">DESCRIÇÃO E REGRAS</span><textarea rows={3} value={a.description} onChange={e=>update(i,{description:e.target.value})}/></label>
          <Button type="button" size="sm" variant="ghost" onClick={()=>{onChange?.(abilities.filter((_,j)=>j!==i));setExpanded(null)}}><Trash2 size={14}/> Remover habilidade</Button>
        </>}
      </div>}
    </article>)}
    {!abilities.length&&<p className="empty-copy">{emptyMessage}</p>}
   </div>
 </section>;
}
