import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, FileText, FolderOpen, Library, LoaderCircle, Map, Search, Shield, Swords, UserRound, Users, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BESTIARY } from '@/lib/bestiary';
import { SEARCH_RULES } from '@/lib/herdeiros-search-rules';
import type { Campaign, Character, Npc } from '@/lib/game';
import './global-search.css';

type Kind = 'regra' | 'bestiario' | 'ficha' | 'npc' | 'campanha' | 'sessao' | 'objetivo' | 'biblioteca' | 'pagina';
export type GlobalSearchResult = { key: string; kind: Kind; title: string; description: string; keywords?: string; id?: string; campaignId?: string };
type Filter = 'tudo' | 'manual' | 'pessoas' | 'campanhas' | 'biblioteca';
type Membership = { campaign_id: string; user_id: string; character_id: string | null };
type CampaignSearchRow = { id: string; campaign_id: string; title: string; public_summary?: string; description?: string; content?: string; category?: string; visibility?: string };
type RemoteTable<T> = { Row: T; Insert: Partial<T>; Update: Partial<T>; Relationships: [] };
type SearchDatabase = { public: {
  Tables: {
    campaign_sessions: RemoteTable<CampaignSearchRow>;
    campaign_objectives: RemoteTable<CampaignSearchRow>;
    campaign_library_items: RemoteTable<CampaignSearchRow>;
  };
  Views: Record<string, never>; Functions: Record<string, never>;
  Enums: Record<string, never>; CompositeTypes: Record<string, never>;
}};
const searchDb = supabase as unknown as SupabaseClient<SearchDatabase>;

type Props = {
  userId: string | null;
  characters: Character[];
  partyCharacters: Character[];
  npcs: Npc[];
  campaigns: Campaign[];
  memberships: Membership[];
  onOpen: (result: GlobalSearchResult) => void;
};

const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const categories: { id: Filter; label: string }[] = [
  { id: 'tudo', label: 'Tudo' },
  { id: 'manual', label: 'Regras e bestiário' },
  { id: 'pessoas', label: 'Fichas e NPCs' },
  { id: 'campanhas', label: 'Campanhas' },
  { id: 'biblioteca', label: 'Biblioteca' },
];
const kindsToFilter: Record<Kind, Filter> = {
  regra: 'manual', bestiario: 'manual', pagina: 'manual',
  ficha: 'pessoas', npc: 'pessoas',
  campanha: 'campanhas', sessao: 'campanhas', objetivo: 'campanhas', biblioteca: 'biblioteca',
};
const shortcut: GlobalSearchResult[] = [
  { key: 'atalho:regras', kind: 'pagina', title: 'Regras do Despertar', description: 'Abrir o Códice interativo', id: 'regras', keywords: 'regras livro códice combate fluxo karma' },
  { key: 'atalho:bestiario', kind: 'pagina', title: 'Bestiário', description: 'Consultar criaturas e ameaças de Arcádia', id: 'bestiario', keywords: 'criaturas monstros gakis agentes' },
  { key: 'atalho:historia', kind: 'pagina', title: 'História e Atlas', description: 'Acompanhar a história do mundo', id: 'historia', keywords: 'lore arcádia mundo espelho atlas' },
  { key: 'atalho:linhagens', kind: 'pagina', title: 'Linhagens', description: 'Humano, Arcadiano, Gaki e Agente Tecnológico', id: 'linhagens' },
  { key: 'atalho:jogador', kind: 'pagina', title: 'Suas fichas', description: 'Abrir a área Jogador', id: 'jogador' },
  { key: 'atalho:mesa', kind: 'pagina', title: 'Mesa / Mestre', description: 'Abrir ferramentas de sessão', id: 'mesa' },
];
const labelFor: Record<Kind, string> = {
  regra: 'Regra', bestiario: 'Criatura', ficha: 'Ficha', npc: 'NPC do Mestre',
  campanha: 'Campanha', sessao: 'Sessão', objetivo: 'Objetivo', biblioteca: 'Biblioteca', pagina: 'Atalho',
};
const glyph: Record<Kind, typeof Search> = {
  regra: BookOpen, bestiario: Swords, ficha: UserRound, npc: Shield,
  campanha: Users, sessao: Map, objetivo: FileText, biblioteca: Library, pagina: FolderOpen,
};
const safeString = (value: unknown) => typeof value === 'string' ? value : '';
const limitText = (s: string, max = 190) => s.length > max ? `${s.slice(0, max - 1)}…` : s;

/** Busca local no conteúdo público + consulta sob RLS para os recursos da campanha.
 * Nenhum dado privado é persistido em localStorage nem enviado para serviços externos.
 */
export function GlobalSearch({ userId, characters, partyCharacters, npcs, campaigns, memberships, onOpen }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('tudo');
  const [focused, setFocused] = useState(0);
  const [remote, setRemote] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [partial, setPartial] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const access = useMemo(() => {
    const myCampaigns = campaigns.filter(c => !userId ||
      (c as Campaign & {master_id?: string}).master_id === userId ||
      memberships.some(m => m.campaign_id === c.id && m.user_id === userId));
    const masterIds = new Set(campaigns.filter(c => userId && (c as Campaign & {master_id?: string}).master_id === userId).map(c => c.id));
    const allowedIds = new Set(myCampaigns.map(c => c.id));
    return { myCampaigns, masterIds, allowedIds, keys: myCampaigns.map(c => c.id).sort().join('|') };
  }, [campaigns, memberships, userId]);

  const local = useMemo<GlobalSearchResult[]>(() => {
    const entries: GlobalSearchResult[] = [...shortcut];
    for (const item of SEARCH_RULES) entries.push({
      key: `regra:${item.id}`, kind: 'regra', id: item.id, title: item.title,
      description: `${item.group} · ${item.teaser}`, keywords: `${item.group} ${item.teaser}`,
    });
    for (const t of BESTIARY) entries.push({
      key: `bestiario:${t.id}`, kind: 'bestiario', id: t.id, title: t.name,
      description: `${t.category} · ${limitText(t.descricao, 150)}`,
      keywords: `${t.category} ${t.descricao} ${t.habilidades} ${t.ataques}`,
    });
    for (const c of characters) entries.push({
      key: `ficha:${c.id}`, kind: 'ficha', id: c.id, title: c.name,
      description: `${c.lineage} · ${c.stage} · Sua ficha`,
      keywords: `${c.lineage} ${c.stage} ${c.concept || ''} ${c.weapon || ''} ${c.nomenclatures.map(n => n.name).join(' ')} ${c.abilities.map(a => a.name).join(' ')}`,
    });
    const own = new Set(characters.map(c => c.id));
    const visiblePartyIds = new Set(memberships.filter(m => m.character_id && access.allowedIds.has(m.campaign_id)).map(m => m.character_id));
    for (const c of partyCharacters) {
      if (own.has(c.id) || (userId && !visiblePartyIds.has(c.id))) continue;
      entries.push({ key: `ficha:${c.id}`, kind: 'ficha', id: c.id, title: c.name,
        description: `${c.lineage} · ${c.stage} · Personagem da mesa`, keywords: `${c.lineage} ${c.stage}` });
    }
    for (const n of npcs) {
      const campaignId = (n as Npc & { campaign_id?: string }).campaign_id;
      // Um NPC de campanha nunca é indexado para participantes comuns, mesmo que a tabela tenha RLS permissiva.
      if (userId ? !campaignId || !access.masterIds.has(campaignId) : false) continue;
      entries.push({ key: `npc:${n.id}`, kind: 'npc', id: n.id, campaignId,
        title: n.name, description: n.kind || 'NPC do Mestre' });
    }
    for (const c of access.myCampaigns) entries.push({
      key: `campanha:${c.id}`, kind: 'campanha', id: c.id, campaignId: c.id,
      title: c.name, description: `Campanha · ${c.scene || 'Mesa viva'}`,
    });
    return entries;
  }, [characters, partyCharacters, npcs, access, memberships, userId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpen(value => !value);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    setRemote([]);
    setPartial(false);
    if (!open || !userId || !access.keys) { setLoading(false); return; }
    let active = true;
    const campaignIds = access.keys.split('|');
    setLoading(true);
    // As 3 consultas passam pelas políticas RLS do Lovable Cloud. Evita buscar segredos de sessões.
    void Promise.all([
      searchDb.from('campaign_sessions').select('id,campaign_id,title,public_summary').in('campaign_id', campaignIds).limit(150),
      searchDb.from('campaign_objectives').select('id,campaign_id,title,description,visibility').in('campaign_id', campaignIds).limit(150),
      searchDb.from('campaign_library_items').select('id,campaign_id,title,description,content,category,visibility').in('campaign_id', campaignIds).limit(150),
    ]).then(responses => {
      if (!active) return;
      const [sessions, objectives, library] = responses;
      const items: GlobalSearchResult[] = [];
      for (const item of ((sessions.data ?? []) as unknown as Record<string, unknown>[])) {
        const id = safeString(item.id); const campaignId = safeString(item.campaign_id);
        if (!id || !access.allowedIds.has(campaignId)) continue;
        items.push({ key: `sessao:${id}`, kind: 'sessao', id, campaignId,
          title: safeString(item.title), description: limitText(safeString(item.public_summary), 150) || 'Sessão da campanha' });
      }
      for (const item of ((objectives.data ?? []) as unknown as Record<string, unknown>[])) {
        const id = safeString(item.id); const campaignId = safeString(item.campaign_id);
        if (!id || !access.allowedIds.has(campaignId)) continue;
        if (item.visibility !== 'mesa' && !access.masterIds.has(campaignId)) continue;
        items.push({ key: `objetivo:${id}`, kind: 'objetivo', id, campaignId,
          title: safeString(item.title), description: limitText(safeString(item.description), 150) || 'Objetivo da campanha' });
      }
      for (const item of ((library.data ?? []) as unknown as Record<string, unknown>[])) {
        const id = safeString(item.id); const campaignId = safeString(item.campaign_id);
        if (!id || !access.allowedIds.has(campaignId)) continue;
        if (item.visibility !== 'mesa' && !access.masterIds.has(campaignId)) continue;
        items.push({ key: `biblioteca:${id}`, kind: 'biblioteca', id, campaignId,
          title: safeString(item.title), description: limitText(safeString(item.description), 150) || `Arquivo · ${safeString(item.category)}`,
          keywords: limitText(safeString(item.content), 3000) });
      }
      setRemote(items);
      setPartial(responses.some(r => !!r.error));
    }).catch(() => { if (active) setPartial(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, userId, access.keys, access]);

  const items = useMemo(() => {
    const words = fold(query.trim()).split(/\s+/).filter(Boolean);
    const output = [...local, ...remote].filter(result => {
      if (filter !== 'tudo' && kindsToFilter[result.kind] !== filter) return false;
      if (!words.length) return true;
      const hay = fold(`${result.title} ${result.description} ${result.keywords ?? ''}`);
      return words.every(word => hay.includes(word));
    });
    if (words.length) output.sort((a, b) => {
      const rank = (x: GlobalSearchResult) => {
        const title = fold(x.title);
        return (title === fold(query.trim()) ? 120 : 0) +
          (title.startsWith(words[0]) ? 60 : 0) +
          (words.every(w => title.includes(w)) ? 35 : 0) +
          (x.kind === 'ficha' || x.kind === 'campanha' ? 5 : 0);
      };
      return rank(b) - rank(a) || a.title.localeCompare(b.title, 'pt-BR');
    });
    return output.slice(0, 60);
  }, [local, remote, query, filter]);

  useEffect(() => { setFocused(0); listRef.current?.scrollTo({ top: 0 }); }, [query, filter]);
  const choose = (result: GlobalSearchResult) => {
    setOpen(false); setQuery(''); setFilter('tudo');
    onOpen(result);
  };
  const onInputKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setFocused(x => Math.min(x + 1, items.length - 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setFocused(x => Math.max(0, x - 1)); }
    if (event.key === 'Enter' && items[focused]) { event.preventDefault(); choose(items[focused]); }
  };
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [focused]);

  return <>
    <button type="button" className="hg-search-trigger" onClick={() => setOpen(true)} title="Pesquisa Geral (Ctrl+K)" aria-label="Abrir Pesquisa Geral">
      <Search size={17} aria-hidden="true" /><span className="hg-search-trigger-label">Pesquisar</span><kbd>Ctrl K</kbd>
    </button>
    {open && <div className="hg-search-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-label="Pesquisa Geral do Herdeiros" className="hg-search-dialog">
        <div className="hg-search-bar"><Search size={22} aria-hidden="true"/><input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onInputKey} placeholder="Busque uma regra, criatura, personagem, campanha..." aria-label="Digite sua pesquisa" autoComplete="off" />
          {query && <button type="button" className="hg-search-clear" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Limpar pesquisa"><X size={17}/></button>}
          <button type="button" className="hg-search-close" onClick={() => setOpen(false)} aria-label="Fechar pesquisa">Esc <X size={16}/></button></div>
        <div className="hg-search-filters" aria-label="Filtrar resultados">{categories.map(category => <button key={category.id} type="button" className={filter === category.id ? 'active' : ''} aria-pressed={filter === category.id} onClick={() => setFilter(category.id)}>{category.label}</button>)}</div>
        <div ref={listRef} className="hg-search-list" role="listbox" aria-label="Resultados da Pesquisa Geral">
          {items.map((item, index) => { const Icon = glyph[item.kind]; return <button key={item.key} type="button" role="option" aria-selected={index === focused} data-active={index === focused ? 'true' : undefined} className={`hg-search-result ${index === focused ? 'active' : ''}`} onMouseEnter={() => setFocused(index)} onClick={() => choose(item)}>
            <span className="hg-search-result-icon"><Icon size={18} /></span><span className="hg-search-result-body"><strong>{item.title}</strong><small>{item.description}</small></span><span className="hg-search-result-type">{labelFor[item.kind]}</span>
          </button>; })}
          {!items.length && <div className="hg-search-empty"><Search size={28}/><strong>Nenhum resultado encontrado</strong><p>Experimente outra palavra ou selecione outra categoria.</p></div>}
        </div>
        <div className="hg-search-footer"><span>{loading ? <><LoaderCircle size={14} className="hg-search-spin"/> Procurando na campanha...</> : `${items.length}${items.length === 60 ? '+' : ''} resultados`}{partial ? ' · Parte das informações da campanha não pôde ser consultada.' : ''}</span><span>↑↓ selecionar · Enter abrir · Esc fechar</span></div>
      </section>
    </div>}
  </>;
}
