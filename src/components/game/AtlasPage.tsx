import { ArrowLeft, ArrowRight, BookOpen, Compass, Landmark, Leaf, MapPinned, Mountain, Shield, Sparkles, Sun, Wind } from 'lucide-react';
import './atlas-page.css';

export type AtlasRegionId = 'floresta' | 'caixa' | 'deserto' | 'grande-fim';

type AtlasRegion = {
  id: AtlasRegionId;
  name: string;
  kicker: string;
  summary: string;
  image?: string;
  wideImage?: string;
  theme: string;
  highlights: { title: string; body: string }[];
};

/**
 * Atlas geográfico de Arcádia. As informações abaixo vêm das definições
 * autorais do mundo; não devem ser substituídas por descrições genéricas.
 * As imagens referenciam as artes já aprovadas no Livro de História.
 */
export const ATLAS_REGIONS: AtlasRegion[] = [
  {
    id: 'floresta', name: 'A Grande Floresta', kicker: 'O território da vida abundante', theme: 'floresta',
    image: '/historia/cenas/livro/floresta-760.webp',
    wideImage: '/historia/cenas/livro/floresta-1520.webp',
    summary: 'Rios imensos, cachoeiras, montanhas e árvores colossais crescem sob a influência do Fluxo. Na Grande Floresta, até a umidade e a vida selvagem parecem existir em uma escala extraordinária.',
    highlights: [
      { title: 'Geografia e natureza', body: 'A floresta abriga grandes rios, montanhas, água corrente e animais de inúmeras formas. O Fluxo intensifica a exuberância e também os perigos do ambiente.' },
      { title: 'Casa Harefield e Casa da Lua', body: 'A Casa Harefield, identificada pelo símbolo do Sol, tem forte presença na região. A Casa da Lua também está presente e mantém uma rivalidade com ela.' },
      { title: 'Arcadianos da floresta', body: 'Há gerações, povos arcadianos migraram para a floresta. Seus descendentes desenvolveram grande conhecimento de trilhas, animais e ambientes, tornando-se observadores e caçadores experientes.' },
    ],
  },
  {
    id: 'caixa', name: 'A Caixa', kicker: 'O coração urbano de Arcádia', theme: 'caixa',
    image: '/historia/cenas/livro/caixa-760.webp',
    wideImage: '/historia/cenas/livro/caixa-1520.webp',
    summary: 'A grande metrópole central é o coração político, tecnológico, educacional e comercial de Arcádia. Sua arquitetura resplandece em cobre e metal, enquanto a Torre do Tempo parece atravessar os próprios céus.',
    highlights: [
      { title: 'Muralha e Torre do Tempo', body: 'Uma grande muralha protege a metrópole das criaturas da floresta e do deserto. No centro, a Torre do Tempo se ergue tão alto que dizem alcançar a altura da própria Cúpula de Som.' },
      { title: 'Governo das Casas', body: 'As Casas escolhem representantes para disputar, em batalhas de várias fases, o governo central. O poder de quem vence é limitado pelos princípios do Livro de Eradon, primeiro governante, que proíbem a tirania e exigem respeito à vontade do povo.' },
      { title: 'Uma cidade em movimento', body: 'Escolas, bibliotecas, comércio, templos e tecnologias alimentadas por minério de Fluxo convivem com motos voadoras, dirigíveis e aviões. A guarda e os regentes protegem a cidade e a fronteira da Cúpula.' },
      { title: 'Atenção ao Consórcio', body: 'O Consórcio não governa A Caixa nem a controla. Sua atuação se concentra no mundo humano; possíveis espiões são um assunto diferente, ainda envolto em segredo.' },
    ],
  },
  {
    id: 'deserto', name: 'O Grande Deserto', kicker: 'Duas temperaturas, uma terra', theme: 'deserto',
    image: '/historia/cenas/livro/deserto-760.webp',
    wideImage: '/historia/cenas/livro/deserto-1520.webp',
    summary: 'Dunas, montanhas de pedra e templos esquecidos guardam uma terra marcada pelo cataclisma. À luz do dia, o calor pode matar; à noite, o deserto se transforma em um palácio de gelo.',
    highlights: [
      { title: 'O legado do cataclisma', body: 'Dizem que esta região recebeu parte do cataclisma antes do fechamento da Cúpula. Sua corrosão diminuiu, mas a antiga terra árida se tornou um deserto de extremos.' },
      { title: 'Do fogo ao gelo', body: 'Quanto mais escaldante o dia, mais brutal é o frio à noite. Criaturas locais se adaptaram a esse ciclo e podem apresentar manifestações de calor e de gelo.' },
      { title: 'Os Nômades da Areia', body: 'Os arcadianos nascidos e criados aqui são famosos por uma resistência física extraordinária. Seu preparo permite enfrentar tanto o sol impiedoso quanto as noites congelantes.' },
      { title: 'Segredos soterrados', body: 'Templos antigos e memórias de um mundo perdido repousam sob a areia. Muitos aventureiros que subestimam essa natureza jamais retornam.' },
    ],
  },
  {
    id: 'grande-fim', name: 'O Grande Fim', kicker: 'Também chamado de Grande Vazio', theme: 'fim',
    summary: 'Ao norte e ao sul, a floresta encontra o deserto. Onde os biomas se misturam, árvores e areias negras formam um ecossistema desconhecido, atravessado por uma rota de pedras protegidas pelo Fluxo.',
    highlights: [
      { title: 'Duas interseções', body: 'O Grande Fim existe nas áreas de encontro entre Grande Floresta e Grande Deserto ao norte e ao sul da região central. Não é um único portão nem uma simples estrada.' },
      { title: 'As pedras da passagem', body: 'Sobreviventes abriram uma rota aos poucos, colocando pedras inscritas por Escultores com a palavra “Barreira”. O Fluxo precisa reabastecer essas proteções periodicamente.' },
      { title: 'Uma travessia possível', body: 'Comerciantes e viajantes atravessam os caminhos protegidos, que se ramificam na direção dos dois biomas. Fora da passagem, nenhuma segurança é garantida.' },
      { title: 'O chamado do vazio', body: 'Quase ninguém viu as criaturas da interseção e voltou para contar. Há relatos de uma influência que atrai os viajantes para fora das pedras — e de desaparecimentos sem explicação.' },
    ],
  },
];

function RegionPicture({ region, eager = false }: { region: AtlasRegion; eager?: boolean }) {
  if (region.id === 'grande-fim') {
    return <div className="ha-fim-art" role="img" aria-label="Representação abstrata provisória de árvores e areia negras, com uma passagem de pedras iluminadas">
      <svg viewBox="0 0 600 310" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="ha-fim-sky" x2="0" y2="1"><stop stopColor="#080811"/><stop offset="1" stopColor="#2b1e2c"/></linearGradient>
          <linearGradient id="ha-fim-path" x2="0" y2="1"><stop stopColor="#c2a575"/><stop offset="1" stopColor="#40352d"/></linearGradient>
        </defs>
        <rect width="600" height="310" fill="url(#ha-fim-sky)"/>
        <path d="M0 190Q90 135 175 202T350 185T600 180V310H0Z" fill="#17151b"/>
        <path d="M0 240Q125 185 225 240T430 224T600 240V310H0Z" fill="#0c0e12"/>
        {Array.from({length:9},(_,i)=>{
          const x=i*75-18;const h=70+(i*37)%70;
          return <g key={i} stroke="#050609" strokeWidth="8" strokeLinecap="round" fill="none"><path d={`M${x} 244 L${x+6} ${244-h}`}/><path d={`M${x+5} ${244-h/2} L${x-25} ${225-h}`}/><path d={`M${x+5} ${244-h/1.7} L${x+30} ${216-h}`}/></g>;
        })}
        <path d="M230 310 Q305 253 290 213 Q273 174 310 124" stroke="#322d2c" strokeWidth="49" fill="none"/>
        <path d="M230 310 Q305 253 290 213 Q273 174 310 124" stroke="url(#ha-fim-path)" strokeWidth="18" strokeDasharray="17 12" fill="none"/>
        {Array.from({length:6},(_,i)=>{
          const x=[231,272,291,289,290,304][i]; const y=[292,268,243,210,179,145][i];
          return <g key={i}><path d={`M${x} ${y}v-24`} stroke="#d4b780" strokeWidth="3"/><circle cx={x} cy={y-25} r="5" fill="#f8e3a8"/></g>;
        })}
      </svg>
      <span className="ha-fim-caption">Arte definitiva do Grande Fim: etapa futura</span>
    </div>;
  }
  return <picture>
    {region.wideImage && <source media="(min-width: 900px)" srcSet={region.wideImage}/>}
    <img src={region.image} alt={`Ilustração aprovada de ${region.name}, do Livro de História de Herdeiros`} loading={eager?'eager':'lazy'} decoding="async"/>
  </picture>;
}

const markers: { region: AtlasRegionId; className: string; title: string }[] = [
  { region: 'floresta', className: 'ha-pin-floresta', title: 'Grande Floresta' },
  { region: 'caixa', className: 'ha-pin-caixa', title: 'A Caixa' },
  { region: 'deserto', className: 'ha-pin-deserto', title: 'Grande Deserto' },
  { region: 'grande-fim', className: 'ha-pin-norte', title: 'Grande Fim · Norte' },
  { region: 'grande-fim', className: 'ha-pin-sul', title: 'Grande Fim · Sul' },
];

export function AtlasPage({ regionId, onSelectRegion }: {regionId: AtlasRegionId | null; onSelectRegion:(region:AtlasRegionId|null)=>void}) {
  const region = ATLAS_REGIONS.find(item=>item.id===regionId);

  return <section className="ha-atlas" aria-label="Atlas de Arcádia">
    {region ? <>
      <div className="ha-region-navigation"><button type="button" onClick={()=>onSelectRegion(null)}><ArrowLeft size={17}/> Voltar ao mapa de Arcádia</button><span>ATLAS DE ARCÁDIA / {region.name.toUpperCase()}</span></div>
      <header className={`ha-region-hero ha-theme-${region.theme}`}>
        <RegionPicture region={region} eager/>
        <div className="ha-region-heading"><span>AS TERRAS DE ARCÁDIA</span><h1>{region.name}</h1><p>{region.kicker}</p></div>
      </header>
      <div className="ha-region-body"><p className="ha-region-lede">{region.summary}</p>
        <div className="ha-region-sections">{region.highlights.map(entry=><article key={entry.title} className="ha-lore-section"><h2>{entry.title}</h2><p>{entry.body}</p></article>)}</div>
        <div className="ha-region-footer"><button type="button" onClick={()=>onSelectRegion(null)}><Compass size={18}/> Explorar outra região</button></div>
      </div>
    </> : <>
      <header className="ha-header"><span className="ha-eyebrow"><Compass size={18}/> HERDEIROS · O DESPERTAR</span><h1>Atlas de Arcádia</h1><p>Conheça as terras que sobreviveram sob a Cúpula de Som: seus povos, seus caminhos e os mistérios que ainda guardam.</p></header>
      <div className="ha-map-panel">
        <div className="ha-map-heading"><span><MapPinned size={19}/> VISÃO GERAL</span><small>Selecione uma região do mapa ou dos cartões abaixo</small></div>
        <figure className="ha-map">
          <picture><source media="(max-width: 680px)" srcSet="/atlas/mapa-arcadia-760.webp"/><img src="/atlas/mapa-arcadia-1520.webp" alt="Representação ilustrada do continente protegido: floresta à esquerda, metrópole central, deserto à direita e duas regiões negras de interseção ao norte e ao sul" loading="eager"/></picture>
          <div className="ha-map-pins" aria-label="Pontos de interesse do mapa">{markers.map(marker=><button type="button" key={marker.className} className={`ha-map-pin ${marker.className}`} onClick={()=>onSelectRegion(marker.region)} title={`Explorar ${marker.title}`} aria-label={`Explorar ${marker.title}`}><span className="ha-pin-dot"/><span className="ha-pin-text">{marker.title}</span></button>)}</div>
        </figure>
        <p className="ha-map-note"><Shield size={16}/> Mapa ilustrativo do território conhecido — não representa distâncias, rotas precisas ou fronteiras administrativas.</p>
      </div>
      <div className="ha-region-list-head"><h2>Terras e regiões</h2><p>Escolha uma região para ler sobre seus habitantes, sua geografia e seus perigos.</p></div>
      <div className="ha-region-grid">{ATLAS_REGIONS.map(item=><button key={item.id} type="button" className={`ha-region-card ha-theme-${item.theme}`} onClick={()=>onSelectRegion(item.id)}>
        <div className="ha-region-card-art"><RegionPicture region={item}/></div>
        <div className="ha-region-card-info"><span>{item.kicker}</span><h3>{item.name}</h3><p>{item.summary}</p><strong>Explorar <ArrowRight size={16}/></strong></div>
      </button>)}</div>
      <footer className="ha-atlas-foot"><div><BookOpen size={19}/> O Atlas descreve Arcádia como ela é conhecida hoje; o Livro de História conta como o mundo chegou até aqui.</div><span><Leaf size={15}/> <Sun size={15}/> <Landmark size={15}/> <Mountain size={15}/> <Wind size={15}/> <Sparkles size={15}/></span></footer>
    </>}
  </section>;
}
