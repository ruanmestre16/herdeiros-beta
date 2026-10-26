/** Expressões de dano personalizáveis por ficha, sem modificar as tabelas oficiais.
 * Exemplos: 1d8, 1d10 + 1d6, 2d8 - 1d12 + 3.
 */
export type DamageTerm = { sign: 1 | -1; count: number; sides: number };
export type DamageFormula = { terms: DamageTerm[]; flat: number; normalized: string };
const VALID_SIDES = new Set([4, 6, 8, 10, 12, 20]);
export const DAMAGE_TYPES = ['Cortante', 'Perfurante', 'Contundente', 'Balístico', 'Fogo', 'Gelo', 'Elétrico', 'Fluxo', 'Karma', 'Ácido', 'Veneno', 'Outro'] as const;

export function parseDamageFormula(raw: string): DamageFormula | null {
  const source = raw.replace(/\s+/g, '').replace(/−/g, '-').toLowerCase();
  if (!source || source.length > 120 || !/^[+-]?(?:\d*d\d+|\d+)(?:[+-](?:\d*d\d+|\d+))*$/.test(source)) return null;
  const parts = source.match(/[+-]?(?:\d*d\d+|\d+)/g) ?? [];
  const terms: DamageTerm[] = [];
  let flat = 0;
  for (const part of parts) {
    const sign: 1 | -1 = part.startsWith('-') ? -1 : 1;
    const token = part.replace(/^[+-]/, '');
    const match = /^(\d*)d(\d+)$/.exec(token);
    if (!match) { const n = Number(token); if (!Number.isSafeInteger(n) || n > 1000) return null; flat += sign * n; continue; }
    const count = Number(match[1] || 1), sides = Number(match[2]);
    if (!Number.isInteger(count) || count < 1 || count > 30 || !VALID_SIDES.has(sides)) return null;
    terms.push({ sign, count, sides });
  }
  if (!terms.length || terms.reduce((a, b) => a + b.count, 0) > 30 || Math.abs(flat) > 1000) return null;
  const normalized = [...terms.map(t => `${t.sign < 0 ? '-' : '+'}${t.count}d${t.sides}`), ...(flat ? [`${flat < 0 ? '-' : '+'}${Math.abs(flat)}`] : [])]
    .join(' ').replace(/^\+/, '').trim().replace(/([+-])\s+/g, '$1 ');
  return { terms, flat, normalized };
}
export function damageFormulaError(value: string): string | null {
  return parseDamageFormula(value) ? null : 'Use dados como 1d8, 1d10 + 1d6 ou 2d8 - 1d12 + 3 (até 30 dados).';
}
export function damageDiceFaces(expression: string, mult = 1): { sides: number; sign: number }[] {
  const parsed = parseDamageFormula(expression);
  if (!parsed) return [];
  return parsed.terms.flatMap(t => Array.from({ length: t.count * mult }, () => ({ sides: t.sides, sign: t.sign })));
}
/** Dados negativos são registrados com valor negativo no histórico para deixar claro o desconto. */
export function rollDamageFormula(expression: string, bonus: number, crit: boolean, extraDice: string[] = [], mult = 2) {
  const formulas = [expression, ...extraDice].map(parseDamageFormula);
  if (formulas.some(f => !f)) return { dice: [] as number[], bonus, total: Math.max(0, bonus), expression: 'Dano inválido' };
  const multiple = crit ? mult : 1;
  const dice: number[] = [];
  let flat = bonus;
  const printed: string[] = [];
  for (const f of formulas) {
    if (!f) continue;
    flat += f.flat;
    printed.push(...f.terms.map(t => `${t.sign < 0 ? '-' : '+'}${t.count * multiple}d${t.sides}`));
    for (const term of f.terms) for (let i = 0; i < term.count * multiple; i++) dice.push((1 + Math.floor(Math.random() * term.sides)) * term.sign);
  }
  const total = Math.max(0, dice.reduce((a, b) => a + b, flat));
  const text = printed.join(' ').replace(/^\+/, '').trim();
  return { dice, bonus: flat, total, expression: `${text}${flat ? ` ${flat > 0 ? '+' : '-'} ${Math.abs(flat)}` : ''}`.trim() };
}
