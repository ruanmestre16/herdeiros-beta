import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DAMAGE_TYPES, damageFormulaError } from '@/lib/weapon-damage';

/** Edição explícita: só grava expressão validada ao apertar Aplicar. */
export function WeaponDamageEditor({ base, value, damageType = '', onSave, label = 'DANO DA ARMA' }: {
  base: string; value: string; damageType?: string; label?: string;
  onSave: (damage: string, damageType: string) => void;
}) {
  const datalistId = useId();
  const [draft, setDraft] = useState(value || base);
  const [kind, setKind] = useState(damageType);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setDraft(value || base); setInvalid(false); }, [base, value]);
  useEffect(() => setKind(damageType), [damageType]);
  const error = damageFormulaError(draft);
  const save = () => { if (error) { setInvalid(true); return; } onSave(draft.trim(), kind.trim()); setInvalid(false); };
  const restore = () => { setDraft(base); setInvalid(false); onSave(base, kind.trim()); };
  return <div className="field-stack mt-3" style={{ padding: 12, border: '1px solid var(--border, #7774)', borderRadius: 10 }}>
    <span className="field-kicker">{label} · PERSONALIZÁVEL</span>
    <p className="empty-copy">Valor oficial: <strong>{base}</strong>. Personalização só desta ficha; não muda o livro.</p>
    <label className="field"><span className="field-label">DANO PERSONALIZADO</span>
      <input aria-label="Expressão de dano personalizado" value={draft} onChange={e => { setDraft(e.target.value); setInvalid(false); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} placeholder="Ex.: 1d10 + 1d6 - 1d12" />
    </label>
    <div className="flex gap-2 flex-wrap items-center">
      {['1d6', '1d8', '1d10', '1d12'].map(d => <Button type="button" key={d} size="sm" variant="outline" onClick={() => { setDraft(s => `${s.trim() || base} + ${d}`); setInvalid(false); }}>+{d}</Button>)}
      <Button type="button" size="sm" variant="outline" onClick={() => { setDraft(s => `${s.trim() || base} - 1d12`); setInvalid(false); }}>−1d12</Button>
    </div>
    <label className="field"><span className="field-label">TIPO DE DANO (DESCRITIVO)</span>
      <input list={datalistId} value={kind} onChange={e => setKind(e.target.value)} placeholder="Cortante, Perfurante, Fluxo..." />
      <datalist id={datalistId}>{DAMAGE_TYPES.map(t => <option value={t} key={t} />)}</datalist>
    </label>
    {invalid && error && <p role="alert" className="form-error">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button type="button" size="sm" disabled={!!error} onClick={save}>Aplicar dano</Button><Button type="button" size="sm" variant="outline" onClick={restore}>Restaurar dano do livro</Button></div>
  </div>;
}
