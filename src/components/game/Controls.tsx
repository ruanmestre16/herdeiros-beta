import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Stepper({ label, value, onChange, min = 0, max = 999, tone = 'default', hint }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; tone?: 'default'|'health'|'flux'|'karma'; hint?: string }) {
  return <div className={cn('stepper', `stepper-${tone}`)}>
    <div className="flex items-center justify-between gap-2"><span className="field-kicker">{label}</span>{hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}</div>
    <div className="mt-2 flex items-center gap-2"><Button variant="outline" size="icon" className="step-btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Diminuir ${label}`} title={`Diminuir ${label}`}><Minus /></Button><input aria-label={label} type="number" min={min} max={max} value={value} onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))} className="number-input" /><Button variant="outline" size="icon" className="step-btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Aumentar ${label}`} title={`Aumentar ${label}`}><Plus /></Button></div>
  </div>;
}
export function SectionHeading({ number, title, aside }: { number?: string; title: string; aside?: React.ReactNode }) { return <div className="section-heading"><div className="flex items-center gap-3">{number && <span className="section-number">{number}</span>}<h2>{title}</h2></div>{aside}</div>; }
export function Meter({ label, current, max, tone }: { label: string; current: number; max: number; tone: 'health'|'flux'|'karma' }) { return <div className={`meter-${tone}-group`}><div className="mb-2 flex items-center justify-between text-xs"><span className="field-kicker">{label}</span><span className="font-medium">{current} <span className="text-muted-foreground">/ {max}</span></span></div><div className="meter-track"><div className={`meter-fill meter-${tone}`} style={{ width: `${Math.min(100, Math.max(0, current / Math.max(1, max) * 100))}%` }} /></div></div>; }
