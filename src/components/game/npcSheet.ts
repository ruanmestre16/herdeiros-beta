import { derived, normalizeCharacter, type Character, type Npc } from '@/lib/game';

/** Mesmo formato já usado pelo editor de NPC: texto das observações + ficha completa guardada junto. */
export const SHEET_MARK = '\n\n<<<FICHA>>>\n';
const NPC_MIRROR = ['name', 'corpo', 'mente', 'espirito', 'pv_current', 'pv_max', 'pf_current', 'pf_max'] as const;

export function splitNpcNotes(notes: string): { text: string; sheet: Character | null } {
  const raw = notes ?? '';
  const i = raw.indexOf(SHEET_MARK);
  if (i < 0) return { text: raw, sheet: null };
  try {
    const parsed = JSON.parse(raw.slice(i + SHEET_MARK.length));
    return { text: raw.slice(0, i), sheet: parsed && typeof parsed === 'object' ? normalizeCharacter(parsed as Partial<Character> & { id: string }) : null };
  } catch { return { text: raw.slice(0, i), sheet: null }; }
}
export const joinNpcNotes = (text: string, sheet: Character | null) => sheet ? `${text}${SHEET_MARK}${JSON.stringify(sheet)}` : text;
/** Ficha completa do NPC (PV, PF, atributos e nome sempre iguais aos do próprio NPC). */
export function npcSheet(npc: Npc): Character | null {
  const { sheet } = splitNpcNotes(npc.notes);
  if (!sheet) return null;
  return { ...sheet, id: npc.id, name: npc.name, corpo: npc.corpo, mente: npc.mente, espirito: npc.espirito, pv_current: npc.pv_current, pv_max: npc.pv_max, pf_current: npc.pf_current, pf_max: npc.pf_max };
}
/** Gaki-monstro criado pelo botão Novo: Karma infinito. */
export const isMonster = (sheet: Character) => !!(sheet as Character & { gaki?: unknown }).gaki;
/** Aplica uma mudança na ficha completa e devolve o NPC já atualizado (espelhando PV, PF, atributos, Esquiva e Bloqueio). */
export function applyNpcSheetPatch(npc: Npc, partial: Partial<Character>): Npc {
  const sheet = npcSheet(npc); if (!sheet) return npc;
  const { text } = splitNpcNotes(npc.notes);
  const next = { ...sheet, ...partial };
  const mirror: Record<string, unknown> = {};
  for (const k of NPC_MIRROR) if (k in partial) mirror[k] = (partial as Record<string, unknown>)[k];
  if ('corpo' in partial) { const d = derived(next.corpo); mirror['esquiva'] = d.esquiva; mirror['bloqueio'] = d.bloqueio; }
  return { ...npc, ...(mirror as Partial<Npc>), notes: joinNpcNotes(text, next) };
}
