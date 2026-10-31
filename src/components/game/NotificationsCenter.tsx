import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Bell, BookOpen, CheckCheck, ChevronRight, RefreshCw, ScrollText, Shield, Swords, Trash2, Users, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import './notifications-center.css';

export type NotificationDestination = 'mesa' | 'mestre' | 'campanhas' | 'biblioteca';

type NotificationKind = 'participant' | 'combat' | 'session' | 'objective' | 'library';
type NotificationRecord = {
  id: string;
  recipient_id: string;
  campaign_id: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  target: NotificationDestination;
  created_at: string;
  read_at: string | null;
};

type FilterMode = 'todas' | 'nao-lidas';

function readableDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

function NotificationIcon({ kind }: { kind: NotificationKind }) {
  if (kind === 'combat') return <Swords size={17} />;
  if (kind === 'session') return <ScrollText size={17} />;
  if (kind === 'library') return <BookOpen size={17} />;
  if (kind === 'objective') return <Shield size={17} />;
  return <Users size={17} />;
}

/**
 * Notificações pessoais persistentes (Lovable Cloud). Não cria notícias fictícias:
 * todos os eventos exibidos foram gravados no banco pelos gatilhos SQL.
 */
export function NotificationsCenter({
  userId,
  onNavigate,
  onLogin,
}: {
  userId: string | null;
  onNavigate: (destination: NotificationDestination, campaignId: string | null) => void;
  onLogin: () => void;
}) {
  const panelId = useId();
  const [opened, setOpened] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('todas');
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [missingMigration, setMissingMigration] = useState(false);
  const [error, setError] = useState('');
  const requestNumber = useRef(0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const reload = useCallback(async (silent = false) => {
    if (!userId) return;
    const request = ++requestNumber.current;
    if (!silent) setLoading(true);
    // A tabela nova ainda não aparece nos tipos gerados pelo Lovable.
    // O cast altera somente o TypeScript: a URL consultada é herdeiros_notifications.
    const { data, error: queryError } = await supabase
      .from('herdeiros_notifications' as 'campaigns')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (request !== requestNumber.current) return;
    setLoading(false);
    if (queryError) {
      const missing = /herdeiros_notifications|does not exist|schema cache|could not find|42P01|PGRST205/i.test(queryError.message);
      setMissingMigration(missing);
      setError(missing ? 'A Central precisa da migração SQL da Etapa 6 no banco do Lovable.' : 'Não foi possível buscar os avisos. Tente atualizar.');
      return;
    }
    setMissingMigration(false);
    setError('');
    setItems((data ?? []) as unknown as NotificationRecord[]);
  }, [userId]);

  useEffect(() => {
    ++requestNumber.current;
    setItems([]);
    setMissingMigration(false);
    setError('');
    setOpened(false);
    if (!userId) return;
    void reload();
    const channel = supabase.channel(`herdeiros-notificacoes-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'herdeiros_notifications', filter: `recipient_id=eq.${userId}`,
      }, () => { void reload(true); })
      .subscribe();
    // Atualiza mesmo se o Realtime estiver indisponível; dados permanecem no banco.
    const timer = window.setInterval(() => { if (!document.hidden) void reload(true); }, 30000);
    const onFocus = () => { if (!document.hidden) void reload(true); };
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      ++requestNumber.current;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onFocus);
      void supabase.removeChannel(channel);
    };
  }, [userId, reload]);

  useEffect(() => {
    if (!opened) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpened(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [opened]);

  const unread = items.filter(item => !item.read_at).length;
  const visible = filter === 'nao-lidas' ? items.filter(item => !item.read_at) : items;

  async function markRead(id: string) {
    if (!userId || busy) return;
    setItems(previous => previous.map(item => item.id === id ? { ...item, read_at: item.read_at || new Date().toISOString() } : item));
    const { error: writeError } = await supabase.from('herdeiros_notifications' as 'campaigns')
      .update({ read_at: new Date().toISOString() } as never)
      .eq('id', id).eq('recipient_id', userId).is('read_at', null);
    if (writeError) { setError('Não foi possível marcar como lida.'); void reload(true); }
  }

  async function markAllRead() {
    if (!userId || !unread || busy) return;
    setBusy(true);
    const now = new Date().toISOString();
    setItems(previous => previous.map(item => ({ ...item, read_at: item.read_at || now })));
    const { error: writeError } = await supabase.from('herdeiros_notifications' as 'campaigns')
      .update({ read_at: now } as never).eq('recipient_id', userId).is('read_at', null);
    if (writeError) { setError('Não foi possível marcar tudo como lido.'); await reload(true); }
    setBusy(false);
  }

  async function deleteOne(id: string) {
    if (!userId || busy) return;
    setItems(previous => previous.filter(item => item.id !== id));
    const { error: writeError } = await supabase.from('herdeiros_notifications' as 'campaigns')
      .delete().eq('recipient_id', userId).eq('id', id);
    if (writeError) { setError('Não foi possível excluir o aviso.'); void reload(true); }
  }

  async function deleteRead() {
    if (!userId || busy || !items.some(item => item.read_at)) return;
    setBusy(true);
    setItems(previous => previous.filter(item => !item.read_at));
    const { error: writeError } = await supabase.from('herdeiros_notifications' as 'campaigns')
      .delete().eq('recipient_id', userId).not('read_at', 'is', null);
    if (writeError) { setError('Não foi possível limpar as notificações lidas.'); await reload(true); }
    setBusy(false);
  }

  function openNotification(item: NotificationRecord) {
    void markRead(item.id);
    setOpened(false);
    onNavigate(item.target, item.campaign_id);
  }

  return <div className="hn-root">
    <button ref={buttonRef} type="button" className="hn-trigger" aria-label={`Notificações${unread ? `, ${unread} não lidas` : ''}`} aria-haspopup="dialog" aria-expanded={opened} aria-controls={opened ? panelId : undefined} title="Central de Notificações" onClick={() => setOpened(value => !value)}>
      <Bell size={18} aria-hidden="true" />
      {unread > 0 && <span className="hn-count" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
      <span className="hn-trigger-text">Avisos</span>
    </button>
    {opened && <>
      <div className="hn-backdrop" onMouseDown={() => setOpened(false)} aria-hidden="true" />
      <section id={panelId} className="hn-panel" role="dialog" aria-modal="false" aria-label="Central de Notificações">
        <header className="hn-heading">
          <div><span className="hn-kicker">HERDEIROS · MESA VIVA</span><h2>Notificações</h2><p>Avisos importantes das suas campanhas</p></div>
          <button type="button" className="hn-icon-button" title="Fechar" aria-label="Fechar notificações" onClick={() => setOpened(false)}><X size={18} /></button>
        </header>
        {userId ? <>
          <div className="hn-toolbar">
            <div className="hn-filters" role="group" aria-label="Filtro de notificações">
              <button type="button" className={filter === 'todas' ? 'hn-selected' : ''} onClick={() => setFilter('todas')}>Todas ({items.length})</button>
              <button type="button" className={filter === 'nao-lidas' ? 'hn-selected' : ''} onClick={() => setFilter('nao-lidas')}>Não lidas ({unread})</button>
            </div>
            <button type="button" className="hn-icon-button" title="Atualizar avisos" aria-label="Atualizar notificações" onClick={() => void reload()} disabled={loading}><RefreshCw size={17} className={loading ? 'hn-spin' : ''}/></button>
          </div>
          {error && <div className="hn-alert" role="status">{error}{missingMigration && <small>Execute o SQL do ZIP no SQL Editor do Lovable Cloud. Não é necessário usar os créditos de chat.</small>}</div>}
          <div className="hn-list">
            {loading && !items.length ? <p className="hn-empty">Carregando suas notificações...</p> : visible.length === 0 ? <p className="hn-empty">{filter === 'nao-lidas' ? 'Você está em dia. Nenhum aviso pendente.' : 'Nenhuma notificação ainda. As novas atividades da sua campanha aparecerão aqui.'}</p> : visible.map(item => <article key={item.id} className={`hn-item ${!item.read_at ? 'hn-unread' : ''}`}>
              <span className="hn-kind-icon"><NotificationIcon kind={item.kind}/></span>
              <button type="button" className="hn-item-main" onClick={() => openNotification(item)} title="Abrir área relacionada">
                <span className="hn-item-title">{item.title}</span>
                <span className="hn-item-body">{item.body}</span>
                <time dateTime={item.created_at}>{readableDate(item.created_at)}</time>
              </button>
              <div className="hn-item-actions">
                {!item.read_at && <button type="button" className="hn-icon-button" title="Marcar como lida" aria-label={`Marcar ${item.title} como lida`} onClick={() => void markRead(item.id)}><CheckCheck size={16}/></button>}
                <button type="button" className="hn-icon-button" title="Excluir aviso" aria-label={`Excluir ${item.title}`} onClick={() => void deleteOne(item.id)}><Trash2 size={15}/></button>
                <ChevronRight size={15} aria-hidden="true"/>
              </div>
            </article>)}
          </div>
          <footer className="hn-footer">
            <button type="button" onClick={() => void markAllRead()} disabled={!unread || busy}><CheckCheck size={16}/> Marcar todas como lidas</button>
            <button type="button" onClick={() => void deleteRead()} disabled={!items.some(item => item.read_at) || busy}><Trash2 size={15}/> Limpar lidas</button>
          </footer>
        </> : <div className="hn-guest"><Bell size={28} /><p>Entre na sua conta para receber notificações das suas campanhas.</p><button type="button" onClick={() => { setOpened(false); onLogin(); }}>Entrar na conta</button></div>}
      </section>
    </>}
  </div>;
}
