import { Minus, Plus, RotateCcw } from 'lucide-react';
import './defense-control.css';

/** Um toque para ajustar +/−; toque no número para digitar qualquer valor de 0 a 9999. */
export function DefenseControl({ label, value, onChange, base, onReset, disabled = false, className = '' }: {
  label: 'ESQUIVA' | 'BLOQUEIO'; value: number; onChange: (next: number) => void;
  base?: number; onReset?: () => void; disabled?: boolean; className?: string;
}) {
  const change = (next: number) => {
    if (Number.isFinite(next)) onChange(Math.max(0, Math.min(9999, Math.round(next))));
  };
  return <div className={`hd-defense-control ${className}`} aria-label={`Ajustar ${label.toLowerCase()}`}>
    <span className="hd-defense-name">{label}</span>
    <div className="hd-defense-row">
      <button type="button" aria-label={`Diminuir ${label.toLowerCase()}`} disabled={disabled || value <= 0} onClick={() => change(value - 1)}><Minus size={16}/></button>
      <input type="number" inputMode="numeric" aria-label={`${label} — editar valor`} min={0} max={9999}
        disabled={disabled} value={value} onChange={e => { if (e.target.value !== '') change(Number(e.target.value)); }}
        onFocus={e => e.target.select()}/>
      <button type="button" aria-label={`Aumentar ${label.toLowerCase()}`} disabled={disabled || value >= 9999} onClick={() => change(value + 1)}><Plus size={16}/></button>
    </div>
    {base !== undefined && base !== value && !disabled && <button type="button" className="hd-defense-reset" onClick={() => onReset ? onReset() : change(base)} title={`Restaurar valor base (${base})`}><RotateCcw size={12}/> Base {base}</button>}
  </div>;
}
