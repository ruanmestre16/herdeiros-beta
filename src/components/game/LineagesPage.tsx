import { useRef, useState } from 'react';
import { ArrowRight, BookOpen, Cpu, Crown, Flame, Headphones, Moon, Shield, Sparkles, Sun, Sword, WandSparkles, type LucideIcon } from 'lucide-react';
import './lineages-page.css';

type Block = { title: string; text: string[] };
type Stage = { name: string; subtitle: string; text: string; passive?: string };
type Lineage = { key: string; name: string; epithet: string; intro: string; blocks: Block[]; stages: Stage[] };

const LINEAGES: Lineage[] = [
  {
    key: 'arcadianos', name: 'Arcadianos', epithet: 'Os Puros',
    intro: 'Os Arcadianos nascem com o benefício do Fluxo: já nascem sabendo moldá-lo. Para eles, o Fluxo é tão natural quanto respirar. Costumam ser nobres e vivem em Arcádia — mas essa facilidade traz o risco constante de corrupção do Ego e da alma, por excesso de confiança ou falta de disciplina.',
    blocks: [
      { title: 'Os Completos(Macro)', text: ['Controla um aspecto elemental por completo. Um herdeiro do fogo pode fazer tudo que envolve fogo, limitado apenas pela imaginação e pela arma. Um herdeiro da água domina o ciclo inteiro: líquido, vapor e gelo.', 'Tem versatilidade absoluta, mas leva mais tempo para atingir a potência máxima em estados específicos.'] },
      { title: 'Fragmentos (Micro)', text: ['Especialistas em um único aspecto de um elemento. O fragmento de gelo controla somente o gelo — porém de forma muito mais abrangente e poderosa do que um herdeiro da água que também toca o gelo.', 'Limitados em versatilidade, superiores em potência e controle. São as pontas de lança táticas do Consórcio.'] },
      { title: 'Armas de Ego', text: ['Algumas Casas nascem com Armas de Ego passadas de geração em geração. Outros Arcadianos forjam a própria arma — a Arma de Vontade —, moldada pela mente durante o despertar (correntes, foices, arcos...), mantendo a essência elemental. Com o tempo, ela também ganha um ego.', 'A Arma Verdadeira é o estado em que o Ego assume forma física independente: luta ao lado do Herdeiro como aliado autônomo, um segundo cérebro de combate que permite reações em dobro e suporte tático imediato.'] },
    ],
    stages: [
      { name: 'Senshi', subtitle: 'O Iniciante', text: 'Foco no ESPÍRITO para estabilizar o Fluxo no plano físico. A Arma de Ego desperta, mas é silenciosa, agindo apenas como catalisador elemental básico.', passive: 'Ao ter êxito em um acerto, recupera 2 PF.' },
      { name: 'Shoji / Harmonia', subtitle: 'O Veterano', text: 'Foco em MENTE e ESPÍRITO. Surge o Eco da arma: o Ego revela personalidade e objetivos próprios. Em conflito ético ou fraqueza, a arma pode tentar uma Possessão — o usuário precisa vencer um duelo mental para não perder o controle do próprio corpo.', passive: 'Ao ter êxito em um acerto, recupera 4 PF.' },
      { name: 'Narande', subtitle: 'A Integração Final', text: 'Sincronização Total. A Arma de Ego deixa de ser instrumento e se torna uma entidade física autônoma — a Arma Verdadeira.', passive: 'Ao ter êxito em um acerto, recupera 8 PF.' },
    ],
  },
  {
    key: 'humanos', name: 'Humanos', epithet: 'Os Libertados',
    intro: 'Os Humanos nascem sob o Véu da Ignorância. Eles são feitos de Fluxo — como tudo no mundo —, mas não conseguem utilizá-lo. Sua conexão é latente, porém onipresente em seu corpo. Para usar o Fluxo, precisam despertar.',
    blocks: [
      { title: 'O Ritual da Navalha', text: ['Alguns clãs humanos usam o Ritual da Navalha para acordar seus filhos. Aos seis anos, após treinamento marcial exaustivo, a criança é lançada em arenas com Gakis Irracionais. No limiar da morte, o instinto de sobrevivência corta o Véu, libertando o Fluxo para salvar o corpo.', 'Os que falham tornam-se Gakis ou morrem. O ritual não prova apenas coragem: é uma violência institucionalizada pela qual a alma aprende, sob ameaça, a nomear sua própria continuidade.'] },
      { title: 'Outros caminhos do despertar', text: ['Nem todos passam pelo ritual. Muitos despertam em batalhas contra Gakis, em experiências de quase-morte ou em traumas extremos — sempre no limite entre a vida e o fim.'] },
      { title: 'Crianças-Farol', text: ['Humanos que nascem com excesso de Fluxo, manifestado muitas vezes como neurodivergência ou dons extraordinários.', 'Seu brilho atrai predadores espirituais e o Consórcio, que as usa em experimentos brutais. Por sua intensidade, costumam ser percebidas antes mesmo de saberem se proteger.', 'Alteram ambientes, chamam a atenção de criaturas e distorcem a percepção dos adultos ao redor — tornando-se peças centrais em guerras invisíveis.'] },
      { title: 'Arma de Vínculo e Agonia', text: ['Ao despertar surge a Arma de Vínculo: uma manifestação estável e tática, moldada pela imaginação. A entrada súbita de energia causa a Agonia inicial — dores físicas atrozes que testam a sanidade.'] },
    ],
    stages: [
      { name: 'Libertado', subtitle: 'A Mente Desperta', text: 'Foco total em MENTE. O humano rompe o Véu e começa a dobrar o Fluxo. Surge a Arma de Vínculo e a Agonia inicial.', passive: 'Ao usar a ação padrão para ler o fluxo parcial do alvo, ganha +3 de dano e bloqueio contra esse alvo.' },
      { name: 'Moldador / Arquiteto', subtitle: 'A Matéria Dobrada', text: 'Foco em MENTE e CORPO. Aprende a disciplinar a dor e domina a Moldagem Dinâmica, alterando propriedades do ambiente com baixo custo mental.', passive: 'Ao ler o fluxo parcial do alvo, ganha +5 de dano e bloqueio contra esse alvo.' },
      { name: 'Mestre / Domínio', subtitle: 'As Leis Refeitas', text: 'Foco em ESPÍRITO e MENTE. Vontade inabalável: refaz as leis da física e suas ordens ao Fluxo são absolutas. A arma torna-se energia pura e mutável.', passive: 'Ao ler o fluxo parcial do alvo, ganha +8 de dano e bloqueio contra esse alvo.' },
    ],
  },
  {
    key: 'gakis', name: 'Gakis', epithet: 'Os Corrompidos pelo Karma',
    intro: 'Gakis são seres que morreram em lugares com corrupção de Karma, ou pessoas que morreram com um sentimento muito ruim e se recusaram a voltar ao Fluxo. Não é mera morte: é corrupção, persistência e fome transformadas em identidade quebrada. Quanto mais sobem de nível, mais inteligentes ficam — e passam a controlar Gakis mais fracos.',
    blocks: [
      { title: 'Ordens de Gakis', text: ['Existem Gakis humanos, Gakis animais, Gakis bestiais e os Velhos — cada ordem carrega a forma e os instintos daquilo que foi em vida.'] },
      { title: 'Alinhamento e dieta', text: ['Predadores (carnívoros): alimentam-se de carne e energia vital, espalhando corrupção e medo.', 'Herbívoros (equilibrados): raros, buscam redenção. Alimentam-se de carne animal preparada ou da força da natureza e atuam como protetores de territórios.'] },
      { title: 'Os Darks', text: ['Seres que transcendem as classes comuns: mestres da distorção que usam o Fluxo para corromper a realidade e outros despertos de propósito.'] },
    ],
    stages: [
      { name: 'Gaki Irracional', subtitle: 'A Besta de Fumaça', text: 'Forma inicial de quem sucumbiu ao Karma. Massa de fumaça negra disforme, movida por instinto e fome. Sem consciência, apenas o desejo de consumir.' },
      { name: 'Gaki Senciente', subtitle: 'O Desperto', text: 'Recupera a fala e a lógica básica. O corpo oscila entre fumaça e matéria e pode alongar membros como sombras. Faz teste de MENTE para não se submeter ao Karma — quanto mais ferido, maior a DT.', passive: 'Recupera 4 PV ao consumir um alvo após a luta, drenando o fluxo restante.' },
      { name: 'Gaki Inteligente', subtitle: 'O Mestre da Estratégia', text: 'Recupera plenamente a razão e a fala complexa, com intelecto superior. Domínio Hierárquico: manipula e comanda Gakis de classes inferiores como peões.', passive: 'Recupera 7 PV ao consumir um alvo após a luta.' },
      { name: 'Gaki Velho', subtitle: 'O Infiltrador Supremo', text: 'O mais perigoso e antigo. Muda a aparência livremente, recupera memórias de vidas passadas e reformula a assinatura espiritual para parecer humano comum — virtualmente indetectável.', passive: 'Recupera 12 PV ao consumir um alvo após a luta.' },
    ],
  },
];


type LineageKey = 'arcadianos' | 'humanos' | 'gakis';
type DetailTab = 'historia' | 'habilidades' | 'estagios';
type CreationLineage = 'Arcadiano' | 'Humano' | 'Gaki' | 'Agente Tecnológico';
type LineageTheme = {key: LineageKey; title: string; tagline:string; lead: string; tag:string; imageNote: string; traits: {title:string; icon:LucideIcon}[]};

const THEMES: LineageTheme[] = [
 {key:'arcadianos',title:'Arcadianos',tagline:'NASCIDOS NO FLUXO',tag:'HERANÇA DO FLUXO',lead:'O Fluxo está neles desde o nascimento. Uma conexão natural, poderosa e tão bela quanto perigosa.',imageNote:'Dois exemplos de Arcadianos',traits:[{title:'Nascidos do Fluxo',icon:Sun},{title:'Armas de Ego',icon:Crown},{title:'Afinidade espiritual',icon:Sparkles}]},
 {key:'humanos',title:'Humanos',tagline:'INFINITAS POSSIBILIDADES',tag:'O DESPERTAR',lead:'Sob o Véu, o Fluxo ainda vive. A imaginação transforma objetos cotidianos em caminhos de poder.',imageNote:'Dois exemplos de Humanos',traits:[{title:'Versatilidade',icon:Sword},{title:'Imaginação',icon:Headphones},{title:'Armas de Vínculo',icon:WandSparkles}]},
 {key:'gakis',title:'Gakis',tagline:'MARCADOS PELO KARMA',tag:'ENTRE A VIDA E O KARMA',lead:'A morte e a corrupção deixam marcas profundas. Alguns Gakis recuperam a razão — outros abraçam a fome.',imageNote:'Exemplo visual de um Dark, uma categoria de Gaki',traits:[{title:'Filhos do Karma',icon:Moon},{title:'Instinto',icon:Flame},{title:'Distorção',icon:Shield}]},
];
const CREATION: Record<LineageKey,CreationLineage> = {arcadianos:'Arcadiano',humanos:'Humano',gakis:'Gaki'};
const DETAIL_TABS: {value:DetailTab; label:string}[] = [{value:'historia',label:'História e origem'},{value:'habilidades',label:'Habilidades e legado'},{value:'estagios',label:'Estágios e passivas'}];

/** The art is deliberately separate from text and controls: all actions remain accessible in PC, browser and Android WebView. */
export function LineagesPage({ onCreate }: {onCreate?: (lineage: CreationLineage) => void}) {
 const [selected,setSelected] = useState<LineageKey>('arcadianos');
 const [detail,setDetail] = useState<DetailTab>('historia');
 const detailsRef = useRef<HTMLDivElement>(null);
 const lineage = LINEAGES.find(l=>l.key===selected)!;
 function showDetails(key:LineageKey,tab:DetailTab) {
   setSelected(key);
   setDetail(tab);
   // The new content is inside the same screen, not a route reload.
   if(typeof window !== 'undefined') window.requestAnimationFrame(()=>detailsRef.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));
 }
 return <section className="hl-page" aria-label="Linhagens de Arcádia">
   <div className="hl-sky" aria-hidden="true"><span className="hl-sun"/><span className="hl-orbit hl-orbit-one"/><span className="hl-orbit hl-orbit-two"/></div>
   <header className="hl-heading">
     <div className="hl-kicker"><Sparkles size={13} aria-hidden="true"/> HERDEIROS · O DESPERTAR <Sparkles size={13} aria-hidden="true"/></div>
     <h1>LINHAGENS</h1>
     <p>Escolha sua origem e descubra seu caminho.</p>
     <div className="hl-divider" aria-hidden="true">✦</div>
   </header>

   <div className="hl-mobile-pick" role="group" aria-label="Escolher linhagem">
    {THEMES.map(t=><button key={t.key} type="button" className={`hl-mobile-choice hl-tone-${t.key} ${selected===t.key?'is-active':''}`} aria-pressed={selected===t.key} onClick={()=>setSelected(t.key)}>{t.title}</button>)}
   </div>
   <div className="hl-grid">
   {THEMES.map(t=><article key={t.key} className={`hl-card hl-tone-${t.key} ${selected===t.key?'hl-selected':''}`} data-selected={selected===t.key} aria-label={`Linhagem ${t.title}`}>
      <div className="hl-card-inner">
       <button className="hl-art-trigger" type="button" aria-label={`Selecionar ${t.title}`} aria-pressed={selected===t.key} onClick={()=>setSelected(t.key)}>
        <div className="hl-art" aria-hidden="true">
         <span className="hl-art-halo"/>
         {t.key==='arcadianos'&&<><img src="/linhagens/arcadiana.webp" className="hl-person hl-arcadiana" alt="" loading="lazy" decoding="async"/><img src="/linhagens/arcadiano.webp" className="hl-person hl-arcadiano" alt="" loading="lazy" decoding="async"/></>}
         {t.key==='humanos'&&<><img src="/linhagens/humano-cartas.webp" className="hl-person hl-humano-cartas" alt="" loading="lazy" decoding="async"/><img src="/linhagens/humano-urbano.webp" className="hl-person hl-humano-urbano" alt="" loading="lazy" decoding="async"/></>}
         {t.key==='gakis'&&<img src="/linhagens/gaki-dark.webp" className="hl-person hl-gaki" alt="" loading="lazy" decoding="async"/>}
         <span className="hl-art-bottom"/>
        </div>
        <span className="hl-character-caption">{t.imageNote}</span>
       </button>
       <div className="hl-content">
        <span className="hl-lineage-icon" aria-hidden="true">{t.key==='arcadianos'?<Sun/>:t.key==='humanos'?<WandSparkles/>:<Moon/>}</span>
        <div className="hl-smalltag">{t.tag}</div>
        <h2>{t.title}</h2>
        <div className="hl-tagline">{t.tagline}</div>
        <p className="hl-lead">{t.lead}</p>
        <div className="hl-traits">{t.traits.map(({title,icon:Icon})=><div className="hl-trait" key={title}><Icon size={21} strokeWidth={1.6} aria-hidden="true"/><span>{title}</span></div>)}</div>
        <div className="hl-card-actions">
          <button type="button" className="hl-action hl-action-outline" onClick={()=>showDetails(t.key,'historia')}><BookOpen size={15} aria-hidden="true"/> História</button>
          <button type="button" className="hl-action hl-action-outline" onClick={()=>showDetails(t.key,'habilidades')}><Sparkles size={15} aria-hidden="true"/> Habilidades</button>
        </div>
        {t.key==='humanos' ? <div className="hl-human-create-actions">
          <button type="button" className="hl-action hl-action-primary" onClick={()=>onCreate?.('Humano')} disabled={!onCreate}>Criar Humano <ArrowRight size={17} aria-hidden="true"/></button>
          <button type="button" className="hl-action hl-action-tech" onClick={()=>onCreate?.('Agente Tecnológico')} disabled={!onCreate}><Cpu size={16} aria-hidden="true"/> Criar Agente Tecnológico</button>
        </div> : <button type="button" className="hl-action hl-action-primary" onClick={()=>onCreate?.(CREATION[t.key])} disabled={!onCreate}>Criar personagem <ArrowRight size={17} aria-hidden="true"/></button>}
       </div>
      </div>
     </article>)}
   </div>

   <div className={`hl-details hl-tone-${selected}`} ref={detailsRef} id="linhagem-detalhes">
     <div className="hl-details-head">
       <div><span className="hl-smalltag">CÓDICE · {lineage.epithet.toUpperCase()}</span><h2>{lineage.name}</h2><p>{lineage.intro}</p></div>
       <button className="hl-action hl-action-primary hl-details-create" onClick={()=>onCreate?.(CREATION[selected])} disabled={!onCreate}>Criar {selected==='gakis'?'Gaki':selected==='humanos'?'Humano':'Arcadiano'} <ArrowRight size={15}/></button>
     </div>
     <div role="tablist" className="hl-details-tabs" aria-label="Informações da linhagem">
       {DETAIL_TABS.map(x=><button key={x.value} role="tab" id={`hl-tab-${x.value}`} aria-controls="hl-detail-panel" aria-selected={detail===x.value} type="button" className={detail===x.value?'is-active':''} onClick={()=>setDetail(x.value)}>{x.label}</button>)}
     </div>
     <div className="hl-detail-panel" role="tabpanel" id="hl-detail-panel" aria-labelledby={`hl-tab-${detail}`}>
      {detail==='historia'&&<div className="hl-story-grid">{lineage.blocks.map((block,i)=><section key={block.title} className="hl-info-card"><span className="hl-info-number">{String(i+1).padStart(2,'0')}</span><h3>{block.title}</h3>{block.text.map((p,j)=><p key={j}>{p}</p>)}</section>)}</div>}
      {detail==='habilidades'&&<div className="hl-story-grid">
         {lineage.stages.map((s,i)=><section key={s.name} className="hl-info-card"><span className="hl-info-number">ESTÁGIO {i+1}</span><h3>{s.name}</h3><p>{s.text}</p>{s.passive&&<p className="hl-passive"><strong>Passiva:</strong> {s.passive}</p>}</section>)}
         <section className="hl-info-card hl-extra"><span className="hl-info-number">CONSULTA</span><h3>Habilidades e regras</h3><p>As habilidades, o GS, as armas e as passivas continuam disponíveis para uso e edição na ficha jogável. Aqui você consulta sua origem sem alterar as regras.</p></section>
       </div>}
      {detail==='estagios'&&<div className="hl-stages">{lineage.stages.map((s,i)=><section key={s.name} className="hl-stage"><span className="hl-stage-num">{String(i+1).padStart(2,'0')}</span><div><span className="hl-smalltag">{s.subtitle}</span><h3>{s.name}</h3><p>{s.text}</p>{s.passive&&<p className="hl-passive"><strong>Passiva:</strong> {s.passive}</p>}</div></section>)}</div>}
     </div>
     {selected==='humanos'&&<div className="hl-tech-note"><Cpu size={22} aria-hidden="true"/><div><strong>Uma possibilidade humana: Agente Tecnológico</strong><p>Humano que usa TECNOLOGIA e PN. Pode existir fora do Consórcio, com Arma de Núcleo, Olho Tecnológico e evolução própria.</p></div><button type="button" className="hl-action hl-action-outline" disabled={!onCreate} onClick={()=>onCreate?.('Agente Tecnológico')}>Criar Agente <ArrowRight size={15}/></button></div>}
   </div>
   <p className="hl-footnote">As ilustrações são exemplos de personagens, não modelos obrigatórios. Sua linhagem define a origem, não sua aparência.</p>
 </section>;
}
