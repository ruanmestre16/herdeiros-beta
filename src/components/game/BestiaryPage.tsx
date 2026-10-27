import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Compass, ExternalLink, Filter, FlaskConical, Leaf, Search, Shield, Skull, Sun, WandSparkles, X } from 'lucide-react';
import { BESTIARY, BESTIARY_CATEGORIES, BESTIARY_PDF, type BestiaryTemplate } from '@/lib/bestiary';
import { Button } from '@/components/ui/button';
import './bestiary-regions.css';

/**
 * Regiões editoriais do Atlas. Karma e Consórcio são origens, não lugares físicos:
 * não atribuímos habitats que o livro não registrou.
 */
type Origin = 'todas' | 'karma' | 'consorcio' | 'floresta' | 'deserto' | 'incognita';
type RegionInfo = { id: Origin; label: string; subtitle: string; description: string; Icon: typeof Compass };
const REGIONS: RegionInfo[] = [
  { id: 'todas', label: 'Atlas completo', subtitle: 'Explore todo o mundo', description: 'Todas as criaturas, reunidas por suas regiões e origens.', Icon: BookOpen },
  { id: 'karma', label: 'Karma', subtitle: 'Gakis e suas variações', description: 'Dos Gakis irracionais aos seres mais antigos e perigosos.', Icon: Skull },
  { id: 'consorcio', label: 'Consórcio', subtitle: 'Agentes e mutagênicos', description: 'Agentes tecnológicos e criaturas associadas ao Consórcio.', Icon: FlaskConical },
  { id: 'floresta', label: 'Grande Floresta', subtitle: 'Seres da floresta', description: 'Bestas e outras criaturas catalogadas na Grande Floresta.', Icon: Leaf },
  { id: 'deserto', label: 'Grande Deserto', subtitle: 'Habitantes do deserto', description: 'Criaturas catalogadas nas extensões do Grande Deserto.', Icon: Sun },
  { id: 'incognita', label: 'Incógnita', subtitle: 'Entidades misteriosas', description: 'Criaturas classificadas pelo próprio Atlas como Incógnita.', Icon: WandSparkles },
];

function originOf(template: BestiaryTemplate): Origin {
  if (template.category === 'Agentes do Consórcio' || template.category === 'Mutagênicos do Consórcio') return 'consorcio';
  if (template.category.startsWith('Gakis ')) return 'karma';
  if (template.category === 'Bestas da Grande Floresta') return 'floresta';
  if (template.category === 'Criaturas do Grande Deserto') return 'deserto';
  if (template.category === 'Criaturas da Incógnita') return 'incognita';
  return 'todas';
}
const normalized = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const regionMeta = (id: Origin) => REGIONS.find(r => r.id === id) || REGIONS[0];

export function BestiaryPage({ onManage }: { onManage?: ((template: BestiaryTemplate) => void) | undefined } = {}) {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState<Origin>('todas');
  const [category, setCategory] = useState('Todas');
  const [selectedId, setSelectedId] = useState('');
  const [bookOpen, setBookOpen] = useState(false);
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => BESTIARY.filter(t =>
    (region === 'todas' || originOf(t) === region) &&
    (category === 'Todas' || t.category === category) &&
    normalized(`${t.name} ${t.category} ${t.descricao}`).includes(normalized(search.trim()))
  ), [region, category, search]);
  const availableCategories = useMemo(() => region === 'todas'
    ? BESTIARY_CATEGORIES
    : BESTIARY_CATEGORIES.filter(cat => BESTIARY.some(t => t.category === cat && originOf(t) === region)), [region]);
  const groups = useMemo(() => REGIONS.filter(r => r.id !== 'todas' && (region === 'todas' || r.id === region))
    .map(r => ({ ...r, creatures: filtered.filter(t => originOf(t) === r.id) }))
    .filter(r => r.creatures.length > 0), [filtered, region]);
  const current = BESTIARY.find(t => t.id === selectedId);
  const chooseRegion = (id: Origin) => { setRegion(id); setCategory('Todas'); setSelectedId(''); };
  const resetFilters = () => { setSearch(''); setRegion('todas'); setCategory('Todas'); setSelectedId(''); };

  useEffect(() => {
    if (!selectedId) return;
    const frame = requestAnimationFrame(() => document.getElementById('bestiary-profile')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    return () => cancelAnimationFrame(frame);
  }, [selectedId]);

  const showOriginal = (t: BestiaryTemplate) => {
    setPage(t.page);
    setBookOpen(true);
    requestAnimationFrame(() => document.getElementById('bestiary-original')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const profile = (t: BestiaryTemplate) => <section id="bestiary-profile" className={`bestiary-profile region-${originOf(t)}`} aria-label={`Ficha de ${t.name}`} key={`profile-${t.id}`}>
    <div className="bestiary-profile-head">
      <div><span className="field-kicker">FICHA DO ATLAS · {t.category}</span><h2>{t.name}</h2><p>{t.descricao}</p></div>
      <button type="button" onClick={() => setSelectedId('')} aria-label="Fechar ficha"><X size={18} /></button>
    </div>
    <div className="bestiary-stat-grid">
      {[{ l: 'Ameaça', v: `NA ${t.na}` }, { l: 'Vida', v: `${t.pv} PV` }, { l: 'Recurso', v: `${t.pf} PF/PN` }, { l: 'Esquiva', v: t.esquiva }, { l: 'Bloqueio', v: t.bloqueio }, { l: 'Desloc.', v: t.deslocamento }].map(s => <div key={s.l}><span>{s.l}</span><strong>{s.v}</strong></div>)}
    </div>
    <div className="bestiary-profile-actions">
      <Button onClick={() => showOriginal(t)} variant="outline"><BookOpen size={16} /> Ver página {t.page} no Atlas</Button>
      {onManage && <Button onClick={() => onManage(t)}><Shield size={16} /> Criar na Mesa</Button>}
    </div>
    <div className="bestiary-details-grid">
      <details><summary>Ataques e dano <span>›</span></summary><pre>{t.ataques || 'Nenhum ataque registrado.'}</pre></details>
      <details><summary>Habilidades e poderes <span>›</span></summary><pre>{t.habilidades || 'Nenhuma habilidade registrada.'}</pre></details>
      {(t.dt || t.observacoes) && <details><summary>DTs e observações <span>›</span></summary><pre>{[t.dt, t.observacoes].filter(Boolean).join('\n\n')}</pre></details>}
    </div>
    <p className="bestiary-profile-note">Ficha de consulta. Para editar e utilizar uma cópia no combate, use a criação de monstros da Mesa / Mestre.</p>
  </section>;

  return <div className="bestiary-atlas">
    <div className="page-heading standalone bestiary-heading">
      <div><span className="eyebrow subtle">CÓDICE SUPREMO · ATLAS DE ARCÁDIA</span><h1>Bestiário <em>vivo.</em></h1>
        <p className="muted-copy">Conheça os seres de Arcádia por sua origem ou região. Abra a ficha de cada criatura com um toque.</p></div>
      <div className="bestiary-heading-actions"><img src="/bestiario/capa.jpg" width={66} height={94} alt="Capa do Bestiário" loading="lazy" />
        <a href={BESTIARY_PDF} target="_blank" rel="noreferrer"><Button variant="outline"><ExternalLink size={16} /> Livro completo</Button></a></div>
    </div>

    <section className="bestiary-section" aria-labelledby="bestiary-regions-title">
      <div className="bestiary-section-heading"><div><span className="field-kicker">01 · MAPA DO ATLAS</span><h2 id="bestiary-regions-title">Origens e regiões</h2><p className="bestiary-section-intro">Escolha uma área para explorar ou veja o Atlas completo, já dividido por grupos.</p></div><span className="bestiary-result-count">{BESTIARY.length} criaturas · 5 grupos</span></div>
      <div className="bestiary-region-grid" role="group" aria-label="Filtrar por origem ou região">
        {REGIONS.map(r => {
          const count = r.id === 'todas' ? BESTIARY.length : BESTIARY.filter(t => originOf(t) === r.id).length;
          return <button type="button" key={r.id} aria-pressed={region === r.id} className={`bestiary-region ${region === r.id ? 'selected' : ''} region-${r.id}`} onClick={() => chooseRegion(r.id)}>
            <span className="bestiary-region-icon"><r.Icon size={23} /></span>
            <span className="bestiary-region-text"><strong>{r.label}</strong><small>{r.subtitle}</small></span>
            <span className="bestiary-region-count">{count}</span>
            <span className="bestiary-region-action">{region === r.id ? 'Explorando' : 'Explorar'} <span aria-hidden="true">›</span></span>
          </button>;
        })}
      </div>
      <p className="bestiary-disclaimer">Karma e Consórcio indicam origens; Grande Floresta e Grande Deserto são regiões. Essa divisão segue as categorias já registradas no Atlas.</p>
    </section>

    <section className="bestiary-section" aria-labelledby="bestiary-catalog-title">
      <div className="bestiary-section-heading"><div><span className="field-kicker">02 · CRIATURAS DE ARCÁDIA</span><h2 id="bestiary-catalog-title">{region === 'todas' ? 'O Atlas por regiões' : regionMeta(region).label}</h2><p className="bestiary-section-intro">{region === 'todas' ? 'Cada conjunto tem sua própria seção para facilitar a consulta.' : regionMeta(region).description}</p></div><span className="bestiary-result-count">{filtered.length} resultado{filtered.length === 1 ? '' : 's'}</span></div>
      <div className="bestiary-filters">
        <label className="bestiary-search"><Search size={17} /><span className="sr-only">Buscar criatura</span>
          <input value={search} onChange={e => { setSearch(e.target.value); setSelectedId(''); }} placeholder="Buscar criatura, tipo ou característica..." />
          {search && <button onClick={() => { setSearch(''); setSelectedId(''); }} aria-label="Limpar busca" type="button"><X size={16} /></button>}
        </label>
        <label className="bestiary-category"><Filter size={16} /><span className="sr-only">Categoria do Bestiário</span>
          <select value={category} onChange={e => { setCategory(e.target.value); setSelectedId(''); }}>
            <option value="Todas">Todas as categorias</option>{availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        {(region !== 'todas' || category !== 'Todas' || search) && <Button variant="outline" size="sm" onClick={resetFilters}><X size={14} /> Limpar filtros</Button>}
      </div>
      <div className="bestiary-regional-catalog">
        {groups.map(group => <section key={group.id} className={`bestiary-region-section region-${group.id}`} aria-label={group.label}>
          <div className="bestiary-regional-heading">
            <span className="bestiary-regional-symbol"><group.Icon size={25} /></span>
            <div><span className="field-kicker">ORIGEM / REGIÃO</span><h3>{group.label}</h3><p>{group.description}</p></div>
            <span className="bestiary-regional-total">{group.creatures.length} criatura{group.creatures.length === 1 ? '' : 's'}</span>
          </div>
          <div className="bestiary-creatures">
            {group.creatures.map(t => <button key={t.id} type="button" aria-expanded={selectedId === t.id} className={`bestiary-creature ${selectedId === t.id ? 'selected' : ''}`} onClick={() => setSelectedId(v => v === t.id ? '' : t.id)}>
              <span className="bestiary-creature-top"><span className="bestiary-creature-symbol"><group.Icon size={20} /></span><span className="bestiary-creature-tier">NA {t.na}</span></span>
              <strong>{t.name}</strong><small>{t.category}</small>
              <span className="bestiary-creature-stats"><span><b>{t.pv}</b> PV</span><span><b>{t.esquiva}</b> Esq.</span><span><b>{t.bloqueio}</b> Bloq.</span></span>
              <span className="bestiary-creature-cta">{selectedId === t.id ? 'Recolher ficha' : 'Explorar ficha'} <span aria-hidden="true">›</span></span>
            </button>)}
          </div>
          {current && group.creatures.some(t => t.id === current.id) && profile(current)}
        </section>)}
      </div>
      {!filtered.length && <div className="bestiary-empty"><Search size={26} /><strong>Nenhuma criatura encontrada</strong><p>Experimente outra região, nome ou categoria.</p><Button variant="outline" size="sm" onClick={resetFilters}>Mostrar Atlas completo</Button></div>}
    </section>

    <section id="bestiary-original" className="bestiary-section bestiary-book" aria-label="Livro original do Bestiário">
      <div className="bestiary-section-heading"><div><span className="field-kicker">03 · FONTE ORIGINAL</span><h2>Atlas ilustrado</h2><p className="muted-copy">Abra o PDF apenas quando quiser consultar a página original.</p></div><Button size="sm" variant="outline" onClick={() => setBookOpen(v => !v)} aria-expanded={bookOpen}>{bookOpen ? 'Recolher PDF' : 'Abrir PDF'} <BookOpen size={15} /></Button></div>
      {bookOpen && <><div className="bestiary-book-pager"><label>Página do livro <input aria-label="Página do Bestiário" type="number" min={1} max={77} value={page} onChange={e => setPage(Math.max(1, Math.min(77, Number(e.target.value) || 1)))} /></label><a href={`${BESTIARY_PDF}#page=${page}`} target="_blank" rel="noreferrer">Abrir página em outra aba <ExternalLink size={14} /></a></div><iframe key={page} title="Bestiário completo de Herdeiros: O Despertar" src={`${BESTIARY_PDF}#page=${page}&view=FitH`} loading="lazy" className="bestiary-iframe" /> </>}
    </section>
  </div>;
}
