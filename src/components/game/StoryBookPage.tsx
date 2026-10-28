import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, Compass, Feather, Home, List, ScrollText } from 'lucide-react';
import './storybook-page.css';

type Passage = { heading: string; paragraphs: string[] };
type Chapter = { id: string; book: string; title: string; subtitle: string; source: string; left: Passage; right: Passage };

/** História do mundo em linguagem editorial. Base: Códice Supremo, Parte I, pp. 7–20.
 * Os acontecimentos e nomes vêm do livro; aqui não há tabelas nem regras de combate.
 */
const CHAPTERS: Chapter[] = [
  {
    id: 'principio', book: 'I · O princípio', title: 'Antes de existir um nome', subtitle: 'O nascimento do Fluxo e do Karma', source: 'Códice Supremo · p. 7',
    left: {heading: 'Quando o nada não tinha nome', paragraphs: [
      'Antes de haver um mundo — antes mesmo de o vazio possuir um nome — surgiu o Fluxo. Foi ele que deu sentido à existência e tornou possível o nascimento da vida. A realidade começou a tomar forma sob essa primeira força.',
      'O Fluxo nunca esteve sozinho. Com ele veio o Karma: uma energia igual e oposta, necessária ao equilíbrio de tudo o que viria a existir. Não eram duas invenções de povos rivais. As duas forças nasceram com a própria criação.'
    ]},
    right: {heading: 'Uma terra antes da divisão', paragraphs: [
      'Depois que o mundo foi moldado e os seres despertaram, surgiram humanos e arcadianos. Os dois povos partilhavam uma grande terra unificada, cujo nome foi perdido ao longo das eras.',
      'Durante milhares de anos, viveram como iguais. Essa convivência antiga pertence a um tempo anterior à cisão do mundo, ao Véu da Ignorância e às disputas que ainda definem o destino de Arcádia.'
    ]}
  },
  {
    id: 'primeiro-gaki', book: 'I · O princípio', title: 'A primeira corrupção', subtitle: 'A Queda e o primeiro Gaki', source: 'Códice Supremo · p. 7',
    left: {heading: 'A cobiça alimenta o Karma', paragraphs: [
      'A paz não foi rompida por uma força que viesse de fora da criação. O Karma cresceu alimentado pela cobiça de humanos e arcadianos. Dessa acumulação nasceu o primeiro Gaki, marcado pela inveja, pela malícia e pelo pior que havia nos dois povos.',
      'O primeiro corrompido matava, contaminava o que tocava e se alimentava de Fluxo. Sua presença não ficou restrita aos seres vivos: plantas e tudo aquilo que possuía energia podiam ser atingidos por sua fome.'
    ]},
    right: {heading: 'A fome ganha muitas formas', paragraphs: [
      'Outros Gakis nasceram dele. Alguns eram bestiais e atacavam por instinto. Outros recuperavam fragmentos de pensamento e fala. Havia também os que compreendiam estratégias, preparavam ciladas e capturavam suas presas com intenção.',
      'Os mais antigos, chamados Velhos, possuíam consciência profunda e um poder esmagador. O mundo descobria que a corrupção não significava apenas perder a razão: às vezes ela podia criar uma inteligência terrivelmente paciente.'
    ]}
  },
  {
    id: 'guerra', book: 'I · O princípio', title: 'A Grande Guerra', subtitle: 'Alianças, traição e coexistência', source: 'Códice Supremo · p. 7',
    left: {heading: 'O mundo contra a horda', paragraphs: [
      'Diante da expansão dos Gakis, a maior parte dos humanos e dos arcadianos se uniu. A guerra foi travada para impedir que a massa de Karma e destruição consumisse o mundo inteiro.',
      'A aliança, porém, não permaneceu intacta. Membros dos dois povos escolheram o outro lado. Desejavam um poder maior do que aquele com que haviam nascido e se juntaram aos Gakis.'
    ]},
    right: {heading: 'A escolha dos antigos', paragraphs: [
      'A traição não foi a única surpresa da guerra. Alguns Gakis antigos se colocaram ao lado dos arcadianos. Eles enxergavam a possibilidade de coexistência entre seres que o conflito havia transformado em inimigos.',
      'Essa escolha alterou o significado da guerra: origem, linhagem e corrupção não determinavam, por si sós, todas as alianças. O destino do mundo continuava ligado às decisões de quem vivia nele.'
    ]}
  },
  {
    id: 'espelho', book: 'I · O princípio', title: 'A divisão da realidade', subtitle: 'Arcádia e o Mundo Espelho', source: 'Códice Supremo · p. 8',
    left: {heading: 'A última Nomenclatura', paragraphs: [
      'Quando a guerra chegou a um ponto de desespero, os aliados reuniram suas vozes e entoaram uma grande Nomenclatura. Não se tratava apenas de uma técnica de batalha, mas de uma estrofe capaz de dividir a própria realidade.',
      'O resultado foi um mundo espelho: duas realidades separadas, nascidas do mesmo passado. Arcádia seria o lugar da guerra final.'
    ]},
    right: {heading: 'O Véu sobre a humanidade', paragraphs: [
      'O outro mundo continuaria como o mundo humano. Nele, os vestígios do Fluxo seriam apagados da percepção comum, deixando a humanidade sem saber da energia que havia participado de sua origem.',
      'Os responsáveis pela divisão acreditavam que isso seria suficiente para mantê-los separados. O próprio Códice deixa a advertência: pelo menos, foi isso que eles pensaram.'
    ]}
  },
  {
    id: 'arcadia-hoje', book: 'II · As terras', title: 'Arcádia sob a Cúpula de Som', subtitle: 'O continente depois do colapso', source: 'Códice Supremo · p. 8',
    left: {heading: 'O mundo que restou', paragraphs: [
      'O mundo antigo, sustentado por leis lógicas e tecnologia cega, desabou sob o peso da própria arrogância. O que restou foi Arcádia: um continente pulsante em que o Fluxo atravessa a matéria e participa das leis da realidade.',
      'Arcádia é cercada e protegida por uma colossal Cúpula de Som. Dentro dela, o silêncio não é ausência; tornou-se algo precioso e disputado.'
    ]},
    right: {heading: 'Viver onde a realidade escuta', paragraphs: [
      'Nesse continente, o Fluxo corre como sangue nas veias do mundo. As cidades, as ruínas e a natureza carregam consequências do passado que ainda podem ser sentidas.',
      'A Cúpula, o silêncio e a proximidade das energias primordiais tornam Arcádia diferente do Mundo Espelho. Quem nasce ou desperta ali vive sob forças que a humanidade comum foi ensinada a não perceber.'
    ]}
  },
  {
    id: 'caixa', book: 'II · As terras', title: 'A Caixa', subtitle: 'A metrópole do Consórcio', source: 'Códice Supremo · p. 8',
    left: {heading: 'Metal, néon e vapor', paragraphs: [
      'A Caixa é uma metrópole opressiva. Seu horizonte se ergue entre metal, luz de néon e vapores químicos. Sob domínio do Consórcio, a cidade mistura tecnologia avançada com a energia primordial de uma maneira deliberadamente controlada.',
      'O Fluxo corre por cabos de fibra óptica e motores a vapor. Em vez de ser venerado como uma força viva, é medido, classificado e colocado a serviço da ordem estabelecida.'
    ]},
    right: {heading: 'A arquitetura da obediência', paragraphs: [
      'Ruas retilíneas, torres de monitoramento, refinarias, corredores de manutenção, plataformas suspensas e centros de pesquisa compõem uma cidade desenhada para vigiar e disciplinar.',
      'Cada estrutura da Caixa reforça a mesma convicção: a estabilidade dependeria da obediência. A espiritualidade é negada em favor do controle catalogado, mesmo quando a própria cidade depende do Fluxo para continuar funcionando.'
    ]}
  },
  {
    id: 'floresta', book: 'II · As terras', title: 'A Grande Floresta', subtitle: 'Onde a natureza possui memória', source: 'Códice Supremo · p. 8',
    left: {heading: 'Árvores que respiram Fluxo', paragraphs: [
      'Na Grande Floresta, as árvores respiram o Fluxo e o tempo não segue sempre uma linha reconhecível. Raízes colossais sustentam um ecossistema indomável, onde a natureza parece observar aqueles que passam.',
      'É o santuário dos Berços, grupos que veneram o Fluxo como uma divindade viva e procuram viver em comunhão com ele.'
    ]},
    right: {heading: 'O passado entre as raízes', paragraphs: [
      'Troncos antigos guardam marcas de batalhas, rituais e nomes perdidos. Em certas partes da floresta, a umidade muda sem explicação, folhas parecem responder perguntas e o próprio chão se comporta como algo desperto.',
      'Ali, a natureza reage aos sentimentos dos Herdeiros. Cada passo atravessa um lugar onde o ambiente não é apenas cenário: é consciência e lembrança.'
    ]}
  },
  {
    id: 'deserto', book: 'II · As terras', title: 'O Grande Deserto', subtitle: 'As areias que revelam o Véu', source: 'Códice Supremo · p. 9',
    left: {heading: 'Uma vastidão prateada', paragraphs: [
      'O Grande Deserto se estende em dunas de areia prateada entre ruínas do Velho Mundo. Seu sol ameaça mais que a pele: a exposição prolongada também desgasta o Véu da Ignorância.',
      'Quem caminha tempo demais por suas terras pode acabar vendo a realidade sem a proteção do Véu, experiência capaz de levar ao despertar — ou à loucura.'
    ]},
    right: {heading: 'As vozes sob a areia', paragraphs: [
      'Pilares partidos, máquinas enterradas e torres consumidas pela erosão são vestígios de civilizações que tentaram controlar aquilo que não compreendiam.',
      'O Códice registra a crença de que o deserto não guarda apenas restos físicos. Entre as ruínas haveria ecos de vozes que ainda desejam receber um nome.'
    ]}
  },
  {
    id: 'faccoes', book: 'III · As forças', title: 'O Consórcio e os Berços', subtitle: 'Controle ou comunhão', source: 'Códice Supremo · p. 9',
    left: {heading: 'O medo de perder o controle', paragraphs: [
      'O Consórcio reúne políticos, cientistas e engenheiros que temem o caos do Fluxo. Sua resposta é contê-lo e preservar o Véu sobre a humanidade comum, defendendo que essa contenção mantém a estabilidade social.',
      'Na Caixa, essa visão se materializa em instituições de vigilância, pesquisa e tecnologia. Medir a energia é também exercer autoridade sobre quem pode utilizá-la.'
    ]},
    right: {heading: 'A defesa das Fontes', paragraphs: [
      'Os Berços são formados por sábios e guerreiros que acreditam na comunhão total com a energia primordial. Eles protegem as Fontes e ensinam que o Fluxo precisa seguir seu curso livremente.',
      'Para os Berços, a estagnação conduz à corrupção. Para o Consórcio, a liberdade absoluta ameaça a ordem. Entre previsibilidade e transcendência, os Herdeiros acabam se tornando pontes vivas entre esses dois caminhos.'
    ]}
  },
  {
    id: 'humanos', book: 'IV · Os povos', title: 'Humanos: os Libertados', subtitle: 'Os que nascem sob o Véu', source: 'Códice Supremo · pp. 9–10',
    left: {heading: 'O dom que permanece adormecido', paragraphs: [
      'Humanos nascem sob o Véu da Ignorância. Sua ligação com o Fluxo é latente, mas está presente em sua própria constituição. Eles são feitos da energia primordial, embora cresçam sem saber disso.',
      'Ao despertar, a imaginação humana pode moldar essa força em formas pessoais. A Arma de Vínculo expressa o modo como cada indivíduo aprende a interagir com algo que o mundo comum ocultava.'
    ]},
    right: {heading: 'O Ritual da Navalha e as Crianças-Farol', paragraphs: [
      'O Códice descreve o Ritual da Navalha, uma prática brutal em que crianças, após treinamento marcial, são lançadas contra Gakis Irracionais. No limiar da morte, o instinto pode rasgar o Véu e libertar o Fluxo. Quem falha corre o risco de morrer ou se tornar Gaki.',
      'Há também as Crianças-Farol: humanos que nascem com excesso de Fluxo e podem apresentar dons extraordinários. Seu brilho as torna perceptíveis a predadores espirituais e ao Consórcio, que as utiliza em experimentos cruéis.'
    ]}
  },
  {
    id: 'agentes', book: 'IV · Os povos', title: 'Os Agentes Tecnológicos', subtitle: 'Humanos que operam o próprio Núcleo', source: 'Códice Supremo · pp. 10–11',
    left: {heading: 'O despertar induzido', paragraphs: [
      'Entre os caminhos humanos descritos no Códice existe o do Agente Tecnológico. Em vez de atravessar o Ritual da Navalha, o Agente passa por uma intervenção: um Núcleo é implantado em seu corpo, conduzindo o Fluxo por meios artificiais.',
      'Sua relação com a energia difere da de quem a molda livremente. O Agente continua humano, nascido sob o Véu, mas sua prática depende de leitura, calibragem e comando da tecnologia.'
    ]},
    right: {heading: 'O legado da tecnologia', paragraphs: [
      'A Arma de Núcleo é fabricada, não evocada pela imaginação do portador. A pessoa e a máquina precisam aprender a funcionar em conjunto, e o despertar forçado pode ser acompanhado por uma Pane inicial dolorosa.',
      'Os Agentes associados ao Consórcio expressam a tentativa de transformar uma energia primordial em algo previsível. Essa origem institucional não obriga que cada personagem tecnológico continue leal ao Consórcio; suas escolhas pertencem à própria história.'
    ]}
  },
  {
    id: 'arcadianos', book: 'IV · Os povos', title: 'Arcadianos: os Puros', subtitle: 'Nascidos com a visão do Fluxo', source: 'Códice Supremo · p. 16',
    left: {heading: 'Aqueles que já enxergam', paragraphs: [
      'Diferentemente dos humanos, os Arcadianos nascem com a visão da energia primordial. Para eles, o Fluxo é tão natural quanto respirar. A familiaridade, porém, também oferece o perigo da confiança excessiva e da corrupção do Ego.',
      'A manifestação de sua vontade pode assumir a forma de uma Arma de Ego. Essa arma não é simples ferramenta: ela guarda uma relação crescente com a identidade e a consciência de quem a criou.'
    ]},
    right: {heading: 'Completos e Fragmentos', paragraphs: [
      'O Códice distingue os Completos, capazes de controlar um aspecto elemental inteiro, e os Fragmentos, especializados em partes mais restritas desse aspecto. Um Completo pode acompanhar todo o ciclo da água; um Fragmento pode dominar apenas o gelo com intensidade maior.',
      'À medida que sua ligação amadurece, a Arma de Ego pode revelar personalidade e objetivos próprios. No ápice dessa integração, a chamada Arma Verdadeira alcança existência física autônoma.'
    ]}
  },
  {
    id: 'gakis', book: 'IV · Os povos', title: 'Gakis: os Corrompidos', subtitle: 'Fome, memória e persistência', source: 'Códice Supremo · p. 17',
    left: {heading: 'O que a corrupção deixa para trás', paragraphs: [
      'Quando o Fluxo é perdido ou consumido pelo Karma, o resultado pode ser uma forma de vida corrompida. Um Gaki não representa apenas morte: nele persistem fome, desejo e uma identidade quebrada.',
      'Os Irracionais são massas de fumaça negra movidas pelo instinto. Os Sencientes recuperam a fala e alguma lógica. Gakis Inteligentes conseguem raciocinar, criar estratégias e comandar outros de classes inferiores.'
    ]},
    right: {heading: 'Os Velhos, as dietas e os Darks', paragraphs: [
      'Os Gakis Velhos são os mais antigos e perigosos. Podem manipular a aparência e a assinatura espiritual, recuperar memórias de vidas passadas e se infiltrar entre pessoas comuns.',
      'Há Predadores, que consomem carne e energia vital, e raros Herbívoros ou Equilibrados, que buscam outra forma de existir e podem proteger territórios. O Códice também menciona os Darks, seres que transcendem classes comuns e usam a distorção para corromper realidade e despertos deliberadamente.'
    ]}
  },
  {
    id: 'minerio', book: 'V · Os segredos', title: 'O Minério de Fluxo', subtitle: 'Quando uma força se torna matéria', source: 'Códice Supremo · p. 19',
    left: {heading: 'A pedra dourada', paragraphs: [
      'Quando o Fluxo fica aprisionado em uma rocha ou em outro mineral, a matéria se transforma. É assim que nasce o Minério de Fluxo, reconhecido pelo aspecto dourado.',
      'As Pedras de Fluxo conservam a energia no estado em que ela ficou presa. Por isso, carregam uma memória material da força que as atravessou.'
    ]},
    right: {heading: 'A matéria que pode ser esculpida', paragraphs: [
      'O minério é um dos suportes utilizados pelos Escultores. Nessas pedras, assim como nas pessoas, podem ser gravadas palavras da força primordial.',
      'Sua existência aproxima a história das ruínas, dos lugares de poder e das disputas pelo uso da energia. Para uns, representa descoberta; para outros, uma oportunidade de controle.'
    ]}
  },
  {
    id: 'lingua', book: 'V · Os segredos', title: 'A Língua Mãe e os Escultores', subtitle: 'Palavras que dão razão às coisas', source: 'Códice Supremo · pp. 19–20',
    left: {heading: 'A primeira linguagem', paragraphs: [
      'Segundo o Códice, a primeira língua foi feita do próprio Fluxo. É a Língua Mãe do Fluxo: uma linguagem que dá razão à existência, porque as coisas existem a partir do que nela foi dito.',
      'Ler essa linguagem exige um preço. Aqueles que tentam compreendê-la podem perder a sanidade ou ver o corpo mudar contra a própria vontade. Para muitos, o contato não representa um dom, mas uma ferida.'
    ]},
    right: {heading: 'A arte e o sacrifício', paragraphs: [
      'Os Escultores são capazes de ler e usar a Língua Mãe, graças à força de vontade e, talvez, a uma capacidade inata de tradução. Trabalham no Minério de Fluxo e também em pessoas, mas não podem fazer isso sem custo.',
      'Cada obra cobra um sacrifício próprio: uma lembrança perdida, um sentido, anos de vida, o nome verdadeiro ou o vínculo com alguém que deixa de reconhecer o Escultor. O Consórcio mantém Escultores que gravam Conceitos nas chamadas Obras-Primas.'
    ]}
  },
  {
    id: 'portais', book: 'V · Os segredos', title: 'Os portais entre mundos', subtitle: 'Pedras, coordenadas e o risco do vazio', source: 'Códice Supremo · p. 20',
    left: {heading: 'Uma palavra gravada em pedra', paragraphs: [
      'Os Escultores também são responsáveis pelos portais. Ao esculpir a palavra adequada em uma pedra, podem criar uma passagem entre locais distantes ou entre Arcádia e o Mundo Espelho.',
      'Um portal não funciona pela vontade vaga de viajar. Quem atravessa precisa saber exatamente para onde vai, reunir Fluxo suficiente e conhecer as coordenadas corretas.'
    ]},
    right: {heading: 'O espaço entre dois destinos', paragraphs: [
      'O erro pode conduzir ao vácuo do mundo. O Códice não apresenta uma tabela única para essas travessias, porque o perigo pertence à história contada pelo Mestre e pelos Herdeiros.',
      'Dessa forma, uma pedra esquecida pode guardar mais que um caminho: também pode conservar o risco de desaparecer entre realidades que um dia já foram a mesma.'
    ]}
  },
  {
    id: 'herdeiros', book: 'V · Os segredos', title: 'O legado dos Herdeiros', subtitle: 'Linhagem, memória e destino', source: 'Códice Supremo · p. 18',
    left: {heading: 'A origem não conta tudo', paragraphs: [
      'Em Herdeiros, linhagem e história pessoal são inseparáveis. Ser Humano, Arcadiano ou Gaki diz algo sobre a relação com o Fluxo e o Karma, mas não determina inteiramente quem alguém se tornará.',
      'Importam também as perdas, os laços, os lugares atravessados e as decisões tomadas antes do começo de uma aventura. São essas lembranças que dão sentido ao poder de um personagem.'
    ]},
    right: {heading: 'A história continua', paragraphs: [
      'O Códice apresenta as histórias de cada Herdeiro como parte da construção de sua identidade e de suas habilidades. Não existe apenas uma trajetória possível para quem desperta.',
      'Depois da Grande Guerra e da divisão dos mundos, Arcádia ainda existe entre medo e liberdade. A próxima página pertence aos personagens que atravessarem essa fronteira.'
    ]}
  }
];

const BOOKS = Array.from(new Set(CHAPTERS.map(chapter => chapter.book)));

/** Destaque contextual automático, apenas dentro da narrativa (não muda nomes próprios). */
function Ink({ children }: { children: string }) {
  return <>{children.split(/(Fluxo|Karma)/gi).map((part, index) => {
    if (/^fluxo$/i.test(part)) return <strong className="hs-ink-flux" key={index}>{part}</strong>;
    if (/^karma$/i.test(part)) return <strong className="hs-ink-karma" key={index}>{part}</strong>;
    return <span key={index}>{part}</span>;
  })}</>;
}

function Leaf({ passage, chapter, side, index }: { passage: Passage; chapter: Chapter; side: 'left' | 'right'; index: number }) {
  return <div className={`hs-leaf hs-leaf-${side}`}>
    <div className="hs-leaf-heading"><span>HERDEIROS · O DESPERTAR</span><span>{chapter.book}</span></div>
    <div className="hs-leaf-inner">
      <span className="hs-ornament" aria-hidden="true">✧ ─── ✦ ─── ✧</span>
      <h3>{passage.heading}</h3>
      {passage.paragraphs.map((text, paragraph) => <p key={paragraph}><Ink>{text}</Ink></p>)}
    </div>
    <div className="hs-leaf-foot"><span>{chapter.source}</span><span>{index * 2 + (side === 'left' ? 1 : 2)}</span></div>
  </div>;
}

export function StoryBookPage({ onHome }: { onHome: () => void }) {
  const [active, setActive] = useState(0);
  const [indexOpen, setIndexOpen] = useState(false);
  const [continuous, setContinuous] = useState(false);
  const top = useRef<HTMLElement>(null);
  const chapter = CHAPTERS[active];
  const choose = (index: number) => {
    setActive(Math.min(Math.max(index, 0), CHAPTERS.length - 1));
    setIndexOpen(false);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches) {
      requestAnimationFrame(() => top.current?.scrollIntoView({block: 'start', behavior: 'smooth'}));
    }
  };
  return <section className="hs-story-page" aria-label="Livro da História de Arcádia" ref={top}>
    <header className="hs-story-head">
      <div className="hs-head-crest" aria-hidden="true"><Compass size={31}/></div>
      <div><span className="hs-eyebrow">HERDEIROS · O DESPERTAR · CRÔNICAS DE ARCÁDIA</span><h1>O Livro da <em>História</em></h1><p>Das primeiras forças à divisão dos mundos. Uma leitura das origens, lugares e povos de Arcádia, reunida a partir do Códice Supremo.</p></div>
      <button type="button" className="hs-back-home" onClick={onHome}><Home size={17}/> Voltar ao portal</button>
    </header>
    <div className="hs-story-toolbar">
      <button type="button" className="hs-index-toggle" aria-expanded={indexOpen} onClick={() => setIndexOpen(v => !v)}><List size={18}/> Índice de capítulos</button>
      <div className="hs-view-switch" role="group" aria-label="Modo de leitura"><button type="button" className={!continuous ? 'active' : ''} aria-pressed={!continuous} onClick={() => setContinuous(false)}><BookOpen size={16}/> Livro aberto</button><button type="button" className={continuous ? 'active' : ''} aria-pressed={continuous} onClick={() => setContinuous(true)}><ScrollText size={16}/> Leitura contínua</button></div>
    </div>
    <div className="hs-story-layout">
      <aside className={`hs-story-index ${indexOpen ? 'is-open' : ''}`} aria-label="Capítulos do livro">
        <div className="hs-index-intro"><Feather size={18}/><strong>Índice das crônicas</strong><p>Uma viagem pelas eras e segredos do mundo.</p></div>
        {BOOKS.map(book => <div className="hs-index-book" key={book}><span>{book}</span>{CHAPTERS.map((item, index) => item.book === book ? <button type="button" key={item.id} className={active === index && !continuous ? 'selected' : ''} onClick={() => { setContinuous(false); choose(index); }} aria-current={active === index && !continuous ? 'page' : undefined}><span>{String(index + 1).padStart(2, '0')}</span>{item.title}</button> : null)}</div>)}
      </aside>
      <div className="hs-reading-area">
        {continuous ? <div className="hs-continuous-reader">
          {CHAPTERS.map((item, index) => <article className="hs-continuous-chapter" key={item.id} id={`historia-${item.id}`}>
            <span className="hs-eyebrow">CRÔNICA {String(index + 1).padStart(2, '0')} · {item.book}</span>
            <h2>{item.title}</h2><p className="hs-chapter-deck">{item.subtitle}</p>
            {[item.left, item.right].map((passage, pidx) => <div key={pidx}><h3>{passage.heading}</h3>{passage.paragraphs.map((text, t) => <p key={t}><Ink>{text}</Ink></p>)}</div>)}
            <small>{item.source}</small>
          </article>)}
        </div> : <>
          <div className="hs-chapter-marker"><span>CAPÍTULO {String(active + 1).padStart(2, '0')} · {chapter.book}</span><span>{active + 1} / {CHAPTERS.length}</span></div>
          <div className="hs-chapter-title"><span>✦</span><h2>{chapter.title}</h2><p>{chapter.subtitle}</p></div>
          <article className="hs-open-book" aria-label={chapter.title}>
            <Leaf passage={chapter.left} chapter={chapter} side="left" index={active}/>
            <Leaf passage={chapter.right} chapter={chapter} side="right" index={active}/>
          </article>
          <nav className="hs-page-turn" aria-label="Virar páginas"><button type="button" onClick={() => choose(active - 1)} disabled={active === 0}><ChevronLeft size={20}/> Capítulo anterior</button><span><BookOpen size={18}/> {String(active + 1).padStart(2, '0')} de {CHAPTERS.length}</span><button type="button" onClick={() => choose(active + 1)} disabled={active === CHAPTERS.length - 1}>Próximo capítulo <ChevronRight size={20}/></button></nav>
        </>}
        <div className="hs-story-colophon"><ArrowLeft size={16}/><span>História de Arcádia, com base na Parte I do Códice Supremo (páginas 7 a 20). Os capítulos são uma adaptação editorial fiel aos acontecimentos do livro, não uma cópia integral nem uma seção de regras.</span><ArrowRight size={16}/></div>
      </div>
    </div>
  </section>;
}
