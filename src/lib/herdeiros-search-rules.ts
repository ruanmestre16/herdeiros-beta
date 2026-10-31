// Índice de títulos oficiais do manual interativo em RulebookPage.tsx.
// Atualize quando novas regras forem acrescentadas ao manual.
export type SearchRule = { id: string; group: string; title: string; teaser: string };
export const SEARCH_RULES: SearchRule[] = [
  {
    "id": "teste-combinado",
    "group": "Comece aqui",
    "title": "Testes combinados",
    "teaser": "Some os dados dos dois atributos usados; não é um ataque de 1d20."
  },
  {
    "id": "criacao",
    "group": "Comece aqui",
    "title": "Criar um Herdeiro",
    "teaser": "Escolha linhagem, história e subclasse antes de distribuir atributos."
  },
  {
    "id": "atributos",
    "group": "Comece aqui",
    "title": "Atributos, dados e limites",
    "teaser": "CORPO, MENTE e ESPÍRITO — ou TECNOLOGIA para agentes."
  },
  {
    "id": "interpretacao",
    "group": "Comece aqui",
    "title": "Teste narrativo e DT",
    "teaser": "A narração define o atributo; o Mestre decide a dificuldade."
  },
  {
    "id": "turno",
    "group": "Combate",
    "title": "Economia de ações",
    "teaser": "Uma ação livre, uma padrão e uma de deslocamento."
  },
  {
    "id": "acerto",
    "group": "Combate",
    "title": "Acerto, dano e crítico",
    "teaser": "1d20 + dado de atributo contra Esquiva; empate favorece quem ataca."
  },
  {
    "id": "quem-bate",
    "group": "Combate",
    "title": "Que atributo usar para atacar?",
    "teaser": "A origem da arma importa mais do que a linhagem sozinha."
  },
  {
    "id": "iniciativa",
    "group": "Combate",
    "title": "Iniciativa e movimento",
    "teaser": "Role CORPO d20, fique com o maior resultado e some CORPO."
  },
  {
    "id": "reacoes",
    "group": "Combate",
    "title": "Esquivar, Bloquear e Contra-atacar",
    "teaser": "Uma reação por rodada, renovada quando seu turno começa."
  },
  {
    "id": "defesa-especial",
    "group": "Combate",
    "title": "Defesas contra Nomenclaturas",
    "teaser": "Parcial e Completa têm bloqueios próprios e sacrifícios de ações."
  },
  {
    "id": "danca",
    "group": "Combate",
    "title": "Dança de Batalha",
    "teaser": "Desviar de vários atacantes corpo a corpo exige ritmo."
  },
  {
    "id": "armas",
    "group": "Combate",
    "title": "Armas e dano base",
    "teaser": "Dados de armas e evolução de armamentos especiais."
  },
  {
    "id": "recitacoes",
    "group": "Fluxo",
    "title": "Nomenclaturas e recitações",
    "teaser": "Direta, Parcial e Completa têm custo, dano e duração distintos."
  },
  {
    "id": "criticos-nomenclaturas",
    "group": "Fluxo",
    "title": "Críticos de Nomenclaturas",
    "teaser": "Direta e Parcial dobram todos os dados; Completa tem 12d8 puro."
  },
  {
    "id": "absorver",
    "group": "Fluxo",
    "title": "Absorver Fluxo (PF)",
    "teaser": "O maior d20 de ESPÍRITO determina a faixa de absorção."
  },
  {
    "id": "forcar",
    "group": "Fluxo",
    "title": "Forçar o Fluxo",
    "teaser": "Gerar PF rapidamente exige pagar um preço em Karma."
  },
  {
    "id": "excedentes-campanha",
    "group": "Fluxo",
    "title": "Complemento: Forçar Fluxo com PF cheio",
    "teaser": "O aplicativo permite Forçar Fluxo mesmo com PF máximo."
  },
  {
    "id": "gs-critico-triplo",
    "group": "GS",
    "title": "Crítico Triplo da arma",
    "teaser": "A vantagem máxima da arma exige recurso antes do ataque e afeta somente os dados."
  },
  {
    "id": "gs",
    "group": "GS",
    "title": "Grau de Sincronia (GS)",
    "teaser": "Os marcos aparecem em 5, 7 e 10 GS; pontos não são gastos."
  },
  {
    "id": "gs-evoluido",
    "group": "GS",
    "title": "Estágio 1: Arma, Corpo ou Nomenclatura",
    "teaser": "Aprimorado em 5; Dominado em 7; efeito especial em 10."
  },
  {
    "id": "gs-2",
    "group": "GS",
    "title": "Estágio 2: caminhos das linhagens não tecnológicas",
    "teaser": "Mimetismo do Fluxo, Vingança Karmática e Nomenclatura Avançada."
  },
  {
    "id": "arcadianos",
    "group": "Linhagens",
    "title": "Arcadianos: nascidos no Fluxo",
    "teaser": "Completos, Fragmentos e a evolução das Armas de Ego."
  },
  {
    "id": "humanos",
    "group": "Linhagens",
    "title": "Humanos: Armas de Vínculo e imaginação",
    "teaser": "Poder moldado pela história, imaginação e vínculo."
  },
  {
    "id": "gakis",
    "group": "Linhagens",
    "title": "Gakis: corpo moldado e Karma",
    "teaser": "Irracional, Senciente, Inteligente e Velho."
  },
  {
    "id": "humano-passiva",
    "group": "Linhagens",
    "title": "Humano padrão: Ler o Fluxo Parcial",
    "teaser": "A passiva humana permite identificar um alvo e ganhar dano e Bloqueio contra ele."
  },
  {
    "id": "agente",
    "group": "Linhagens",
    "title": "Humano → Agente Tecnológico: atributos e arma",
    "teaser": "TECNOLOGIA substitui ESPÍRITO; PN substitui PF. Arma de Núcleo não usa MENTE."
  },
  {
    "id": "agente-ativacoes",
    "group": "Linhagens",
    "title": "Humano → Agente Tecnológico: Habilidades de Núcleo",
    "teaser": "Ativações Rápida, Calibrada e Plena substituem Nomenclaturas."
  },
  {
    "id": "agente-olho",
    "group": "Linhagens",
    "title": "Humano → Agente Tecnológico: Olho Tecnológico",
    "teaser": "Varredura, Predição e Anulação evoluem com o estágio."
  },
  {
    "id": "agente-carga",
    "group": "Linhagens",
    "title": "Humano → Agente Tecnológico: Carga e Forçar Núcleo",
    "teaser": "Absorver PN e forçar o gerador tecnológico têm custos distintos."
  },
  {
    "id": "gs-tech-1",
    "group": "GS",
    "title": "Agente Tecnológico (Humano): GS do Estágio 1",
    "teaser": "Arma de Núcleo, Corpo Modular ou Habilidade de Núcleo."
  },
  {
    "id": "gs-tech-2",
    "group": "GS",
    "title": "Agente Tecnológico (Humano): Engenharia de Obra-Prima",
    "teaser": "Núcleo auxiliar, Amplificação, Conceito Experimental e Obra-Prima."
  },
  {
    "id": "nucleo-estabilidade",
    "group": "Linhagens",
    "title": "Humano → Agente Tecnológico: Destruição do Núcleo",
    "teaser": "Estados especiais do Núcleo nesta campanha, diferentes do Karma espiritual."
  },
  {
    "id": "transferencia-tech",
    "group": "Linhagens",
    "title": "Humano → Agente Tecnológico: transferência de PN",
    "teaser": "Transferência restrita a agentes e tecnologia compatível."
  },
  {
    "id": "karma",
    "group": "Karma",
    "title": "Karma: Distorção, Berserker e Consumido",
    "teaser": "As faixas de 50%, 70% e 100% afetam corpo e mente."
  },
  {
    "id": "karma-campanha",
    "group": "Karma",
    "title": "Complemento: efeitos narrativos e alertas de Karma",
    "teaser": "Sinais pulsantes, testes de MENTE e morte como desfecho padrão."
  },
  {
    "id": "descanso",
    "group": "Karma",
    "title": "Descanso e recuperação",
    "teaser": "Recuperação de PV e redução de Karma segundo a qualidade do descanso."
  },
  {
    "id": "agonia",
    "group": "Narrativa",
    "title": "Agonia: três tentativas de sobrevivência",
    "teaser": "A 0 PV, uma sequência dramática de testes com DT definida pela narrativa."
  },
  {
    "id": "sacrificio",
    "group": "Narrativa",
    "title": "Sacrifício e Morte Definitiva",
    "teaser": "A técnica final do Herdeiro e as consequências de morrer em Arcádia."
  },
  {
    "id": "exploracao",
    "group": "Narrativa",
    "title": "Investigação e exploração",
    "teaser": "Pontos de Interesse, teste adequado e ajuda narrativa."
  },
  {
    "id": "elo",
    "group": "Narrativa",
    "title": "Elo entre aliados",
    "teaser": "Vínculo, confiança e Proteção Compartilhada."
  },
  {
    "id": "ancora",
    "group": "Narrativa",
    "title": "Âncora Sentimental",
    "teaser": "O objeto que conecta o Herdeiro à sua humanidade."
  },
  {
    "id": "moedas",
    "group": "Narrativa",
    "title": "Moedas do Destino",
    "teaser": "Recompensas por boas narrações e soluções criativas."
  },
  {
    "id": "habilidades",
    "group": "Narrativa",
    "title": "Habilidades Próprias",
    "teaser": "Usar com tempo normal, Tempo Dedicado ou Com Pressa."
  },
  {
    "id": "cicatrizes",
    "group": "Narrativa",
    "title": "Cicatrizes e Domínios de Fluxo",
    "teaser": "Marcas da jornada e regiões com efeitos extraordinários."
  }
];
