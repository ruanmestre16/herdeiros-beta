import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, Compass, Feather, Home, List, ScrollText, Sword, Cpu, Flame, Leaf as LeafIcon, Gem, Moon, Orbit, Building2, Eye, Sun, Scissors, Headphones, Map, Sparkles, Crown, Shield } from 'lucide-react';
import './storybook-page.css';

type Passage = { heading: string; paragraphs: string[] };
type Chapter = { id: string; book: string; title: string; subtitle: string; source: string; left: Passage; right: Passage };

/** História do mundo em linguagem editorial. Base: livro original, Parte I, pp. 7–20.
 * Os acontecimentos e nomes vêm do livro; aqui não há tabelas nem regras de combate.
 */
const CHAPTERS: Chapter[] = [
  {
    id: 'principio', book: 'I · O princípio', title: 'Antes de existir um nome', subtitle: 'O nascimento do Fluxo e do Karma', source: 'Livro original · página 7',
    left: {heading: 'Quando o nada não tinha nome', paragraphs: [
      'Antes de haver um mundo — antes mesmo de o vazio possuir um nome — surgiu o Fluxo. Foi ele que deu sentido à existência e tornou possível o nascimento da vida. A realidade começou a tomar forma sob essa primeira força.',
      'O Fluxo nunca esteve sozinho. Com ele veio o Karma: uma energia igual e oposta, necessária ao equilíbrio de tudo o que viria a existir. Não eram duas invenções de povos rivais. As duas forças nasceram com a própria criação.',
      "O livro situa o início de todas as coisas nesse encontro: primeiro a força que dá sentido à existência, depois sua contraparte necessária. Antes de cidades, linhagens ou fronteiras, a história já carregava a possibilidade de equilíbrio e de conflito."
    ]},
    right: {heading: 'Uma terra antes da divisão', paragraphs: [
      'Depois que o mundo foi moldado e os seres despertaram, surgiram humanos e arcadianos. Os dois povos partilhavam uma grande terra unificada, cujo nome foi perdido ao longo das eras.',
      'Durante milhares de anos, viveram como iguais. Essa convivência antiga pertence a um tempo anterior à cisão do mundo, ao Véu da Ignorância e às disputas que ainda definem o destino de Arcádia.',
      "O nome daquela terra ancestral se perdeu. O que se conhece é o fato de humanos e arcadianos terem habitado o mesmo lugar por milênios, sem a separação que mais tarde dividiria a realidade."
    ]}
  },
  {
    id: 'primeiro-gaki', book: 'I · O princípio', title: 'A primeira corrupção', subtitle: 'A Queda e o primeiro Gaki', source: 'Livro original · página 7',
    left: {heading: 'A cobiça alimenta o Karma', paragraphs: [
      'A paz não foi rompida por uma força que viesse de fora da criação. O Karma cresceu alimentado pela cobiça de humanos e arcadianos. Dessa acumulação nasceu o primeiro Gaki, marcado pela inveja, pela malícia e pelo pior que havia nos dois povos.',
      'O primeiro corrompido matava, contaminava o que tocava e se alimentava de Fluxo. Sua presença não ficou restrita aos seres vivos: plantas e tudo aquilo que possuía energia podiam ser atingidos por sua fome.',
      "O Gaki primordial não se limitava a ferir suas vítimas. Ele corrompia, matava e se alimentava do Fluxo; o alcance de sua presença se estendia aos seres vivos e até às plantas tocadas por sua fome."
    ]},
    right: {heading: 'A fome ganha muitas formas', paragraphs: [
      'Outros Gakis nasceram dele. Alguns eram bestiais e atacavam por instinto. Outros recuperavam fragmentos de pensamento e fala. Havia também os que compreendiam estratégias, preparavam ciladas e capturavam suas presas com intenção.',
      'Os mais antigos, chamados Velhos, possuíam consciência profunda e um poder esmagador. O mundo descobria que a corrupção não significava apenas perder a razão: às vezes ela podia criar uma inteligência terrivelmente paciente.',
      "Entre aqueles que descendiam do primeiro Gaki havia graus profundos de entendimento. A distância entre uma fera instintiva e um Velho, dotado de consciência e poder esmagador, transformou aquela ameaça em algo impossível de enfrentar sempre da mesma maneira."
    ]}
  },
  {
    id: 'guerra', book: 'I · O princípio', title: 'A Grande Guerra', subtitle: 'Alianças, traição e coexistência', source: 'Livro original · página 7',
    left: {heading: 'O mundo contra a horda', paragraphs: [
      'Diante da expansão dos Gakis, a maior parte dos humanos e dos arcadianos se uniu. A guerra foi travada para impedir que a massa de Karma e destruição consumisse o mundo inteiro.',
      'A aliança, porém, não permaneceu intacta. Membros dos dois povos escolheram o outro lado. Desejavam um poder maior do que aquele com que haviam nascido e se juntaram aos Gakis.',
      "A massa de Karma colocava a terra unificada em risco. Não se tratava de defender somente um povo: o destino de humanos e arcadianos estava ligado à sobrevivência do mundo que compartilhavam."
    ]},
    right: {heading: 'A escolha dos antigos', paragraphs: [
      'A traição não foi a única surpresa da guerra. Alguns Gakis antigos se colocaram ao lado dos arcadianos. Eles enxergavam a possibilidade de coexistência entre seres que o conflito havia transformado em inimigos.',
      'Essa escolha alterou o significado da guerra: origem, linhagem e corrupção não determinavam, por si sós, todas as alianças. O destino do mundo continuava ligado às decisões de quem vivia nele.',
      "Os antigos que escolheram lutar pelos arcadianos enxergaram a possibilidade de coexistência. A própria guerra, portanto, carregava também a prova de que nem todos os Gakis desejavam destruir o lugar onde haviam surgido."
    ]}
  },
  {
    id: 'espelho', book: 'I · O princípio', title: 'A divisão da realidade', subtitle: 'Arcádia e o Mundo Espelho', source: 'Livro original · página 8',
    left: {heading: 'A última Nomenclatura', paragraphs: [
      'Quando a guerra chegou a um ponto de desespero, os aliados reuniram suas vozes e entoaram uma grande Nomenclatura. Não se tratava apenas de uma técnica de batalha, mas de uma estrofe capaz de dividir a própria realidade.',
      'O resultado foi um mundo espelho: duas realidades separadas, nascidas do mesmo passado. Arcádia seria o lugar da guerra final.',
      "A Nomenclatura foi entoada em conjunto como último recurso. Seu alcance não se restringiu a afastar inimigos; ela separou o mundo que havia sido partilhado durante milênios, deixando a guerra final para Arcádia."
    ]},
    right: {heading: 'O Véu sobre a humanidade', paragraphs: [
      'O outro mundo continuaria como o mundo humano. Nele, os vestígios do Fluxo seriam apagados da percepção comum, deixando a humanidade sem saber da energia que havia participado de sua origem.',
      'Os responsáveis pela divisão acreditavam que isso seria suficiente para mantê-los separados. A narrativa deixa uma advertência: pelo menos, foi isso que eles pensaram.',
      "O mundo humano continuaria sem a lembrança perceptível do Fluxo. O plano de esquecer aquela energia parecia uma solução definitiva, mas o relato termina com uma dúvida: os que dividiram a realidade realmente conseguiram apagar todos os rastros?"
    ]}
  },
  {
    id: 'arcadia-hoje', book: 'II · As terras', title: 'Arcádia sob a Cúpula de Som', subtitle: 'O continente depois do colapso', source: 'Livro original · página 8',
    left: {heading: 'O mundo que restou', paragraphs: [
      'O mundo antigo, sustentado por leis lógicas e tecnologia cega, desabou sob o peso da própria arrogância. O que restou foi Arcádia: um continente pulsante em que o Fluxo atravessa a matéria e participa das leis da realidade.',
      'Arcádia é cercada e protegida por uma colossal Cúpula de Som. Dentro dela, o silêncio não é ausência; tornou-se algo precioso e disputado.',
      "A Cúpula de Som protege e delimita esse continente. O silêncio ganhou valor em um lugar onde a energia primordial, as ruínas da história e o peso do que foi perdido permanecem próximos uns dos outros."
    ]},
    right: {heading: 'Viver onde a realidade escuta', paragraphs: [
      'Nesse continente, o Fluxo corre como sangue nas veias do mundo. As cidades, as ruínas e a natureza carregam consequências do passado que ainda podem ser sentidas.',
      'A Cúpula, o silêncio e a proximidade das energias primordiais tornam Arcádia diferente do Mundo Espelho. Quem nasce ou desperta ali vive sob forças que a humanidade comum foi ensinada a não perceber.',
      "O passado também está inscrito na geografia: há uma metrópole que quer domesticar o Fluxo, uma floresta que o venera e um deserto onde o Véu se desgasta sob o sol. Cada território testemunha uma resposta diferente à mesma energia."
    ]}
  },
  {
    id: 'caixa', book: 'II · As terras', title: 'A Caixa', subtitle: 'A metrópole do Consórcio', source: 'Livro original · página 8',
    left: {heading: 'Metal, néon e vapor', paragraphs: [
      'A Caixa é uma metrópole opressiva. Seu horizonte se ergue entre metal, luz de néon e vapores químicos. Sob domínio do Consórcio, a cidade mistura tecnologia avançada com a energia primordial de uma maneira deliberadamente controlada.',
      'O Fluxo corre por cabos de fibra óptica e motores a vapor. Em vez de ser venerado como uma força viva, é medido, classificado e colocado a serviço da ordem estabelecida.',
      "A arquitetura repete os ideais de seus administradores: corredores de manutenção e centros de pesquisa dividem espaço com torres de monitoramento, refinarias e plataformas de transporte suspensas. Nada ali foi concebido para parecer espontâneo."
    ]},
    right: {heading: 'A arquitetura da obediência', paragraphs: [
      'Ruas retilíneas, torres de monitoramento, refinarias, corredores de manutenção, plataformas suspensas e centros de pesquisa compõem uma cidade desenhada para vigiar e disciplinar.',
      'Cada estrutura da Caixa reforça a mesma convicção: a estabilidade dependeria da obediência. A espiritualidade é negada em favor do controle catalogado, mesmo quando a própria cidade depende do Fluxo para continuar funcionando.',
      "Políticos, engenheiros e cientistas do Consórcio tratam o Fluxo como fenômeno que pode ser medido e contido. A cidade depende dessa energia, mesmo ao tentar afastar dela qualquer sentido de comunhão espiritual."
    ]}
  },
  {
    id: 'floresta', book: 'II · As terras', title: 'A Grande Floresta', subtitle: 'Onde a natureza possui memória', source: 'Livro original · página 8',
    left: {heading: 'Árvores que respiram Fluxo', paragraphs: [
      'Na Grande Floresta, as árvores respiram o Fluxo e o tempo não segue sempre uma linha reconhecível. Raízes colossais sustentam um ecossistema indomável, onde a natureza parece observar aqueles que passam.',
      'É o santuário dos Berços, grupos que veneram o Fluxo como uma divindade viva e procuram viver em comunhão com ele.',
      "Os troncos guardam registros de conflitos e rituais; nomes já perdidos pelas pessoas podem persistir nas marcas das árvores. Nas regiões mais antigas, até o tempo parece deixar de seguir uma sucessão simples de instantes."
    ]},
    right: {heading: 'O passado entre as raízes', paragraphs: [
      'Troncos antigos guardam marcas de batalhas, rituais e nomes perdidos. Em certas partes da floresta, a umidade muda sem explicação, folhas parecem responder perguntas e o próprio chão se comporta como algo desperto.',
      'Ali, a natureza reage aos sentimentos dos Herdeiros. Cada passo atravessa um lugar onde o ambiente não é apenas cenário: é consciência e lembrança.',
      "O Livro descreve folhas que sussurram respostas antes das perguntas, variações de umidade sem explicação e solos que cedem como se estivessem atentos. A Grande Floresta não é passiva diante dos sentimentos de quem a atravessa."
    ]}
  },
  {
    id: 'deserto', book: 'II · As terras', title: 'O Grande Deserto', subtitle: 'As areias que revelam o Véu', source: 'Livro original · página 9',
    left: {heading: 'Uma vastidão prateada', paragraphs: [
      'O Grande Deserto se estende em dunas de areia prateada entre ruínas do Velho Mundo. Seu sol ameaça mais que a pele: a exposição prolongada também desgasta o Véu da Ignorância.',
      'Quem caminha tempo demais por suas terras pode acabar vendo a realidade sem a proteção do Véu, experiência capaz de levar ao despertar — ou à loucura.',
      "A areia prateada preserva sinais de eras anteriores à ordem atual: pilares, máquinas e civilizações soterradas que desejaram dominar forças que não compreendiam."
    ]},
    right: {heading: 'As vozes sob a areia', paragraphs: [
      'Pilares partidos, máquinas enterradas e torres consumidas pela erosão são vestígios de civilizações que tentaram controlar aquilo que não compreendiam.',
      'Há relatos de que o deserto não guarda apenas restos físicos. Entre as ruínas haveria ecos de vozes que ainda desejam receber um nome.',
      "Entre os destroços, sobrevivem rumores sobre vozes que ainda procuram ser nomeadas. Atravessar esse lugar por tempo demais também significa arriscar a proteção que mantém os humanos afastados da percepção direta do Fluxo."
    ]}
  },
  {
    id: 'faccoes', book: 'III · As forças', title: 'O Consórcio e os Berços', subtitle: 'Controle ou comunhão', source: 'Livro original · página 9',
    left: {heading: 'O medo de perder o controle', paragraphs: [
      'O Consórcio reúne políticos, cientistas e engenheiros que temem o caos do Fluxo. Sua resposta é contê-lo e preservar o Véu sobre a humanidade comum, defendendo que essa contenção mantém a estabilidade social.',
      'Na Caixa, essa visão se materializa em instituições de vigilância, pesquisa e tecnologia. Medir a energia é também exercer autoridade sobre quem pode utilizá-la.',
      "O Consórcio defende manter o Véu sobre a humanidade comum. Para seus dirigentes, conter o imprevisto seria uma forma de impedir que o mundo voltasse a cair em caos."
    ]},
    right: {heading: 'A defesa das Fontes', paragraphs: [
      'Os Berços são formados por sábios e guerreiros que acreditam na comunhão total com a energia primordial. Eles protegem as Fontes e ensinam que o Fluxo precisa seguir seu curso livremente.',
      'Para os Berços, a estagnação conduz à corrupção. Para o Consórcio, a liberdade absoluta ameaça a ordem. Entre previsibilidade e transcendência, os Herdeiros acabam se tornando pontes vivas entre esses dois caminhos.',
      "Os Berços protegem as Fontes e ensinam a necessidade de permitir que a energia siga seu curso. Entre as duas posições, os Herdeiros caminham como pontes vivas, sem que o conflito entre controle e liberdade esteja resolvido."
    ]}
  },
  {
    id: 'humanos', book: 'IV · Os povos', title: 'Humanos: os Libertados', subtitle: 'Os que nascem sob o Véu', source: 'Livro original · páginas 9–10',
    left: {heading: 'O dom que permanece adormecido', paragraphs: [
      'Humanos nascem sob o Véu da Ignorância. Sua ligação com o Fluxo é latente, mas está presente em sua própria constituição. Eles são feitos da energia primordial, embora cresçam sem saber disso.',
      'Ao despertar, a imaginação humana pode moldar essa força em formas pessoais. A Arma de Vínculo expressa o modo como cada indivíduo aprende a interagir com algo que o mundo comum ocultava.',
      "O despertar é descrito como rompimento do Véu: não é a descoberta de uma energia que antes estivesse ausente do corpo humano, mas a libertação de algo que sempre fez parte dele.",
      "O Ritual da Navalha começa com treinamento marcial severo e chega, aos seis anos, ao confronto com Gakis Irracionais. O livro não o retrata como mera prova de coragem, e sim como um mecanismo de despertar pela quase-morte."
    ]},
    right: {heading: 'O Ritual da Navalha e as Crianças-Farol', paragraphs: [
      'O livro descreve o Ritual da Navalha, uma prática brutal em que crianças, após treinamento marcial, são lançadas contra Gakis Irracionais. No limiar da morte, o instinto pode rasgar o Véu e libertar o Fluxo. Quem falha corre o risco de morrer ou se tornar Gaki.',
      'Há também as Crianças-Farol: humanos que nascem com excesso de Fluxo e podem apresentar dons extraordinários. Seu brilho as torna perceptíveis a predadores espirituais e ao Consórcio, que as utiliza em experimentos cruéis.',
      "O brilho das Crianças-Farol pode alterar ambientes, chamar criaturas e até perturbar a maneira como adultos as percebem. Elas frequentemente se tornam alvo antes de terem condições de compreender ou dominar a própria força.",
      "As formas que a imaginação humana dá à Arma de Vínculo refletem sua história individual: ninguém precisa carregar um símbolo igual ao do outro para despertar."
    ]}
  },
  {
    id: 'agentes', book: 'IV · Os povos', title: 'Os Agentes Tecnológicos', subtitle: 'Humanos que operam o próprio Núcleo', source: 'Livro original · páginas 10–11',
    left: {heading: 'O despertar induzido', paragraphs: [
      'Entre os caminhos humanos descritos no livro existe o do Agente Tecnológico. Em vez de atravessar o Ritual da Navalha, o Agente passa por uma intervenção: um Núcleo é implantado em seu corpo, conduzindo o Fluxo por meios artificiais.',
      'Sua relação com a energia difere da de quem a molda livremente. O Agente continua humano, nascido sob o Véu, mas sua prática depende de leitura, calibragem e comando da tecnologia.',
      "No livro, a implantação do Núcleo representa uma forma de despertar imposta pela técnica. O Agente não recebe a visão natural de um Arcadiano; nasceu sob o mesmo Véu dos outros humanos.",
      "A primeira ligação entre Núcleo e corpo pode provocar a Pane inicial, a dor brutal que acompanha o despertar induzido. O procedimento não torna seu portador menos humano, mas muda sua relação com o Fluxo."
    ]},
    right: {heading: 'O legado da tecnologia', paragraphs: [
      'A Arma de Núcleo é fabricada, não evocada pela imaginação do portador. A pessoa e a máquina precisam aprender a funcionar em conjunto, e o despertar forçado pode ser acompanhado por uma Pane inicial dolorosa.',
      'Os Agentes associados ao Consórcio expressam a tentativa de transformar uma energia primordial em algo previsível. Essa origem institucional não obriga que cada personagem tecnológico continue leal ao Consórcio; suas escolhas pertencem à própria história.',
      "As armas tecnológicas podem ser lâminas, pistolas, lanças ou manoplas. Diferentemente das Armas de Vínculo e de Ego, são construídas e alimentadas pelo Núcleo do portador.",
      "O Consórcio classifica agentes inimigos em uma série de desenvolvimento conhecida como MK1, MK2 e MK3; a existência dessa estrutura reforça a obsessão institucional por medir cada passo do poder."
    ]}
  },
  {
    id: 'arcadianos', book: 'IV · Os povos', title: 'Arcadianos: os Puros', subtitle: 'Nascidos com a visão do Fluxo', source: 'Livro original · página 16',
    left: {heading: 'Aqueles que já enxergam', paragraphs: [
      'Diferentemente dos humanos, os Arcadianos nascem com a visão da energia primordial. Para eles, o Fluxo é tão natural quanto respirar. A familiaridade, porém, também oferece o perigo da confiança excessiva e da corrupção do Ego.',
      'A manifestação de sua vontade pode assumir a forma de uma Arma de Ego. Essa arma não é simples ferramenta: ela guarda uma relação crescente com a identidade e a consciência de quem a criou.',
      "A facilidade em ver o Fluxo não elimina o perigo: orgulho, descontrole ou desprezo pela disciplina podem afetar o Ego e a própria alma. A intimidade com a energia traz uma responsabilidade que os nascidos sob o Véu não conhecem desde o começo.",
      "Na progressão arcadiana, a relação com a arma deixa de ser puramente instrumental. Seu Ego pode manifestar desejos e valores próprios, criando tensões com a vontade de quem a empunha."
    ]},
    right: {heading: 'Completos e Fragmentos', paragraphs: [
      'Há uma distinção entre os Completos, capazes de controlar um aspecto elemental inteiro, e os Fragmentos, especializados em partes mais restritas desse aspecto. Um Completo pode acompanhar todo o ciclo da água; um Fragmento pode dominar apenas o gelo com intensidade maior.',
      'À medida que sua ligação amadurece, a Arma de Ego pode revelar personalidade e objetivos próprios. No ápice dessa integração, a chamada Arma Verdadeira alcança existência física autônoma.',
      "Os Completos controlam todo um aspecto elemental, embora possam demorar mais a atingir potência extrema em um único estado. Os Fragmentos perdem amplitude, mas ganham força e precisão em seu domínio específico.",
      "Na integração final, a Arma Verdadeira alcança forma independente e tangível: a manifestação de um Ego que já não cabe inteiramente nas mãos de seu portador."
    ]}
  },
  {
    id: 'gakis', book: 'IV · Os povos', title: 'Gakis: os Corrompidos', subtitle: 'Fome, memória e persistência', source: 'Livro original · página 17',
    left: {heading: 'O que a corrupção deixa para trás', paragraphs: [
      'Quando o Fluxo é perdido ou consumido pelo Karma, o resultado pode ser uma forma de vida corrompida. Um Gaki não representa apenas morte: nele persistem fome, desejo e uma identidade quebrada.',
      'Os Irracionais são massas de fumaça negra movidas pelo instinto. Os Sencientes recuperam a fala e alguma lógica. Gakis Inteligentes conseguem raciocinar, criar estratégias e comandar outros de classes inferiores.',
      "A corrupção não apaga todos da mesma maneira. O estado Irracional é dominado pela fome, enquanto o Senciente oscila entre fumaça e matéria, já capaz de falar e de pensar de forma rudimentar.",
      "O Gaki Inteligente pode comandar outros de classes inferiores. O Velho, por sua vez, domina a dissimulação: pode modificar a própria forma e assinatura espiritual, lembrando de vidas passadas."
    ]},
    right: {heading: 'Os Velhos, as dietas e os Darks', paragraphs: [
      'Os Gakis Velhos são os mais antigos e perigosos. Podem manipular a aparência e a assinatura espiritual, recuperar memórias de vidas passadas e se infiltrar entre pessoas comuns.',
      'Há Predadores, que consomem carne e energia vital, e raros Herbívoros ou Equilibrados, que buscam outra forma de existir e podem proteger territórios. O livro também menciona os Darks, seres que transcendem classes comuns e usam a distorção para corromper realidade e despertos deliberadamente.',
      "Os Predadores se alimentam de carne e energia vital. Os raros Herbívoros ou Equilibrados procuram outra forma de sustento — carne animal preparada ou energia da natureza — e podem tornar-se protetores de territórios.",
      "O livro diferencia os Darks das classes habituais: são seres que transcendem essas categorias e empregam a distorção com a intenção de corromper a realidade e outros despertos."
    ]}
  },
  {
    id: 'minerio', book: 'V · Os segredos', title: 'O Minério de Fluxo', subtitle: 'Quando uma força se torna matéria', source: 'Livro original · página 19',
    left: {heading: 'A pedra dourada', paragraphs: [
      'Quando o Fluxo fica aprisionado em uma rocha ou em outro mineral, a matéria se transforma. É assim que nasce o Minério de Fluxo, reconhecido pelo aspecto dourado.',
      'As Pedras de Fluxo conservam a energia no estado em que ela ficou presa. Por isso, carregam uma memória material da força que as atravessou.',
      "O Fluxo não desaparece quando fica preso à matéria. Ele transforma rocha e minério, criando pedras douradas que conservam a energia nas condições do momento em que foi aprisionada."
    ]},
    right: {heading: 'A matéria que pode ser esculpida', paragraphs: [
      'O minério é um dos suportes utilizados pelos Escultores. Nessas pedras, assim como nas pessoas, podem ser gravadas palavras da força primordial.',
      'Sua existência aproxima a história das ruínas, dos lugares de poder e das disputas pelo uso da energia. Para uns, representa descoberta; para outros, uma oportunidade de controle.',
      "É nesse suporte, e também em pessoas, que a obra dos Escultores pode acontecer. A pedra recebe uma palavra, mas o preço não deixa de existir apenas porque o trabalho recai sobre o mineral."
    ]}
  },
  {
    id: 'lingua', book: 'V · Os segredos', title: 'A Língua Mãe e os Escultores', subtitle: 'Palavras que dão razão às coisas', source: 'Livro original · páginas 19–20',
    left: {heading: 'A primeira linguagem', paragraphs: [
      'Conforme a história, a primeira língua foi feita do próprio Fluxo. É a Língua Mãe do Fluxo: uma linguagem que dá razão à existência, porque as coisas existem a partir do que nela foi dito.',
      'Ler essa linguagem exige um preço. Aqueles que tentam compreendê-la podem perder a sanidade ou ver o corpo mudar contra a própria vontade. Para muitos, o contato não representa um dom, mas uma ferida.',
      "O sentido profundo da Língua Mãe vai além de nomear o que já existe: a narrativa afirma que as coisas existem porque foram ditas nessa linguagem primordial.",
      "Para quem tenta ler e entender diretamente essa língua, a ameaça é concreta. A razão pode se desfazer, e o corpo pode mudar sem consentimento do próprio leitor."
    ]},
    right: {heading: 'A arte e o sacrifício', paragraphs: [
      'Os Escultores são capazes de ler e usar a Língua Mãe, graças à força de vontade e, talvez, a uma capacidade inata de tradução. Trabalham no Minério de Fluxo e também em pessoas, mas não podem fazer isso sem custo.',
      'Cada obra cobra um sacrifício próprio: uma lembrança perdida, um sentido, anos de vida, o nome verdadeiro ou o vínculo com alguém que deixa de reconhecer o Escultor. O Consórcio mantém Escultores que gravam Conceitos nas chamadas Obras-Primas.',
      "Cada Escultor paga um preço próprio, que pode consumir memória, sentidos, anos de vida, o verdadeiro nome ou o reconhecimento de alguém amado.",
      "Os Escultores a serviço do Consórcio gravam um Conceito tanto na arma quanto no portador de certas Obras-Primas. O conceito não é necessariamente algo escolhido por quem será marcado."
    ]}
  },
  {
    id: 'portais', book: 'V · Os segredos', title: 'Os portais entre mundos', subtitle: 'Pedras, coordenadas e o risco do vazio', source: 'Livro original · página 20',
    left: {heading: 'Uma palavra gravada em pedra', paragraphs: [
      'Os Escultores também são responsáveis pelos portais. Ao esculpir a palavra adequada em uma pedra, podem criar uma passagem entre locais distantes ou entre Arcádia e o Mundo Espelho.',
      'Um portal não funciona pela vontade vaga de viajar. Quem atravessa precisa saber exatamente para onde vai, reunir Fluxo suficiente e conhecer as coordenadas corretas.',
      "A pedra é marcada com a palavra portal na Língua Mãe. Uma passagem assim pode ligar o Mundo Espelho a Arcádia, mas também dois pontos distintos do mesmo mundo."
    ]},
    right: {heading: 'O espaço entre dois destinos', paragraphs: [
      'O erro pode conduzir ao vácuo do mundo. O perigo da travessia permanece uma parte da história: quem erra o caminho pode desaparecer no vácuo entre destinos.',
      'Dessa forma, uma pedra esquecida pode guardar mais que um caminho: também pode conservar o risco de desaparecer entre realidades que um dia já foram a mesma.',
      "O destino precisa ser conhecido com exatidão, o Fluxo necessário deve estar disponível e as coordenadas devem estar corretas. A ausência de qualquer um desses elementos abre a possibilidade de perder-se no vácuo do mundo.",
      "Assim, um portal abandonado não é uma simples porta: pode guardar uma travessia cujo ponto final já não é conhecido por ninguém."
    ]}
  },
  {
    id: 'herdeiros', book: 'V · Os segredos', title: 'O legado dos Herdeiros', subtitle: 'Linhagem, memória e destino', source: 'Livro original · página 18',
    left: {heading: 'A origem não conta tudo', paragraphs: [
      'Em Herdeiros, linhagem e história pessoal são inseparáveis. Ser Humano, Arcadiano ou Gaki diz algo sobre a relação com o Fluxo e o Karma, mas não determina inteiramente quem alguém se tornará.',
      'Importam também as perdas, os laços, os lugares atravessados e as decisões tomadas antes do começo de uma aventura. São essas lembranças que dão sentido ao poder de um personagem.',
      "O livro trata a história de cada personagem como parte central daquilo que ele poderá se tornar. A linhagem indica a relação com o mundo; os acontecimentos vividos determinam o sentido particular dessa relação."
    ]},
    right: {heading: 'A história continua', paragraphs: [
      'A narrativa apresenta as histórias de cada Herdeiro como parte da construção de sua identidade e de suas habilidades. Não existe apenas uma trajetória possível para quem desperta.',
      'Depois da Grande Guerra e da divisão dos mundos, Arcádia ainda existe entre medo e liberdade. A próxima página pertence aos personagens que atravessarem essa fronteira.',
      "O Herdeiro não desperta em uma terra neutra. Caminha entre a memória da Grande Guerra, a divisão das realidades, as disputas do Consórcio e dos Berços, a presença dos Gakis e os segredos que ainda podem ser esculpidos no Fluxo."
    ]}
  }
];


/** Ilustração temática por capítulo. Os textos em CHAPTERS acima permanecem intocados. */
const CHAPTER_ART = {
  principio: { tone: 'duo', emblem: Sparkles, note: 'O encontro entre Fluxo e Karma' },
  'primeiro-gaki': { tone: 'karma', emblem: Flame, note: 'A primeira corrupção' },
  guerra: { tone: 'duo', emblem: Sword, note: 'A Grande Guerra' },
  espelho: { tone: 'duo', emblem: Orbit, note: 'A separação dos mundos' },
  'arcadia-hoje': { tone: 'flux', emblem: Compass, note: 'Arcádia desperta' },
  caixa: { tone: 'tech', emblem: Building2, note: 'As ruínas e torres da Caixa' },
  floresta: { tone: 'nature', emblem: LeafIcon, note: 'A Grande Floresta' },
  deserto: { tone: 'ember', emblem: Sun, note: 'A imensidão do Deserto' },
  faccoes: { tone: 'duo', emblem: Shield, note: 'Consórcio e Berços' },
  humanos: { tone: 'human', emblem: Scissors, note: 'O despertar da humanidade' },
  agentes: { tone: 'tech', emblem: Cpu, note: 'O coração do Núcleo tecnológico' },
  arcadianos: { tone: 'flux', emblem: Sword, note: 'Os Arcadianos e o Fluxo' },
  gakis: { tone: 'karma', emblem: Flame, note: 'A transformação karmática' },
  minerio: { tone: 'flux', emblem: Gem, note: 'O Minério de Fluxo' },
  lingua: { tone: 'tech', emblem: Feather, note: 'A Língua Mãe' },
  portais: { tone: 'duo', emblem: Orbit, note: 'Os caminhos entre mundos' },
  herdeiros: { tone: 'flux', emblem: Crown, note: 'O legado dos Herdeiros' },
} as const;

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII'];

/** Salienta Fluxo e Karma sem alterar uma única palavra do texto da História. */
function Ink({ children }: { children: string }) {
  return <>{children.split(/(Fluxo|Karma)/gi).map((part, index) => {
    if (/^fluxo$/i.test(part)) return <strong className="hs-ink-flux" key={index}>{part}</strong>;
    if (/^karma$/i.test(part)) return <strong className="hs-ink-karma" key={index}>{part}</strong>;
    return <span key={index}>{part}</span>;
  })}</>;
}

/** Um único pergaminho: história legível à esquerda e imagem à direita.
 *  O texto completo é mantido em uma coluna com rolagem independente no PC,
 *  para que a área ilustrada não precise invadir o texto. No celular, rola tudo.
 */
function StorySpread({chapter, index, continuous = false}: {chapter: Chapter; index: number; continuous?: boolean}) {
  const art = CHAPTER_ART[chapter.id as keyof typeof CHAPTER_ART] ?? CHAPTER_ART.principio;
  const Icon = art.emblem;
  const ordinal = ROMAN[index] ?? String(index + 1);
  return <article className={`hs-story-spread hs-theme-${art.tone} ${continuous ? 'hs-story-spread-continuous' : ''}`}
    id={`historia-${chapter.id}`} aria-label={`Capítulo ${index + 1}: ${chapter.title}`}>
    <div className="hs-spread-inner">
      <div className="hs-story-narrative">
        <header className="hs-spread-title">
          <span className="hs-chapter-number">✦ &nbsp; CAPÍTULO {ordinal} &nbsp; ✦</span>
          <h2>{chapter.title}</h2>
          <p className="hs-chapter-deck"><Ink>{chapter.subtitle}</Ink></p>
          <span className="hs-spread-rule" aria-hidden="true">✧ ─────── ✦ ─────── ✧</span>
        </header>
        <div className="hs-narrative-passages">
          {[chapter.left,chapter.right].map((passage, part) => <section key={part} className="hs-story-passage">
            <h3>{passage.heading}</h3>
            {passage.paragraphs.map((paragraph, paraIndex) => <p key={paraIndex}><Ink>{paragraph}</Ink></p>)}
          </section>)}
        </div>
        <footer className="hs-spread-source"><span>{chapter.source}</span><span>{index + 1} / {CHAPTERS.length}</span></footer>
      </div>
      <figure className="hs-story-illustration" aria-label={`Ilustração: ${art.note}`}>
        <img src={`/historia/cenas/${chapter.id}.webp`}
          alt={`${art.note}. Ilustração narrativa referente a ${chapter.title}.`}
          loading={index === 0 && !continuous ? 'eager' : 'lazy'} decoding="async" width={760} height={990}/>
        <figcaption><Icon size={17} aria-hidden="true"/><span>{art.note}</span></figcaption>
      </figure>
      <span className="hs-edge hs-edge-left" aria-hidden="true"/>
      <span className="hs-edge hs-edge-right" aria-hidden="true"/>
      <span className="hs-edge hs-edge-top" aria-hidden="true"/>
      <span className="hs-edge hs-edge-bottom" aria-hidden="true"/>
      <span className="hs-spread-glyph" aria-hidden="true">✶</span>
      <span className="hs-spread-seal" aria-hidden="true">✦</span>
    </div>
  </article>;
}

export function StoryBookPage({ onHome }: { onHome: () => void }) {
  const [active, setActive] = useState(0);
  const [indexOpen, setIndexOpen] = useState(false);
  const [continuous, setContinuous] = useState(false);
  const top = useRef<HTMLElement>(null);
  const chapter = CHAPTERS[active] ?? CHAPTERS[0]!;
  const choose = (index: number) => {
    setActive(Math.min(Math.max(index, 0), CHAPTERS.length - 1));
    setIndexOpen(false);
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => top.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));
    }
  };
  return <section className="hs-story-page" aria-label="A História de Arcádia" ref={top}>
    <div className="hs-story-toolbar">
      <button type="button" className="hs-index-toggle" aria-expanded={indexOpen} onClick={() => setIndexOpen(v => !v)}>
        <List size={18}/> Capítulos
      </button>
      <div className="hs-view-switch" role="group" aria-label="Modo de leitura">
        <button type="button" className={!continuous?'active':''} aria-pressed={!continuous} onClick={() => setContinuous(false)}><BookOpen size={16}/> Livro aberto</button>
        <button type="button" className={continuous?'active':''} aria-pressed={continuous} onClick={() => setContinuous(true)}><ScrollText size={16}/> Leitura contínua</button>
      </div>
    </div>
    <div className="hs-story-layout">
      <aside className={`hs-story-index ${indexOpen ? 'is-open' : ''}`} aria-label="Índice dos capítulos">
        <div className="hs-index-intro">
          <span className="hs-index-crest" aria-hidden="true">✥</span>
          <h1>A HISTÓRIA DE ARCÁDIA</h1>
          <p>Dezessete capítulos · as crônicas do mundo</p>
        </div>
        <nav className="hs-index-chapters" aria-label="Escolher capítulo">
          {CHAPTERS.map((item,index) => {
            const art = CHAPTER_ART[item.id as keyof typeof CHAPTER_ART] ?? CHAPTER_ART.principio;
            const Glyph = art.emblem;
            return <button type="button" key={item.id}
              className={`hs-index-row ${active === index && !continuous ? 'selected' : ''}`}
              onClick={() => {setContinuous(false);choose(index);}}
              aria-current={active === index && !continuous ? 'page' : undefined}>
                <span className="hs-index-symbol" aria-hidden="true"><Glyph size={14}/></span>
                <span><strong>{ROMAN[index]}. {item.title}</strong><small>{index === active && !continuous ? item.subtitle : item.book}</small></span>
                <ChevronRight size={14} className="hs-index-chevron" aria-hidden="true"/>
              </button>;
          })}
        </nav>
        <button type="button" className="hs-back-home" onClick={onHome}><Home size={16}/> Voltar ao portal</button>
      </aside>
      <div className="hs-reading-area">
        {continuous ? <div className="hs-continuous-reader">
          {CHAPTERS.map((item,index) => <StorySpread chapter={item} index={index} continuous key={item.id}/>) }
        </div> : <>
          <StorySpread chapter={chapter} index={active}/>
          <nav className="hs-page-turn" aria-label="Virar capítulos">
            <button type="button" onClick={() => choose(active - 1)} disabled={active === 0} aria-label="Capítulo anterior"><ChevronLeft size={19}/> Anterior</button>
            <span><Compass size={21}/> {active + 1} / {CHAPTERS.length}</span>
            <button type="button" onClick={() => choose(active + 1)} disabled={active === CHAPTERS.length - 1} aria-label="Próximo capítulo">Próximo <ChevronRight size={19}/></button>
          </nav>
        </>}
        <div className="hs-story-colophon">História de Arcádia · narrativa do mundo preservada · Fonte: livro original</div>
      </div>
    </div>
  </section>;
}
