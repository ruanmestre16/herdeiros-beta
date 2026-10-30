import { useRef, useState } from 'react';
import { Download, FileJson, FileDown, FolderUp, ShieldCheck, X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { derived, isTechAgent, sheetState, type Character } from '@/lib/game';
import './character-backup.css';

/**
 * Backup local das fichas pessoais. Não exporta dados de outras pessoas, senhas,
 * segredos do Mestre, arquivos do Storage ou configurações da conta.
 * A importação cria novas fichas por meio de addCharacter() existente.
 */
const FORMAT = 'herdeiros-character-backup';
const VERSION = 1;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_SHEETS = 40;
const STRING_FIELDS = ['name','lineage','stage','concept','weapon','story','weapon_type','weapon_dice'] as const;
const NUMBER_FIELDS = ['corpo','mente','espirito','pv_current','pv_max','pf_current','pf_max','karma','gs','exhaustion'] as const;
const SERIALIZABLE = [...STRING_FIELDS, ...NUMBER_FIELDS, 'initiative', 'sync', 'nomenclatures', 'inventory', 'abilities'] as const;
type BackupSheet = Omit<Character, 'id'>;

type BackupFile = {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  characters: BackupSheet[];
};

function objectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function text(value: unknown, limit: number, fallback = ''): string {
  return typeof value === 'string' ? value.slice(0, limit) : fallback;
}
function integer(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && Math.abs(value) < 1_000_000 ? value : fallback;
}
function safeArray(value: unknown, limit: number): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(objectLike).slice(0, limit) : [];
}
function serializeSheet(sheet: Character): BackupSheet {
  const raw = sheet as unknown as Record<string, unknown>;
  // Seleção explícita: nunca inclui id, user_id, created_at ou campos de conta.
  const safe = Object.fromEntries(SERIALIZABLE.map(k => [k, raw[k]]));
  return safe as BackupSheet;
}
function validateSheet(raw: unknown): BackupSheet {
  if (!objectLike(raw)) throw new Error('Uma ficha do arquivo está em formato inválido.');
  if (typeof raw.name !== 'string' || !raw.name.trim() || typeof raw.lineage !== 'string' || !raw.lineage.trim())
    throw new Error('Há uma ficha sem nome ou linhagem válida.');
  const sheet = Object.fromEntries(STRING_FIELDS.map(key => [key, text(raw[key], key === 'story' ? 500_000 : 300)])) as Record<string, unknown>;
  for (const key of NUMBER_FIELDS) {
    if (typeof raw[key] !== 'number' || !Number.isFinite(raw[key])) throw new Error(`Atributo inválido em ${raw.name}: ${key}.`);
    sheet[key] = integer(raw[key]);
  }
  sheet.initiative = raw.initiative === null || raw.initiative === undefined ? null : integer(raw.initiative);
  sheet.sync = safeArray(raw.sync, 150).map(x => ({ name: text(x.name, 160), level: integer(x.level) }));
  sheet.inventory = safeArray(raw.inventory, 300).map(x => ({ name: text(x.name, 300), quantity: integer(x.quantity) }));
  sheet.nomenclatures = safeArray(raw.nomenclatures, 200).map(x => ({
    name: text(x.name, 300), cost: integer(x.cost),
    ...(x.effect !== undefined ? { effect: text(x.effect, 5000) } : {}),
    ...(x.kind === 'Direta' || x.kind === 'Parcial' || x.kind === 'Completa' ? { kind: x.kind } : {}),
    ...(x.dice !== undefined ? { dice: integer(x.dice) } : {}),
    ...(x.family !== undefined ? { family: text(x.family, 300) } : {}),
  }));
  // O item kind:'state' guarda progressão, equipamento e defesas editadas.
  // Sua descrição JSON permanece como texto, sem execução de código.
  sheet.abilities = safeArray(raw.abilities, 300).map(x => ({
    name: text(x.name, 300), description: text(x.description, 500_000),
    ...(x.kind === 'scar' || x.kind === 'state' ? { kind: x.kind } : {}),
    ...(x.scarType !== undefined ? { scarType: text(x.scarType, 100) } : {}),
    ...(x.benefit !== undefined ? { benefit: text(x.benefit, 2000) } : {}),
  }));
  return sheet as unknown as BackupSheet;
}
function parseBackup(json: unknown): BackupSheet[] {
  if (!objectLike(json) || json.format !== FORMAT || json.version !== VERSION || !Array.isArray(json.characters))
    throw new Error('Formato de backup incompatível. Use um arquivo JSON exportado pelo Herdeiros.');
  if (json.characters.length === 0 || json.characters.length > MAX_SHEETS)
    throw new Error(`O arquivo deve conter entre 1 e ${MAX_SHEETS} fichas.`);
  return json.characters.map(validateSheet);
}
function downloadJson(name: string, sheets: Character[]) {
  if (sheets.length === 0) return;
  const payload: BackupFile = {
    format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(),
    characters: sheets.map(serializeSheet),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name.replace(/[^a-zA-Z0-9À-ÿ._-]+/g, '-').slice(0, 110) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[s] ?? s));
}
function printSheet(c: Character): boolean {
  const w = window.open('', '_blank', 'width=980,height=850');
  if (!w) return false;
  w.opener = null;
  const base = derived(c.corpo);
  const overrides = sheetState(c) as ReturnType<typeof sheetState> & { esquivaOverride?: number | null; bloqueioOverride?: number | null };
  const esquiva = overrides.esquivaOverride ?? base.esquiva;
  const bloqueio = overrides.bloqueioOverride ?? base.bloqueio;
  const row = (label: string, value: unknown) => `<div class="stat"><b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span></div>`;
  const list = (title: string, values: string[]) => `<section><h2>${escapeHtml(title)}</h2>${values.length ? `<ul>${values.map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>` : '<p>Não informado.</p>'}</section>`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Ficha de ${escapeHtml(c.name)}</title><style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Georgia,serif;color:#2d211c;background:#fff;margin:0;padding:24px;line-height:1.45}header{border-bottom:3px double #95713b;margin-bottom:18px;padding-bottom:13px}header small{letter-spacing:.18em;color:#84643c}h1{font-size:32px;margin:8px 0}h2{font-size:16px;border-bottom:1px solid #bca179;padding-bottom:4px;color:#76552b}p{white-space:pre-wrap;overflow-wrap:anywhere}section{break-inside:avoid-page;margin:18px 0}li{margin:7px 0;white-space:pre-wrap;overflow-wrap:anywhere}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.stat{border:1px solid #d7c6ab;padding:9px;min-height:55px}.stat b{display:block;font:10px system-ui;color:#7f633d;text-transform:uppercase}.stat span{display:block;margin-top:4px;font-size:16px}.note{font:11px system-ui;color:#665f53;margin-top:20px}button{border:1px solid #7d603e;background:#ecdab8;padding:10px 18px;cursor:pointer}nav{text-align:right}@media print{nav{display:none}body{padding:0}}
    </style></head><body><nav><button onclick="window.print()">Imprimir / Salvar em PDF</button></nav>
    <header><small>HERDEIROS · O DESPERTAR — FICHA DE PERSONAGEM</small><h1>${escapeHtml(c.name)}</h1><div>${escapeHtml(c.lineage)} · ${escapeHtml(c.stage)} · ${escapeHtml(c.concept)}</div></header>
    <div class="stats">${[
      row('Corpo', c.corpo),row('Mente',c.mente),row(isTechAgent(c.lineage)?'Tecnologia':'Espírito',c.espirito),
      row('PV',`${c.pv_current} / ${c.pv_max}`),row(isTechAgent(c.lineage)?'PN':'PF',`${c.pf_current} / ${c.pf_max}`),
      row('Karma',c.karma),row('GS',c.gs),row('Esquiva',esquiva),row('Bloqueio',bloqueio),
    ].join('')}</div>
    ${list('Arma', [c.weapon, c.weapon_type, c.weapon_dice].filter(Boolean))}
    ${list(isTechAgent(c.lineage)?'Habilidades de Núcleo / Nomenclaturas':'Nomenclaturas', c.nomenclatures.map(n=>`${n.name}${n.kind?` (${n.kind})`:''} · ${n.cost} ${isTechAgent(c.lineage)?'PN':'PF'}${n.effect?` — ${n.effect}`:''}`))}
    ${list('Habilidades',c.abilities.filter(a=>a.kind!=='state').map(a=>`${a.name}: ${a.description}`))}
    ${list('Inventário',c.inventory.map(i=>`${i.name} × ${i.quantity}`))}
    ${list('Vínculos / Sincronia',c.sync.map(i=>`${i.name}: ${i.level}`))}
    <section><h2>História</h2><p>${escapeHtml(c.story)}</p></section>
    <div class="note">Cópia para leitura e impressão. Para recuperar dados editáveis, mantenha também seu backup JSON.</div>
    </body></html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  return true;
}

export function CharacterBackup({
  characters, selected, onImport,
}: {
  characters: Character[];
  selected?: Character | null;
  onImport: (sheet: Partial<Character>) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<BackupSheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const ownSelected = selected && characters.some(c=>c.id===selected.id) ? selected : null;

  async function selectFile(file: File | undefined) {
    setPending([]);
    setNotice('');
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { setNotice('Arquivo muito grande. Limite: 2 MB.'); return; }
    try {
      const restored = parseBackup(JSON.parse(await file.text()));
      setPending(restored);
      setNotice(`Backup reconhecido: ${restored.length} ficha(s). Confira antes de restaurar.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Falha ao ler backup.');
    }
  }

  async function restore() {
    if (!pending.length || loading) return;
    setLoading(true);
    let done = 0;
    for (const character of pending) {
      try {
        const id = await onImport(character);
        if (!id) break;
        done++;
      } catch { break; }
    }
    setLoading(false);
    setPending([]);
    if (inputRef.current) inputRef.current.value = '';
    setNotice(done === 0 ? 'Não foi possível restaurar. Verifique a conta e a conexão.' : `${done} ficha(s) restaurada(s) como novas.${done < pending.length ? ' Algumas não foram importadas.' : ''}`);
  }

  return <div className="hb-wrapper">
    <Button type="button" variant="outline" className="min-h-11" onClick={()=>setOpen(current=>!current)} aria-expanded={open}>
      <FileJson size={17}/> Exportar e recuperar
    </Button>
    {open && <section className="hb-panel" aria-label="Exportação e backup de fichas pessoais">
      <div className="hb-head"><div><strong>Arquivo pessoal de Herdeiros</strong><p>Faça uma cópia antes de grandes alterações. Seus arquivos ficam no seu dispositivo.</p></div><button type="button" className="hb-close" aria-label="Fechar" onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <div className="hb-actions">
        <Button type="button" variant="outline" disabled={!ownSelected} onClick={()=>ownSelected && downloadJson(`herdeiros-${ownSelected.name}`, [ownSelected])}><Download size={16}/> Baixar ficha JSON</Button>
        <Button type="button" variant="outline" disabled={!characters.length} onClick={()=>downloadJson(`herdeiros-minhas-fichas-${new Date().toISOString().slice(0,10)}`, characters)}><FileDown size={16}/> Backup de todas as minhas fichas</Button>
        <Button type="button" variant="outline" disabled={!ownSelected} onClick={()=>{if(ownSelected&&!printSheet(ownSelected))setNotice('Seu navegador bloqueou a janela de impressão. Libere pop-ups para esta página.')}}><Printer size={16}/> Imprimir / Salvar PDF</Button>
      </div>
      <div className="hb-restore">
        <label htmlFor="herdeiros-restore-file"><FolderUp size={18}/> Restaurar um backup JSON</label>
        <input ref={inputRef} id="herdeiros-restore-file" type="file" accept=".json,application/json" disabled={loading} onChange={e=>void selectFile(e.currentTarget.files?.[0])}/>
        {pending.length > 0 && <div className="hb-preview">
          <strong>Prévia: {pending.length} ficha(s)</strong>
          <ul>{pending.map((s,i)=><li key={`${s.name}-${i}`}>{s.name} · {s.lineage} · {s.stage}</li>)}</ul>
          <Button type="button" disabled={loading} onClick={()=>void restore()}><ShieldCheck size={17}/>{loading?'Restaurando...':`Restaurar ${pending.length} como novas fichas`}</Button>
          <small>Nenhuma ficha atual será sobrescrita. Os arquivos locais não são enviados a terceiros.</small>
        </div>}
      </div>
      {notice && <p className="hb-notice" role="status">{notice}</p>}
      <p className="hb-disclaimer">Backup JSON: editável e restaurável. PDF: para leitura/impressão. Não inclui campanhas, NPCs, documentos privados ou arquivos da Biblioteca.</p>
    </section>}
  </div>;
}
