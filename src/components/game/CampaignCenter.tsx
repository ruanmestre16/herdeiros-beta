import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, Check, CheckCircle2, ClipboardList, Eye, EyeOff, LockKeyhole, Plus, RefreshCw, ScrollText, Trash2, Users, WandSparkles } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import './campaign-center.css';
import { CampaignLibrary } from './CampaignLibrary';

type SessionStatus = 'planejada' | 'em_andamento' | 'concluida';
type ObjectiveStatus = 'aberto' | 'concluido';
type ObjectiveVisibility = 'mesa' | 'mestre';
type CampaignSession = {
  id: string; campaign_id: string; number: number; title: string;
  session_date: string | null; status: SessionStatus; public_summary: string;
  created_at: string; updated_at: string;
};
type SessionSecret = { session_id: string; private_notes: string; updated_at: string };
type CampaignObjective = {
  id: string; campaign_id: string; title: string; description: string;
  status: ObjectiveStatus; visibility: ObjectiveVisibility; created_at: string; updated_at: string;
};
type TableShape<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };
type SessionInsert = Pick<CampaignSession, 'campaign_id' | 'number' | 'title'> & Partial<Pick<CampaignSession, 'session_date' | 'status' | 'public_summary'>>;
type ObjectiveInsert = Pick<CampaignObjective, 'campaign_id' | 'title'> & Partial<Pick<CampaignObjective, 'description' | 'visibility' | 'status'>>;
type CampaignDatabase = { public: {
  Tables: {
    campaign_sessions: TableShape<CampaignSession, SessionInsert, Partial<CampaignSession>>;
    campaign_session_secrets: TableShape<SessionSecret, Pick<SessionSecret, 'session_id' | 'private_notes'>, Partial<SessionSecret>>;
    campaign_objectives: TableShape<CampaignObjective, ObjectiveInsert, Partial<CampaignObjective>>;
  };
  Views: Record<string, never>;
  Functions: Record<string, never>;
  Enums: Record<string, never>;
  CompositeTypes: Record<string, never>;
} };
// A migração SQL adiciona estas tabelas. Esta tipagem local não substitui as
// definições geradas pelo Supabase, evitando editar arquivos autogerados.
const db = supabase as unknown as SupabaseClient<CampaignDatabase>;

type Props = {
  campaignId: string | null;
  campaignName: string;
  userId: string | null;
  isMaster: boolean;
  membersCount: number;
  log: string[];
};
const STATUS_LABELS: Record<SessionStatus, string> = {
  planejada: 'Planejada', em_andamento: 'Em andamento', concluida: 'Concluída',
};
const PREVIEW_LOG_LIMIT = 15;
function dateText(value: string | null) {
  if (!value) return 'Data a definir';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
function readableError(error: { message: string; code?: string } | null) {
  if (!error) return '';
  if (error.code === '42P01' || /does not exist|not find the table|schema cache/i.test(error.message)) {
    return 'As tabelas da Central ainda não existem no Supabase. Execute a migração SQL do pacote antes de usar esta página.';
  }
  if (error.code === '42501') return 'Permissão negada: somente o Mestre pode alterar esta campanha.';
  return error.message;
}

export function CampaignCenter({ campaignId, campaignName, userId, isMaster, membersCount, log }: Props) {
  const [sessions, setSessions] = useState<CampaignSession[]>([]);
  const [objectives, setObjectives] = useState<CampaignObjective[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [privateNotes, setPrivateNotes] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<SessionStatus>('planejada');
  const [summary, setSummary] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [objectiveVisibility, setObjectiveVisibility] = useState<ObjectiveVisibility>('mesa');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<'sessoes' | 'objetivos' | 'cronica' | 'biblioteca'>('sessoes');
  const current = sessions.find(s => s.id === selectedId) ?? null;
  const openObjectives = useMemo(() => objectives.filter(o => o.status === 'aberto').length, [objectives]);
  // Foco opcional vindo da Pesquisa Geral: abre a aba correta.
  useEffect(() => {
    const focus = () => {
      try {
        const raw = sessionStorage.getItem('herdeiros:global-search-target');
        if (!raw || !campaignId) return;
        const target = JSON.parse(raw) as { kind?: string; id?: string; campaignId?: string };
        if (target.campaignId !== campaignId) return;
        if (target.kind === 'biblioteca') { setTab('biblioteca'); return; }
        if (target.kind === 'objetivo') { setTab('objetivos'); sessionStorage.removeItem('herdeiros:global-search-target'); return; }
        if (target.kind === 'sessao') {
          setTab('sessoes');
          if (sessions.some(s => s.id === target.id)) {
            setSelectedId(target.id ?? null);
            sessionStorage.removeItem('herdeiros:global-search-target');
          }
        }
      } catch { /* ignore */ }
    };
    focus(); window.addEventListener('herdeiros:global-search-focus', focus);
    return () => window.removeEventListener('herdeiros:global-search-focus', focus);
  }, [campaignId, sessions]);


  const load = useCallback(async () => {
    if (!campaignId || !userId) return;
    setLoading(true);
    const [sessionResult, objectiveResult] = await Promise.all([
      db.from('campaign_sessions').select('*').eq('campaign_id', campaignId).order('number', { ascending: false }),
      db.from('campaign_objectives').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false }),
    ]);
    const err = sessionResult.error || objectiveResult.error;
    if (err) setNotice(readableError(err));
    else {
      setSessions(sessionResult.data || []);
      setObjectives(objectiveResult.data || []);
      setNotice('');
      setSelectedId(previous => previous && (sessionResult.data || []).some(s => s.id === previous)
        ? previous : sessionResult.data?.[0]?.id ?? null);
    }
    setLoading(false);
  }, [campaignId, userId]);

  useEffect(() => {
    setSessions([]); setObjectives([]); setSelectedId(null); setPrivateNotes('');
    setTitle(''); setSummary(''); setDate(''); setStatus('planejada'); setNotice('');
    void load();
  }, [load]);

  // Atualização entre participantes conectados à mesma mesa.
  useEffect(() => {
    if (!campaignId || !userId) return;
    const channel = supabase.channel(`herdeiros-campaign-center-${campaignId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_sessions', filter: `campaign_id=eq.${campaignId}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_objectives', filter: `campaign_id=eq.${campaignId}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [campaignId, userId, load]);

  useEffect(() => {
    const selected = sessions.find(s => s.id === selectedId);
    if (!selected) return;
    setTitle(selected.title); setDate(selected.session_date || '');
    setStatus(selected.status); setSummary(selected.public_summary);
    setPrivateNotes('');
    if (!isMaster) return;
    let active = true;
    void db.from('campaign_session_secrets').select('private_notes').eq('session_id', selected.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setNotice(readableError(error));
        else setPrivateNotes(data?.private_notes ?? '');
      });
    return () => { active = false; };
    // Manter o formulário enquanto edita; atualizações de outras sessões não sobrescrevem campos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, isMaster, campaignId]);

  async function createSession() {
    if (!campaignId || !isMaster) return;
    setSaving(true); setNotice('');
    const number = Math.max(0, ...sessions.map(s => s.number)) + 1;
    const { data, error } = await db.from('campaign_sessions')
      .insert({ campaign_id: campaignId, number, title: `Sessão ${number}`, status: 'planejada' })
      .select('*').single();
    setSaving(false);
    if (error) { setNotice(readableError(error)); return; }
    setSessions(previous => [data, ...previous]); setSelectedId(data.id);
    setTab('sessoes'); setNotice(`Sessão ${number} criada.`);
  }

  async function saveSession() {
    if (!current || !isMaster || !title.trim()) return;
    setSaving(true); setNotice('');
    const payload = {
      title: title.trim().slice(0, 160), session_date: date || null,
      status, public_summary: summary.slice(0, 12000), updated_at: new Date().toISOString(),
    };
    const { error } = await db.from('campaign_sessions').update(payload).eq('id', current.id);
    if (error) { setSaving(false); setNotice(readableError(error)); return; }
    const secretResult = await db.from('campaign_session_secrets').upsert({
      session_id: current.id, private_notes: privateNotes.slice(0, 24000), updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id' });
    setSaving(false);
    if (secretResult.error) { setNotice(`Resumo público salvo, mas notas privadas não foram salvas: ${readableError(secretResult.error)}`); return; }
    setSessions(previous => previous.map(s => s.id === current.id ? { ...s, ...payload } : s));
    setNotice('Sessão salva. Resumo disponível para a mesa; notas privadas restritas ao Mestre.');
  }

  async function deleteSession() {
    if (!current || !isMaster || !window.confirm(`Excluir definitivamente a sessão ${current.number}?`)) return;
    setSaving(true);
    const { error } = await db.from('campaign_sessions').delete().eq('id', current.id);
    setSaving(false);
    if (error) { setNotice(readableError(error)); return; }
    const remaining = sessions.filter(s => s.id !== current.id);
    setSessions(remaining); setSelectedId(remaining[0]?.id ?? null);
    setNotice('Sessão excluída.');
  }

  async function createObjective() {
    if (!campaignId || !isMaster || !newObjective.trim()) return;
    setSaving(true); setNotice('');
    const { data, error } = await db.from('campaign_objectives')
      .insert({ campaign_id: campaignId, title: newObjective.trim().slice(0, 180), visibility: objectiveVisibility })
      .select('*').single();
    setSaving(false);
    if (error) { setNotice(readableError(error)); return; }
    setObjectives(previous => [data, ...previous]);
    setNewObjective(''); setNotice('Objetivo criado.');
  }

  async function setObjectiveStatus(objective: CampaignObjective) {
    if (!isMaster) return;
    const next: ObjectiveStatus = objective.status === 'aberto' ? 'concluido' : 'aberto';
    const { error } = await db.from('campaign_objectives')
      .update({ status: next, updated_at: new Date().toISOString() }).eq('id', objective.id);
    if (error) { setNotice(readableError(error)); return; }
    setObjectives(previous => previous.map(o => o.id === objective.id ? { ...o, status: next } : o));
    setNotice('Objetivo atualizado.');
  }

  async function deleteObjective(objective: CampaignObjective) {
    if (!isMaster || !window.confirm(`Excluir objetivo "${objective.title}"?`)) return;
    const { error } = await db.from('campaign_objectives').delete().eq('id', objective.id);
    if (error) { setNotice(readableError(error)); return; }
    setObjectives(previous => previous.filter(o => o.id !== objective.id));
    setNotice('Objetivo excluído.');
  }

  if (!campaignId) return <section className="hc-center hc-empty"><BookOpen size={32}/><h2>Nenhuma campanha selecionada</h2><p>Crie uma mesa ou entre em uma existente na área Mesa / Mestre.</p></section>;
  if (!userId) return <section className="hc-center hc-empty"><LockKeyhole size={32}/><h2>Entre para acompanhar sua campanha</h2><p>As sessões e objetivos ficam associados à sua conta e à mesa no Supabase.</p></section>;

  return <section className="hc-center" aria-label="Central de Campanhas">
    <header className="hc-hero">
      <span className="hc-eyebrow"><WandSparkles size={15}/> HERDEIROS · CAMPANHAS</span>
      <div className="hc-hero-main"><div><h1>Central de <em>Campanhas</em></h1><p>{campaignName || 'Mesa sem nome'} · {isMaster ? 'Visão do Mestre' : 'Visão do Jogador'}</p></div>
      <Button variant="outline" onClick={() => void load()} disabled={loading} title="Atualizar sessões e objetivos"><RefreshCw size={16}/> Atualizar</Button></div>
      <div className="hc-stats"><span><CalendarDays size={17}/> {sessions.length} sessões</span><span><ClipboardList size={17}/> {openObjectives} objetivos abertos</span><span><Users size={17}/> {membersCount} participantes</span></div>
    </header>

    <div className="hc-tabs" role="tablist" aria-label="Áreas da Central">
      <button type="button" role="tab" aria-selected={tab === 'sessoes'} className={tab === 'sessoes' ? 'is-active' : ''} onClick={() => setTab('sessoes')}><CalendarDays size={17}/> Sessões</button>
      <button type="button" role="tab" aria-selected={tab === 'objetivos'} className={tab === 'objetivos' ? 'is-active' : ''} onClick={() => setTab('objetivos')}><ClipboardList size={17}/> Objetivos</button>
      <button type="button" role="tab" aria-selected={tab === 'cronica'} className={tab === 'cronica' ? 'is-active' : ''} onClick={() => setTab('cronica')}><ScrollText size={17}/> Crônica</button>
      <button type="button" role="tab" aria-selected={tab === 'biblioteca'} className={tab === 'biblioteca' ? 'is-active' : ''} onClick={() => setTab('biblioteca')}><BookOpen size={17}/> Biblioteca</button>
    </div>
    {notice && <p className="hc-notice" role="status">{notice}</p>}
    {loading && <p className="hc-loading" role="status">Sincronizando dados da campanha...</p>}

    {tab === 'sessoes' && <div className="hc-sessions">
      <aside className="hc-session-list"><div className="hc-panel-header"><h2>Jornadas registradas</h2>{isMaster && <Button size="sm" onClick={() => void createSession()} disabled={saving}><Plus size={15}/> Nova</Button>}</div>
        {!sessions.length && <p className="hc-empty-copy">Ainda não há sessões. O Mestre pode criar a primeira.</p>}
        {sessions.map(s => <button key={s.id} type="button" className={`hc-session-choice ${selectedId === s.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(s.id)}>
          <span className="hc-session-number">{String(s.number).padStart(2, '0')}</span><span className="hc-session-choice-text"><strong>{s.title}</strong><small>{dateText(s.session_date)} · {STATUS_LABELS[s.status]}</small></span>
        </button>)}
      </aside>
      <div className="hc-session-detail">{current ? <>
        <div className="hc-panel-header"><h2>Sessão {current.number}</h2><span className="hc-chip">{STATUS_LABELS[current.status]}</span></div>
        {isMaster ? <div className="hc-form">
          <label>Título da sessão<input value={title} maxLength={160} onChange={e => setTitle(e.target.value)}/></label>
          <div className="hc-form-row"><label>Data<input type="date" value={date} onChange={e => setDate(e.target.value)}/></label><label>Situação<select value={status} onChange={e => setStatus(e.target.value as SessionStatus)}><option value="planejada">Planejada</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluída</option></select></label></div>
          <label>Resumo compartilhado com os jogadores<textarea rows={6} maxLength={12000} value={summary} placeholder="O que aconteceu na sessão? Quais descobertas o grupo fez?" onChange={e => setSummary(e.target.value)}/></label>
          <label className="hc-private-label"><LockKeyhole size={15}/> Anotações secretas do Mestre<textarea rows={5} maxLength={24000} value={privateNotes} placeholder="Reviravoltas, pistas não reveladas e decisões futuras. Visível somente ao Mestre." onChange={e => setPrivateNotes(e.target.value)}/></label>
          <div className="hc-form-actions"><Button disabled={saving || !title.trim()} onClick={() => void saveSession()}><Check size={16}/> Salvar sessão</Button><Button variant="outline" size="sm" disabled={saving} onClick={() => void deleteSession()}><Trash2 size={15}/> Excluir</Button></div>
        </div> : <article className="hc-public-summary"><span className="hc-muted">{dateText(current.session_date)}</span><h3>{current.title}</h3><p>{current.public_summary || 'O Mestre ainda não compartilhou um resumo desta sessão.'}</p></article>}
      </> : <div className="hc-empty-copy">Selecione uma sessão à esquerda para acompanhar sua história.</div>}</div>
    </div>}

    {tab === 'objetivos' && <div className="hc-objectives"><div className="hc-panel-header"><h2>Objetivos da campanha</h2><span>{openObjectives} em andamento</span></div>
      {isMaster && <div className="hc-objective-create"><label className="hc-sr-only" htmlFor="hc-new-objective">Novo objetivo</label><input id="hc-new-objective" value={newObjective} maxLength={180} onChange={e => setNewObjective(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void createObjective(); }} placeholder="Ex.: Encontrar a origem das inscrições"/>
        <select aria-label="Visibilidade do objetivo" value={objectiveVisibility} onChange={e => setObjectiveVisibility(e.target.value as ObjectiveVisibility)}><option value="mesa">Visível à mesa</option><option value="mestre">Só Mestre</option></select>
        <Button disabled={saving || !newObjective.trim()} onClick={() => void createObjective()}><Plus size={17}/> Adicionar</Button></div>}
      {!objectives.length && <p className="hc-empty-copy">Nenhum objetivo disponível nesta campanha.</p>}
      <div className="hc-objective-list">{objectives.map(objective => <article className={`hc-objective ${objective.status === 'concluido' ? 'is-done' : ''}`} key={objective.id}>
        <span className="hc-objective-icon">{objective.status === 'concluido' ? <CheckCircle2 size={22}/> : <ClipboardList size={22}/>}</span>
        <div><h3>{objective.title}</h3>{objective.description && <p>{objective.description}</p>}
          <small>{objective.visibility === 'mestre' ? <><EyeOff size={13}/> Anotação privada</> : <><Eye size={13}/> Compartilhado com a mesa</>} · {objective.status === 'concluido' ? 'Concluído' : 'Em aberto'}</small></div>
        {isMaster && <div className="hc-objective-actions"><Button size="sm" variant="outline" onClick={() => void setObjectiveStatus(objective)}>{objective.status === 'concluido' ? 'Reabrir' : 'Concluir'}</Button><Button variant="ghost" size="sm" aria-label={`Excluir objetivo ${objective.title}`} onClick={() => void deleteObjective(objective)}><Trash2 size={15}/></Button></div>}
      </article>)}</div>
    </div>}

    {tab === 'biblioteca' && <CampaignLibrary campaignId={campaignId} userId={userId} isMaster={isMaster} />}
    {tab === 'cronica' && <section className="hc-chronicle"><div className="hc-panel-header"><h2>Crônica recente</h2><span>Registros existentes da mesa</span></div>
      <p className="hc-muted">Os acontecimentos do combate e da mesa continuam sendo registrados pelas ferramentas que você já usa. Esta área apenas reúne a leitura dos registros.</p>
      {!log.length && <p className="hc-empty-copy">Nenhum acontecimento registrado ainda.</p>}
      {log.slice(0, PREVIEW_LOG_LIMIT).map((entry, index) => <p className="hc-chronicle-entry" key={`${index}-${entry.slice(0, 20)}`}><span>✦</span>{entry}</p>)}
      {log.length > PREVIEW_LOG_LIMIT && <p className="hc-muted">Exibindo os {PREVIEW_LOG_LIMIT} registros mais recentes de {log.length}.</p>}
    </section>}
  </section>;
}
