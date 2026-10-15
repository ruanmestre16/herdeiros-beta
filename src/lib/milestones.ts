/** Textos dos marcos de GS (Cap. VII). O caminho é definido no marco de 5 GS; os marcos de 7 e 10 seguem o mesmo caminho. */
export type MilestoneText = { title: string; text: string };
type ByGs = Record<5 | 7 | 10, MilestoneText>;

const TEXTS: Record<string, ByGs> = {
  arma: {
    5: { title: 'Arma Evoluída', text: 'O dado do atributo da arma entra no dano no lugar do valor fixo. Ex.: 1d8 + 1d6 em vez de 1d8 + 2. Opção de Vínculo de Fluxo: gastando 2 PF, o dano de Fluxo conta como dano normal contra Gakis.' },
    7: { title: 'Arma Dominada', text: 'Soma o dado do atributo e também o valor fixo do atributo. Ex.: 1d8 + 1d6 + 2.' },
    10: { title: 'Arma Estilizada', text: 'A arma ganha um efeito especial definido com o Mestre e libera o Crítico Triplo: 10 PF declarados antes do ataque. A margem de crítico do d20 passa a ser 20 menos o atributo de ataque e, se o ataque for crítico, os dados de dano são multiplicados por 3.' },
  },
  corpo: {
    5: { title: 'Corpo Evoluído', text: 'O dado de CORPO entra no dano no lugar do valor fixo de CORPO nos ataques de Corpo Moldado.' },
    7: { title: 'Corpo Dominado', text: 'Soma o dado de CORPO e o valor fixo de CORPO. Libera Ataque Extra: 3 PF depois de acertar o primeiro golpe, rolando 2d20 (fica com o menor) + dado de CORPO, 1x por rodada.' },
    10: { title: 'Corpo Estilizado', text: 'Libera O Chamado (5 PF, os alvos fazem teste de ESPÍRITO) e o Ataque Extra Refinado (10 PF, dois ataques normais sem desvantagem). Efeito especial definido com o Mestre.' },
  },
  nomenclatura: {
    5: { title: 'Nomenclatura Aprimorada', text: 'Vale para Direta, Parcial e Completa: o dado de ESPÍRITO entra na conta do dano. Com ESPÍRITO 3, +1d8 em vez de +3 fixo.' },
    7: { title: 'Nomenclatura Dominada', text: 'Soma o dado de ESPÍRITO e o valor fixo de ESPÍRITO ao dano. Parcial passa a custar 3 PF e Completa 10 PF; a Direta continua em 2 PF.' },
    10: { title: 'Nomenclatura Favorita', text: 'Escolha uma Nomenclatura: ela evolui para uma versão superior (mais dados, efeito novo ou alcance maior), gastando PF a mais. O efeito é definido com o Mestre.' },
  },
  mimetismo: {
    5: { title: 'Mimetismo · O Registro e o Inventário', text: 'A linhagem que escolher poderá registrar técnicas vistas em combate. Guarda até MENTE + ESPÍRITO habilidades copiadas. Ao presenciar uma técnica, faz um teste de MENTE + ESPÍRITO contra a DT do Mestre gastando 5 PF para gravá-la. Se falhar, a oportunidade se fecha permanentemente para aquela técnica. Receber o ataque diretamente facilita; técnicas de aliados exigem Elo alto ou dano proposital.' },
    7: { title: 'Mimetismo Dominado', text: 'Ativar a habilidade copiada junto com o ataque custa só 3 PF. Antes de atacar, declara o efeito e faz teste de MENTE + ESPÍRITO. O efeito é sempre em escala reduzida e adaptada.' },
    10: { title: 'Mimetismo Absoluto', text: 'Gastando 12 PF, dispensa testes: a execução é garantida e a técnica replica em escala máxima.' },
  },
  vinganca: {
    5: { title: 'Vingança Karmática', text: 'A linhagem que escolher poderá canalizar a dor recebida em retaliação. Gasta 3 PF antes do ataque. Se acertar, devolve 1/3 de todo o dano recebido até ali como dano bônus. Se errar, os PF são gastos e o bônus se perde.' },
    7: { title: 'Vingança Karmática Aprimorada', text: 'Gasta 5 PF antes do ataque. Devolve 1/2 do dano acumulado que tomou como dano fixo bônus no golpe. Se errar, os PF são consumidos.' },
    10: { title: 'Vingança Karmática Absoluta', text: 'Gasta 12 PF e não exige nenhum teste. Descarrega 100% do dano recebido no combate no próximo ataque e aplica ao alvo Karma igual à metade do dano devolvido.' },
  },
  nomenclatura_avancada: {
    5: { title: 'Nomenclatura Favorita Dupla', text: 'A linhagem que escolher poderá levar o Fluxo a outro patamar. Elege uma segunda Nomenclatura Favorita, evoluída para a versão superior com dados extras, alcance ou efeitos combinados com o Mestre.' },
    7: { title: 'A Voz e o Eco da Arma', text: 'Uma vez por cena, como ação livre e por 5 PF, usa a habilidade inerente da arma (ou possessão, ou poder especial). Só é possível usar até uma versão parcial da técnica da arma, nunca uma completa. Se errar o ataque, o efeito se desfaz e os PF são consumidos do mesmo jeito.' },
    10: { title: 'Fusão de Nomenclaturas', text: 'Gasta 12 PF para fundir duas Nomenclaturas conhecidas numa técnica sinérgica inédita. O ataque precisa acertar; se errar, os 12 PF são consumidos. Dano e efeito são definidos com o Mestre.' },
  },
  livre: {
    5: { title: 'Marco livre', text: 'Depois do Estágio 3, o que a evolução faz é conversa livre com o Mestre. A escolha deve ser narrada e justificada.' },
    7: { title: 'Marco livre', text: 'Depois do Estágio 3, o que a evolução faz é conversa livre com o Mestre. A escolha deve ser narrada e justificada.' },
    10: { title: 'Marco livre', text: 'Depois do Estágio 3, o que a evolução faz é conversa livre com o Mestre. A escolha deve ser narrada e justificada.' },
  },
};
export const milestoneText = (choice: string, gs: 5 | 7 | 10): MilestoneText => (TEXTS[choice] ?? TEXTS['livre']!)[gs];
