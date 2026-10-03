import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SectionHeading } from './Controls';

type Block = { title: string; text: string[] };
type Stage = { name: string; subtitle: string; text: string; passive?: string };
type Lineage = { key: string; name: string; epithet: string; intro: string; blocks: Block[]; stages: Stage[] };

const LINEAGES: Lineage[] = [
  {
    key: 'arcadianos', name: 'Arcadianos', epithet: 'Os Puros',
    intro: 'Os Arcadianos nascem com o benefício do Fluxo: já nascem sabendo moldá-lo. Para eles, o Fluxo é tão natural quanto respirar. Costumam ser nobres e vivem em Arcádia — mas essa facilidade traz o risco constante de corrupção do Ego e da alma, por excesso de confiança ou falta de disciplina.',
    blocks: [
      { title: 'Herdeiro Total (Macro)', text: ['Controla um aspecto elemental por completo. Um herdeiro do fogo pode fazer tudo que envolve fogo, limitado apenas pela imaginação e pela arma. Um herdeiro da água domina o ciclo inteiro: líquido, vapor e gelo.', 'Tem versatilidade absoluta, mas leva mais tempo para atingir a potência máxima em estados específicos.'] },
      { title: 'Fragmentos (Micro)', text: ['Especialistas em um único aspecto de um elemento. O fragmento de gelo controla somente o gelo — porém de forma muito mais abrangente e poderosa do que um herdeiro da água que também toca o gelo.', 'Limitados em versatilidade, superiores em potência e controle. São as pontas de lança táticas do Consórcio.'] },
      { title: 'Armas de Ego', text: ['Algumas Casas nascem com Armas de Ego passadas de geração em geração. Outros Arcadianos forjam a própria arma — a Arma de Vontade —, moldada pela mente durante o despertar (correntes, foices, arcos...), mantendo a essência elemental. Com o tempo, ela também ganha um ego.', 'A Arma Verdadeira é o estado em que o Ego assume forma física independente: luta ao lado do Herdeiro como aliado autônomo, um segundo cérebro de combate que permite reações em dobro e suporte tático imediato.'] },
    ],
    stages: [
      { name: 'Senshi', subtitle: 'O Iniciante', text: 'Foco no ESPIRITO para estabilizar o Fluxo no plano físico. A Arma de Ego desperta, mas é silenciosa, agindo apenas como catalisador elemental básico.', passive: 'Ao ter êxito em um acerto, recupera 2 PF.' },
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

export function LineagesPage() {
  const [sel, setSel] = useState('arcadianos');
  const l = LINEAGES.find(x => x.key === sel)!;
  return <>
    <div className="page-heading standalone"><div><span className="eyebrow subtle">CÓDICE / LINHAGENS</span><h1>As linhagens de <em>Arcádia.</em></h1><p className="muted-copy">Modos distintos de existir diante do Fluxo. Toque em uma linhagem para ler.</p></div></div>
    <div className="rules-layout">
      <aside className="rules-index"><span className="field-kicker">LINHAGENS</span>
        {LINEAGES.map((x, i) => <Button key={x.key} variant={x.key === sel ? 'secondary' : 'ghost'} className="justify-start" onClick={() => setSel(x.key)}><span>{String(i + 1).padStart(2, '0')}</span>&nbsp;{x.name}</Button>)}
      </aside>
      <div className="rules-content">
        <section className="rule-block"><SectionHeading number="✦" title={`${l.name}: ${l.epithet}`} /><p>{l.intro}</p></section>
        {l.blocks.map((b, i) => <section key={b.title} className="rule-block"><SectionHeading number={String(i + 1).padStart(2, '0')} title={b.title} />{b.text.map((t, j) => <p key={j}>{t}</p>)}</section>)}
        <section className="rule-block"><SectionHeading number="◆" title="Estágios de evolução e passivas" />
          {l.stages.map((s, i) => <div key={s.name} style={{ marginBottom: '1.25rem' }}>
            <p><strong>Nível {i + 1} — {s.name}</strong> <em>({s.subtitle})</em></p>
            <p>{s.text}</p>
            {s.passive && <p className="text-primary"><strong>Passiva:</strong> {s.passive}</p>}
          </div>)}
        </section>
      </div>
    </div>
  </>;
}
