import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Compass, Landmark, Leaf, MapPinned, Minus, Mountain, Plus, RotateCcw, Shield, Sparkles, Sun, Wind, WandSparkles } from 'lucide-react';
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
    return <div className="ha-fim-art" role="img" aria-label="Representação do Grande Fim: encontro sombrio entre floresta e deserto, cortado por caminhos de pedras rúnicas protegidas pelo Fluxo">
      <svg viewBox="0 0 600 310" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="ha-fim-sky" x2="0" y2="1"><stop stopColor="#07060f"/><stop offset="0.55" stopColor="#211824"/><stop offset="1" stopColor="#0d0b11"/></linearGradient>
          <linearGradient id="ha-fim-path" x2="0" y2="1"><stop stopColor="#f3d692"/><stop offset="1" stopColor="#4b3d2b"/></linearGradient>
          <radialGradient id="ha-fim-void" cx="50%" cy="50%" r="60%"><stop stopColor="#9f79bf" stopOpacity="0.65"/><stop offset="1" stopColor="#9f79bf" stopOpacity="0"/></radialGradient>
        </defs>
        <rect width="600" height="310" fill="url(#ha-fim-sky)"/>
        <rect x="0" y="0" width="240" height="310" fill="#101811" opacity="0.45"/>
        <rect x="360" y="0" width="240" height="310" fill="#20140d" opacity="0.45"/>
        <circle cx="300" cy="42" r="86" fill="url(#ha-fim-void)"/>
        <circle cx="300" cy="268" r="76" fill="url(#ha-fim-void)" opacity="0.8"/>
        <path d="M0 198Q70 158 150 194T300 182T600 192V310H0Z" fill="#111217"/>
        <path d="M0 238Q90 204 160 234T300 230T600 238V310H0Z" fill="#0a0b10"/>
        {Array.from({ length: 7 }, (_, i) => {
          const x = 24 + i * 70;
          const h = 80 + (i % 3) * 22;
          return <g key={`forest-${i}`} stroke="#04070b" strokeWidth="8" strokeLinecap="round" fill="none"><path d={`M${x} 242 L${x + 4} ${242 - h}`}/><path d={`M${x + 3} ${240 - h / 2} L${x - 24} ${224 - h}`}/><path d={`M${x + 3} ${235 - h / 1.8} L${x + 28} ${214 - h}`}/></g>;
        })}
        {Array.from({ length: 10 }, (_, i) => {
          const x = 390 + i * 28;
          const y = 248 - (i % 2) * 12;
          return <path key={`dune-${i}`} d={`M${x} ${y}q12 -18 24 0q-11 16 -24 0Z`} fill="#120f13" opacity="0.95"/>;
        })}
        <path d="M292 310 Q306 250 298 218 Q290 188 300 160 Q310 188 302 218 Q294 250 308 310" stroke="#2e2827" strokeWidth="46" fill="none"/>
        <path d="M292 310 Q306 250 298 218 Q290 188 300 160 Q310 188 302 218 Q294 250 308 310" stroke="url(#ha-fim-path)" strokeWidth="14" strokeDasharray="20 14" fill="none"/>
        <path d="M300 160 Q247 146 212 116" stroke="url(#ha-fim-path)" strokeWidth="12" strokeDasharray="16 12" fill="none"/>
        <path d="M300 160 Q353 146 388 116" stroke="url(#ha-fim-path)" strokeWidth="12" strokeDasharray="16 12" fill="none"/>
        <path d="M300 160 Q250 90 228 48" stroke="url(#ha-fim-path)" strokeWidth="10" strokeDasharray="15 11" fill="none" opacity="0.78"/>
        <path d="M300 160 Q350 90 372 48" stroke="url(#ha-fim-path)" strokeWidth="10" strokeDasharray="15 11" fill="none" opacity="0.78"/>
        {[ [301,294],[302,270],[300,244],[300,214],[300,184],[300,156],[276,142],[248,126],[352,126],[324,142],[257,92],[343,92] ].map(([x,y],i)=><g key={`ward-${i}`}><path d={`M${x} ${y}v-20`} stroke="#e8cb88" strokeWidth="2.5"/><circle cx={x} cy={y-22} r="4.2" fill="#ffe5a9"/></g>)}
      </svg>
      <span className="ha-fim-caption">Visual poético do Grande Fim · Norte e Sul</span>
    </div>;
  }

  return <picture>
    {region.wideImage && <source media="(min-width: 900px)" srcSet={region.wideImage} />}
    <img src={region.image} alt={`Ilustração aprovada de ${region.name}, do Livro de História de Herdeiros`} loading={eager ? 'eager' : 'lazy'} decoding="async" />
  </picture>;
}

function RegionAtmosphere({ regionId, animated }: { regionId: AtlasRegionId; animated: boolean }) {
  const stateClass = animated ? 'ha-scene-animated' : 'ha-scene-still';

  return <div className={`ha-region-atmosphere ha-scene-${regionId} ${stateClass}`} aria-hidden="true">
    {regionId === 'floresta' && <>
      <i className="ha-scene-el ha-scene-fog ha-scene-fog-a" />
      <i className="ha-scene-el ha-scene-fog ha-scene-fog-b" />
      <i className="ha-scene-el ha-scene-pollen ha-scene-pollen-a" />
      <i className="ha-scene-el ha-scene-pollen ha-scene-pollen-b" />
      <i className="ha-scene-el ha-scene-glow ha-scene-glow-a" />
    </>}
    {regionId === 'caixa' && <>
      <i className="ha-scene-el ha-scene-beam" />
      <i className="ha-scene-el ha-scene-scan" />
      <i className="ha-scene-el ha-scene-traffic ha-scene-traffic-a" />
      <i className="ha-scene-el ha-scene-traffic ha-scene-traffic-b" />
      <i className="ha-scene-el ha-scene-city-glow" />
    </>}
    {regionId === 'deserto' && <>
      <i className="ha-scene-el ha-scene-heat" />
      <i className="ha-scene-el ha-scene-sandflow ha-scene-sandflow-a" />
      <i className="ha-scene-el ha-scene-sandflow ha-scene-sandflow-b" />
      <i className="ha-scene-el ha-scene-frost ha-scene-frost-a" />
      <i className="ha-scene-el ha-scene-frost ha-scene-frost-b" />
    </>}
    {regionId === 'grande-fim' && <>
      <i className="ha-scene-el ha-scene-void ha-scene-void-a" />
      <i className="ha-scene-el ha-scene-void ha-scene-void-b" />
      <i className="ha-scene-el ha-scene-route" />
      <i className="ha-scene-el ha-scene-route ha-scene-route-branch-left" />
      <i className="ha-scene-el ha-scene-route ha-scene-route-branch-right" />
      <i className="ha-scene-el ha-scene-embers" />
    </>}
  </div>;
}

function AtlasEffectsButton({ animated, onToggle }: { animated: boolean; onToggle: () => void }) {
  return <button
    type="button"
    className={`ha-effects-toggle ${animated ? 'is-active' : ''}`}
    aria-pressed={animated}
    aria-label={animated ? 'Desligar animações do Atlas' : 'Ligar animações do Atlas'}
    title={animated ? 'Desligar animações do Atlas' : 'Ligar animações do Atlas'}
    onClick={onToggle}
  >
    <WandSparkles size={16} /> {animated ? 'Animações ligadas' : 'Animações desligadas'}
  </button>;
}

const markers: { region: AtlasRegionId; className: string; title: string; short: string }[] = [
  { region: 'floresta', className: 'ha-pin-floresta', title: 'Grande Floresta', short: 'Floresta' },
  { region: 'caixa', className: 'ha-pin-caixa', title: 'A Caixa', short: 'A Caixa' },
  { region: 'deserto', className: 'ha-pin-deserto', title: 'Grande Deserto', short: 'Deserto' },
  { region: 'grande-fim', className: 'ha-pin-norte', title: 'Grande Fim · Norte', short: 'Grande Fim · Norte' },
  { region: 'grande-fim', className: 'ha-pin-sul', title: 'Grande Fim · Sul', short: 'Grande Fim · Sul' },
];

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;
type MapPosition = { x: number; y: number };

/**
 * A Etapa 2 utiliza o mapa já aprovado e mantém as regiões da Etapa 1.
 * Arraste e zoom modificam APENAS a camada visual do mapa (incluindo pinos),
 * sem mudar navegação, histórico, texto do livro ou coordenadas salvas.
 * Os limites de arrasto impedem que o usuário perca o mapa de vista.
 *
 * Etapa 3: as mesmas artes recebem vida com camadas atmosféricas opcionais.
 */
function AtlasWorldMap({ onSelectRegion, animated, onToggleAnimated }: { onSelectRegion: (region: AtlasRegionId) => void; animated: boolean; onToggleAnimated: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<MapPosition>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ pointerId: number; x: number; y: number; pan: MapPosition } | null>(null);

  const clampPan = useCallback((next: MapPosition, nextZoom: number): MapPosition => {
    const rect = viewport.current?.getBoundingClientRect();
    const w = rect?.width ?? 1000;
    const h = rect?.height ?? 750;
    const limitX = (w * (nextZoom - 1)) / 2;
    const limitY = (h * (nextZoom - 1)) / 2;
    return {
      x: Math.max(-limitX, Math.min(limitX, next.x)),
      y: Math.max(-limitY, Math.min(limitY, next.y)),
    };
  }, []);

  function applyZoom(next: number) {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(next * 100) / 100));
    setPan(current => clampPan(current, clamped));
    setZoom(clamped);
  }

  function resetMap() {
    dragState.current = null;
    setDragging(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (zoom === MIN_ZOOM || event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    dragState.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, pan };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPan(clampPan({ x: drag.pan.x + event.clientX - drag.x, y: drag.pan.y + event.clientY - drag.y }, zoom));
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragState.current?.pointerId !== event.pointerId) return;
    dragState.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  }

  return <div className="ha-world-map" aria-label="Mapa ilustrado interativo do continente protegido de Arcádia">
    <div className="ha-map-tools" role="group" aria-label="Controles do mapa">
      <button type="button" title="Ampliar o mapa" aria-label="Ampliar o mapa" disabled={zoom >= MAX_ZOOM} onClick={() => applyZoom(zoom + ZOOM_STEP)}><Plus size={19} /></button>
      <output className="ha-map-zoom" aria-live="off" aria-label={`Ampliação ${Math.round(zoom * 100)} por cento`}>{Math.round(zoom * 100)}%</output>
      <button type="button" title="Reduzir o mapa" aria-label="Reduzir o mapa" disabled={zoom <= MIN_ZOOM} onClick={() => applyZoom(zoom - ZOOM_STEP)}><Minus size={19} /></button>
      <button type="button" title="Centralizar mapa" aria-label="Centralizar mapa" onClick={resetMap}><RotateCcw size={18} /></button>
      <span className="ha-map-tools-separator" aria-hidden="true" />
      <AtlasEffectsButton animated={animated} onToggle={onToggleAnimated} />
    </div>
    <figure className={`ha-map ${zoom > 1 ? 'ha-map-zoomed' : ''} ${dragging ? 'ha-map-dragging' : ''} ${animated ? 'ha-map-animated' : 'ha-map-still'}`}>
      <div ref={viewport} className="ha-map-viewport" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <div className="ha-map-canvas" style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}>
          <picture>
            <source media="(max-width: 680px)" srcSet="/atlas/mapa-arcadia-760.webp" />
            <img src="/atlas/mapa-arcadia-1520.webp" alt="Vista aérea de Arcádia: Grande Floresta à esquerda, a metrópole de A Caixa cercada por muralhas no centro, Grande Deserto à direita e dois corredores negros do Grande Fim acima e abaixo" draggable={false} loading="eager" decoding="async" />
          </picture>
          <div className="ha-map-atmosphere" aria-hidden="true">
            <i className="ha-weather ha-fog" /><i className="ha-weather ha-sand" /><i className="ha-weather ha-void-north" /><i className="ha-weather ha-void-south" /><i className="ha-weather ha-tower" />
            <i className="ha-ward ha-ward-north" /><i className="ha-ward ha-ward-south" />
          </div>
          <div className="ha-map-pins" role="group" aria-label="Regiões clicáveis do mapa">
            {markers.map(marker => <button type="button" key={marker.className} className={`ha-map-pin ${marker.className}`} onClick={() => onSelectRegion(marker.region)} title={`Explorar ${marker.title}`} aria-label={`Explorar ${marker.title}`}><span className="ha-pin-dot" /><span className="ha-pin-text">{marker.title}</span></button>)}
          </div>
        </div>
      </div>
      <div className="ha-map-north" aria-hidden="true"><Compass size={20} /><span>N</span></div>
      <figcaption className="ha-map-instruction">{zoom > 1 ? 'Arraste para explorar · toque em um ponto para abrir a região' : 'Selecione uma região · use + para aproximar'}</figcaption>
    </figure>
    <div className="ha-map-legend" aria-label="Legenda do mapa">
      <span className="ha-legend-item ha-legend-forest"><i /> Grande Floresta</span>
      <span className="ha-legend-item ha-legend-city"><i /> A Caixa</span>
      <span className="ha-legend-item ha-legend-desert"><i /> Grande Deserto</span>
      <span className="ha-legend-item ha-legend-void"><i /> Grande Fim · Norte e Sul</span>
    </div>
  </div>;
}

export function AtlasPage({ regionId, onSelectRegion }: { regionId: AtlasRegionId | null; onSelectRegion: (region: AtlasRegionId | null) => void }) {
  const region = ATLAS_REGIONS.find(item => item.id === regionId);
  const [animated, setAnimated] = useState(true);

  return <section className="ha-atlas" aria-label="Atlas de Arcádia">
    {region ? <>
      <div className="ha-region-navigation"><button type="button" onClick={() => onSelectRegion(null)}><ArrowLeft size={17} /> Voltar ao mapa de Arcádia</button><span>ATLAS DE ARCÁDIA / {region.name.toUpperCase()}</span></div>
      <header className={`ha-region-hero ha-theme-${region.theme}`}>
        <div className="ha-region-scene">
          <RegionPicture region={region} eager />
          <RegionAtmosphere regionId={region.id} animated={animated} />
        </div>
        <div className="ha-region-hero-tools"><AtlasEffectsButton animated={animated} onToggle={() => setAnimated(value => !value)} /></div>
        <div className="ha-region-heading"><span>AS TERRAS DE ARCÁDIA</span><h1>{region.name}</h1><p>{region.kicker}</p></div>
      </header>
      <div className="ha-region-body"><p className="ha-region-lede">{region.summary}</p>
        <div className="ha-region-sections">{region.highlights.map(entry => <article key={entry.title} className="ha-lore-section"><h2>{entry.title}</h2><p>{entry.body}</p></article>)}</div>
        <div className="ha-region-footer"><button type="button" onClick={() => onSelectRegion(null)}><Compass size={18} /> Explorar outra região</button></div>
      </div>
    </> : <>
      <header className="ha-header"><span className="ha-eyebrow"><Compass size={18} /> HERDEIROS · O DESPERTAR</span><h1>Atlas de Arcádia</h1><p>Conheça as terras que sobreviveram sob a Cúpula de Som: seus povos, seus caminhos e os mistérios que ainda guardam.</p></header>
      <div className="ha-map-panel">
        <div className="ha-map-heading"><span><MapPinned size={19} /> VISÃO GERAL</span><small>Selecione uma região do mapa ou dos cartões abaixo</small></div>
        <AtlasWorldMap onSelectRegion={onSelectRegion} animated={animated} onToggleAnimated={() => setAnimated(value => !value)} />
        <p className="ha-map-note"><Shield size={16} /> Mapa ilustrativo do território conhecido — não representa distâncias, rotas precisas ou fronteiras administrativas.</p>
      </div>
      <div className="ha-region-list-head"><h2>Terras e regiões</h2><p>Escolha uma região para ler sobre seus habitantes, sua geografia e seus perigos.</p></div>
      <div className="ha-region-grid">{ATLAS_REGIONS.map(item => <button key={item.id} type="button" className={`ha-region-card ha-theme-${item.theme}`} onClick={() => onSelectRegion(item.id)}>
        <div className="ha-region-card-art"><RegionPicture region={item} /></div>
        <div className="ha-region-card-info"><span>{item.kicker}</span><h3>{item.name}</h3><p>{item.summary}</p><strong>Explorar <ArrowRight size={16} /></strong></div>
      </button>)}</div>
      <footer className="ha-atlas-foot"><div><BookOpen size={19} /> O Atlas descreve Arcádia como ela é conhecida hoje; o Livro de História conta como o mundo chegou até aqui.</div><span><Leaf size={15} /> <Sun size={15} /> <Landmark size={15} /> <Mountain size={15} /> <Wind size={15} /> <Sparkles size={15} /></span></footer>
    </>}
  </section>;
}
