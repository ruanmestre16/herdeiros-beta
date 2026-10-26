import type { NomenclatureKind } from './game';

/** Uma versão pronta para o cadastro. Os PF efetivos continuam definidos pelo Códice. */
export type ParsedNomenclatureTechnique = {
  kind: NomenclatureKind;
  name: string;
  family: string;
  effect: string;
  declaredCost?: number;
};

type Draft = ParsedNomenclatureTechnique & { lines: string[]; waitingForName: boolean };

type GradeHeading = { kind: NomenclatureKind; title: string; cost?: number };

/** Retira apenas a decoração do cabeçalho. Não altera descrições nem recitações. */
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

function title(value: string): string {
  return plain(value).replace(/\s+/g, ' ').replace(/\s*[:\-–—]\s*$/, '').trim();
}

function readCost(value: string): number | undefined {
  const cleaned = fold(value);
  const standard = cleaned.match(/\b(\d+)\s*(?:p\.?\s*f\.?|pontos?\s+de\s+fluxo)\b/);
  const inverted = cleaned.match(/\bpf\s*[:=]?\s*(\d+)\b/);
  return standard ? Number(standard[1]) : inverted ? Number(inverted[1]) : undefined;
}

const PREFIX_WORDS = new Set([
  'nomenclatura', 'nomenclaturas', 'nomeacao', 'recitacao', 'ameaca',
  'ativacao', 'manifestacao', 'invocacao', 'liberacao', 'tecnica', 'ataque',
  'grau', 'nivel', 'estagio', 'modo', 'forma', 'versao', 'etapa', 'tipo',
  'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'sua', 'seu',
  'i', 'ii', 'iii', '1', '2', '3',
]);

/**
 * Reconhece cabeçalhos, não frases narrativas, como:
 *  - DIRETA — 2 PF; NOMEAÇÃO DIRETA; RECITAÇÃO PARCIAL; RECITAÇÃO COMPLETA
 *  - NOMENCLATURA DIRETA; AMEAÇA DIRETA; MANIFESTAÇÃO COMPLETA
 *  - GRAU I: DIRETA; ATIVAÇÃO DE FORMA PARCIAL; DIRETA: NOME — PF 2
 * Aceita Markdown, emojis, custo opcional e maiúsculas/minúsculas.
 */
function gradeHeading(raw: string): GradeHeading | null {
  if (/^\s*>/.test(raw)) return null; // A fala de um personagem não é cabeçalho.
  const cleaned = title(raw).replace(/^\d{1,3}\s*[.):\-–—]\s*/, '');
  const normalized = fold(cleaned);
  const match = /\b(direta|direto|parcial|completa|completo)\b/.exec(normalized);
  if (!match || match.index === undefined) return null;

  const prefix = normalized.slice(0, match.index).trim();
  const prefixTokens = prefix.split(/[^a-z0-9]+/).filter(Boolean);
  if (prefixTokens.some(word => !PREFIX_WORDS.has(word))) return null;
  // Uma palavra após "direta" sem marcador é provavelmente parte de uma frase.
  const tail = cleaned.slice(match.index + match[0].length);
  if (tail.trim() && !/^[\s:|/\-–—(\[]/.test(tail)) return null;

  const cost = readCost(tail);
  const stripped = tail
    .replace(/\b(?:custo\s*[:=]?\s*)?\d+\s*(?:p\.?\s*f\.?|pontos?\s+de\s+fluxo)\b/ig, '')
    .replace(/\bpf\s*[:=]?\s*\d+\b/ig, '')
    .replace(/\b(?:nome(?:\s+da\s+tecnica)?|titulo)\s*:\s*/i, '')
    .replace(/[()[\]]/g, '')
    .replace(/^[\s:|/\-–—]+|[\s:|/\-–—]+$/g, '')
    .trim();

  // "DIRETA (NOMEAÇÃO)" / "PARCIAL (RECITAÇÃO)" identificam o tipo, não o nome.
  const leftover = fold(stripped);
  const suffixIsType = /^(?:nomenclatura|nomeacao|recitacao|manifestacao|ativacao|ameaca|tecnica)$/.test(leftover);
  const name = suffixIsType ? '' : title(stripped);
  if (name.split(/\s+/).length > 14 || /[.!?].+/.test(name)) return null;
  // Sem custo/nome, evite interpretar uma oração que começa com "Ataque direto...".
  if (prefixTokens.length && name && cost === undefined && !/^\s*#{1,6}\s/.test(raw) && !/^\s*\*\*/.test(raw)) {
    const first = prefixTokens[0];
    if (first === 'ataque' || first === 'ameaca') return null;
  }
  return {
    kind: match[0].startsWith('diret') ? 'Direta' : match[0] === 'parcial' ? 'Parcial' : 'Completa',
    title: name,
    ...(cost !== undefined ? { cost } : {}),
  };
}

/** Nome de família explicitamente marcado ou numerado. */
function explicitFamily(raw: string, headingLevel: number): string | null {
  const text = title(raw);
  const named = fold(text).match(/^(?:nomenclatura|tecnica)(?:\s+\d{1,3})?\s*[:\-–—]\s*(.+)$/);
  if (named) return title(text.slice(named.index! + named[0].length - named[1]!.length));
  if (headingLevel > 0 && headingLevel <= 3) {
    const numbered = raw.trim().replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '')
      .match(/^\s*\d{1,3}\s*[.):\-–—]\s*(.+)$/);
    if (numbered) return title(numbered[1]!);
  }
  return null;
}

function likelyName(raw: string, headingLevel: number): boolean {
  if (/^\s*>/.test(raw)) return false;
  const text = title(raw);
  if (!text || /[.!?]$/.test(text)) return false;
  if (/^(?:efeito|cura|dano|alcance|custo|duracao|reducao|teste)\s*:/i.test(fold(text))) return false;
  if (headingLevel > 0) return true;
  if (text.split(/\s+/).length > 10) return false;
  const letters = text.replace(/[^\p{L}]/gu, '');
  return !!letters && letters === letters.toUpperCase();
}

function isClosingHeading(normalized: string): boolean {
  return /^(?:identidade(?:\s+da\s+tecnica)?|consideracoes\s+finais|resumo\s+da\s+tecnica|notas\s+finais|habilidade\s+propria|habilidades|atributos|caracteristicas\s+de\s+combate)\s*$/.test(normalized);
}

function isEffectHeading(normalized: string): boolean {
  return /^(?:efeitos?|exemplos?|observacoes?|mecanica|duracao|alcance|uso|descricao|condicoes)\b/.test(normalized)
    || /^(?:dano|reducao|cura|defesa)\s*[:—-]\s*/.test(normalized);
}

/**
 * Importa uma ou várias nomenclaturas. Cada "grau" encerra o efeito do anterior.
 * Apenas os títulos dos graus são normalizados; os efeitos ficam intactos.
 * Um texto sem cabeçalhos de grau retorna [], sem inventar dados.
 */
export function parseNomenclatureText(text: string): ParsedNomenclatureTechnique[] {
  const drafts: Draft[] = [];
  let current: Draft | null = null;
  let family = '';
  let documentTitle = '';
  let insideNomenclatures = false;
  let sectionLevel = 0;
  let closedSection = false;
  let pendingFamily = '';

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
    if (headingLevel > 0 && isClosingHeading(normalized) && drafts.length > 0) {
      closedSection = true;
      current = null;
      continue;
    }

    // O grau tem prioridade sobre outros títulos: "NOMENCLATURA DIRETA" NÃO é nome de família.
    const grade = gradeHeading(raw);
    if (grade) {
      if (pendingFamily) {
        family = pendingFamily;
        pendingFamily = '';
      }
      const newDraft: Draft = {
        kind: grade.kind,
        name: grade.title,
        family,
        effect: '',
        lines: [],
        waitingForName: !grade.title,
        ...(grade.cost !== undefined ? { declaredCost: grade.cost } : {}),
      };
      drafts.push(newDraft);
      current = newDraft;
      continue;
    }

    const namedFamily = explicitFamily(raw, headingLevel);
    if (namedFamily) {
      family = namedFamily;
      pendingFamily = '';
      current = null;
      continue;
    }

    // Família sem número dentro de "# NOMENCLATURAS": "## CURA DAS SOMBRAS".
    if (insideNomenclatures && !current && headingLevel === sectionLevel + 1
      && !isEffectHeading(normalized)) {
      family = title(raw);
      pendingFamily = '';
      continue;
    }

    // As seções principais após NOMENCLATURAS encerram o importador.
    if (insideNomenclatures && headingLevel > 0 && headingLevel <= sectionLevel && !current?.waitingForName) {
      closedSection = true;
      current = null;
      continue;
    }

    if (headingLevel === 1 && !documentTitle && !current) {
      documentTitle = title(raw);
    }

    // "## NOVA FAMÍLIA" após uma família completa (sem numeração).
    // Não confunda subtítulos "## EFEITO — ..." com novos poderes.
    const finishedCurrentFamily = current && ['Direta', 'Parcial', 'Completa'].every(kind =>
      drafts.some(d => d.kind === kind && (d.family || documentTitle) === (current!.family || documentTitle)),
    );
    if (headingLevel === 2 && insideNomenclatures && !isEffectHeading(normalized)
      && !gradeHeading(raw) && finishedCurrentFamily && !/^\d+\s/.test(label)) {
      pendingFamily = title(raw);
      // Só aplica a família quando surgir o próximo grau: subtítulos ainda pertencem ao efeito.
    }

    // No começo de um bloco "# NOMENCLATURA X" sem famílias explícitas,
    // o nome do documento serve como família de fallback.
    if (!current) continue;
    const explicitName = label.match(/^(?:nome(?:\s+da\s+tecnica)?|titulo)\s*:\s*(.+)$/i);
    if (explicitName) {
      current.name = title(explicitName[1]!);
      current.waitingForName = false;
      continue;
    }
    if (current.declaredCost === undefined && /^(?:custo\s*:\s*)?(?:\d+\s*(?:p\.?\s*f\.?|pontos?\s+de\s+fluxo)|pf\s*[:=]?\s*\d+)\s*$/i.test(normalized)) {
      current.declaredCost = readCost(label);
      continue;
    }
    if (current.waitingForName && likelyName(raw, headingLevel)) {
      current.name = title(raw);
      current.waitingForName = false;
      continue;
    }
    current.lines.push(raw.trim().replace(/\\([*_])/g, '$1'));
  }

  const defaultFamily = documentTitle && !/^(?:nomenclaturas?|tecnicas?)$/i.test(fold(documentTitle))
    ? documentTitle : drafts.find(d => d.name)?.name || 'Nomenclatura importada';
  return drafts.map(d => ({
    kind: d.kind,
    family: d.family || defaultFamily,
    name: d.name || `${d.family || defaultFamily} — ${d.kind}`,
    effect: d.lines.join('\n').trim(),
    ...(d.declaredCost !== undefined ? { declaredCost: d.declaredCost } : {}),
  }));
}
