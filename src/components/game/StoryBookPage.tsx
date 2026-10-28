import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, Compass, Feather, Home, List, ScrollText, Sword, Cpu, Flame, Leaf as LeafIcon, Gem, Moon, Orbit, Building2, Eye, Sun, Scissors, Headphones, Map, Sparkles, Crown, Shield } from 'lucide-react';
import './storybook-page.css';

type Passage = { heading: string; paragraphs: string[] };
type Chapter = { id: string; book: string; title: string; subtitle: string; source: string; left: Passage; right: Passage };

/** História do mundo em linguagem editorial. Base: livro original, Parte I, pp. 7–20.
 * Os acontecimentos e nomes vêm do livro; aqui não há tabelas nem regras de combate.
 */
/** Sequência exata da referência enviada: 17 pergaminhos.
 * A ordem do ÍNDICE é editorial: o Primeiro Gaki surgiu ANTES da Grande Separação.
 * Cosmicárquicos: somente o título consta da referência visual; o Códice enviado
 * não apresenta descrição canônica. Nenhuma lore inédita foi atribuída ao grupo.
 */
const CHAPTERS: Chapter[] = [
  {
    "id": "principio",
    "book": "I · As origens",
    "title": "O Primeiro Movimento",
    "subtitle": "A origem do Fluxo e do Karma",
    "source": "Livro de regras · p. 7",
    "left": {
      "heading": "Quando tudo começou",
      "paragraphs": [
        "Antes de haver um mundo, quando nem o nada possuía um nome, surgiu o Fluxo. Ele deu sentido à existência, primeiro à vida e depois a tudo o que passou a existir.",
        "Junto ao Fluxo veio o Karma: uma energia igual e oposta, necessária ao equilíbrio da criação. As duas forças são anteriores aos povos, às guerras e aos nomes que mais tarde dividiriam a realidade."
      ]
    },
    "right": {
      "heading": "A primeira centelha",
      "paragraphs": [
        "Do mundo moldado por essas forças nasceriam seres, terras e histórias. A origem de Arcádia remonta a esse princípio, muito antes de existir a separação entre o mundo humano e o mundo arcadiano.",
        "A partir desse ponto, o Códice narra como uma antiga convivência deu lugar à cobiça, à guerra e, por fim, a dois mundos que jamais esqueceriam completamente a mesma origem."
      ]
    }
  },
  {
    "id": "nascimento",
    "book": "I · As origens",
    "title": "O Nascimento",
    "subtitle": "Os primeiros povos de uma terra sem nome",
    "source": "Livro de regras · p. 7",
    "left": {
      "heading": "A terra unificada",
      "paragraphs": [
        "Depois que a realidade foi moldada e os seres vivos despertaram, nasceram os primeiros humanos e arcadianos. O nome da grande terra que habitavam juntos perdeu-se ao longo das eras.",
        "Durante milhares de anos, esses dois povos viveram como iguais. Não havia ainda Mundo Espelho, Véu da Ignorância ou a divisão que mais tarde transformaria a sua história."
      ]
    },
    "right": {
      "heading": "Duas maneiras de despertar",
      "paragraphs": [
        "Os arcadianos nasceriam com a visão natural do Fluxo; para os humanos, a conexão com essa energia permaneceria latente sob o Véu. Essa diferença é descrita pelo Códice ao apresentar as linhagens, mas não apaga a origem compartilhada de ambos.",
        "A união antiga dos povos é a lembrança do que existiu antes de a cobiça alimentar o Karma e desencadear a queda."
      ]
    }
  },
  {
    "id": "separacao",
    "book": "I · As origens",
    "title": "A Grande Separação",
    "subtitle": "A Nomenclatura que dividiu a realidade",
    "source": "Livro de regras · pp. 7–8",
    "left": {
      "heading": "Uma decisão no fim da guerra",
      "paragraphs": [
        "Depois da expansão dos Gakis, uma Grande Guerra reuniu a maior parte dos humanos e arcadianos contra a corrupção. Houve traições, mas também Gakis antigos que escolheram lutar ao lado dos arcadianos por acreditarem na coexistência.",
        "Como última saída, os aliados entoaram juntos uma Nomenclatura de alcance incomparável: uma estrofe do mundo inteiro, capaz de dividir a própria realidade."
      ]
    },
    "right": {
      "heading": "Arcádia e o Mundo Espelho",
      "paragraphs": [
        "Da divisão nasceram dois destinos. Arcádia guardaria o campo da guerra final; o outro mundo continuaria como mundo humano, com os rastros do Fluxo apagados da percepção comum.",
        "Os responsáveis pela separação pensaram ter deixado a humanidade em segurança, sem conhecer a energia primordial. O Códice encerra essa passagem com uma dúvida: “Pelo menos, foi isso que eles pensaram.”"
      ]
    }
  },
  {
    "id": "marcha",
    "book": "I · As origens",
    "title": "A Marcha dos Mundos",
    "subtitle": "A guerra e os caminhos da realidade",
    "source": "Livro de regras · pp. 7–8",
    "left": {
      "heading": "O caminho até a cisão",
      "paragraphs": [
        "A Grande Guerra não separou simplesmente povos bons de povos maus. Humanos e arcadianos combateram os Gakis, mas alguns se aliaram à horda em busca de poder. Da mesma forma, Gakis antigos reconheceram que a coexistência ainda era possível.",
        "A separação dos mundos aconteceu depois desse conflito. A Nomenclatura coletiva abriu uma ruptura entre o passado compartilhado e os destinos que seguiriam caminhos diferentes."
      ]
    },
    "right": {
      "heading": "Dois mundos, uma história",
      "paragraphs": [
        "O mundo humano permaneceu sob o esquecimento do Fluxo. Arcádia guardou a memória da guerra e passou a existir sob outras condições, posteriormente marcada pela Cúpula de Som e pelas forças que a disputam.",
        "A marcha deste capítulo é a passagem de uma história única para duas realidades. Ela não altera a ordem dos acontecimentos: a queda do Primeiro Gaki e a Grande Guerra vieram antes da separação."
      ]
    }
  },
  {
    "id": "primeiro-gaki",
    "book": "I · As origens",
    "title": "O Primeiro Gaki",
    "subtitle": "A fome que nasceu da cobiça",
    "source": "Livro de regras · p. 7; Bestiário · pp. 6–17",
    "left": {
      "heading": "Uma queda anterior à separação",
      "paragraphs": [
        "Antes da Grande Guerra e da divisão dos mundos, o Karma cresceu alimentado pela cobiça de humanos e arcadianos. Dessa corrupção nasceu o primeiro Gaki, marcado pela inveja, pela malícia e pelo pior que existia em ambos os povos.",
        "Ele corrompia, matava e consumia Fluxo. Sua fome alcançava seres vivos, plantas e tudo o que pudesse tocar. Dele surgiram outros Gakis e a ameaça deixou de ser apenas um único ser."
      ]
    },
    "right": {
      "heading": "As muitas faces da corrupção",
      "paragraphs": [
        "Entre seus descendentes havia os bestiais, movidos por instinto; os sencientes, capazes de pensamento rudimentar; os inteligentes, que armavam ciladas; e os Velhos, possuidores de grande consciência e poder.",
        "O Bestiário amplia essas diferenças em suas fichas. O capítulo ocupa aqui a quinta posição, conforme o índice ilustrado, mas seu acontecimento pertence ao passado anterior à Grande Separação."
      ]
    }
  },
  {
    "id": "ruinas",
    "book": "II · Arcádia",
    "title": "A Era das Ruínas",
    "subtitle": "O que restou do Velho Mundo",
    "source": "Livro de regras · pp. 8–9",
    "left": {
      "heading": "Depois do colapso",
      "paragraphs": [
        "O mundo antigo, governado por leis lógicas e tecnologia cega, sucumbiu sob o peso de sua própria arrogância. Arcádia é o que restou: um continente pulsante, cercado e protegido por uma colossal Cúpula de Som.",
        "Dentro da redoma, o silêncio adquiriu um valor extraordinário e o Fluxo atravessa as veias da realidade. A memória do passado persiste no terreno, nas construções e nas forças que ainda disputam o continente."
      ]
    },
    "right": {
      "heading": "Vestígios de outras eras",
      "paragraphs": [
        "A Caixa se ergue entre metal, néon, refinarias e centros de pesquisa. O Grande Deserto conserva ruínas do Velho Mundo, máquinas soterradas e pilares consumidos pela erosão.",
        "A Grande Floresta, por outro lado, guarda marcas de batalhas e nomes perdidos entre raízes colossais. Cada território conserva uma forma diferente de memória."
      ]
    }
  },
  {
    "id": "arcadianos",
    "book": "III · Os povos",
    "title": "Os Arcadianos",
    "subtitle": "Herdeiros do Fluxo",
    "source": "Livro de regras · p. 16",
    "left": {
      "heading": "Nascidos com a visão",
      "paragraphs": [
        "Os Arcadianos nascem com a percepção natural do Fluxo. Para eles, sentir a energia primordial é tão comum quanto respirar; essa proximidade, porém, não elimina os riscos de excesso de confiança, corrupção do Ego e falta de disciplina.",
        "Sua vontade se manifesta por meio da Arma de Ego, que pode ganhar identidade e desejos próprios conforme o Arcadiano amadurece."
      ]
    },
    "right": {
      "heading": "Completos e Fragmentos",
      "paragraphs": [
        "Os Arcadianos Completos controlam um aspecto elemental inteiro, como o ciclo da água. Os Fragmentos dominam uma parte específica desse aspecto, como o gelo, com maior potência e precisão.",
        "Nos estágios avançados, a arma pode revelar personalidade e objetivos. Na integração final, a Arma Verdadeira alcança forma física autônoma. O Fluxo, para um Arcadiano, é poder e também responsabilidade."
      ]
    }
  },
  {
    "id": "humanos",
    "book": "III · Os povos",
    "title": "Os Humanos",
    "subtitle": "Os libertados sob o Véu da Ignorância",
    "source": "Livro de regras · pp. 9–10",
    "left": {
      "heading": "O poder que não sabiam carregar",
      "paragraphs": [
        "Humanos nascem sob o Véu da Ignorância. Sua ligação com o Fluxo é latente, mas está presente no próprio corpo: são feitos dessa energia mesmo quando não sabem de sua existência.",
        "O despertar rompe o Véu. A imaginação e a trajetória pessoal podem moldar uma Arma de Vínculo, expressão singular da relação de cada humano com a energia que sempre carregou."
      ]
    },
    "right": {
      "heading": "A dor do despertar",
      "paragraphs": [
        "O Códice descreve o Ritual da Navalha, em que o confronto extremo pode despertar o Fluxo no limiar da morte, mas também resultar em tragédia. O processo é brutal, não uma simples prova de coragem.",
        "Também existem as Crianças-Farol, nascidas com excesso de Fluxo e capazes de atrair a atenção de predadores e do Consórcio antes de entender o próprio poder."
      ]
    }
  },
  {
    "id": "agentes",
    "book": "III · Os povos",
    "title": "Os Agentes Tecnológicos",
    "subtitle": "O despertar forçado pelo Núcleo",
    "source": "Livro de regras · pp. 10–15",
    "left": {
      "heading": "O Fluxo operado pela tecnologia",
      "paragraphs": [
        "O Agente Tecnológico continua sendo humano, mas seu despertar ocorre por implantação de um Núcleo. Em vez de comungar com o Fluxo, aprende a lê-lo, calibrá-lo e conduzi-lo por meios artificiais.",
        "Esse caminho é desenvolvido pelo Consórcio. O procedimento não concede a visão natural de um Arcadiano e pode provocar a Pane inicial, marcada por dor intensa."
      ]
    },
    "right": {
      "heading": "Armas criadas, não evocadas",
      "paragraphs": [
        "A Arma de Núcleo não nasce diretamente da imaginação: é fabricada e alimentada pela tecnologia do portador. Lâminas, pistolas, lanças ou manoplas podem receber essa função.",
        "Os poderes desse caminho são chamados Habilidades de Núcleo. O Agente representa a tentativa de controlar uma força primordial por medição, engenharia e disciplina."
      ]
    }
  },
  {
    "id": "cosmicarquicos",
    "book": "III · Os povos",
    "title": "Os Cosmicárquicos",
    "subtitle": "Um capítulo aguardando sua história oficial",
    "source": "Índice visual enviado · capítulo X; sem entrada específica no Códice",
    "left": {
      "heading": "Um nome no índice de Arcádia",
      "paragraphs": [
        "O título “Os Cosmicárquicos” está presente na referência visual desta História. No entanto, a edição do Códice Supremo fornecida com o projeto não contém uma descrição específica dessa linhagem ou grupo.",
        "Para respeitar a história oficial, este pergaminho não atribui aos Cosmicárquicos uma origem, aparência, hierarquia, habilidades ou vínculos que o livro não estabeleceu."
      ]
    },
    "right": {
      "heading": "À espera do texto canônico",
      "paragraphs": [
        "O Códice confirma que Fluxo e Karma são forças primordiais e que a realidade foi dividida em Arcádia e Mundo Espelho. Esses acontecimentos não bastam, por si só, para definir quem são os Cosmicárquicos.",
        "Esta entrada permanece reservada à narrativa oficial do criador. Sua ilustração é apenas simbólica dos mundos descritos pelo livro, sem representar um Cosmicárquico."
      ]
    }
  },
  {
    "id": "terras",
    "book": "IV · As terras",
    "title": "As Terras",
    "subtitle": "A geografia do Despertar",
    "source": "Livro de regras · pp. 8–9",
    "left": {
      "heading": "A Caixa e a Grande Floresta",
      "paragraphs": [
        "Na Caixa, o Consórcio organiza uma metrópole de metal, néon e vapores químicos. Fluxo e tecnologia convivem sob torres de monitoramento, refinarias e centros de pesquisa criados para manter a ordem.",
        "A Grande Floresta cresce entre raízes colossais e árvores que respiram Fluxo. É território de memória viva e santuário dos Berços, onde a natureza pode responder às emoções dos visitantes."
      ]
    },
    "right": {
      "heading": "O Grande Deserto",
      "paragraphs": [
        "Além dessas regiões estende-se o Grande Deserto: vastidão de areia prateada, ruínas antigas e fragmentos de máquinas e civilizações esquecidas.",
        "O sol do deserto erode o Véu da Ignorância. Quem permanece muito tempo sob sua luz pode se aproximar do despertar ou da loucura. As terras de Arcádia não são apenas cenários; moldam os riscos de cada jornada."
      ]
    }
  },
  {
    "id": "consorcio",
    "book": "IV · As forças",
    "title": "O Consórcio",
    "subtitle": "Ordem, pesquisa e controle",
    "source": "Livro de regras · pp. 8–10 e 20; Bestiário · pp. 18–30",
    "left": {
      "heading": "A disciplina da Caixa",
      "paragraphs": [
        "O Consórcio reúne políticos, cientistas e engenheiros que temem o caos do Fluxo. Seu objetivo é conter essa energia e manter o Véu sobre a humanidade comum, defendendo a estabilidade por meio do controle.",
        "Na Caixa, isso se transforma em pesquisa, vigilância e catalogação. O Fluxo é medido e dirigido por tecnologias que colocam a ordem acima da comunhão espiritual."
      ]
    },
    "right": {
      "heading": "Os experimentos e as Obras-Primas",
      "paragraphs": [
        "O Códice descreve Agentes Tecnológicos criados pelo despertar forçado e Escultores a serviço do Consórcio. Estes gravam Conceitos em armas e portadores das Obras-Primas.",
        "O Bestiário registra mutagênicos produzidos a partir de Gakis e a série de agentes MK1, MK2 e MK3. São diferentes expressões da tentativa do Consórcio de transformar poder em instrumento."
      ]
    }
  },
  {
    "id": "bercos",
    "book": "IV · As forças",
    "title": "Os Berços",
    "subtitle": "Guardiões das Fontes de Fluxo",
    "source": "Livro de regras · pp. 8–9",
    "left": {
      "heading": "O santuário vivo",
      "paragraphs": [
        "Os Berços reúnem sábios e guerreiros que acreditam na comunhão com a energia primordial. Protegem as Fontes e ensinam que o Fluxo precisa correr livremente.",
        "Na Grande Floresta, essa convicção encontra um santuário. Árvores e raízes guardam lembranças; a própria natureza reage à presença e aos sentimentos dos Herdeiros."
      ]
    },
    "right": {
      "heading": "Controle e liberdade",
      "paragraphs": [
        "Para os Berços, a estagnação do Fluxo abre caminho para a corrupção. Para o Consórcio, permitir que a energia siga sem contenção ameaça a ordem.",
        "Entre essas visões, os Herdeiros caminham como pontes vivas. O Códice não apresenta essa tensão como uma disputa resolvida, e as escolhas de cada personagem podem atravessá-la."
      ]
    }
  },
  {
    "id": "minerio",
    "book": "V · Os segredos",
    "title": "O Minério de Fluxo",
    "subtitle": "O ouro que guarda a energia",
    "source": "Livro de regras · p. 19",
    "left": {
      "heading": "Quando a pedra se transforma",
      "paragraphs": [
        "O Fluxo que fica preso em uma rocha ou em outro minério não desaparece. Ele altera a matéria, criando o Minério de Fluxo, reconhecido por sua aparência dourada.",
        "As Pedras de Fluxo preservam a energia no estado em que foi aprisionada. A matéria torna-se um receptáculo para a força primordial."
      ]
    },
    "right": {
      "heading": "O trabalho dos Escultores",
      "paragraphs": [
        "Esse minério é um dos suportes sobre os quais os Escultores podem trabalhar. O outro é o próprio ser humano ou arcadiano: uma pessoa pode ser marcada pela Língua Mãe.",
        "A criação de uma obra não é casual. O uso da linguagem primordial exige o sacrifício particular de quem a esculpe."
      ]
    }
  },
  {
    "id": "lingua",
    "book": "V · Os segredos",
    "title": "A Língua Mãe",
    "subtitle": "A linguagem que dá razão ao mundo",
    "source": "Livro de regras · p. 19",
    "left": {
      "heading": "A primeira língua",
      "paragraphs": [
        "A primeira linguagem foi feita do próprio Fluxo. Chama-se Língua Mãe do Fluxo e, segundo o Códice, as coisas existem porque foram ditas nela.",
        "Não se trata simplesmente de um alfabeto antigo. Ler ou compreender a Língua Mãe pode ferir a sanidade e transformar o corpo de quem tenta fazê-lo, mesmo contra a própria vontade."
      ]
    },
    "right": {
      "heading": "O peso de uma palavra",
      "paragraphs": [
        "Pouquíssimos indivíduos conseguem utilizá-la. O livro chama esses raros intérpretes de Escultores, capazes de gravar palavras em minério ou em pessoas.",
        "Compreender a linguagem que sustenta as coisas não significa dominá-la sem consequências. O sacrifício acompanha o poder que ela permite manifestar."
      ]
    }
  },
  {
    "id": "escultores",
    "book": "V · Os segredos",
    "title": "Os Escultores",
    "subtitle": "A obra exige um sacrifício",
    "source": "Livro de regras · pp. 19–20",
    "left": {
      "heading": "Os que leem o impossível",
      "paragraphs": [
        "Os Escultores são os poucos capazes de ler e empregar a Língua Mãe do Fluxo. O Códice atribui essa capacidade à força de vontade e, talvez, a um dom de tradução que não é inteiramente compreendido.",
        "Eles esculpem Minério de Fluxo e pessoas. Cada obra cobra um preço único: uma lembrança, um sentido, anos de vida, o nome verdadeiro ou o reconhecimento de alguém amado."
      ]
    },
    "right": {
      "heading": "Os portais e o risco do vazio",
      "paragraphs": [
        "Entre as obras dos Escultores estão os portais, criados ao gravar uma palavra em pedra. A travessia pode ligar locais de Arcádia ou atravessar a distância entre Arcádia e o Mundo Espelho.",
        "Para funcionar, a viagem exige destino conhecido, Fluxo suficiente e coordenadas corretas. Quem erra pode perder-se no vácuo do mundo. O Consórcio também mantém Escultores que gravam Conceitos nas Obras-Primas."
      ]
    }
  },
  {
    "id": "herdeiros",
    "book": "V · Os segredos",
    "title": "O Legado dos Herdeiros",
    "subtitle": "Sua história é o seu poder",
    "source": "Livro de regras · p. 18; epígrafe · p. 2",
    "left": {
      "heading": "Linhagem e história",
      "paragraphs": [
        "Em Herdeiros, a linhagem e a trajetória do personagem se encontram para formar a sua subclasse. Ser Humano, Arcadiano ou Gaki revela uma relação com o Fluxo, mas não determina sozinho o que alguém se tornará.",
        "O que o Herdeiro viveu, perdeu, protegeu e escolheu altera o sentido de seus dons. Seu poder nasce dessa união entre origem e história, construída junto ao Mestre."
      ]
    },
    "right": {
      "heading": "A próxima página",
      "paragraphs": [
        "Arcádia ainda é atravessada pelo legado da Guerra, pela divisão da realidade e pela tensão entre o Consórcio e os Berços. As ruínas, as Fontes, os Gakis e os portais são partes de uma história inacabada.",
        "O futuro cabe aos que despertam. Como ensina a epígrafe do Códice: “Sua história é o seu poder.”"
      ]
    }
  }
];

/** Ilustrações reaproveitadas exclusivamente do ZIP enviado, sem imagens externas.
 * `scene` desacopla o capítulo da arte para permitir reordenação sem duplicar arquivos.
 */
const CHAPTER_ART = {
  "principio": { tone: 'duo', scene: 'principio', emblem: Sparkles, note: "O encontro entre Fluxo e Karma" },
  "nascimento": { tone: 'flux', scene: 'arcadia-hoje', emblem: Compass, note: "A terra ancestral e os povos do Fluxo" },
  "separacao": { tone: 'duo', scene: 'espelho', emblem: Orbit, note: "A divisão entre Arcádia e o Mundo Espelho" },
  "marcha": { tone: 'duo', scene: 'guerra', emblem: Sword, note: "A guerra que antecedeu a divisão dos mundos" },
  "primeiro-gaki": { tone: 'karma', scene: 'primeiro-gaki', emblem: Flame, note: "O surgimento do primeiro Gaki" },
  "ruinas": { tone: 'tech', scene: 'caixa', emblem: Building2, note: "As construções e as ruínas de Arcádia" },
  "arcadianos": { tone: 'flux', scene: 'arcadianos', emblem: Sword, note: "Os Arcadianos e suas Armas de Ego" },
  "humanos": { tone: 'human', scene: 'humanos', emblem: Scissors, note: "Os Humanos diante do despertar" },
  "agentes": { tone: 'tech', scene: 'agentes', emblem: Cpu, note: "A tecnologia e o Núcleo dos agentes" },
  "cosmicarquicos": { tone: 'duo', scene: 'espelho', emblem: Orbit, note: "Visão simbólica dos mundos — não retrata um Cosmicárquico" },
  "terras": { tone: 'ember', scene: 'deserto', emblem: Map, note: "Paisagens de Arcádia: floresta, deserto e ruínas" },
  "consorcio": { tone: 'tech', scene: 'faccoes', emblem: Shield, note: "Pesquisas e rituais sob o controle do Consórcio" },
  "bercos": { tone: 'nature', scene: 'floresta', emblem: LeafIcon, note: "A floresta viva, santuário dos Berços" },
  "minerio": { tone: 'flux', scene: 'minerio', emblem: Gem, note: "O Minério de Fluxo dourado" },
  "lingua": { tone: 'flux', scene: 'lingua', emblem: Feather, note: "Os sinais e os ecos da Língua Mãe" },
  "escultores": { tone: 'duo', scene: 'portais', emblem: Feather, note: "Os Escultores e suas passagens entre mundos" },
  "herdeiros": { tone: 'flux', scene: 'herdeiros', emblem: Crown, note: "Os Herdeiros diante de Arcádia" },
} as const;

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII'];

/** Os títulos e subtítulos são os da nova sequência; sem substituições invisíveis. */
const titleOf = (chapter: Chapter) => chapter.title;
const subtitleOf = (chapter: Chapter) => chapter.subtitle;

/** Realce textual sem modificar nenhum parágrafo. */
function Ink({ children }: { children: string }) {
  return <>{children.split(/(Fluxo|Karma)/gi).map((part, index) => {
    if (/^fluxo$/i.test(part)) return <strong className="hs-ink-flux" key={index}>{part}</strong>;
    if (/^karma$/i.test(part)) return <strong className="hs-ink-karma" key={index}>{part}</strong>;
    return <span key={index}>{part}</span>;
  })}</>;
}

type StorySpreadProps = {
  chapter: Chapter;
  index: number;
  continuous?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
};

/** Uma folha de pergaminho: arte vinculada ao tema, lore fundamentada no Códice à esquerda.
 * Leitura em livro: texto rola dentro do pergaminho no desktop.
 * Leitura corrida ou celular: a página inteira rola naturalmente.
 */
function StorySpread({chapter, index, continuous = false, onPrevious, onNext}: StorySpreadProps) {
  const art = CHAPTER_ART[chapter.id as keyof typeof CHAPTER_ART] ?? CHAPTER_ART.principio;
  const Icon = art.emblem;
  const ordinal = ROMAN[index] ?? String(index + 1);
  const gesture = useRef<{x:number;y:number}|null>(null);
  const artPath = `/historia/cenas/${art.scene}`;

  return <article
    className={`hs-story-spread hs-theme-${art.tone} ${continuous ? 'hs-story-spread-continuous' : ''}`}
    id={`historia-${chapter.id}`}
    aria-label={`Capítulo ${index + 1}: ${titleOf(chapter)}`}
    onTouchStart={event => {if (!continuous && event.touches[0]) gesture.current={x:event.touches[0].clientX,y:event.touches[0].clientY};}}
    onTouchEnd={event => {
      if (continuous || !gesture.current || !event.changedTouches[0]) return;
      const dx=event.changedTouches[0].clientX-gesture.current.x;
      const dy=event.changedTouches[0].clientY-gesture.current.y;
      gesture.current=null;
      if (Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)*1.7) {
        if (dx<0) onNext?.(); else onPrevious?.();
      }
    }}
  >
    <div className="hs-spread-inner">
      <div className="hs-story-narrative">
        <header className="hs-spread-title">
          <span className="hs-chapter-number"><span aria-hidden="true">✧ ─── ✦ ─── ✧</span> CAPÍTULO {ordinal} <span aria-hidden="true">✧ ─── ✦ ─── ✧</span></span>
          <h2>{titleOf(chapter)}</h2>
          <p className="hs-chapter-deck"><Ink>{subtitleOf(chapter)}</Ink></p>
          <span className="hs-spread-rule" aria-hidden="true">─────── ✧ ✦ ✧ ───────</span>
        </header>
        <div className="hs-narrative-passages">
          {[chapter.left,chapter.right].map((passage, part) => <section key={part} className="hs-story-passage">
            <h3>{passage.heading}</h3>
            {passage.paragraphs.map((paragraph, paraIndex) => <p key={paraIndex}><Ink>{paragraph}</Ink></p>)}
          </section>)}
        </div>
        <footer className="hs-spread-source"><span>{chapter.source}</span><span>HERDEIROS · O DESPERTAR</span></footer>
      </div>
      <figure className="hs-story-illustration" aria-label={`Ilustração: ${art.note}`}>
        <picture>
          <source type="image/webp" srcSet={`${artPath}-480.webp 480w, ${artPath}-760.webp 760w, ${artPath}-1520.webp 1520w`} sizes="(max-width: 820px) 100vw, (max-width: 1260px) 50vw, 43vw" />
          <img src={`${artPath}.webp`} alt={`${art.note}. Arte ilustrativa do capítulo ${titleOf(chapter)}.`}
            loading={index === 0 && !continuous ? 'eager' : 'lazy'}
            fetchPriority={index === 0 && !continuous ? 'high' : 'auto'}
            decoding="async" width={760} height={990} draggable={false}/>
        </picture>
        <figcaption><Icon size={17} aria-hidden="true"/><span>{art.note}</span></figcaption>
      </figure>
      <span className="hs-edge hs-edge-left" aria-hidden="true"/>
      <span className="hs-edge hs-edge-right" aria-hidden="true"/>
      <span className="hs-edge hs-edge-top" aria-hidden="true"/>
      <span className="hs-edge hs-edge-bottom" aria-hidden="true"/>
      <span className="hs-spread-glyph" aria-hidden="true">✧</span>
      <span className="hs-spread-seal" aria-hidden="true">✥</span>
      {!continuous && <nav className="hs-parchment-turn" aria-label="Navegar pelos pergaminhos">
        <button type="button" onClick={onPrevious} disabled={index===0} aria-label="Pergaminho anterior" title="Pergaminho anterior"><ChevronLeft size={24}/></button>
        <span aria-label={`Página ${index + 1} de ${CHAPTERS.length}`}>{index + 1} <small>/ {CHAPTERS.length}</small></span>
        <button type="button" onClick={onNext} disabled={index===CHAPTERS.length-1} aria-label="Próximo pergaminho" title="Próximo pergaminho"><ChevronRight size={24}/></button>
      </nav>}
      {continuous && <span className="hs-continuous-number" aria-label={`Página ${index+1} de ${CHAPTERS.length}`}>{index+1} / {CHAPTERS.length}</span>}
    </div>
  </article>;
}

export function StoryBookPage({ onHome }: { onHome: () => void }) {
  const [active, setActive] = useState(0);
  const [indexOpen, setIndexOpen] = useState(false);
  const [continuous, setContinuous] = useState(false);
  const top = useRef<HTMLElement>(null);
  const chapter = CHAPTERS[active] ?? CHAPTERS[0]!;
  useEffect(() => {
    const shell = document.querySelector('.app-shell');
    shell?.classList.add('hs-history-shell');
    return () => shell?.classList.remove('hs-history-shell');
  }, []);

  const choose = (index: number) => {
    const selected = Math.min(Math.max(index, 0), CHAPTERS.length - 1);
    setActive(selected);
    setIndexOpen(false);
    requestAnimationFrame(() => {
      const target = continuous ? document.getElementById(`historia-${CHAPTERS[selected]?.id}`) : top.current;
      target?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      if (!continuous) document.querySelector<HTMLElement>('.hs-story-narrative')?.scrollTo({top:0});
    });
  };

  // Leitura por teclado, além dos botões e gestos horizontais do celular.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (continuous || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || ['INPUT','TEXTAREA','SELECT','BUTTON'].includes(event.target.tagName))) return;
      if (event.key === 'ArrowRight' && active < CHAPTERS.length - 1) { event.preventDefault(); choose(active + 1); }
      if (event.key === 'ArrowLeft' && active > 0) { event.preventDefault(); choose(active - 1); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // O evento acompanha as mudanças de página ou modo de leitura.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, continuous]);

  // No modo corrido, o índice destaca o capítulo visível sem interromper a leitura.
  useEffect(() => {
    if (!continuous || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        const found=CHAPTERS.findIndex(item => entry.target.id === `historia-${item.id}`);
        if (found>=0) setActive(found);
      }
    }, {rootMargin:'-12% 0px -65% 0px',threshold:0});
    document.querySelectorAll('.hs-story-spread-continuous').forEach(element=>observer.observe(element));
    return ()=>observer.disconnect();
  }, [continuous]);

  return <section className="hs-story-page" aria-label="A História de Arcádia" ref={top}>
    <div className="hs-story-toolbar">
      <button type="button" className="hs-index-toggle" aria-expanded={indexOpen} aria-controls="hs-story-index" onClick={() => setIndexOpen(value=>!value)}>
        <List size={18}/> Índice dos capítulos
      </button>
      <div className="hs-view-switch" role="group" aria-label="Escolha como ler a História">
        <button type="button" className={!continuous?'active':''} aria-pressed={!continuous} onClick={() => setContinuous(false)}><BookOpen size={16}/> Pergaminhos</button>
        <button type="button" className={continuous?'active':''} aria-pressed={continuous} onClick={() => setContinuous(true)}><ScrollText size={16}/> Leitura corrida</button>
      </div>
    </div>
    <div className="hs-story-layout">
      <aside id="hs-story-index" className={`hs-story-index ${indexOpen ? 'is-open' : ''}`} aria-label="Índice dos capítulos">
        <div className="hs-index-intro">
          <span className="hs-index-crest" aria-hidden="true">✧</span>
          <h1>A HISTÓRIA DE ARCÁDIA</h1>
        </div>
        <nav className="hs-index-chapters" aria-label="Escolher capítulo">
          {CHAPTERS.map((item,index) => {
            const art = CHAPTER_ART[item.id as keyof typeof CHAPTER_ART] ?? CHAPTER_ART.principio;
            const Glyph = art.emblem;
            return <button type="button" key={item.id}
              className={`hs-index-row ${active === index ? 'selected' : ''}`}
              onClick={() => choose(index)} aria-current={active === index ? 'page' : undefined}>
              <span className="hs-index-symbol" aria-hidden="true"><Glyph size={16}/></span>
              <span className="hs-index-row-text"><strong>{ROMAN[index]}. {titleOf(item)}</strong><small>{active === index ? subtitleOf(item) : ''}</small></span>
              <ChevronRight size={14} className="hs-index-chevron" aria-hidden="true"/>
            </button>;
          })}
        </nav>
        <button type="button" className="hs-back-home" onClick={onHome}><Home size={16}/> Voltar ao portal</button>
      </aside>
      <div className="hs-reading-area">
        {continuous ? <div className="hs-continuous-reader">
          {CHAPTERS.map((item,index) => <StorySpread chapter={item} index={index} continuous key={item.id}/>) }
        </div> : <StorySpread chapter={chapter} index={active} onPrevious={() => choose(active - 1)} onNext={() => choose(active + 1)}/>}
        <p className="hs-story-reading-tip">{continuous ? 'Leitura corrida · deslize para acompanhar a crônica de Arcádia' : 'Vire as páginas pelas setas · no celular, deslize para o lado · no PC, use ← e →'}</p>
        <div className="hs-story-colophon">HERDEIROS · O DESPERTAR — A HISTÓRIA DE ARCÁDIA</div>
      </div>
    </div>
  </section>;
}
