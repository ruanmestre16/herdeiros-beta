import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Compass, Flame, Home, LogIn, Menu, ScrollText, Search, Shield, Sparkles, Users, X } from 'lucide-react';
import './herdeiros-portal.css';

type Destination = 'inicio' | 'jogador' | 'mesa' | 'mestre' | 'regras' | 'linhagens' | 'bestiario' | 'historia';
type Props = {
  onNavigate: (area: Destination) => void;
  onCreate: () => void;
  onLogin: () => void;
  signedIn: boolean;
  characterCount: number;
  campaignCount: number;
  profileName: string;
  showHistory?: boolean;
};

type Hotspot = {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  dest?: Destination;
  special?: 'create' | 'login';
};

/** Áreas de clique correspondentes ao arquivo aprovado de 1672 × 941 px.
 * Nenhum bloco fake da ilustração vira recurso novo no sistema.
 */
const HOTSPOTS: Hotspot[] = [
  { label: 'Página inicial', x: 24, y: 4, w: 332, h: 50, dest: 'inicio' },
  { label: 'Início', x: 450, y: 5, w: 73, h: 39, dest: 'inicio' },
  { label: 'Linhagens', x: 527, y: 5, w: 93, h: 39, dest: 'linhagens' },
  { label: 'Bestiário', x: 623, y: 5, w: 85, h: 39, dest: 'bestiario' },
  { label: 'Regras', x: 708, y: 5, w: 82, h: 39, dest: 'regras' },
  { label: 'Mesa / Mestre', x: 791, y: 5, w: 127, h: 39, dest: 'mesa' },
  { label: 'Jogador', x: 922, y: 5, w: 76, h: 39, dest: 'jogador' },
  { label: 'História de Arcádia', x: 1002, y: 5, w: 88, h: 39, dest: 'historia' },
  { label: 'Entrar ou abrir minha conta', x: 1480, y: 2, w: 148, h: 46, special: 'login' },
  { label: 'Comece sua jornada — criar personagem', x: 628, y: 407, w: 203, h: 43, special: 'create' },
  { label: 'Conheça a história', x: 839, y: 407, w: 200, h: 43, dest: 'historia' },
  { label: 'Abrir minhas fichas de jogador', x: 35, y: 457, w: 396, h: 264, dest: 'jogador' },
  { label: 'Criar personagem', x: 205, y: 689, w: 210, h: 32, special: 'create' },
  { label: 'Entrar na Mesa', x: 439, y: 457, w: 382, h: 264, dest: 'mesa' },
  { label: 'Abrir as ferramentas do Mestre', x: 620, y: 689, w: 191, h: 34, dest: 'mestre' },
  { label: 'Abrir o Códice de Regras', x: 830, y: 457, w: 382, h: 264, dest: 'regras' },
  { label: 'Consultar as regras', x: 1022, y: 690, w: 188, h: 31, dest: 'regras' },
  { label: 'Explorar o Bestiário', x: 1221, y: 457, w: 408, h: 267, dest: 'bestiario' },
  { label: 'Abrir o atlas do Bestiário', x: 1414, y: 687, w: 200, h: 35, dest: 'bestiario' },
  { label: 'Ver todas as linhagens', x: 1402, y: 741, w: 200, h: 30, dest: 'linhagens' },
  { label: 'Arcadianos — nascidos no Fluxo', x: 49, y: 770, w: 508, h: 117, dest: 'linhagens' },
  { label: 'Gakis — marcados pelo Karma', x: 559, y: 770, w: 514, h: 117, dest: 'linhagens' },
  { label: 'Humanos — infinitas possibilidades', x: 1078, y: 770, w: 524, h: 117, dest: 'linhagens' },
];

const MOBILE_AREAS = [
  { title: 'Jogador', subtitle: 'CRIE SEU HERDEIRO', copy: 'Fichas Vivas, atributos, habilidades, equipamentos e evolução por GS.', icon: Users, image: 'player', dest: 'jogador' as Destination, action: 'Abrir minhas fichas', points: ['Linhagem e atributos', 'Habilidades e armas', 'Combate e recursos'] },
  { title: 'Mesa / Mestre', subtitle: 'CONDUZA GRANDES HISTÓRIAS', copy: 'Mesas conectadas, fichas compartilhadas e ferramentas de narração.', icon: Shield, image: 'mesa', dest: 'mesa' as Destination, action: 'Entrar na mesa', points: ['Fichas da mesa', 'Monstros e NPCs', 'Combate e rolagens'] },
  { title: 'Regras', subtitle: 'O CÓDICE INTERATIVO', copy: 'Busque e consulte as regras oficiais e as adaptações da campanha.', icon: ScrollText, image: 'regras', dest: 'regras' as Destination, action: 'Ler as regras', points: ['Combate e Fluxo', 'GS e progressão', 'Karma e narrativa'] },
  { title: 'Bestiário', subtitle: 'CRIATURAS DE ARCÁDIA', copy: 'Criaturas organizadas por região e acesso à criação de monstros na Mesa.', icon: Flame, image: 'bestiario', dest: 'bestiario' as Destination, action: 'Explorar Bestiário', points: ['Karma · Consórcio', 'Grande Floresta', 'Deserto · Incógnita'] },
];

const SEARCH_AREAS: { label: string; keywords: string; dest: Destination }[] = [
  {label:'Regras e Códice', keywords:'regra combate fluxo gs sincronia teste dado karma núcleo nomenclatura', dest:'regras'},
  {label:'Linhagens', keywords:'arcadianos gakis humanos agente tecnológico origem', dest:'linhagens'},
  {label:'Bestiário', keywords:'monstros criaturas floresta deserto consórcio incógnita bestiário', dest:'bestiario'},
  {label:'Mesa / Mestre', keywords:'mesa mestre npc sessão campanha jogador offline', dest:'mesa'},
  {label:'Minhas fichas', keywords:'ficha personagem equipamento inventário ficha viva criar', dest:'jogador'},
  {label:'História', keywords:'historia mundo arcádia cronica lore', dest:'historia'},
];

function Portrait({ name, className }: { name: string; className?: string }) {
  return <img className={`hp-exact-portrait ${className ?? ''}`} alt="" loading="lazy" decoding="async" draggable={false} src={`/linhagens/${name}.webp`} />;
}

export function PortalHome({ onNavigate, onCreate, onLogin, signedIn, characterCount, campaignCount, profileName, showHistory = false }: Props) {
  // Classe auxiliar para Android WebViews mais antigos que não implementam :has().
  useEffect(() => {
    const shell = document.querySelector('.app-shell');
    if (!showHistory) shell?.classList.add('hp-exact-shell');
    return () => shell?.classList.remove('hp-exact-shell');
  }, [showHistory]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const suggestions = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR');
    if (!q) return SEARCH_AREAS;
    return SEARCH_AREAS.filter(item => (`${item.label} ${item.keywords}`).toLocaleLowerCase('pt-BR').includes(q));
  }, [search]);
  const go = (dest: Destination) => { setMenuOpen(false); setSearchOpen(false); onNavigate(dest); };
  const activate = (spot: Hotspot) => {
    if (spot.special === 'create') onCreate();
    else if (spot.special === 'login') onLogin();
    else if (spot.dest) go(spot.dest);
  };

  if (showHistory) return <section className="hp-exact-history">
    <div className="hp-exact-story-scene" aria-hidden="true"><Portrait name="arcadiana"/><Portrait name="gaki-dark"/><Portrait name="humano-urbano"/></div>
    <span className="hp-exact-eyebrow">HERDEIROS · CRÔNICAS DE ARCÁDIA</span>
    <h1>Um mundo entre o <em>Fluxo</em> e o <i>Karma</i></h1>
    <p>Arcadianos nascem do Fluxo; Gakis carregam o Karma; Humanos criam seus próprios caminhos. Suas histórias se encontram na mesa, onde cada escolha altera o destino da campanha.</p>
    <div className="hp-exact-story-actions"><button onClick={() => go('linhagens')}>Conhecer linhagens <ArrowRight size={16}/></button><button onClick={() => go('regras')}>Consultar o Códice <ArrowRight size={16}/></button><button onClick={() => go('inicio')}>Voltar ao início <Home size={16}/></button></div>
  </section>;

  return <div className="hp-exact-home" aria-label="Portal Herdeiros: O Despertar">
    <div className="hp-exact-desktop">
      <div className="hp-exact-stage">
        <img className="hp-exact-background" src="/portal/portal-aprovado.webp" width={1672} height={941} alt="Portal ilustrado de Herdeiros: o Fluxo dourado dos Arcadianos à esquerda, o Karma púrpura dos Gakis no centro e o mundo Humano à direita, com atalhos para Jogador, Mesa, Regras, Bestiário e Linhagens." fetchPriority="high" draggable={false}/>
        {HOTSPOTS.map((spot,i) => <button key={`${spot.label}-${i}`} type="button" className="hp-exact-hotspot" aria-label={spot.label} title={spot.label} style={{left:`${spot.x/1672*100}%`,top:`${spot.y/941*100}%`,width:`${spot.w/1672*100}%`,height:`${spot.h/941*100}%`}} onClick={() => activate(spot)} />)}
        <div className="hp-exact-search" style={{left:'76.4%',top:'1.2%',width:'8.6%',height:'3.7%'}}>
          <label className="hp-exact-sr" htmlFor="hp-exact-search-input">Buscar áreas do aplicativo</label>
          <input id="hp-exact-search-input" value={search} onChange={e => {setSearch(e.target.value);setSearchOpen(true);}} onFocus={() => setSearchOpen(true)} onKeyDown={e => {if(e.key === 'Escape') setSearchOpen(false);if(e.key === 'Enter' && suggestions[0]) go(suggestions[0].dest);}} aria-label="Buscar áreas do aplicativo" autoComplete="off" />
          {searchOpen && <div className="hp-exact-search-results" role="listbox" aria-label="Resultados da busca">{suggestions.length ? suggestions.map(item=><button type="button" key={item.label} onClick={()=>go(item.dest)}>{item.label}<ArrowRight size={14}/></button>) : <span>Nenhum resultado.</span>}</div>}
        </div>
        {signedIn && <button type="button" className="hp-exact-logged" onClick={onLogin} aria-label="Abrir minha conta">{profileName ? profileName.slice(0,18) : 'Minha conta'}</button>}
      </div>
      <span className="hp-exact-a11y">Layout visual da arte aprovada. Use os botões e os cartões clicáveis para acessar o sistema.</span>
    </div>

    <div className="hp-exact-mobile">
      <header className="hp-mobile-top">
        <button type="button" className="hp-mobile-brand" onClick={()=>go('inicio')} aria-label="Herdeiros — início"><Compass size={28}/><span>HERDEIROS<small>O DESPERTAR</small></span></button>
        <div><button className="hp-mobile-account" onClick={onLogin} type="button" aria-label={signedIn?'Abrir conta':'Entrar'}>{signedIn?<Users size={19}/>:<LogIn size={19}/>}</button><button className="hp-mobile-menu-btn" type="button" onClick={()=>setMenuOpen(v=>!v)} aria-label="Abrir navegação" aria-expanded={menuOpen}>{menuOpen?<X/>:<Menu/>}</button></div>
      </header>
      {menuOpen && <nav className="hp-mobile-nav" aria-label="Navegação do Herdeiros">{(['inicio','jogador','mesa','regras','linhagens','bestiario','historia'] as Destination[]).map(dest=><button key={dest} type="button" onClick={()=>go(dest)}>{({inicio:'Início',jogador:'Jogador',mesa:'Mesa / Mestre',regras:'Regras',linhagens:'Linhagens',bestiario:'Bestiário',historia:'História'} as Record<Destination,string>)[dest]}<ArrowRight size={14}/></button>)}</nav>}
      <section className="hp-mobile-hero">
        <div className="hp-mobile-hero-sky" aria-hidden="true"><Portrait name="arcadiana" className="hp-m-arcadiana"/><Portrait name="arcadiano" className="hp-m-arcadiano"/><Portrait name="gaki-dark" className="hp-m-gaki"/><Portrait name="humano-urbano" className="hp-m-urbano"/><Portrait name="humano-cartas" className="hp-m-cartas"/></div>
        <div className="hp-mobile-hero-copy"><span>ENTRE O FLUXO E O KARMA</span><h1>HERDEIROS<small>O DESPERTAR</small></h1><p>Nasce uma nova história. Explore Arcádia, construa seu personagem e reúna sua mesa.</p><div className="hp-m-actions"><button type="button" onClick={onCreate}>Comece sua jornada <ArrowRight size={15}/></button><button type="button" onClick={()=>go('historia')}>Conheça a história</button></div></div>
      </section>
      {signedIn && <div className="hp-mobile-session"><Sparkles size={17}/><span>{profileName || 'Sua jornada'} · {characterCount} ficha(s) · {campaignCount} mesa(s)</span><button type="button" onClick={()=>go('jogador')}>Abrir</button></div>}
      <div className="hp-mobile-section-title"><span>O UNIVERSO DE ARCÁDIA</span><h2>Explore o Herdeiros</h2></div>
      <div className="hp-mobile-area-grid">{MOBILE_AREAS.map(area=>{const Icon=area.icon;return <article key={area.title} className={`hp-mobile-area hp-mobile-area-${area.image}`}>
        <div className="hp-mobile-area-scene" aria-hidden="true">{area.image==='player'&&<Portrait name="arcadiana"/>}</div>
        <div className="hp-mobile-area-content"><div className="hp-mobile-area-head"><Icon size={22}/><div><h3>{area.title}</h3><small>{area.subtitle}</small></div></div><p>{area.copy}</p><ul>{area.points.map(point=><li key={point}>{point}</li>)}</ul><button type="button" onClick={()=>go(area.dest)}>{area.action} <ArrowRight size={16}/></button>{area.image==='player'&&<button type="button" className="hp-mobile-secondary" onClick={onCreate}>+ Criar personagem</button>}{area.image==='mesa'&&<button type="button" className="hp-mobile-secondary" onClick={()=>go('mestre')}>Ferramentas do Mestre</button>}</div>
      </article>;})}</div>
      <section className="hp-mobile-lineages"><div className="hp-mobile-section-title"><span>TRÊS ORIGENS · UM DESTINO</span><h2>Linhagens</h2></div><div className="hp-mobile-lineage-grid">
        <button className="hp-mobile-lineage hp-arc" type="button" onClick={()=>go('linhagens')}><Portrait name="arcadiana"/><Portrait name="arcadiano"/><span><strong>ARCADIANOS</strong><small>NASCIDOS NO FLUXO</small></span><ArrowRight/></button>
        <button className="hp-mobile-lineage hp-gaki" type="button" onClick={()=>go('linhagens')}><Portrait name="gaki-dark"/><span><strong>GAKIS</strong><small>MARCADOS PELO KARMA</small></span><ArrowRight/></button>
        <button className="hp-mobile-lineage hp-human" type="button" onClick={()=>go('linhagens')}><Portrait name="humano-urbano"/><Portrait name="humano-cartas"/><span><strong>HUMANOS</strong><small>INFINITAS POSSIBILIDADES</small></span><ArrowRight/></button>
      </div></section>
      <footer className="hp-mobile-footer">✦ HERDEIROS · O DESPERTAR <span>Tudo flui. Tudo cobra.</span></footer>
    </div>
  </div>;
}
