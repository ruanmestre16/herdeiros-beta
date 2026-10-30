import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BookOpen, Check, Eye, EyeOff, FileImage, FileText, FolderOpen, Link2, LockKeyhole, Map, Plus, RefreshCw, Search, Trash2, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import './campaign-library.css';

/** Biblioteca vinculada a uma campanha real. Não usa public/ para segredos. */
type Category = 'nota' | 'pista' | 'mapa' | 'imagem' | 'documento' | 'link';
type Visibility = 'mestre' | 'mesa';
type LibraryItem = {
  id: string; campaign_id: string; category: Category; visibility: Visibility;
  title: string; description: string; content: string; external_url: string | null;
  storage_path: string | null; file_name: string | null; file_mime: string | null;
  created_at: string; updated_at: string;
};
type LibraryInsert = Pick<LibraryItem, 'campaign_id' | 'category' | 'visibility' | 'title' | 'description' | 'content'> &
  Partial<Pick<LibraryItem, 'external_url' | 'storage_path' | 'file_name' | 'file_mime'>>;
type TableShape<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };
type LibraryDatabase = { public: { Tables: { campaign_library_items: TableShape<LibraryItem, LibraryInsert, Partial<LibraryItem>> }; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } };
const db = supabase as unknown as SupabaseClient<LibraryDatabase>;
const BUCKET = 'herdeiros-campaign-library';
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const CATEGORIES: Category[] = ['nota', 'pista', 'mapa', 'imagem', 'documento', 'link'];
const LABELS: Record<Category, string> = { nota: 'Anotação', pista: 'Pista', mapa: 'Mapa', imagem: 'Imagem', documento: 'Documento', link: 'Link' };
const MEDIA_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf', 'text/plain': 'txt' };
const FILE_TYPES = Object.keys(MEDIA_EXT);
const onlyHttps = (input: string): string | null => {
  try { const parsed = new URL(input.trim()); return parsed.protocol === 'https:' ? parsed.toString() : null; } catch { return null; }
};
function errorText(error: { message: string; code?: string } | null) {
  if (!error) return '';
  if (error.code === '42P01' || /does not exist|schema cache|could not find the table/i.test(error.message)) return 'A Biblioteca ainda não está instalada no Supabase. É necessário aplicar a migração SQL do pacote.';
  if (error.code === '42501' || /row.level security|permission denied|not authorized/i.test(error.message)) return 'Operação bloqueada pelas permissões da campanha. Confira sua conta e o papel de Mestre.';
  return error.message;
}
const typeIcon = (category: Category) => {
  if (category === 'mapa') return <Map size={18}/>;
  if (category === 'imagem') return <FileImage size={18}/>;
  if (category === 'documento') return <FileText size={18}/>;
  if (category === 'link') return <Link2 size={18}/>;
  if (category === 'pista') return <Search size={18}/>;
  return <BookOpen size={18}/>;
};
type Props = { campaignId: string; userId: string; isMaster: boolean };

export function CampaignLibrary({ campaignId, userId, isMaster }: Props) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Category | 'todos'>('todos');
  const [creating, setCreating] = useState(false);
  const [category, setCategory] = useState<Category>('nota');
  const [visibility, setVisibility] = useState<Visibility>('mestre');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [signedUrl, setSignedUrl] = useState('');
  const [previewError, setPreviewError] = useState('');

  const visibleItems = useMemo(() => items
    .filter(item => item.campaign_id === campaignId && (isMaster || item.visibility === 'mesa') && (filter === 'todos' || item.category === filter))
    .filter(item => `${item.title}\n${item.description}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))),
  [campaignId, isMaster, items, filter, query]);
  const selected = items.find(item => item.campaign_id === campaignId && (isMaster || item.visibility === 'mesa') && item.id === selectedId) ?? null;

  const load = useCallback(async () => {
    if (!campaignId || !userId) return;
    setLoading(true);
    const { data, error } = await db.from('campaign_library_items').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false });
    // Não mostrar o retorno de outra mesa quando o usuário alterna rapidamente.
    if (!error) setItems(data ?? []);
    else setNotice(errorText(error));
    setLoading(false);
  }, [campaignId, userId]);

  useEffect(() => {
    setItems([]); setSelectedId(null); setCreating(false); setNotice(''); setSignedUrl(''); setPreviewError('');
    void load();
  }, [load, isMaster]);

  useEffect(() => {
    if (!campaignId || !userId) return;
    const channel = supabase.channel(`herdeiros-library-${campaignId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_library_items', filter: `campaign_id=eq.${campaignId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [campaignId, userId, load]);

  // URL assinada expira em 60 s e só é pedida quando alguém abre o documento.
  useEffect(() => {
    setSignedUrl(''); setPreviewError('');
    if (!selected?.storage_path) return;
    let active = true;
    void supabase.storage.from(BUCKET).createSignedUrl(selected.storage_path, 60).then(({ data, error }) => {
      if (!active) return;
      if (error) setPreviewError(error.message);
      else setSignedUrl(data?.signedUrl ?? '');
    });
    return () => { active = false; };
  }, [selected?.storage_path, selected?.id, selected?.visibility]);

  function resetForm() {
    setCategory('nota'); setVisibility('mestre'); setTitle(''); setDescription(''); setContent('');
    setExternalUrl(''); setFile(null); setCreating(false);
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = '';
    setFile(picked);
    if (picked && !title.trim()) setTitle(picked.name.slice(0, 160));
  }

  async function create() {
    if (!isMaster || saving) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) { setNotice('Informe um título para o material.'); return; }
    const needsFile = category === 'mapa' || category === 'imagem' || category === 'documento';
    if (needsFile && !file) { setNotice('Selecione um arquivo para este material.'); return; }
    const safeLink = category === 'link' ? onlyHttps(externalUrl) : null;
    if (category === 'link' && !safeLink) { setNotice('Use um link válido que comece com https://.'); return; }
    let path: string | null = null;
    setSaving(true); setNotice('');
    if (needsFile && file) {
      if (file.size > MAX_UPLOAD_BYTES) { setSaving(false); setNotice('Arquivo muito grande. O limite é 15 MB.'); return; }
      const mime = file.type === 'text/markdown' ? 'text/plain' : file.type;
      const ext = MEDIA_EXT[mime];
      if (!ext || !FILE_TYPES.includes(mime)) { setSaving(false); setNotice('Use PNG, JPG, WebP, PDF ou TXT. Outros formatos não são permitidos.'); return; }
      if (category === 'imagem' && !mime.startsWith('image/')) { setSaving(false); setNotice('A categoria Imagem aceita apenas PNG, JPG e WebP.'); return; }
      if (category === 'mapa' && !mime.startsWith('image/') && mime !== 'application/pdf') { setSaving(false); setNotice('A categoria Mapa aceita PNG, JPG, WebP ou PDF.'); return; }
      const uuid = crypto.randomUUID();
      path = `${campaignId}/${uuid}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: mime, cacheControl: '120' });
      if (error) { setSaving(false); setNotice(`Falha ao enviar arquivo: ${error.message}`); return; }
    }
    const payload: LibraryInsert = {
      campaign_id: campaignId, category, visibility, title: cleanTitle.slice(0, 160),
      description: description.trim().slice(0, 3000), content: (category === 'nota' || category === 'pista') ? content.slice(0, 16000) : '',
      external_url: safeLink, storage_path: path, file_name: path ? file?.name.slice(0, 220) ?? null : null,
      file_mime: path ? (file?.type === 'text/markdown' ? 'text/plain' : file?.type) ?? null : null,
    };
    const { data, error } = await db.from('campaign_library_items').insert(payload).select('*').single();
    if (error) {
      if (path) await supabase.storage.from(BUCKET).remove([path]); // Evita arquivo órfão em caso de falha.
      setSaving(false); setNotice(errorText(error)); return;
    }
    setItems(previous => [data, ...previous]); setSelectedId(data.id); resetForm();
    setNotice(visibility === 'mestre' ? 'Material salvo somente para o Mestre.' : 'Material adicionado e compartilhado com a mesa.');
    setSaving(false);
  }

  async function toggleVisibility(item: LibraryItem) {
    if (!isMaster || saving) return;
    const next: Visibility = item.visibility === 'mestre' ? 'mesa' : 'mestre';
    setSaving(true); setNotice('');
    const { error } = await db.from('campaign_library_items').update({ visibility: next, updated_at: new Date().toISOString() }).eq('id', item.id).eq('campaign_id', campaignId);
    setSaving(false);
    if (error) { setNotice(errorText(error)); return; }
    setItems(previous => previous.map(row => row.id === item.id ? { ...row, visibility: next } : row));
    setNotice(next === 'mesa' ? 'Material revelado aos jogadores.' : 'Material ocultado dos jogadores. Links assinados anteriores podem permanecer válidos por até 60 segundos.');
  }

  async function remove(item: LibraryItem) {
    if (!isMaster || saving || !window.confirm(`Excluir "${item.title}" da Biblioteca? Essa ação não pode ser desfeita.`)) return;
    setSaving(true); setNotice('');
    // Remover arquivo antes da linha, porque a autorização de acesso usa os metadados.
    if (item.storage_path) {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([item.storage_path]);
      if (storageError) { setSaving(false); setNotice(`Não foi possível remover o anexo: ${storageError.message}`); return; }
    }
    const { error } = await db.from('campaign_library_items').delete().eq('id', item.id).eq('campaign_id', campaignId);
    setSaving(false);
    if (error) { setNotice(`O anexo foi removido, mas o registro não: ${errorText(error)}. Atualize e tente excluir novamente.`); return; }
    setItems(previous => previous.filter(row => row.id !== item.id));
    if (selectedId === item.id) setSelectedId(null);
    setNotice('Material excluído da Biblioteca.');
  }

  return <section className="hlib-root" aria-label="Biblioteca da campanha">
    <div className="hlib-heading"><div><span className="hlib-kicker"><FolderOpen size={15}/> ARQUIVO DA MESA</span><h2>Biblioteca {isMaster ? 'do Mestre' : 'da Campanha'}</h2><p>{isMaster ? 'Guarde segredos e revele pistas quando chegar a hora.' : 'Aqui ficam as pistas, mapas e documentos que o Mestre compartilhou.'}</p></div>
      <div className="hlib-top-actions"><Button variant="outline" size="sm" disabled={loading} onClick={() => void load()}><RefreshCw size={16}/> Atualizar</Button>{isMaster && <Button size="sm" onClick={() => { resetForm(); setCreating(true); }}><Plus size={16}/> Novo material</Button>}</div>
    </div>
    {notice && <p role="status" className="hlib-notice">{notice}</p>}
    <div className="hlib-toolbar"><label className="hlib-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar materiais" aria-label="Pesquisar biblioteca"/></label><label className="hlib-filter">Categoria<select value={filter} onChange={e => setFilter(e.target.value as Category | 'todos')}><option value="todos">Todas</option>{CATEGORIES.map(cat => <option key={cat} value={cat}>{LABELS[cat]}</option>)}</select></label></div>
    {creating && isMaster && <div className="hlib-form"><div className="hlib-form-title"><h3>Novo material</h3><button aria-label="Cancelar criação" onClick={resetForm} type="button"><X size={19}/></button></div>
      <div className="hlib-form-grid"><label>Categoria<select value={category} onChange={e => { setCategory(e.target.value as Category); setFile(null); }} disabled={saving}>{CATEGORIES.map(cat => <option key={cat} value={cat}>{LABELS[cat]}</option>)}</select></label><label>Visibilidade<select value={visibility} onChange={e => setVisibility(e.target.value as Visibility)} disabled={saving}><option value="mestre">Privado — só Mestre</option><option value="mesa">Compartilhar com a mesa</option></select></label></div>
      <label>Título<input value={title} maxLength={160} disabled={saving} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Mapa da interseção norte"/></label>
      <label>Descrição (opcional)<textarea value={description} maxLength={3000} rows={2} disabled={saving} onChange={e => setDescription(e.target.value)}/></label>
      {(category === 'nota' || category === 'pista') && <label>Conteúdo<textarea value={content} maxLength={16000} rows={5} disabled={saving} onChange={e => setContent(e.target.value)} placeholder="Anotação, pista, texto de documento..."/></label>}
      {category === 'link' && <label>Endereço HTTPS<input value={externalUrl} type="url" disabled={saving} placeholder="https://..." onChange={e => setExternalUrl(e.target.value)}/></label>}
      {(category === 'mapa' || category === 'imagem' || category === 'documento') && <label className="hlib-upload"><UploadCloud size={20}/> Escolher imagem ou documento (até 15 MB)<input disabled={saving} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,image/jpeg,image/png,image/webp,application/pdf,text/plain" onChange={onFile}/>{file && <strong>{file.name}</strong>}</label>}
      <div className="hlib-form-actions"><Button disabled={saving || !title.trim()} onClick={() => void create()}><Check size={16}/>{saving ? 'Salvando...' : 'Salvar material'}</Button><Button variant="outline" disabled={saving} onClick={resetForm}>Cancelar</Button></div>
    </div>}
    {loading && <p className="hlib-empty">Carregando biblioteca...</p>}
    {!loading && !visibleItems.length && <p className="hlib-empty">{isMaster ? 'A Biblioteca está vazia. Crie sua primeira pista, mapa ou anotação.' : 'O Mestre ainda não revelou materiais para esta campanha.'}</p>}
    <div className="hlib-layout"><div className="hlib-list">{visibleItems.map(item => <button type="button" key={item.id} className={`hlib-item ${selectedId === item.id ? 'is-selected' : ''}`} onClick={() => { setSelectedId(item.id); setCreating(false); }}>
      <span className="hlib-item-icon">{typeIcon(item.category)}</span><span className="hlib-item-copy"><strong>{item.title}</strong><small>{LABELS[item.category]} · {item.visibility === 'mestre' ? 'Privado' : 'Compartilhado'}</small></span>{item.visibility === 'mestre' ? <LockKeyhole size={14}/> : <Eye size={14}/>}</button>)}</div>
      <div className="hlib-detail">{selected ? <article key={selected.id}><div className="hlib-detail-head"><span>{LABELS[selected.category]}</span><span>{selected.visibility === 'mestre' ? <><LockKeyhole size={15}/> Só Mestre</> : <><Eye size={15}/> Visível à mesa</>}</span></div><h3>{selected.title}</h3>{selected.description && <p>{selected.description}</p>}
        {(selected.category === 'nota' || selected.category === 'pista') && <p className="hlib-fulltext">{selected.content || 'Nenhum texto adicionado.'}</p>}
        {selected.external_url && <a className="hlib-link" href={selected.external_url} target="_blank" rel="noopener noreferrer"><Link2 size={17}/> Abrir referência externa</a>}
        {selected.storage_path && <div className="hlib-file-detail"><strong>{selected.file_name}</strong>{signedUrl && selected.file_mime?.startsWith('image/') && <img className="hlib-image" alt={selected.title} src={signedUrl} />}
          {previewError && <p role="status">Falha no acesso ao arquivo: {previewError}</p>}
          {signedUrl && <a className="hlib-link" href={signedUrl} target="_blank" rel="noopener noreferrer">Abrir arquivo (link temporário)</a>}
        </div>}
        {isMaster && <div className="hlib-item-actions"><Button variant="outline" size="sm" disabled={saving} onClick={() => void toggleVisibility(selected)}>{selected.visibility === 'mestre' ? <Eye size={16}/> : <EyeOff size={16}/>} {selected.visibility === 'mestre' ? 'Revelar à mesa' : 'Ocultar dos jogadores'}</Button><Button variant="outline" size="sm" disabled={saving} onClick={() => void remove(selected)}><Trash2 size={16}/> Excluir</Button></div>}
      </article> : <div className="hlib-placeholder"><FolderOpen size={38}/><p>Selecione um material para visualizar.</p></div>}</div>
    </div>
  </section>;
}
