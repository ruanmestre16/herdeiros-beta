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
    image: '/atlas/grande-fim-760.webp',
    wideImage: '/atlas/grande-fim-1520.webp',
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

  return <picture>
    {region.wideImage && <source media="(min-width: 900px)" srcSet={region.wideImage} />}
    <img src={region.image} alt={region.id === "grande-fim" ? "Arte aprovada do Grande Fim: trilha protegida por pedras iluminadas entre árvores negras e areia sombria" : `Ilustração aprovada de ${region.name}, do Livro de História de Herdeiros`} loading={eager ? 'eager' : 'lazy'} decoding="async" />
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
    <div className="ha-region-live-motes" aria-hidden="true">
      {Array.from({length: 22}, (_,i) => (
        <i key={i} className={`ha-region-mote ha-region-mote-${regionId}`}
          style={{left:`${5+(i*29)%90}%`,top:`${7+(i*37)%80}%`,animationDelay:`-${(i*.47).toFixed(2)}s`,animationDuration:`${4.2+(i%7)*.8}s`}} />
      ))}
    </div>
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
    <WandSparkles size={16} /> {animated ? 'Pausar movimento' : 'Ativar movimento'}
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
      <span className="ha-reduced-motion-hint">Movimento reduzido no dispositivo: ative manualmente se desejar.</span>
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
          <svg className="ha-map-live-routes" viewBox="0 0 1000 750" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            {/* Dois caminhos protegidos do Grande Fim, ao norte e ao sul da Caixa. */}
            <path className="ha-live-route ha-route-north" d="M495 298 Q484 252 447 210 Q438 181 443 149 Q387 118 339 93 M443 149 Q495 132 560 90"/>
            <path className="ha-live-route ha-route-south" d="M500 465 Q504 505 518 544 Q535 591 496 635 Q462 667 392 694 M496 635 Q552 654 621 708"/>
            <path className="ha-live-route-core ha-route-north" d="M495 298 Q484 252 447 210 Q438 181 443 149 Q387 118 339 93 M443 149 Q495 132 560 90"/>
            <path className="ha-live-route-core ha-route-south" d="M500 465 Q504 505 518 544 Q535 591 496 635 Q462 667 392 694 M496 635 Q552 654 621 708"/>
            <circle className="ha-live-tower-ring" cx="500" cy="373" r="30"/>
            <circle className="ha-live-tower-ring ha-live-tower-ring-two" cx="500" cy="373" r="18"/>
          </svg>
          <div className="ha-map-live-motes" aria-hidden="true">
            {Array.from({length: 36}, (_,i) => {
              const area = i%4;
              const x = area===0 ? 5+(i*17)%27 : area===1 ? 70+(i*13)%24 : area===2 ? 35+(i*11)%32 : 34+(i*19)%31;
              const y = area===2 ? 5+(i*7)%20 : area===3 ? 79+(i*7)%18 : 9+(i*13)%72;
              return <i key={i} className={`ha-map-mote ha-mote-${['forest','desert','void','void'][area]}`} style={{left:`${x}%`,top:`${y}%`,animationDelay:`${-(i*0.67)}s`,animationDuration:`${4.2+(i%6)*.75}s`}}/>;
            })}
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
  // Prefere movimento reduzido? Começa pausado, mas a opção manual continua disponível.
  const [animated, setAnimated] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

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
      <div className="ha-region-list-head"><h2>Terras e regiões</h2><p>Escolha uma região para ler sobre seus habitantes, sua geografia e seus perigos. <strong>{animated ? 'Cenários em movimento' : 'Animações pausadas'}</strong></p></div>
      <div className="ha-region-grid">{ATLAS_REGIONS.map(item => <button key={item.id} type="button" className={`ha-region-card ha-theme-${item.theme}`} onClick={() => onSelectRegion(item.id)}>
        <div className="ha-region-card-art"><RegionPicture region={item} /><RegionAtmosphere regionId={item.id} animated={animated}/></div>
        <div className="ha-region-card-info"><span>{item.kicker}</span><h3>{item.name}</h3><p>{item.summary}</p><strong>Explorar <ArrowRight size={16} /></strong></div>
      </button>)}</div>
      <footer className="ha-atlas-foot"><div><BookOpen size={19} /> O Atlas descreve Arcádia como ela é conhecida hoje; o Livro de História conta como o mundo chegou até aqui.</div><span><Leaf size={15} /> <Sun size={15} /> <Landmark size={15} /> <Mountain size={15} /> <Wind size={15} /> <Sparkles size={15} /></span></footer>
    </>}
  </section>;
}
