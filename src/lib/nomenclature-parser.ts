import type { NomenclatureKind } from './game';

/** Importador tolerante a Markdown/texto simples, sem depender de preços de PF. */
export type ParsedNomenclatureTechnique = {
  kind: NomenclatureKind;
  name: string;
  family: string;
  effect: string;
  /** Custo declarado no texto: apenas informativo; o Códice continua definindo o custo real. */
  declaredCost?: number;
};

type Draft = {
  kind: NomenclatureKind;
  name: string;
  family: string;
  lines: string[];
  waitingForName: boolean;
  declaredCost?: number;
};

/** Remove marcação apenas para reconhecer cabeçalhos; o texto do efeito é preservado. */
function plain(line: string): string {
  return line.trim()
    .replace(/^>\s*/, '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^(?:[-*•]\s+|\d{1,3}[.)]\s+)/, '')
    .replace(/\\([*_])/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .trim();
}

function fold(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function asTitle(value: string): string {
  return plain(value).replace(/\s+/g, ' ').replace(/\s*[:\-–—]\s*$/, '').trim();
}

function readCost(value: string): number | undefined {
  const match = fold(value).match(/\b(\d+)\s*(?:p\.?\s*f\.?|pontos?\s+de\s+fluxo)\b/);
  return match ? Number(match[1]) : undefined;
}

function modeHeading(value: string): { kind: NomenclatureKind; title: string; cost?: number } | null {
  const cleaned = asTitle(value).replace(/^\d{1,3}\s*[.):\-]\s*/, '');
  const normalized = fold(cleaned);
  // Aceita: "### DIRETA — 2 PF", "Versão: Parcial", "Modo completo (12 PF)" e similares.
  const match = normalized.match(/^(?:(?:grau|versao|nivel|modo|forma|recitacao|tecnica|estagio)\s*(?:\d+)?\s*[:\-–—]?\s*)?(direta|direto|parcial|completa|completo)(?=$|[\s:()\[\]\/|\-–—])/);
  if (!match) return null;
  const token = match[1]!;
  const kind: NomenclatureKind = token.startsWith('diret') ? 'Direta' : token === 'parcial' ? 'Parcial' : 'Completa';
  const originalTail = cleaned.slice(match[0].length);
  const cost = readCost(originalTail);
  const tailWithoutCost = originalTail
    .replace(/\b(?:custo\s*[:=]?\s*)?\d+\s*(?:p\.?\s*f\.?|pontos?\s+de\s+fluxo)\b/ig, '')
    .replace(/[()[\]]/g, '')
    .replace(/^[\s:|\/\-–—]+|[\s:|\/\-–—]+$/g, '')
    .trim();
  // Não classifica frases narrativas que por acaso começam com "direta...".
  if (!/^[\s:|\/\-–—(\[]/.test(originalTail) && originalTail.trim() && cost === undefined) return null;
  if (tailWithoutCost.split(/\s+/).length > 12 || /[.!?][\s\S]+/.test(tailWithoutCost)) return null;
  return { kind, title: asTitle(tailWithoutCost), ...(cost !== undefined ? { cost } : {}) };
}

function familyHeading(value: string, headingLevel: number): string | null {
  const text = asTitle(value);
  // Cabeçalhos independentes de número de '#': "NOMENCLATURA: ..." / "TÉCNICA 1 — ...".
  const named = text.match(/^(?:nomenclatura|tecnica)(?:\s+\d{1,3})?\s*[:\-–—]\s*(.+)$/i);
  if (named) return asTitle(named[1]!);
  // "## 1. CURA PRECISA" e "## 2 - CÍRCULO DA VIDA".
  if (headingLevel > 0 && headingLevel <= 3) {
    const numbered = value.trim().replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '').match(/^\s*\d{1,3}\s*[.):\-–—]\s*(.+)$/);
    if (numbered) return asTitle(numbered[1]!);
  }
  // "## CURA PRECISA" dentro de uma seção de Nomenclaturas (ainda não é um grau).
  if (headingLevel === 2 && text && !/^(?:nomenclaturas?|habilidades?|atributos|combate|arma|caracteristicas)\b/i.test(fold(text))) return text;
  return null;
}

function isLikelyTitle(value: string, headingLevel: number): boolean {
  if (headingLevel > 0) return true;
  const text = asTitle(value);
  if (!text || /[.!?]$/.test(text) || value.trim().startsWith('>')) return false;
  if (/^(?:efeito|cura|dano|alcance|custo|duracao)\s*:/i.test(fold(text))) return false;
  if (text.split(/\s+/).length > 10) return false;
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (letters && letters === letters.toUpperCase()) return true;
  return text.split(/\s+/).filter(w => /^\p{Lu}/u.test(w)).length >= 2;
}

function effectLine(raw: string): string {
  return raw.trim().replace(/\\([*_])/g, '$1');
}

/**
 * Um documento pode conter várias nomenclaturas, cada qual com até três graus.
 * A divisão não depende de "PF" nem de títulos inventados a partir das descrições.
 */
export function parseNomenclatureText(text: string): ParsedNomenclatureTechnique[] {
  const drafts: Draft[] = [];
  let current: Draft | null = null;
  let family = '';
  let insideNomenclatures = false;
  let sectionLevel = 0;
  let closedSection = false;

  for (const raw of text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').split('\n')) {
    if (!raw.trim()) continue;
    const headingLevel = /^\s*(#{1,6})\s+/.exec(raw)?.[1]?.length ?? 0;
    const label = plain(raw);
    const normalized = fold(label);
    if (!label) continue;

    if (/^nomenclaturas?\s*$/.test(normalized) || /^tecnicas?\s+de\s+(?:fluxo|combate)\s*$/.test(normalized)) {
      insideNomenclatures = true;
      closedSection = false;
      sectionLevel = headingLevel || 1;
      current = null;
      continue;
    }
    if (closedSection) continue;

    const mode = modeHeading(raw);
    if (mode) {
      current = { kind: mode.kind, name: mode.title, family, lines: [], waitingForName: !mode.title, ...(mode.cost !== undefined ? { declaredCost: mode.cost } : {}) };
      drafts.push(current);
      continue;
    }

    // Nome de nova família: antes de considerar um título solto ou um efeito.
    const familyName = familyHeading(raw, headingLevel);
    if (familyName) {
      family = familyName;
      current = null;
      continue;
    }

    // Um título de seção principal encerra a importação do bloco de nomenclaturas.
    // Exceção: título logo após o cabeçalho de um grau ("# CURA PRECISA: ...").
    if (insideNomenclatures && headingLevel > 0 && headingLevel <= sectionLevel && !current?.waitingForName) {
      insideNomenclatures = false;
      closedSection = true;
      current = null;
      continue;
    }

    if (!current) continue;
    const nameMatch = label.match(/^(?:nome(?:\s+da\s+tecnica)?|titulo)\s*:\s*(.+)$/i);
    if (nameMatch) {
      current.name = asTitle(nameMatch[1]!);
      current.waitingForName = false;
      continue;
    }
    if (current.declaredCost === undefined && /^(?:custo\s*:\s*)?\d+\s*(?:p\.?\s*f\.?|pontos?\s+de\s+fluxo)\s*$/i.test(normalized)) {
      current.declaredCost = readCost(label);
      continue;
    }
    if (current.waitingForName && isLikelyTitle(raw, headingLevel)) {
      current.name = asTitle(raw);
      current.waitingForName = false;
      continue;
    }
    current.lines.push(effectLine(raw));
  }

  // Sem cabeçalho de família, as versões do mesmo texto ficam ligadas à primeira técnica.
  const firstNamed = drafts.find(d => d.name)?.name;
  const defaultFamily = firstNamed || 'Nomenclatura importada';
  return drafts.map(d => {
    const group = d.family || defaultFamily;
    return {
      kind: d.kind,
      family: group,
      name: d.name || `${group} — ${d.kind}`,
      effect: d.lines.join('\n').trim(),
      ...(d.declaredCost !== undefined ? { declaredCost: d.declaredCost } : {}),
    };
  });
}
