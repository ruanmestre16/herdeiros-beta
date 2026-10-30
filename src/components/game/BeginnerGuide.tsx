import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight, Compass, Crown, GraduationCap, LockKeyhole, RotateCcw, Shield, Sparkles, Swords, Users, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import './beginner-guide.css';

export type GuideDestination = 'inicio' | 'historia' | 'jogador' | 'mesa' | 'mestre' | 'regras' | 'bestiario' | 'linhagens';
export type GuideAction = 'create' | 'npcs' | 'combate' | 'exploracao' | 'campanhas';
type Track = 'jogador' | 'mestre';

type Lesson = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  detail: string;
  reminders: readonly string[];
  question: string;
  answers: readonly [string, string, string];
  correct: number;
  explanation: string;
  destination: GuideDestination;
  action?: GuideAction;
  cta: string;
};

type Progress = Record<Track, string[]>;
const initialProgress = (): Progress => ({ jogador: [], mestre: [] });

const lessons: Record<Track, readonly Lesson[]> = {
  jogador: [
    {
      id: 'universo', eyebrow: '01 / O UNIVERSO', title: 'O Primeiro Movimento',
      subtitle: 'Conheça o mundo antes de entrar na aventura.',
      detail: 'Em Herdeiros, o Fluxo está ligado à existência e o Karma à sua oposição. A história de Arcádia e do Mundo Espelho nasce dessa relação, que vai muito além de uma escolha simples entre bem e mal.',
      reminders: ['Fluxo e Karma são energias, não personagens.', 'Arcádia e Mundo Espelho compartilham uma origem.', 'A História apresenta a cronologia do Códice.'],
      question: 'Qual afirmação combina com o universo de Herdeiros?',
      answers: ['Fluxo e Karma são dois reinos governados por deuses.', 'Fluxo e Karma são energias fundamentais do universo.', 'O Karma só existe dentro dos equipamentos.'],
      correct: 1, explanation: 'Exato. Essas duas forças fazem parte da origem e da história dos mundos.',
      destination: 'historia', cta: 'Explorar a História',
    },
    {
      id: 'criacao', eyebrow: '02 / PERSONAGEM', title: 'Desperte seu Herdeiro',
      subtitle: 'Escolha a linhagem e crie uma ficha de verdade.',
      detail: 'O criador de personagens te acompanha pelas etapas de identidade, atributos e recursos. Sua história e sua linhagem ajudam a dar sentido às habilidades que terá na campanha.',
      reminders: ['Linhagens: Humano, Arcadiano, Gaki ou Agente Tecnológico.', 'Os atributos começam em 1; a criação distribui mais 3 pontos.', 'O Agente Tecnológico usa Tecnologia no lugar de Espírito.'],
      question: 'O que muda na ficha de um Agente Tecnológico?',
      answers: ['Troca Espírito por Tecnologia.', 'Não possui atributos.', 'Só pode ser controlado pelo Mestre.'],
      correct: 0, explanation: 'Isso mesmo. O atributo Tecnologia representa o caminho próprio dos agentes.',
      destination: 'jogador', action: 'create', cta: 'Criar minha primeira ficha',
    },
    {
      id: 'ficha', eyebrow: '03 / RECURSOS', title: 'Aprenda a ler sua ficha',
      subtitle: 'Vida, Fluxo e progressão sempre à mão.',
      detail: 'Na ficha interativa, acompanhe os pontos de vida, os pontos de Fluxo, os atributos, as armas e a evolução por Grau de Sincronia. Os controles são reais: alterações feitas na ficha podem ser salvas.',
      reminders: ['PV acompanha a resistência do personagem.', 'PF representa os Pontos de Fluxo usados por técnicas.', 'GS significa Grau de Sincronia e participa da progressão.'],
      question: 'Qual recurso costuma ser gasto ao utilizar Nomenclaturas?',
      answers: ['PV de todos os aliados.', 'PF, os Pontos de Fluxo.', 'O código de acesso da mesa.'],
      correct: 1, explanation: 'Correto! Consulte os custos da técnica antes de utilizá-la.',
      destination: 'jogador', cta: 'Abrir minha ficha',
    },
    {
      id: 'nomenclaturas', eyebrow: '04 / TÉCNICAS', title: 'Dê nome ao seu poder',
      subtitle: 'Entenda as três formas de Nomenclatura.',
      detail: 'Nomenclaturas não são apenas números: a forma de recitação muda o custo e o tempo de execução. O Códice explica as condições de cada forma, inclusive canalização e interrupções.',
      reminders: ['Direta utiliza a ação padrão.', 'Parcial utiliza a ação padrão e a de deslocamento.', 'Completa exige canalização até o próximo turno do conjurador.'],
      question: 'Qual recitação exige canalização entre turnos?',
      answers: ['Direta.', 'Parcial.', 'Completa.'],
      correct: 2, explanation: 'Perfeito. A Completa exige planejamento e atenção à defesa.',
      destination: 'regras', cta: 'Ver regras de Nomenclaturas',
    },
    {
      id: 'combate', eyebrow: '05 / BATALHA', title: 'Seu primeiro combate',
      subtitle: 'Ataque, defesa e escolha de reações.',
      detail: 'O combate usa o resultado do ataque contra a Esquiva. Quando houver uma reação disponível, você poderá escolher como responder. O Mestre administra a rodada e confirma as ações da mesa.',
      reminders: ['O ataque comum usa 1d20 + dado do atributo aplicável.', 'Esquivar compara o ataque à Esquiva; Bloquear reduz dano.', 'Contra-atacar exige superar o resultado do atacante.'],
      question: 'Qual das opções é uma reação de combate?',
      answers: ['Contra-atacar.', 'Trocar a linhagem durante o turno.', 'Apagar a mesa.'],
      correct: 0, explanation: 'Isso! Esquivar e Bloquear também são reações possíveis.',
      destination: 'mesa', cta: 'Conhecer a área da Mesa',
    },
    {
      id: 'mesa', eyebrow: '06 / AVENTURA', title: 'Entre na mesa e jogue',
      subtitle: 'Leve seu personagem para uma campanha.',
      detail: 'A área Mesa / Mestre permite entrar com código e senha ou por convite. Depois, selecione qual ficha representará você na campanha para participar das cenas e do combate compartilhado.',
      reminders: ['Use a conta e o convite da campanha correta.', 'Escolha sua ficha na mesa após entrar.', 'Acompanhe a cena, os aliados e o combate ao vivo.'],
      question: 'O que você precisa fazer para jogar com sua ficha na mesa?',
      answers: ['Excluir o personagem antes de entrar.', 'Entrar na campanha e selecionar sua ficha.', 'Criar uma nova conta a cada sessão.'],
      correct: 1, explanation: 'Exatamente. A ficha selecionada passa a representar você naquela mesa.',
      destination: 'mesa', cta: 'Ir para a Mesa',
    },
    {
      id: 'descoberta', eyebrow: '07 / DESCOBERTA', title: 'A jornada continua',
      subtitle: 'Use as áreas de consulta para aprender no seu ritmo.',
      detail: 'O site reúne regras, linhagens, bestiário, história e atlas. Essas seções ajudam a consultar o mundo e as mecânicas sem interromper a campanha.',
      reminders: ['Regras: consulta de mecânicas e exemplos.', 'Linhagens: características dos caminhos jogáveis.', 'História: capítulos e exploração do universo.'],
      question: 'Onde você consulta detalhes das mecânicas de jogo?',
      answers: ['Na seção Regras.', 'Na senha da mesa.', 'Somente excluindo sua ficha.'],
      correct: 0, explanation: 'Certo. O Códice continua disponível para consultas durante a aventura.',
      destination: 'regras', cta: 'Consultar o Códice',
    },
  ],
  mestre: [
    {
      id: 'preparar-mesa', eyebrow: '01 / PREPARAÇÃO', title: 'Reúna sua mesa',
      subtitle: 'Crie a campanha e convide seus jogadores.',
      detail: 'Na visão do Mestre, você pode criar uma mesa e organizar sua sessão. Compartilhe o código e a senha somente com os participantes que deseja convidar.',
      reminders: ['Crie uma nova mesa na área do Mestre.', 'Defina o acesso da campanha.', 'Peça para cada jogador selecionar sua ficha ao entrar.'],
      question: 'Qual é o primeiro passo para organizar uma nova campanha?',
      answers: ['Criar a mesa na área do Mestre.', 'Excluir as fichas dos jogadores.', 'Liberar anotações privadas publicamente.'],
      correct: 0, explanation: 'Isso mesmo. A mesa reúne os personagens e os eventos da campanha.',
      destination: 'mestre', cta: 'Abrir ferramentas do Mestre',
    },
    {
      id: 'povoar', eyebrow: '02 / PERSONAGENS', title: 'Dê vida ao cenário',
      subtitle: 'Prepare NPCs, monstros e aliados.',
      detail: 'A seção NPCs e inimigos permite criar personagens próprios, criaturas originais e fichas baseadas no Bestiário. Confira quais dados podem ser revelados aos jogadores.',
      reminders: ['Selecione um modelo ou crie um monstro do zero.', 'Revise PV, PF, armas e capacidades da criatura.', 'Controle a visibilidade de nome, vida e ficha.'],
      question: 'Qual recurso ajuda a preparar criaturas para a sessão?',
      answers: ['Apagar as Nomenclaturas dos jogadores.', 'NPCs e inimigos na visão do Mestre.', 'Alterar a senha de outro usuário.'],
      correct: 1, explanation: 'Correto! Assim você organiza os envolvidos no encontro.',
      destination: 'mestre', action: 'npcs', cta: 'Preparar NPCs e inimigos',
    },
    {
      id: 'narrar-combate', eyebrow: '03 / COMBATE', title: 'Conduza a rodada',
      subtitle: 'Organize turnos, ações e reações.',
      detail: 'O painel de combate permite acompanhar a iniciativa e as ações dos participantes. A confirmação do Mestre ajuda a manter o estado do combate sincronizado.',
      reminders: ['Confirme a campanha correta antes de iniciar.', 'Acompanhe a ordem de turnos.', 'Revise ataques, defesas e reações antes de aplicar resultados.'],
      question: 'Quem acompanha e confirma as ações da mesa?',
      answers: ['A página de História.', 'O Mestre no painel de combate.', 'O arquivo de backup do navegador.'],
      correct: 1, explanation: 'Exatamente. O Mestre conduz a cena e administra o combate.',
      destination: 'mestre', action: 'combate', cta: 'Abrir painel de Combate',
    },
    {
      id: 'explorar', eyebrow: '04 / EXPLORAÇÃO', title: 'Prepare o desconhecido',
      subtitle: 'Pontos de interesse e Domínios de Fluxo.',
      detail: 'Use Exploração para estruturar descobertas e desafios. O Mestre pode trabalhar com segredos e visibilidade para revelar informações apenas quando fizer sentido na história.',
      reminders: ['Crie pontos de interesse para a campanha.', 'Defina segredos e condições das descobertas.', 'Revise o que os jogadores podem visualizar.'],
      question: 'Por que revisar a visibilidade de um ponto de interesse?',
      answers: ['Para não revelar segredos antes da hora.', 'Para reduzir os PV de toda a mesa.', 'Para alterar automaticamente a linhagem dos jogadores.'],
      correct: 0, explanation: 'Isso! Informações privadas devem continuar exclusivas do Mestre.',
      destination: 'mestre', action: 'exploracao', cta: 'Abrir Exploração',
    },
    {
      id: 'campanhas', eyebrow: '05 / CRÔNICA', title: 'Registre o que aconteceu',
      subtitle: 'Sessões, objetivos e memória da aventura.',
      detail: 'A Central de Campanhas organiza o histórico da sua mesa. Você pode planejar sessões, acompanhar objetivos e registrar acontecimentos importantes da jornada.',
      reminders: ['Sessões organizam a sequência da campanha.', 'Objetivos mostram o que ainda está em aberto.', 'A Crônica reúne os acontecimentos importantes.'],
      question: 'Onde ficam Sessões, Objetivos e Crônica?',
      answers: ['Na Central de Campanhas.', 'No editor de avatar.', 'Nas configurações do navegador.'],
      correct: 0, explanation: 'Exato. Essa é a memória estruturada da campanha.',
      destination: 'mesa', action: 'campanhas', cta: 'Abrir Central de Campanhas',
    },
    {
      id: 'biblioteca', eyebrow: '06 / ARQUIVOS', title: 'Guarde os segredos do Mestre',
      subtitle: 'Organize documentos, pistas, imagens e mapas.',
      detail: 'Na aba Biblioteca da Central de Campanhas, materiais privados ficam sob controle do Mestre. Você decide quando um item pode ser revelado à mesa.',
      reminders: ['Guarde notas e pistas ligadas à campanha.', 'Use materiais privados para preparar revelações.', 'Revise a opção de compartilhamento antes de publicar.'],
      question: 'O que acontece com um item marcado como privado do Mestre?',
      answers: ['Todos recebem uma cópia pública.', 'Ele deve ficar oculto dos jogadores.', 'Ele apaga automaticamente os eventos.'],
      correct: 1, explanation: 'Perfeito. A biblioteca separa preparação privada e materiais revelados.',
      destination: 'mesa', action: 'campanhas', cta: 'Abrir Biblioteca do Mestre',
    },
  ],
};

const parseProgress = (raw: string | null): Progress => {
  if (!raw) return initialProgress();
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return initialProgress();
    const obj = value as Record<string, unknown>;
    const valid = (track: Track): string[] => {
      const allowed = new Set(lessons[track].map(lesson => lesson.id));
      return Array.isArray(obj[track]) ? obj[track].filter((id): id is string => typeof id === 'string' && allowed.has(id)) : [];
    };
    return { jogador: valid('jogador'), mestre: valid('mestre') };
  } catch { return initialProgress(); }
};

export function BeginnerGuide({
  userId, hasCharacter, hasCampaign, onNavigate, onLogin,
}: {
  userId: string | null;
  hasCharacter: boolean;
  hasCampaign: boolean;
  onNavigate: (destination: GuideDestination, action?: GuideAction) => void;
  onLogin: () => void;
}) {
  const storageKey = `herdeiros.guia-iniciantes.v1.${userId ?? 'visitante'}`;
  const [track, setTrack] = useState<Track>('jogador');
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [answered, setAnswered] = useState<Record<string, number>>({});
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    try { setProgress(parseProgress(window.localStorage.getItem(storageKey))); }
    catch { setProgress(initialProgress()); }
  }, [storageKey]);

  const steps = lessons[track];
  const current = steps[index] ?? steps[0];
  const doneIds = progress[track];
  const finished = doneIds.includes(current.id);
  const allCount = lessons.jogador.length + lessons.mestre.length;
  const totalDone = progress.jogador.length + progress.mestre.length;
  const currentPercent = Math.round((doneIds.length / steps.length) * 100);
  const selectedAnswer = answered[`${track}:${current.id}`];
  const answerCorrect = selectedAnswer === current.correct;
  const nextPending = useMemo(() => steps.findIndex(step => !doneIds.includes(step.id)), [steps, doneIds]);

  function save(next: Progress) {
    setProgress(next);
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Armazenamento opcional */ }
  }
  function completeCurrent() {
    if (finished) return;
    save({ ...progress, [track]: [...progress[track], current.id] });
  }
  function answer(option: number) {
    setAnswered(prev => ({ ...prev, [`${track}:${current.id}`]: option }));
    if (option === current.correct) completeCurrent();
  }
  function changeTrack(next: Track) {
    setTrack(next);
    const ids = progress[next];
    const first = lessons[next].findIndex(step => !ids.includes(step.id));
    setIndex(first === -1 ? 0 : first);
    setShowReset(false);
  }
  function resetTrack() {
    save({ ...progress, [track]: [] });
    setIndex(0);
    setAnswered(prev => Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith(`${track}:`))));
    setShowReset(false);
  }

  return <section className="hg-guide" aria-labelledby="hg-page-title">
    <div className="hg-hero">
      <div className="hg-hero-copy">
        <span className="hg-overline"><GraduationCap size={16} aria-hidden="true"/> HERDEIROS · ESCOLA DO DESPERTAR</span>
        <h1 id="hg-page-title">Seu primeiro passo <em>começa aqui.</em></h1>
        <p>Aprenda a jogar ou mestrar com missões rápidas, perguntas de treino e atalhos para as áreas reais do Herdeiros. Sem alterar sua ficha durante o treinamento.</p>
        <div className="hg-hero-tags"><span><CheckCircle2 size={14}/> Gratuito</span><span><BookOpen size={14}/> No seu ritmo</span><span><Shield size={14}/> Sem mudanças automáticas na mesa</span></div>
      </div>
      <div className="hg-hero-symbol" aria-hidden="true"><Sparkles size={60}/><span>INICIAÇÃO</span></div>
    </div>

    <div className="hg-summary" aria-live="polite">
      <div><span className="hg-kicker">SEU CAMINHO</span><strong>{totalDone} de {allCount} missões aprendidas</strong><small>O progresso é guardado apenas neste navegador.</small></div>
      <div className="hg-total-progress" aria-label={`${totalDone} de ${allCount} missões concluídas`}><span style={{ width: `${Math.round((totalDone / allCount) * 100)}%` }}/></div>
    </div>

    <div className="hg-tracks" role="tablist" aria-label="Trilha de treinamento">
      <button type="button" role="tab" aria-selected={track === 'jogador'} className={track === 'jogador' ? 'hg-track hg-track-active' : 'hg-track'} onClick={() => changeTrack('jogador')}><Users size={20}/><span><strong>Trilha do Jogador</strong><small>Ficha, poderes, combate e mesa</small></span><span className="hg-track-count">{progress.jogador.length}/{lessons.jogador.length}</span></button>
      <button type="button" role="tab" aria-selected={track === 'mestre'} className={track === 'mestre' ? 'hg-track hg-track-active' : 'hg-track'} onClick={() => changeTrack('mestre')}><Crown size={20}/><span><strong>Trilha do Mestre</strong><small>Sessões, NPCs, exploração e biblioteca</small></span><span className="hg-track-count">{progress.mestre.length}/{lessons.mestre.length}</span></button>
    </div>

    <div className="hg-body">
      <aside className="hg-index" aria-label={`Missões da trilha ${track}`}>
        <div className="hg-index-heading"><span className="hg-kicker">MISSÕES</span><strong>{currentPercent}% concluído</strong></div>
        <div className="hg-index-progress"><span style={{ width: `${currentPercent}%` }}/></div>
        <div className="hg-mission-list">{steps.map((step, i) => <button key={step.id} type="button" className={`hg-mission ${index === i ? 'hg-mission-current' : ''} ${doneIds.includes(step.id) ? 'hg-mission-done' : ''}`} aria-current={index === i ? 'step' : undefined} onClick={() => { setIndex(i); setShowReset(false); }}><span className="hg-mission-mark">{doneIds.includes(step.id) ? <Check size={15}/> : String(i+1).padStart(2, '0')}</span><span><small>{step.eyebrow.split('/')[1].trim()}</small><strong>{step.title}</strong></span><ChevronRight size={16}/></button>)}</div>
        <button className="hg-resume" type="button" onClick={() => setIndex(nextPending === -1 ? steps.length - 1 : nextPending)}><Compass size={16}/> {nextPending === -1 ? 'Revisar última missão' : 'Continuar de onde parei'}</button>
      </aside>

      <article className="hg-lesson" aria-labelledby="hg-lesson-title">
        <div className="hg-lesson-heading"><span className="hg-overline">{current.eyebrow}</span>{finished && <span className="hg-complete-pill"><CheckCircle2 size={15}/> Aprendida</span>}</div>
        <h2 id="hg-lesson-title">{current.title}</h2>
        <p className="hg-lesson-subtitle">{current.subtitle}</p>
        <p className="hg-lesson-detail">{current.detail}</p>
        <div className="hg-memory"><div className="hg-memory-title"><WandSparkles size={17}/> PARA GUARDAR</div>{current.reminders.map((point, i) => <div className="hg-memory-point" key={i}><Check size={16}/><span>{point}</span></div>)}</div>
        <div className="hg-quiz"><div className="hg-quiz-label"><Swords size={17}/> DESAFIO RÁPIDO</div><h3>{current.question}</h3><div className="hg-options">{current.answers.map((option, i) => <button type="button" key={i} onClick={() => answer(i)} className={`hg-option ${selectedAnswer === i ? (answerCorrect ? 'hg-option-correct' : 'hg-option-incorrect') : ''}`} aria-pressed={selectedAnswer === i}><span>{String.fromCharCode(65 + i)}</span>{option}</button>)}</div>{selectedAnswer !== undefined && <p role="status" className={answerCorrect ? 'hg-feedback hg-feedback-correct' : 'hg-feedback hg-feedback-incorrect'}>{answerCorrect ? <CheckCircle2 size={17}/> : <Compass size={17}/>} {answerCorrect ? current.explanation : 'Ainda não! Confira as dicas acima e escolha outra resposta.'}</p>}</div>
        <div className="hg-actions"><Button variant="outline" onClick={() => onNavigate(current.destination, current.action)}><Compass size={16}/>{current.cta}<ArrowRight size={16}/></Button>{!finished ? <Button onClick={completeCurrent}><Check size={16}/> Marcar como aprendida</Button> : <span className="hg-done-label"><CheckCircle2 size={17}/> Missão concluída</span>}</div>
        <div className="hg-pagination"><Button size="sm" variant="ghost" disabled={index === 0} onClick={() => setIndex(i => Math.max(0, i-1))}><ChevronLeft size={16}/> Anterior</Button><span>Missão {index+1} de {steps.length}</span><Button size="sm" variant="ghost" disabled={index >= steps.length-1} onClick={() => setIndex(i => Math.min(steps.length-1, i+1))}>Próxima <ChevronRight size={16}/></Button></div>
      </article>
    </div>

    <div className="hg-footer"><div><LockKeyhole size={17}/><span>{userId ? 'As missões são apenas educativas. Seu progresso não altera o banco nem substitui um backup de ficha.' : 'Você pode começar sem entrar. Para salvar uma ficha ou participar da mesa online, entre na sua conta.'}</span></div>{!userId && <Button variant="outline" size="sm" onClick={onLogin}>Entrar na conta <ArrowRight size={15}/></Button>}{userId && (hasCharacter || hasCampaign) && <span className="hg-existing">{hasCharacter ? 'Ficha encontrada' : ''}{hasCharacter && hasCampaign ? ' · ' : ''}{hasCampaign ? 'Mesa encontrada' : ''}</span>}</div>
    <div className="hg-reset-row">{showReset ? <div className="hg-reset-confirm" role="group" aria-label="Confirmar reinício da trilha"><span>Reiniciar só a trilha {track} neste navegador?</span><Button size="sm" variant="outline" onClick={() => setShowReset(false)}>Cancelar</Button><Button size="sm" variant="destructive" onClick={resetTrack}>Reiniciar</Button></div> : <button type="button" onClick={() => setShowReset(true)}><RotateCcw size={15}/> Reiniciar a trilha</button>}</div>
  </section>;
}
