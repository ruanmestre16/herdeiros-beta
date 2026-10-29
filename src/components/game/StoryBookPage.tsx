import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, Compass, Feather, Home, List, ScrollText, Sword, Cpu, Flame, Leaf as LeafIcon, Gem, Moon, Orbit, Building2, Eye, Sun, Scissors, Headphones, Map, Sparkles, Crown, Shield } from 'lucide-react';
import './storybook-page.css';

type Passage = { heading: string; paragraphs: string[] };
type Chapter = { id: string; book: string; title: string; subtitle: string; source: string; left: Passage; right: Passage; extra?: Passage[] };

/** História do mundo em linguagem editorial. Base: livro original, Parte I, pp. 7–20.
 * Os acontecimentos e nomes vêm do livro; aqui não há tabelas nem regras de combate.
 */
/** Ordem cronológica corrigida para a narrativa inicial: o Primeiro Gaki surge antes
 * da Grande Guerra e da Grande Estrofe, que por sua vez precede a Marcha dos Mundos.
 * A guerra é narrada dentro de "O Primeiro Gaki" e "A Grande Separação", mantendo agora 17 capítulos, incluindo a narrativa própria dos Gakis.
 * A partir de "Os Arcadianos", os capítulos são temáticos e não afirmam datas de surgimento.
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
        "Antes de existir um mundo, nem mesmo o nada possuía um nome. Quando o próprio conceito de existir nasceu, o Fluxo nasceu com ele e deu sentido àquilo que podia ser, viver e um dia receber um nome.",
        "Em contrapartida, quando a existência tomou forma, também a inexistência tomou vida: o Karma. Iguais em origem e opostos em essência, Fluxo e Karma são duas medidas de uma mesma realidade. Não são, por natureza, o bem e o mal."
      ]
    },
    "right": {
      "heading": "A primeira centelha",
      "paragraphs": [
        "Ainda não havia cidades, seres ou terras. Apenas duas forças primordiais, a existência e a inexistência, acompanhando a possibilidade de tudo o que viria a existir.",
        "Daquilo que o Fluxo passou a nomear, o mundo seria moldado e a vida despertaria. Seu primeiro movimento viria muito antes da cobiça, dos Gakis e da divisão que marcou a história de Arcádia."
      ]
    }
  },
  {
    "id": "nascimento",
    "book": "I · As origens",
    "title": "O Nascimento",
    "subtitle": "Os primeiros povos de uma terra sem nome",
    "source": "Códice Supremo · pp. 7, 9 e 16",
    "left": {
      "heading": "A terra anterior aos dois mundos",
      "paragraphs": [
        "Depois que o Fluxo deu sentido às coisas e o mundo foi moldado, a vida despertou. Os primeiros humanos e arcadianos nasceram numa grande terra unificada, cujo nome se perdeu ao longo das eras.",
        "Durante milhares de anos, os dois povos viveram como iguais. Não existiam ainda Arcádia e Mundo Espelho como realidades separadas: a Grande Estrofe só seria entoada após o surgimento dos Gakis e a Grande Guerra."
      ]
    },
    "right": {
      "heading": "As raízes de duas linhagens",
      "paragraphs": [
        "Humanos e arcadianos partilham a mesma origem no mundo antigo, mas desenvolvem maneiras diferentes de se relacionar com o Fluxo. Os arcadianos possuem uma percepção natural dessa força; os humanos carregam o Fluxo em sua própria constituição.",
        "A condição humana sob o Véu da Ignorância pertence à história do mundo após a separação. Não se deve projetar esse Véu sobre os milênios de convivência anteriores à Grande Estrofe."
      ]
    }
  },
  {
    "id": "primeiro-gaki",
    "book": "I · A queda e a guerra",
    "title": "O Primeiro Gaki",
    "subtitle": "A fome que nasceu da cobiça",
    "source": "Códice Supremo · pp. 7 e 17; Bestiário · pp. 4–17",
    "left": {
      "heading": "A queda da primeira paz",
      "paragraphs": [
        "Na terra onde humanos e arcadianos haviam vivido lado a lado por milênios, a cobiça, a inveja e a malícia de ambos os povos alimentaram o Karma. A força primordial cresceu até gerar o Primeiro Gaki.",
        "Aquela criatura já possuía inteligência e um poder esmagador. Corrompia e matava, alimentava-se de Fluxo e estendia sua fome aos seres vivos, às plantas e a tudo o que encontrava. Sua existência marcou a ruptura da antiga paz."
      ]
    },
    "right": {
      "heading": "Uma nova maneira de existir",
      "paragraphs": [
        "Dos efeitos da corrupção vieram outros Gakis. Quando o Fluxo de uma vida é consumido ou distorcido pelo Karma, o resultado não é somente o fim: pode surgir uma identidade alterada pela persistência e pela fome.",
        "O Gaki é também uma das linhagens de Herdeiros. Sua origem carrega o risco da corrupção, mas nem toda trajetória termina na mesma escolha. O próprio Códice conta que alguns Gakis antigos rejeitaram a destruição e buscaram coexistir com os demais povos."
      ]
    }
  },
  {
    "id": "separacao",
    "book": "I · A queda e a guerra",
    "title": "A Grande Separação",
    "subtitle": "A Grande Estrofe que dividiu a realidade",
    "source": "Códice Supremo · pp. 7–8; direção autoral do RPG para a passagem do Karma",
    "left": {
      "heading": "Depois da Grande Guerra",
      "paragraphs": [
        "O Primeiro Gaki havia surgido antes da guerra. Sua descendência se multiplicou, e o conflito envolveu humanos, arcadianos e Gakis — inclusive aqueles que escolheram combater ao lado dos antigos povos.",
        "Como última válvula de escape, os aliados entoaram juntos uma Grande Nomenclatura: uma estrofe do mundo inteiro, poderosa o suficiente para dividir a própria realidade em duas."
      ]
    },
    "right": {
      "heading": "A Grande Estrofe do Mundo",
      "paragraphs": [
        "Da divisão nasceram Arcádia, onde se travaria a guerra final, e o Mundo Espelho, que continuaria como mundo humano, mas com os rastros do Fluxo apagados.",
        "Na imagem dessa ruptura, a maior parte do Karma atravessa a Grande Estrofe rumo a Arcádia. No Mundo Espelho ficam apenas vestígios dessa força, enquanto a humanidade segue sem enxergar o Fluxo que antes conhecera."
      ]
    }
  },
  {
    "id": "marcha",
    "book": "I · A queda e a guerra",
    "title": "A Marcha dos Mundos",
    "subtitle": "Dois mundos idênticos, destinos diferentes",
    "source": "Códice Supremo · pp. 7–8; arte aprovada dos mundos espelhados",
    "left": {
      "heading": "O afastamento dos mundos",
      "paragraphs": [
        "Depois de entoada a Grande Estrofe, a realidade dividida passou a seguir dois caminhos. Os mundos compartilham a mesma origem, mas não a mesma relação perceptível com o Fluxo.",
        "Arcádia ficou destinada ao desfecho da guerra. Do outro lado, a humanidade prosseguiu sem reconhecer os rastros da força que havia moldado a existência."
      ]
    },
    "right": {
      "heading": "A memória de uma origem comum",
      "paragraphs": [
        "Dois mundos de forma esférica e geografia espelhada se afastam na imensidão. Arcádia segue envolta pela luz dourada do Fluxo e pelas correntes roxas do Karma; o Mundo Espelho conserva seus mares, terras e nuvens sem mostrar essas energias.",
        "A memória da origem comum ainda existe, mesmo quando o destino de cada mundo se distancia do outro. O que foi uma única realidade agora prossegue por dois caminhos."
      ]
    }
  },
  {
    "id": "ruinas",
    "book": "II · Arcádia",
    "title": "A Era das Ruínas",
    "subtitle": "O que restou do Velho Mundo",
    "source": "Livro de regras · pp. 8–9 · detalhes definidos pelo autor",
    "left": {
      "heading": "Depois do colapso",
      "paragraphs": [
        "Depois da Grande Guerra, quase todo o planeta de Arcádia tornou-se uma vastidão árida e arenosa. O Velho Mundo deixou suas marcas entre ruínas, pedras e terras ressequidas, em contraste com a vida protegida em uma parte do mundo.",
        "Um continente inteiro foi resguardado pela colossal Cúpula de Som: uma redoma fechada acima e abaixo da terra, sem muralhas que a substituam. Sob essa proteção permanecem a Grande Floresta, a Caixa e parte do Grande Deserto."
      ]
    },
    "right": {
      "heading": "Vestígios de outras eras",
      "paragraphs": [
        "No interior da Cúpula, o Fluxo pulsa e a paisagem revela três naturezas distintas: a floresta viva de árvores colossais, o centro metropolitano de tecnologia e formação, e o deserto cujo ciclo entre calor e gelo desafia seus habitantes.",
        "Fora dela, a vastidão seca guarda o peso das eras. A areia que recobriu o planeta não deve ser confundida com o Grande Deserto, que já fazia parte do ecossistema do continente muito antes do colapso."
      ]
    }
  },
  {
    "id": "arcadianos",
    "book": "III · Os povos",
    "title": "Os Arcadianos",
    "subtitle": "Os puros: herdeiros da visão do Fluxo",
    "source": "Códice Supremo · pp. 7 e 16",
    "left": {
      "heading": "Quem são os Arcadianos",
      "paragraphs": [
        "Os Arcadianos nasceram na mesma terra antiga que os humanos e viveram com eles durante milhares de anos. O que distingue esse povo é a visão natural do Fluxo: para um arcadiano, perceber a força que atravessa o mundo é tão espontâneo quanto respirar.",
        "Essa intimidade não os torna imunes à corrupção. O excesso de confiança, a falta de disciplina e os conflitos do Ego podem ameaçar a alma de alguém que nasceu tão próximo da energia primordial."
      ]
    },
    "right": {
      "heading": "Uma herança que assume muitas formas",
      "paragraphs": [
        "A relação dos Arcadianos com os elementos não é igual em todos os indivíduos. O Códice os distingue entre Completos e Fragmentos, duas formas diferentes de manifestar um aspecto do Fluxo.",
        "Essas diferenças não nasceram de povos separados, mas de modos distintos de compreender e expressar uma mesma força. A versatilidade de um Completo e a especialização de um Fragmento têm identidades próprias."
      ]
    },
    "extra": [
      {
        "heading": "Os Completos — o elemento em sua totalidade",
        "paragraphs": [
          "Um Arcadiano Completo manifesta um aspecto elemental inteiro. Quem possui o aspecto da água, por exemplo, alcança o ciclo que reúne líquido, vapor e gelo, em vez de se prender a uma única expressão.",
          "Essa amplitude oferece muitas possibilidades, mas exige um caminho mais demorado até alcançar pleno domínio de cada estado particular. Ser Completo não significa ser melhor que um Fragmento: sua força está na totalidade do aspecto."
        ]
      },
      {
        "heading": "Os Fragmentos — a essência de um único aspecto",
        "paragraphs": [
          "Um Arcadiano Fragmento aprofunda apenas parte de um elemento. Aquele que manifesta o gelo, por exemplo, concentra nesse estado a força que um Completo distribui por todo o ciclo da água.",
          "Seu horizonte é mais estreito, mas seu controle e sua potência naquele fragmento podem superar os de um Completo. O livro registra que o Consórcio emprega Fragmentos como ponta de lança em suas operações, aproveitando essa especialização."
        ]
      },
      {
        "heading": "A Arma de Ego — a vontade que ganha presença",
        "paragraphs": [
          "Os Arcadianos conseguem projetar armas a partir da própria vontade e criatividade. Correntes, foices, arcos e outras formas refletem não apenas a imaginação de quem as manifesta, mas também a essência elemental que carregam.",
          "Com o amadurecimento, a Arma de Ego pode revelar uma personalidade e desejos próprios, até ganhar presença física independente como Arma Verdadeira. A proximidade entre portador e arma é uma relação de identidade, harmonia e, por vezes, conflito."
        ]
      }
    ]
  },
  {
    "id": "humanos",
    "book": "III · Os povos",
    "title": "Os Humanos",
    "subtitle": "Os libertados: aqueles que carregam o Fluxo sem vê-lo",
    "source": "Códice Supremo · pp. 7–10",
    "left": {
      "heading": "Quem são os Humanos",
      "paragraphs": [
        "Os Humanos compartilham com os Arcadianos o nascimento na antiga terra unificada. Após a Grande Estrofe, o mundo humano seguiu separado de Arcádia, e a humanidade comum ficou sob o Véu da Ignorância, sem reconhecer o Fluxo que a constitui.",
        "O poder não está ausente de seus corpos. Ele permanece latente, invisível a quem ainda não despertou. Essa distância entre a energia que possuem e aquilo que conseguem perceber marca a história humana no Mundo Espelho."
      ]
    },
    "right": {
      "heading": "Quando o Véu se rompe",
      "paragraphs": [
        "O despertar pode revelar ao humano a energia que sempre esteve presente. Sua imaginação molda então uma Arma de Vínculo, cuja forma expressa a história de quem a carrega; nem duas trajetórias precisam produzir a mesma arma.",
        "A descoberta, porém, não é tranquila. O Códice descreve dor extrema e a possibilidade de perder a própria vida ao tentar romper o Véu. A liberdade de perceber o Fluxo também pode chegar acompanhada de sofrimento."
      ]
    },
    "extra": [
      {
        "heading": "O Ritual da Navalha",
        "paragraphs": [
          "O livro descreve um ritual cruel em que crianças de seis anos, depois de treinamento exaustivo, são lançadas diante de Gakis Irracionais. No limite da sobrevivência, o instinto pode romper o Véu e libertar o Fluxo.",
          "Nem todas sobrevivem. Algumas morrem; outras podem tornar-se Gakis. O Ritual da Navalha é apresentado no Códice como uma violência institucionalizada, e não como uma simples prova heroica de coragem."
        ]
      },
      {
        "heading": "As Crianças-Farol",
        "paragraphs": [
          "Alguns humanos nascem com uma presença de Fluxo extraordinariamente intensa. São as Crianças-Farol, capazes de alterar ambientes ou atrair atenções perigosas mesmo antes de compreender o que carregam.",
          "Seu brilho chama predadores espirituais e o interesse do Consórcio, que o livro associa a experimentos brutais. A história dessas crianças mostra que carregar poder não significa ter escolhido o destino que outros tentam lhes impor."
        ]
      }
    ]
  },
  {
    "id": "gakis",
    "book": "III · Os povos",
    "title": "Os Gakis",
    "subtitle": "Do instinto à consciência: as formas do Karma",
    "source": "Códice Supremo · pp. 7 e 17; Bestiário · Gakis Irracionais, Sencientes, Inteligentes e Velhos",
    "left": {
      "heading": "Quem são os Gakis",
      "paragraphs": [
        "Os Gakis não nasceram junto aos primeiros humanos e arcadianos. A cobiça, a inveja e a malícia desses povos alimentaram o Karma até que surgiu o Primeiro Gaki, capaz de corromper vidas e consumir o Fluxo. A partir dele vieram outros seres, diferentes entre si em corpo, consciência e escolhas.",
        "O Códice descreve a existência dos Gakis como corrupção, persistência e fome transformadas em identidade. Sua matéria pode oscilar entre fumaça negra e formas mais estáveis; eles moldam o próprio corpo em garras, membros alongados e outras extensões, em vez de manifestar uma Arma de Ego."
      ]
    },
    "right": {
      "heading": "A hierarquia da consciência",
      "paragraphs": [
        "Os Irracionais são as Bestas de Fumaça: massas negras disformes, guiadas pelo instinto de consumir. Os Sencientes já recuperaram a fala e uma lógica ainda rudimentar, mas continuam a alternar sombra e matéria, muitas vezes sem apresentar um rosto definido.",
        "Os Inteligentes possuem linguagem elaborada, planejamento e a capacidade de comandar Gakis de classes inferiores. No alto da hierarquia estão os Velhos, cuja antiguidade e domínio da própria essência lhes permitem mudar de aparência, recuperar lembranças de outras vidas e vestir rostos como máscaras."
      ]
    },
    "extra": [
      {
        "heading": "Predadores e Herbívoros",
        "paragraphs": [
          "Os Predadores, também chamados Carnívoros, alimentam-se de carne e energia vital, espalhando corrupção e medo. Em contraste, os raros Herbívoros, ou Equilibrados, procuram redenção e podem alimentar-se de energia da natureza ou de carne animal preparada, protegendo territórios em vez de destruí-los.",
          "Essa distinção fala de alimentação e escolhas, não dos quatro graus de consciência. Um Gaki não é definido apenas pela fome: na Grande Guerra, alguns dos mais antigos se voltaram contra a destruição e escolheram a possibilidade de coexistência."
        ]
      },
      {
        "heading": "Darks — além das classes comuns",
        "paragraphs": [
          "O Códice também nomeia os Darks: seres que transcendem as classes comuns e dominam distorções do Fluxo capazes de corromper a realidade e outros despertos. Não constituem um quinto estágio da hierarquia Irracional–Senciente–Inteligente–Velho.",
          "Por mais perigosa que seja sua origem, a história dos Gakis não se resume a uma única forma de agir. Instinto, consciência, poder e decisões individuais transformam o lugar que cada um ocupa em Arcádia."
        ]
      }
    ]
  },
  {
    "id": "agentes",
    "book": "III · Os povos",
    "title": "Os Agentes Tecnológicos",
    "subtitle": "O despertar forçado pelo Núcleo",
    "source": "Códice Supremo · pp. 10–11; contexto do Consórcio · pp. 8–9",
    "left": {
      "heading": "Humanos transformados pelo Consórcio",
      "paragraphs": [
        "Os Agentes Tecnológicos não são uma quarta linhagem nascida ao lado de humanos, arcadianos e Gakis. São humanos do Consórcio que seguem outro caminho para despertar: um Núcleo é implantado no corpo e a energia passa a ser conduzida artificialmente.",
        "O Consórcio busca medir, compreender e dominar o Fluxo. Desse desejo nasceu a figura do Agente, alguém que não comunga naturalmente com a força primordial como um Arcadiano, mas aprende a operá-la por instrumentos e disciplina."
      ]
    },
    "right": {
      "heading": "O preço de conduzir o poder",
      "paragraphs": [
        "O Núcleo pode provocar uma dolorosa Pane inicial. O equipamento que o Agente utiliza não é uma Arma de Ego espontânea: trata-se de tecnologia e armamento fabricado, com metal, mecanismos, implantes e energia canalizada.",
        "Ainda que compartilhem uma estética de metal escuro e dispositivos luminosos, os Agentes possuem identidades próprias e cores que distinguem seus papéis. Por trás do braço mecânico e da armadura continua existindo uma pessoa humana."
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
        "O sol do deserto erode o Véu da Ignorância. Quem permanece muito tempo sob sua luz pode se aproximar do despertar ou da loucura. As terras de Arcádia não são apenas cenários moldam os riscos de cada jornada."
      ]
    }
  },
  {
    "id": "consorcio",
    "book": "IV · As forças",
    "title": "O Consórcio",
    "subtitle": "Ordem, pesquisa e controle",
    "source": "Livro de regras · pp. 8–10 e 20 Bestiário · pp. 18–30 · detalhes definidos pelo autor",
    "left": {
      "heading": "A disciplina da Caixa",
      "paragraphs": [
        "O Consórcio reúne políticos, pesquisadores e engenheiros que buscam medir e submeter o Fluxo a uma ordem rígida. Suas operações combinam vigilância, ciência, armamentos e Núcleos tecnológicos para transformar a energia primordial em instrumento.",
        "Além de sua influência na Caixa, a organização mantém uma sede colossal e parcialmente escondida no deserto: metal escuro, estruturas de comando, instalações militares e tecnologia capaz de mobilizar inúmeros agentes."
      ]
    },
    "right": {
      "heading": "Os experimentos e as Obras-Primas",
      "paragraphs": [
        "Entre seus integrantes há pessoas com braços, pernas e olhos mecânicos, assim como armaduras escuras e detalhes de cor que distinguem patentes e funções. O poder da instituição se revela tanto nas máquinas quanto nas pessoas transformadas por elas.",
        "O Códice também apresenta Escultores a serviço do Consórcio, mutagênicos e Obras-Primas marcadas por Conceitos. São expressões diferentes de um mesmo esforço: dar forma calculável àquilo que nasceu muito antes de qualquer máquina."
      ]
    }
  },
  {
    "id": "bercos",
    "book": "IV · As forças",
    "title": "Os Berços",
    "subtitle": "Guardiões das Fontes de Fluxo",
    "source": "Livro de regras · pp. 8–9 · detalhes definidos pelo autor",
    "left": {
      "heading": "O santuário vivo",
      "paragraphs": [
        "Os Berços reúnem sábios, protetores, guerreiros e educadores que defendem a liberdade das Fontes de Fluxo. Seu santuário amplo é marcado por construções de mármore branco, detalhes dourados e uma gigantesca árvore de tronco branco, veios dourados e folhas brancas bordadas de ouro.",
        "Entre escolas, áreas médicas e jardins, crianças vestidas de branco crescem sob cuidado e formação. Uma arena de treinamento, deslocada para uma região junto à água, integra esse complexo de aprendizado e proteção."
      ]
    },
    "right": {
      "heading": "Controle e liberdade",
      "paragraphs": [
        "A maioria de seus agentes veste ternos sociais pretos, variando as camisas e cores internas. Alguns dos mais experientes podem escolher roupas inteiramente próprias, desde tecidos leves de seda até trajes singulares que expressam sua história.",
        "Para os Berços, o Fluxo precisa continuar correndo, e não ser reduzido apenas a um recurso catalogado. Sua visão contrasta com o controle defendido pelo Consórcio, sem que isso apague a humanidade e as escolhas individuais dos que vivem em cada organização."
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
    "source": "Livro de regras · pp. 19–20 · detalhes definidos pelo autor",
    "left": {
      "heading": "Os que leem o impossível",
      "paragraphs": [
        "Os Escultores são os raros capazes de ler e utilizar a Língua Mãe do Fluxo. Alguns exibem marcas e desenhos pelo corpo como tatuadores; outros se parecem com artesãos comuns, vendedores, estudiosos ou agentes de organizações poderosas.",
        "Não existe uniforme que os defina. Um usa canivete e instrumento de gravação; outro trabalha com agulhas; alguém pode apenas carregar uma caneta. Todos procuram impor palavras à matéria — e cada obra exige sacrifício pessoal."
      ]
    },
    "right": {
      "heading": "Os portais e o risco do vazio",
      "paragraphs": [
        "Eles gravam a Língua Mãe em Minério de Fluxo e também podem esculpir pessoas. O preço pode ser uma lembrança, um sentido, anos de vida, o próprio nome ou a memória que alguém querido possui deles.",
        "Entre suas obras estão os portais, feitos ao inscrever uma palavra numa pedra. Destino conhecido, Fluxo suficiente e coordenadas corretas são indispensáveis; um erro pode fazer alguém perder-se no vácuo do mundo."
      ]
    }
  },
  {
    "id": "herdeiros",
    "book": "V · Os segredos",
    "title": "O Legado dos Herdeiros",
    "subtitle": "Sua história é o seu poder",
    "source": "Livro de regras · p. 18 epígrafe · p. 2 · detalhes definidos pelo autor",
    "left": {
      "heading": "Linhagem e história",
      "paragraphs": [
        "Herdeiro é aquele que conhece e consegue utilizar o Fluxo. Arcadianos, Humanos despertos, Gakis conscientes e até Agentes Tecnológicos do Consórcio podem carregar esse nome, embora suas origens e formas de poder sejam distintas.",
        "Nenhuma linhagem, sozinha, determina o destino de alguém. A história de cada Herdeiro é feita das escolhas, perdas, compromissos e relações que dão significado ao modo como usa aquilo que recebeu."
      ]
    },
    "right": {
      "heading": "A próxima página",
      "paragraphs": [
        "Arcádia e o Mundo Espelho permanecem ligados por sua origem, ainda que vivam realidades diferentes. O futuro repousa diante de indivíduos de povos e caminhos diversos, capazes de cooperar, confrontar-se ou mudar o rumo do que lhes foi legado.",
        "O Gaki envolto em Karma, o Arcadiano que percebe o Fluxo, o Humano que atravessou o Véu e o Agente que o canaliza por tecnologia partilham uma verdade: o próximo capítulo ainda não foi escrito. Sua história é seu poder."
      ]
    }
  }
];

const GREAT_WAR: Chapter = {
  "id": "guerra",
  "book": "I · A queda e a guerra",
  "title": "A Grande Guerra e a Traição",
  "subtitle": "A batalha que antecedeu a Estrofe",
  "source": "Códice Supremo · p. 7; aparência dos Gakis da era definida pelo autor",
  "left": {
    "heading": "A aliança ameaçada",
    "paragraphs": [
      "O Primeiro Gaki não permaneceu sozinho. A corrupção se espalhou, e das novas formas de Karma surgiram hordas que ameaçavam a existência de todos os povos. Humanos e Arcadianos uniram suas forças para impedir que a terra fosse consumida.",
      "Nessa era, muitos Gakis eram essencialmente fumaça negra e Karma roxo, sem rostos fixos. Irracionais avançavam como feras guiadas pela fome; Sencientes apresentavam maior coesão e sinais de pensamento, ainda longe da forma humana definida."
    ]
  },
  "right": {
    "heading": "A traição e a escolha",
    "paragraphs": [
      "A guerra também trouxe traições. Alguns humanos e Arcadianos se voltaram contra seus próprios aliados, procurando poder naquilo que deveria ter sido combatido.",
      "Mas houve uma escolha inesperada: Gakis antigos rejeitaram a destruição e se aliaram aos Arcadianos, acreditando na possibilidade de coexistência. O conflito precedeu a Grande Estrofe do Mundo — a recitação que dividiria a realidade."
    ]
  }
};

const LANDS: Record<"floresta" | "caixa" | "deserto", Omit<Chapter,"id" | "book">> = {
  "floresta": {
    "title": "A Grande Floresta",
    "subtitle": "A natureza que respira Fluxo",
    "source": "Códice Supremo · pp. 8–9; Bestiário · seção Grande Floresta; detalhes definidos pelo autor",
    "left": {
      "heading": "Um ecossistema vivo",
      "paragraphs": [
        "A Grande Floresta se estende sob copas colossais, raízes tão antigas quanto os nomes esquecidos e caminhos em que o tempo pode perder sua linearidade. O Fluxo atravessa árvores, animais e cada raiz, fazendo da floresta muito mais que uma paisagem.",
        "Ali, a natureza tem memória e consciência. Folhas, troncos e solo podem reagir aos sentimentos e ações dos Herdeiros. É também o território que acolhe os santuários dos Berços."
      ]
    },
    "right": {
      "heading": "A beleza também ameaça",
      "paragraphs": [
        "A floresta é extraordinariamente perigosa. Plantas carnívoras podem atacar sem aviso, e animais repletos de Fluxo adquirem formas e comportamentos capazes de surpreender até viajantes experientes.",
        "Não se trata de maldade indistinta: as Bestas de Fluxo pertencem ao equilíbrio local. A mesma energia que faz a floresta florescer pode torná-la mortal para quem não respeita seus limites."
      ]
    }
  },
  "caixa": {
    "title": "A Caixa",
    "subtitle": "A metrópole sob a Torre do Tempo",
    "source": "Códice Supremo · pp. 8–9; aparência, Torre do Tempo e instituições definidas pelo autor",
    "left": {
      "heading": "O coração urbano do continente",
      "paragraphs": [
        "A Caixa é o grande centro metropolitano de Arcádia. Em uma planície de ruas amplas, jardins, escolas e instituições de formação, habitantes e Arcadianos aprendem a conviver com os recursos de um mundo atravessado pelo Fluxo.",
        "Sua beleza mistura vegetação, bronze, metal e tonalidades azuis. Prédios altos, centros de pesquisa e grandes edifícios de ensino fazem da cidade um encontro entre natureza e tecnologia."
      ]
    },
    "right": {
      "heading": "A Torre do Tempo",
      "paragraphs": [
        "Acima de toda a paisagem sobe a Torre do Tempo. Erguida no coração da Caixa, ela atravessa a linha do horizonte e parece não ter fim, tão alta que o olhar a perde no céu.",
        "O Consórcio exerce influência e controle na cidade, como narra o Códice. A vida cotidiana, porém, também compreende estudo, convivência e desenvolvimento: a aparência luminosa da metrópole não elimina a tensão entre liberdade e disciplina."
      ]
    }
  },
  "deserto": {
    "title": "O Grande Deserto",
    "subtitle": "A terra do calor e do gelo",
    "source": "Códice Supremo · p. 9; Bestiário · criaturas do Grande Deserto; ciclos e vestimentas definidos pelo autor",
    "left": {
      "heading": "Um deserto anterior às ruínas",
      "paragraphs": [
        "O Grande Deserto não nasceu com a devastação do planeta após a Grande Guerra. É parte antiga do ecossistema do continente, com areias, minérios de Arcádia e formas de vida adaptadas a uma intensidade de Fluxo quase insuportável.",
        "Durante o dia, um calor escaldante obriga seus moradores a criar vestimentas especiais de proteção. A areia e o Fluxo podem tomar formas vivas: criaturas que surgem de dunas, rochas e correntes de energia."
      ]
    },
    "right": {
      "heading": "Quando a noite transforma a areia",
      "paragraphs": [
        "Ao anoitecer, o calor dá lugar a um frio assustador. O mesmo deserto parece converter-se em um palácio gélido, e muitas das criaturas mudam com ele: formas de areia e Fluxo durante o dia, formas de gelo e Fluxo durante a noite.",
        "Essa dualidade faz do lugar uma região extrema e perigosa. Nenhum viajante pode julgá-lo apenas pela aparência das dunas sob o sol, pois sua outra face aguarda a chegada da lua."
      ]
    }
  }
};


// A numeração agora reúne 17 capítulos. A Grande Guerra é um interlúdio,
// e "As Terras" contém três pergaminhos, cada um com sua própria arte aprovada.
// Os textos são adaptações de leitura do Códice e das definições autorais,
// não novas regras ou reproduções de números de ficha.
const ART: Record<string, {tone:string; scene:string; emblem:typeof Sparkles; note:string; imageWidth:number; imageHeight:number}> = {
  principio:{tone:'duo',scene:'principio',emblem:Sparkles,note:'Fluxo e Karma primordiais',imageWidth:1672,imageHeight:941},
  nascimento:{tone:'flux',scene:'nascimento',emblem:Compass,note:'Nascimento de um mundo ainda unificado',imageWidth:1672,imageHeight:941},
  'primeiro-gaki':{tone:'karma',scene:'primeiro-gaki',emblem:Flame,note:'O primeiro Gaki consumindo o Fluxo',imageWidth:1672,imageHeight:941},
  guerra:{tone:'karma',scene:'guerra',emblem:Sword,note:'A Grande Guerra e a Traição',imageWidth:1672,imageHeight:941},
  separacao:{tone:'duo',scene:'separacao',emblem:Orbit,note:'A Grande Estrofe do Mundo',imageWidth:1672,imageHeight:941},
  marcha:{tone:'duo',scene:'marcha',emblem:Compass,note:'Arcádia e o Mundo Espelho',imageWidth:1536,imageHeight:1024},
  ruinas:{tone:'ember',scene:'ruinas',emblem:Building2,note:'A Cúpula de Som sobre o continente preservado',imageWidth:1672,imageHeight:941},
  arcadianos:{tone:'flux',scene:'arcadianos',emblem:Sun,note:'Os Arcadianos reunidos diante de Arcádia — ilustração escolhida pelo autor',imageWidth:972,imageHeight:941},
  humanos:{tone:'human',scene:'humanos',emblem:Eye,note:'Um humano despertando em meio aos que vivem sob o Véu',imageWidth:1672,imageHeight:941},
  gakis:{tone:'karma',scene:'gakis',emblem:Flame,note:'Gakis Senciente, Inteligente e Velho — ilustração em revisão',imageWidth:922,imageHeight:941},
  agentes:{tone:'tech',scene:'agentes',emblem:Cpu,note:'Os Agentes Tecnológicos do Consórcio',imageWidth:1619,imageHeight:971},
  floresta:{tone:'nature',scene:'floresta',emblem:LeafIcon,note:'A Grande Floresta, exuberante e perigosa',imageWidth:1672,imageHeight:941},
  caixa:{tone:'tech',scene:'caixa',emblem:Building2,note:'A Caixa e sua Torre do Tempo',imageWidth:1672,imageHeight:941},
  deserto:{tone:'ember',scene:'deserto',emblem:Moon,note:'O Grande Deserto entre o dia e a noite',imageWidth:1672,imageHeight:941},
  consorcio:{tone:'tech',scene:'consorcio',emblem:Shield,note:'A sede oculta e o poder do Consórcio',imageWidth:1672,imageHeight:941},
  bercos:{tone:'flux',scene:'bercos',emblem:LeafIcon,note:'Os Berços e a grande árvore branca',imageWidth:1672,imageHeight:941},
  minerio:{tone:'flux',scene:'minerio',emblem:Gem,note:'A jazida de Minério de Fluxo',imageWidth:1672,imageHeight:941},
  lingua:{tone:'flux',scene:'lingua',emblem:Feather,note:'Os glifos da Língua Mãe',imageWidth:1672,imageHeight:941},
  escultores:{tone:'duo',scene:'escultores',emblem:Feather,note:'Escultores de diferentes estilos gravando a Língua Mãe',imageWidth:1672,imageHeight:941},
  herdeiros:{tone:'duo',scene:'herdeiros',emblem:Crown,note:'Os diferentes Herdeiros diante do futuro de ambos os mundos',imageWidth:1672,imageHeight:941}
};
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII'];
type StoryPage = Chapter & { chapterId:string; scene:string; tone:string; note:string; emblem:typeof Sparkles; imageWidth:number; imageHeight:number; partLabel?:string };
function pageFor(ch:Chapter, artId = ch.id, opts:Partial<StoryPage> = {}):StoryPage {
  return {...ch,chapterId:ch.id, ...ART[artId]!, ...opts};
}
const READING_PAGES: StoryPage[] = CHAPTERS.flatMap(chapter => {
  if (chapter.id === 'primeiro-gaki') return [
    pageFor(chapter),
    pageFor(GREAT_WAR, 'guerra', {chapterId:chapter.id,partLabel:'INTERLÚDIO · ANTES DA GRANDE SEPARAÇÃO'})
  ];
  if (chapter.id === 'terras') return (['floresta','caixa','deserto'] as const).map((id,i) =>
    pageFor({...chapter,...LANDS[id],id},id,{chapterId:'terras',partLabel:`AS TERRAS · ${i+1} DE 3`})
  );
  return [pageFor(chapter)];
});
const firstPageOf = (id:string) => READING_PAGES.findIndex(page=>page.chapterId===id);

/** Realça Fluxo/Karma sem alterar nenhuma palavra do manuscrito. */
function Ink({ children }: { children: string }) {
  return <>{children.split(/(Fluxo|Karma)/gi).map((part, index) => {
    if (/^fluxo$/i.test(part)) return <strong className="hs-ink-flux" key={index}>{part}</strong>;
    if (/^karma$/i.test(part)) return <strong className="hs-ink-karma" key={index}>{part}</strong>;
    return <span key={index}>{part}</span>;
  })}</>;
}

type SpreadProps = {page:StoryPage; index:number; continuous?:boolean; onPrevious?:()=>void; onNext?:()=>void};
function StorySpread({page,index,continuous=false,onPrevious,onNext}:SpreadProps){
  const Icon = page.emblem;
  const artPath = `/historia/cenas/livro/${page.scene}`;
  const chapterIndex = CHAPTERS.findIndex(ch=>ch.id===page.chapterId);
  const ordinal = ROMAN[chapterIndex] ?? String(chapterIndex+1);
  const gesture = useRef<{x:number;y:number}|null>(null);
  const isFirst = index===0;
  return <article
    className={`hs-story-spread hs-theme-${page.tone} ${continuous?'hs-story-spread-continuous':''}`}
    id={`historia-${page.id}`} aria-label={`${page.partLabel??`Capítulo ${ordinal}`}: ${page.title}`}
    onTouchStart={event=>{if(!continuous&&event.touches[0])gesture.current={x:event.touches[0].clientX,y:event.touches[0].clientY};}}
    onTouchEnd={event=>{
      if(continuous||!gesture.current||!event.changedTouches[0])return;
      const dx=event.changedTouches[0].clientX-gesture.current.x;
      const dy=event.changedTouches[0].clientY-gesture.current.y;
      gesture.current=null;
      if(Math.abs(dx)>80&&Math.abs(dx)>Math.abs(dy)*1.8) (dx<0?onNext:onPrevious)?.();
    }}>
    <div className="hs-spread-inner">
      <div className="hs-story-narrative" tabIndex={0} aria-label={`Texto de ${page.title}`}>
        <header className="hs-spread-title">
          <span className="hs-chapter-number"><span aria-hidden="true">✧ ─── ✦ ─── ✧</span> CAPÍTULO {ordinal}<span aria-hidden="true">✧ ─── ✦ ─── ✧</span></span>
          <h2>{page.title}</h2>
          <p className="hs-chapter-deck"><Ink>{page.subtitle}</Ink></p>
          {page.partLabel&&<p className="hs-part-label">{page.partLabel}</p>}
          <span className="hs-spread-rule" aria-hidden="true">─────── ✧ ✦ ✧ ───────</span>
        </header>
        <div className="hs-narrative-passages">
          {[page.left,page.right,...(page.extra??[])].map((passage,part)=><section key={part} className={`hs-story-passage ${part>1?'hs-story-passage--lore':''}`}>
            <h3>{passage.heading}</h3>
            {passage.paragraphs.map((paragraph,pidx)=><p key={pidx}><Ink>{paragraph}</Ink></p>)}
          </section>)}
        </div>
        <footer className="hs-spread-source"><span>{page.source}</span><span>HERDEIROS · O DESPERTAR</span></footer>
      </div>
      <figure className="hs-story-illustration hs-approved-art"
        style={{backgroundImage:`url(${artPath}-760.webp)`}} aria-label={`Ilustração aprovada: ${page.note}`}>
        <picture>
          <source type="image/webp" srcSet={`${artPath}-480.webp 480w, ${artPath}-760.webp 760w, ${artPath}-1520.webp 1520w, ${artPath}-full.webp ${page.imageWidth}w`}
            sizes="(max-width: 820px) 100vw, (max-width: 1320px) 50vw, 43vw"/>
          <img src={`${artPath}-original.png`} alt={page.note} width={page.imageWidth} height={page.imageHeight}
            decoding="async" fetchPriority={isFirst&&!continuous?'high':'auto'} loading={isFirst&&!continuous?'eager':'lazy'} draggable={false}/>
        </picture>
        <figcaption><Icon size={17} aria-hidden="true"/><span>{page.note}</span></figcaption>
      </figure>
      <span className="hs-edge hs-edge-left" aria-hidden="true"/>
      <span className="hs-edge hs-edge-right" aria-hidden="true"/>
      <span className="hs-edge hs-edge-top" aria-hidden="true"/>
      <span className="hs-edge hs-edge-bottom" aria-hidden="true"/>
      <span className="hs-spread-glyph" aria-hidden="true">✧</span>
      <span className="hs-spread-seal" aria-hidden="true">✥</span>
      {!continuous&&<nav className="hs-parchment-turn" aria-label="Passar para outro pergaminho">
        <button type="button" onClick={onPrevious} disabled={index===0} aria-label="Pergaminho anterior" title="Pergaminho anterior"><ChevronLeft size={24}/></button>
        <span aria-label={`Pergaminho ${index+1} de ${READING_PAGES.length}`}>{index+1} <small>/ {READING_PAGES.length}</small></span>
        <button type="button" onClick={onNext} disabled={index===READING_PAGES.length-1} aria-label="Próximo pergaminho" title="Próximo pergaminho"><ChevronRight size={24}/></button>
      </nav>}
      {continuous&&<span className="hs-continuous-number" aria-label={`Pergaminho ${index+1} de ${READING_PAGES.length}`}>{index+1} / {READING_PAGES.length}</span>}
    </div>
  </article>;
}

export function StoryBookPage({onHome}:{onHome:()=>void}) {
  const [active,setActive]=useState(0);
  const [indexOpen,setIndexOpen]=useState(false);
  const [continuous,setContinuous]=useState(false);
  const top=useRef<HTMLElement>(null);
  const page=READING_PAGES[active]??READING_PAGES[0]!;
  useEffect(()=>{
    const shell=document.querySelector('.app-shell');
    shell?.classList.add('hs-history-shell');
    return ()=>shell?.classList.remove('hs-history-shell');
  },[]);

  const choose=(index:number)=>{
    const selected=Math.min(Math.max(index,0),READING_PAGES.length-1);
    setActive(selected);
    setIndexOpen(false);
    requestAnimationFrame(()=>{
      const target=continuous?document.getElementById(`historia-${READING_PAGES[selected]?.id}`):top.current;
      target?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      if(!continuous)document.querySelector<HTMLElement>('.hs-story-spread:not(.hs-story-spread-continuous) .hs-story-narrative')?.scrollTo({top:0});
    });
  };
  useEffect(()=>{
    if(!continuous) return;
    // Entrar em leitura corrida preserva o trecho atualmente selecionado.
    requestAnimationFrame(()=>document.getElementById(`historia-${READING_PAGES[active]?.id}`)?.scrollIntoView({block:'start'}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[continuous]);
  useEffect(()=>{
    const keyDown=(event:KeyboardEvent)=>{
      if(continuous||event.altKey||event.ctrlKey||event.metaKey)return;
      if(event.target instanceof HTMLElement&&(event.target.isContentEditable||['INPUT','TEXTAREA','SELECT','BUTTON'].includes(event.target.tagName)))return;
      if(event.key==='ArrowRight'&&active<READING_PAGES.length-1){event.preventDefault();choose(active+1);}
      if(event.key==='ArrowLeft'&&active>0){event.preventDefault();choose(active-1);}
    };
    window.addEventListener('keydown',keyDown);
    return ()=>window.removeEventListener('keydown',keyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[active,continuous]);
  useEffect(()=>{
    if(!continuous||!('IntersectionObserver' in window))return;
    const obs=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){
        const i=READING_PAGES.findIndex(item=>entry.target.id===`historia-${item.id}`);
        if(i>=0)setActive(i);
      }
    },{rootMargin:'-10% 0px -65% 0px',threshold:0});
    document.querySelectorAll('.hs-story-spread-continuous').forEach(el=>obs.observe(el));
    return ()=>obs.disconnect();
  },[continuous]);

  return <section className="hs-story-page" aria-label="A História de Arcádia" ref={top}>
    <div className="hs-story-toolbar">
      <button type="button" className="hs-index-toggle" aria-expanded={indexOpen} aria-controls="hs-story-index" onClick={()=>setIndexOpen(v=>!v)}>
        <List size={18}/> Índice dos capítulos
      </button>
      <div className="hs-view-switch" role="group" aria-label="Modo de leitura">
        <button type="button" className={!continuous?'active':''} aria-pressed={!continuous} onClick={()=>setContinuous(false)}><BookOpen size={16}/> Pergaminhos</button>
        <button type="button" className={continuous?'active':''} aria-pressed={continuous} onClick={()=>setContinuous(true)}><ScrollText size={16}/> Leitura corrida</button>
      </div>
    </div>
    <div className="hs-story-layout">
      <aside id="hs-story-index" className={`hs-story-index ${indexOpen?'is-open':''}`} aria-label="Índice dos 17 capítulos">
        <div className="hs-index-intro"><span className="hs-index-crest" aria-hidden="true">✧</span><h1>A HISTÓRIA DE ARCÁDIA</h1></div>
        <nav className="hs-index-chapters" aria-label="Escolher capítulo">
          {CHAPTERS.map((item,i)=>{
            const selected=page.chapterId===item.id;
            const glyph=ART[item.id==='terras'?'floresta':item.id]?.emblem??Sparkles;
            const Glyph=glyph;
            return <div key={item.id} className="hs-index-group">
              <button type="button" className={`hs-index-row ${selected?'selected':''}`} onClick={()=>choose(firstPageOf(item.id))} aria-current={selected?'page':undefined}>
                <span className="hs-index-symbol" aria-hidden="true"><Glyph size={16}/></span>
                <span className="hs-index-row-text"><strong>{ROMAN[i]}. {item.title}</strong><small>{selected?item.subtitle:''}</small></span>
                <ChevronRight size={14} className="hs-index-chevron" aria-hidden="true"/>
              </button>
              {item.id==='primeiro-gaki'&&<button type="button" className={`hs-index-subrow ${page.id==='guerra'?'selected':''}`} onClick={()=>choose(READING_PAGES.findIndex(p=>p.id==='guerra'))}>↳ A Grande Guerra e a Traição</button>}
              {item.id==='terras'&&(['floresta','caixa','deserto'] as const).map(id=><button type="button" key={id} className={`hs-index-subrow ${page.id===id?'selected':''}`} onClick={()=>choose(READING_PAGES.findIndex(p=>p.id===id))}>↳ {LANDS[id].title}</button>)}
            </div>;
          })}
        </nav>
        <button type="button" className="hs-back-home" onClick={onHome}><Home size={16}/> Voltar ao portal</button>
      </aside>
      <div className="hs-reading-area">
        {continuous?<div className="hs-continuous-reader">{READING_PAGES.map((p,i)=><StorySpread key={p.id} page={p} index={i} continuous/>)}</div>
          :<StorySpread page={page} index={active} onPrevious={()=>choose(active-1)} onNext={()=>choose(active+1)}/>}
        <p className="hs-story-reading-tip">{continuous?'Leitura corrida · role a página para acompanhar toda a História de Arcádia':'Passe ao próximo pergaminho pelas setas · no celular, deslize para o lado · no PC, use ← e →'}</p>
        <div className="hs-story-colophon">HERDEIROS · O DESPERTAR — A HISTÓRIA DE ARCÁDIA</div>
      </div>
    </div>
  </section>;
}
