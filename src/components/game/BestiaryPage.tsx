import { useState } from 'react';
import { BookOpen, Search, ExternalLink } from 'lucide-react';
import { BESTIARY, BESTIARY_CATEGORIES, BESTIARY_PDF } from '@/lib/bestiary';
import { Button } from '@/components/ui/button';

/** Livro público: o PDF completo é servido de /public, sem expor informações das mesas. */
export function BestiaryPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [page, setPage] = useState(1);
  const [bookOpen, setBookOpen] = useState(true);
  const filtered = BESTIARY.filter(t => (category === 'Todas' || t.category === category) && `${t.name} ${t.category}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const selectPage = (p: number) => { setPage(p); setBookOpen(true); };
  return <div>
    <div className="page-heading standalone"><div><span className="eyebrow subtle">CÓDICE SUPREMO · VOLUME II</span><h1>Bestiário de <em>Arcádia.</em></h1><p className="muted-copy">O livro ilustrado completo e os 26 modelos de criaturas usados no combate.</p></div>
      <div className="flex items-center gap-4"><img src="/bestiario/capa.jpg" width={76} height={108} alt="Capa do Bestiário ilustrado" style={{borderRadius:6,boxShadow:"0 4px 18px #0006"}} /><a href={BESTIARY_PDF} target="_blank" rel="noreferrer"><Button variant="outline"><ExternalLink size={16}/> Abrir PDF completo</Button></a></div>
    </div>
    <div className="game-panel" style={{ marginBottom: 18 }}>
      <div className="panel-head"><h3>Consultar criaturas</h3></div>
      <div className="field-stack">
        <label className="field"><span className="field-label">BUSCAR POR NOME</span><div className="flex items-center gap-2"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Gaki, Raposa-Miragem, Esfinge..." /></div></label>
        <label className="field"><span className="field-label">CATEGORIA</span><select value={category} onChange={e => setCategory(e.target.value)}><option>Todas</option>{BESTIARY_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',gap:10, marginTop:16 }}>
        {filtered.map(t => <button key={t.id} type="button" onClick={() => selectPage(t.page)} aria-label={`Ler ${t.name} na página ${t.page}`} style={{ textAlign:'left', border:'1px solid var(--border, #7774)',borderRadius:10,padding:12,background:'transparent',color:'inherit',cursor:'pointer' }}>
          <strong style={{ display:'block' }}>{t.name}</strong><small>{t.category} · NA {t.na} · PV {t.pv} · pág. {t.page}</small>
        </button>)}
      </div>
      {!filtered.length && <p className="empty-copy">Nenhuma criatura encontrada.</p>}
    </div>
    <div className="game-panel">
      <div className="panel-head"><h3><BookOpen size={17} style={{display:'inline', marginRight:8}}/> Livro ilustrado · 77 páginas</h3>
        <Button size="sm" variant="outline" onClick={() => setBookOpen(!bookOpen)}>{bookOpen ? 'Ocultar' : 'Exibir'} livro</Button>
      </div>
      {bookOpen && <>
        <p className="muted-copy" style={{ marginBottom:12 }}>Selecione uma criatura acima para abrir sua página no livro. As fichas aqui são de consulta; o Mestre cria cópias editáveis em Mestre → NPCs e inimigos → Novo.</p>
        <iframe key={page} title="Bestiário completo de Herdeiros: O Despertar" src={`${BESTIARY_PDF}#page=${page}&view=FitH`} style={{ width:'100%',height:'min(78vh, 850px)', minHeight:460,border:0,borderRadius:8,background:'#161616' }} loading="lazy" />
        <a href={`${BESTIARY_PDF}#page=${page}`} target="_blank" rel="noreferrer" className="text-flux"><ExternalLink size={14} style={{display:'inline'}}/> Abrir em outra aba (página {page})</a>
      </>}
    </div>
  </div>;
}
