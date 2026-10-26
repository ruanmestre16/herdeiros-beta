import type { BestiaryTemplate } from './bestiary';
import type { Nomenclature } from './game';

/** Habilidades do Bestiário ficam na ficha do NPC, dentro do campo notes existente. */
export type MasterAbility = {
  id: string;
  name: string;
  description: string;
  type: 'habilidade' | 'nucleo' | 'gs' | 'tática' | 'nota';
  cost?: string;
};
export type MkEdition = 'livro' | 'campanha';
export type MkPreset = { edition: MkEdition; stage: number; path: string; description: string };

const uniqueId = (name: string, index: number) => `${index}-${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').slice(0,45)}`;
const cards = (rows: Array<[string,string,string?]>, type: MasterAbility['type']):MasterAbility[] => rows.map(([name, description, cost], i) => ({ id: uniqueId(name,i), name, description, type, ...(cost?{cost}:{}) }));

/** O texto transcrito do PDF pode conter quebras de linha no meio das frases.
 *  Conservamos o texto original separadamente; esta leitura é apenas a apresentação em cartões.
 */
export function splitBestiaryAbilities(raw: string): MasterAbility[] {
  const lines = (raw || '').replace(/\r/g,'').split('\n');
  const output: MasterAbility[] = [];
  let heading = '';
  let paragraph = '';
  let section: MasterAbility['type'] = 'habilidade';
  const flush = () => {
    if (!heading && !paragraph) return;
    const name = heading || 'Observação do Bestiário';
    output.push({id: uniqueId(name,output.length),name,description: paragraph.trim() || name,type: section});
    heading='';paragraph='';
  };
  for (const line of lines) {
    const l = line.trim();
    if(!l)continue;
    if (/^(?:TÁTICA|AJUSTES E USO|USO NA MESA|SUGESTÃO AO MESTRE|REAÇÕES NO NÍVEL QUENTE|TESTE DE CÓPIA(?: \(.*\))?)$/i.test(l)) {
      flush();heading=l;section=/TÁTICA/i.test(l)?'tática':'nota';continue;
    }
    // A transcrição usa "Nome da habilidade. explicação..."; evita dividir continuações comuns.
    const match = l.match(/^([A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ][^.?!:]{2,74}?)\s*\.\s+([a-záàâãéêíóôõúüç(].*)$/u);
    if (match && !/^(?:Exemplo|Sucesso|Falha|Dano|Crítico|Acerto|Grupo de referência|Mais agentes|Duração estimada|Núcleo da arma|Sem núcleo)/i.test(match[1])) {
      flush();heading=match[1].trim();paragraph=match[2].trim();section=/Núcleo|EMP|Escudo Cinético|Impulsor|Descarga|Protocolo|Módulo|Calibragem/i.test(heading)?'nucleo':'habilidade';
    } else if (/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][^.:]{3,54}:\s*\S/u.test(l) && paragraph.length>0) {
      flush();const parts=l.split(/:\s*/,2);heading=parts[0].trim();paragraph=parts[1]||'';section='nota';
    } else {
      paragraph += `${paragraph?' ':''}${l}`;
    }
  }
  flush();
  return output.length ? output : [];
}

/** A base do livro jamais é alterada. Estes são ajustes opcionais de campanha do Mestre. */
const MK_CONFIG: Record<string,{stage:number;pv:number;pf:number;na:number;path:string;description:string}> = {
 'agente-campo-mk1': {stage:1,pv:42,pf:22,na:4,path:'Estágio 1 · marcos de 5, 7 e 10 GS',description:'MK1 veterano com os aprimoramentos dos três caminhos de GS. Ajuste de campanha, acima do modelo oficial.'},
 'executor-mk2': {stage:2,pv:110,pf:28,na:11,path:'Estágio 2 · marcos de 5, 7 e 10 GS',description:'MK2 no segundo ciclo de evolução; habilidades especiais adaptadas pelo Mestre.'},
 'obra-prima-mk3': {stage:3,pv:250,pf:36,na:22,path:'Estágio 3 · domínio do Mestre',description:'MK3 com técnicas de mestre e um Conceito personalizável. O Mestre define a manifestação máxima.'},
};
export function mkConfigFor(id:string){return MK_CONFIG[id]??null;}

const MK1_GS = cards([
 ['5 GS · Núcleo Energizado','Dano da Arma de Núcleo recebe o dado de TECNOLOGIA no lugar do valor fixo; com 2 PN pode atingir Gakis como dano normal.','2 PN (opcional)'],
 ['5 GS · Corpo Modular Evoluído','Implantes usam TECNOLOGIA e somam o dado do atributo ao dano do módulo.'],
 ['5 GS · Habilidade de Núcleo Aprimorada','As Ativações Rápida, Calibrada e Plena recebem o dado de TECNOLOGIA no dano.'],
 ['7 GS · Arma de Núcleo Dominada','Dano da arma + dado de TECNOLOGIA + valor fixo de TECNOLOGIA.'],
 ['7 GS · Ataque Extra','Após acertar, pode tentar ataque adicional: 2d20 (menor) + dado de TECNOLOGIA; uma vez por rodada.','3 PN'],
 ['7 GS · Habilidade de Núcleo Dominada','Soma dado e valor fixo de TECNOLOGIA ao dano; Calibrada custa 3 PN e Plena 10 PN.'],
 ['10 GS · Crítico Triplo','Declarar antes do ataque; margem de crítico: 20 menos TECNOLOGIA (somente d20 natural). Dados triplicam se acertar.','10 PN'],
 ['10 GS · O Chamado e Ataque Extra Refinado','O Chamado provoca testes de reação; Ataque Refinado permite dois ataques normais consecutivos uma vez por rodada.','5 PN / 10 PN'],
 ['10 GS · Habilidade de Núcleo Favorita','Escolha uma habilidade de Núcleo para aprimorar com o Mestre: dados, alcance ou efeito adicional.'],
], 'gs');
const MK2_GS = cards([
 ['5 GS · Mimetismo Tecnológico','Registra até TECNOLOGIA + MENTE técnicas observadas; teste combinado de MENTE e TECNOLOGIA. Adaptação de campanha do segundo ciclo.','5 PN'],
 ['7 GS · Mimetismo Dominado','Integra uma técnica registrada à Arma de Núcleo numa versão reduzida. Teste de MENTE + TECNOLOGIA.','3 PN'],
 ['10 GS · Mimetismo Absoluto','Pode executar a técnica registrada na escala plena, após adaptação do Mestre.','12 PN'],
 ['5 GS · Vingança Karmática','Após declarar, devolve como bônus 1/3 do dano já sofrido se acertar.','3 PN'],
 ['7 GS · Vingança Aprimorada','Devolve metade do dano sofrido como bônus fixo após acertar.','5 PN'],
 ['10 GS · Vingança Absoluta','Devolve integralmente o dano sofrido no combate e aplica Karma equivalente à metade.','12 PN'],
 ['5 GS · Núcleo Favorito Duplo','Escolha duas Habilidades de Núcleo favoritas e defina seus aprimoramentos com o Mestre.'],
 ['7 GS · Voz e Eco da Arma','Permite acionar habilidade inerente da Arma de Núcleo como ação livre, até escala parcial; uma vez por cena.','5 PN'],
 ['10 GS · Fusão de Protocolos','Combina dois protocolos conhecidos num só efeito, com aprovação do Mestre; PN são gastos na tentativa.','12 PN'],
], 'gs');
const MK3_GS = cards([
 ['Mestre · Conceito da Obra-Prima','O Mestre define Conceito, Manifestação, Ápice e Preço da Arma. Mantém todas as habilidades próprias descritas no Bestiário.'],
 ['Mestre · Domínio do Núcleo','Aprimoramentos de estágio 3 são definidos narrativamente pelo Mestre. Ajuste as reservas, alcance e efeitos conforme a mesa.'],
 ['Mestre · Ápice do Conceito','Manifestação máxima personalizada. Dano e custo devem ser preenchidos na ficha e anunciados antes do ataque.'],
], 'gs');
export function mkCampaignCards(id:string):MasterAbility[] {
 return id==='agente-campo-mk1'?MK1_GS:id==='executor-mk2'?MK2_GS:id==='obra-prima-mk3'?MK3_GS:[];
}
export function mkCampaignValues(t:BestiaryTemplate,edition:MkEdition) {
 const cfg=mkConfigFor(t.id);
 if(edition==='livro'||!cfg)return {pv:t.pv,pf:t.pf,na:t.na,stage:0};
 return {pv:cfg.pv,pf:cfg.pf,na:cfg.na,stage:cfg.stage};
}
export function makeAbility(name='Nova habilidade',type:MasterAbility['type']='habilidade'):MasterAbility {
 return {id:`custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,name,description:'',type};
}

/** Três Ativações de Núcleo oficiais na escala 2/5/12 PN; nomes são sugestões editáveis de campanha. */
export function mkNucleusProtocols(id:string):MasterAbility[] {
 if (!mkConfigFor(id)) return [];
 const suffix=id==='agente-campo-mk1'?'de Campo':id==='executor-mk2'?'do Executor':'da Obra-Prima';
 return cards([
  [`Ativação Rápida · Pulso ${suffix}`,`Ação padrão. Acerto: 1d20 + dado de TECNOLOGIA contra Esquiva. Dano-base 1d6 (crítico 2d6). Defina um efeito adicional com o Mestre.`, '2 PN'],
  [`Ativação Calibrada · Protocolo ${suffix}`,`Ação padrão + deslocamento. Acerto: 1d20 + dado de TECNOLOGIA. Dano-base 2d8 (crítico 4d8).`, '5 PN'],
  [`Ativação Plena · Autorização ${suffix}`,`Conjuração completa até a próxima vez; regras de interrupção da Completa. Acerto: 1d20 + dado de TECNOLOGIA. Dano-base 6d8 (crítico 12d8).`, '12 PN'],
 ],'nucleo');
}

/** Mantém as três Ativações editadas ligadas ao painel de combate e à ficha completa. */
export function nucleusAsNomenclatures(source:MasterAbility[]):Nomenclature[] {
 const names = ['Direta','Parcial','Completa'] as const;
 return source.slice(0,3).map((a,i)=>({
  name:a.name,kind:names[i]??'Direta',family:'Protocolos de Núcleo',
  cost:[2,5,12][i]??2,effect:a.description,
 }));
}
