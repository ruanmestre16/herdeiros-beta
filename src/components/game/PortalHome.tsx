import { ArrowRight, BookOpen, Compass, Dices, Flame, ScrollText, Shield, Sparkles, Swords, Users, WandSparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import './herdeiros-portal.css';

type Destination = 'jogador' | 'mesa' | 'mestre' | 'regras' | 'linhagens' | 'bestiario' | 'historia';
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

const ART = '/linhagens/';

function Portrait({ name, className, eager = false }: { name: string; className: string; eager?: boolean }) {
  return <img className={`hp-portrait ${className}`} src={`${ART}${name}.webp`} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} />;
}

function LinkButton({ children, onClick, outline = false }: { children: ReactNode; onClick: () => void; outline?: boolean }) {
  return <button type="button" onClick={onClick} className={`hp-action ${outline ? 'hp-outline' : ''}`}>{children}<ArrowRight size={16} aria-hidden="true" /></button>;
}

const areas = [
  {
    title: 'Jogador', subtitle: 'CRIE E VIVA SEU HERDEIRO', icon: Users,
    summary: 'Fichas Vivas, linhagens, evolução e combate em um só lugar.',
    items: ['Fichas jogáveis', 'PV · PF · PN', 'GS e habilidades', 'Combate rápido'],
    type: 'player', destination: 'jogador' as Destination, button: 'Abrir minhas fichas',
  },
  {
    title: 'Mesa / Mestre', subtitle: 'CONDUZA A HISTÓRIA', icon: Shield,
    summary: 'Gerencie personagens, criaturas, rodadas e sessões conectadas.',
    items: ['Mesa ao vivo', 'Fichas da Mesa', 'Controles do Mestre', 'Rolagens e encontros'],
    type: 'master', destination: 'mesa' as Destination, button: 'Entrar na mesa',
  },
  {
    title: 'Regras', subtitle: 'O CÓDICE INTERATIVO', icon: ScrollText,
    summary: 'Consulte o sistema sem interromper a narrativa.',
    items: ['Comece aqui', 'Combate e Fluxo', 'GS e Linhagens', 'Karma e Narrativa'],
    type: 'rules', destination: 'regras' as Destination, button: 'Consultar regras',
  },
  {
    title: 'Bestiário', subtitle: 'CRIATURAS DE ARCÁDIA', icon: Flame,
    summary: 'Um atlas de ameaças e mistérios, separado por origens.',
    items: ['Karma', 'Consórcio', 'Grande Floresta', 'Grande Deserto · Incógnita'],
    type: 'bestiary', destination: 'bestiario' as Destination, button: 'Explorar bestiário',
  },
];

export function PortalHome({ onNavigate, onCreate, onLogin, signedIn, characterCount, campaignCount, profileName, showHistory = false }: Props) {
  return (
    <div className="hp-portal">
      <section className="hp-hero" aria-labelledby="hp-title">
        <div className="hp-hero-half hp-hero-flux" aria-hidden="true"><span className="hp-halo hp-halo-flux" /><Portrait name="arcadiana" className="hp-arcadiana" eager /><Portrait name="arcadiano" className="hp-arcadiano" eager /></div>
        <div className="hp-hero-half hp-hero-karma" aria-hidden="true"><span className="hp-halo hp-halo-karma" /><Portrait name="gaki-dark" className="hp-gaki" eager /></div>
        <div className="hp-hero-half hp-hero-human" aria-hidden="true"><Portrait name="humano-urbano" className="hp-urbano" eager /><Portrait name="humano-cartas" className="hp-cartas" eager /></div>
        <div className="hp-hero-text">
          <span className="hp-kicker"><Compass size={16} /> O UNIVERSO DE ARCÁDIA</span>
          <h1 id="hp-title">HERDEIROS<span>O DESPERTAR</span></h1>
          <p className="hp-hero-call">Entre o <strong>Fluxo</strong> e o <em>Karma</em>, nasce uma nova história.</p>
          <p className="hp-hero-description">Três linhagens, múltiplos caminhos. Construa sua ficha, reúna sua mesa e escreva o próximo capítulo.</p>
          <div className="hp-hero-buttons">
            <LinkButton onClick={() => signedIn ? onNavigate('jogador') : onLogin()}>{signedIn ? 'Continuar minha jornada' : 'Começar minha jornada'}</LinkButton>
            <LinkButton onClick={() => onNavigate('historia')} outline>Conheça a história</LinkButton>
          </div>
        </div>
        <span className="hp-hero-caption hp-left-caption" aria-hidden="true">FLUXO · ARCADIANOS</span>
        <span className="hp-hero-caption hp-mid-caption" aria-hidden="true">KARMA · GAKIS</span>
        <span className="hp-hero-caption hp-right-caption" aria-hidden="true">MUNDO HUMANO</span>
      </section>

      {signedIn && !showHistory && (
        <div className="hp-session" role="status">
          <Sparkles size={17}/>
          <div><strong>{profileName ? `Bem-vindo, ${profileName}` : 'Sua jornada continua'}</strong><span>{characterCount} {characterCount === 1 ? 'ficha' : 'fichas'} · {campaignCount} {campaignCount === 1 ? 'mesa disponível' : 'mesas disponíveis'}</span></div>
          <button onClick={() => onNavigate('jogador')}>Abrir ficha <ArrowRight size={15}/></button>
        </div>
      )}

      {showHistory && <section className="hp-story" aria-labelledby="hp-story-title">
        <span className="hp-eyebrow">CRÔNICAS DE ARCÁDIA</span>
        <h2 id="hp-story-title">Um mundo entre o poder e suas consequências</h2>
        <p>No universo de Herdeiros, o Fluxo concede possibilidades, mas o Karma cobra suas marcas. Arcadianos nascem do Fluxo, Gakis carregam o Karma e Humanos encontram seu próprio caminho através da versatilidade.</p>
        <p>A história se desenvolve na mesa: personagens, escolhas e consequências pertencem à campanha conduzida pelo Mestre.</p>
        <div className="hp-story-links"><LinkButton onClick={() => onNavigate('linhagens')}>Conhecer linhagens</LinkButton><LinkButton onClick={() => onNavigate('regras')} outline>Consultar o Códice</LinkButton></div>
      </section>}

      <div className="hp-section-heading"><span>EXPLORE O HERDEIROS</span><h2>Uma mesa. Todas as possibilidades.</h2><p>As áreas abaixo abrem as ferramentas reais do aplicativo.</p></div>
      <section className="hp-destinations" aria-label="Áreas do aplicativo">
        {areas.map(area => {
          const Icon = area.icon;
          return <article key={area.type} className={`hp-destination hp-destination-${area.type}`}>
            <div className="hp-destination-art" aria-hidden="true">
              {area.type === 'player' && <Portrait name="arcadiana" className="hp-card-character"/>}
              {area.type === 'master' && <><Dices size={90}/><span className="hp-master-map"/></>}
              {area.type === 'rules' && <BookOpen size={120}/>}
              {area.type === 'bestiary' && <Flame size={132}/>}
            </div>
            <div className="hp-destination-content">
              <div className="hp-card-head"><span><Icon size={22}/></span><div><h3>{area.title}</h3><small>{area.subtitle}</small></div></div>
              <p>{area.summary}</p>
              <ul>{area.items.map(t => <li key={t}><Sparkles size={12}/>{t}</li>)}</ul>
              <LinkButton onClick={() => onNavigate(area.destination)}>{area.button}</LinkButton>
              {area.type === 'player' && <button type="button" className="hp-quick-create" onClick={onCreate}>+ Criar novo Herdeiro</button>}
            </div>
          </article>;
        })}
      </section>

      <section className="hp-lineages" aria-labelledby="hp-lineages-title">
        <header><div><span className="hp-eyebrow">TRÊS ORIGENS · UM DESTINO</span><h2 id="hp-lineages-title">Linhagens</h2><p>O Fluxo, o Karma e a força da vontade humana.</p></div><button type="button" onClick={() => onNavigate('linhagens')}>Ver todas as linhagens <ArrowRight size={16}/></button></header>
        <div className="hp-lineage-grid">
          <button type="button" className="hp-lineage-card hp-lineage-arc" onClick={() => onNavigate('linhagens')}><Portrait name="arcadiana" className="hp-lineage-a"/><Portrait name="arcadiano" className="hp-lineage-b"/><span className="hp-lineage-text"><strong>Arcadianos</strong><small>NASCIDOS NO FLUXO</small></span><ArrowRight size={20}/></button>
          <button type="button" className="hp-lineage-card hp-lineage-gaki" onClick={() => onNavigate('linhagens')}><Portrait name="gaki-dark" className="hp-lineage-center"/><span className="hp-lineage-text"><strong>Gakis</strong><small>MARCADOS PELO KARMA</small></span><ArrowRight size={20}/></button>
          <button type="button" className="hp-lineage-card hp-lineage-human" onClick={() => onNavigate('linhagens')}><Portrait name="humano-urbano" className="hp-lineage-a"/><Portrait name="humano-cartas" className="hp-lineage-b"/><span className="hp-lineage-text"><strong>Humanos</strong><small>INFINITAS POSSIBILIDADES</small></span><ArrowRight size={20}/></button>
        </div>
      </section>
      <div className="hp-footer-quote"><WandSparkles size={17}/><span>Tudo flui. Tudo cobra.</span><Swords size={17}/></div>
    </div>
  );
}
