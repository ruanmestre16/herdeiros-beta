import { useEffect, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Check, ChevronDown, Crosshair, Dices,
  Eye, Heart, History, Radio, Shield, ShieldCheck, Skull, Sparkles, Swords,
  Target, UserRound, Users, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Interface do Mestre. Os dados, rolagens, regras e permissões permanecem no CombatPanel.
 * Reutilizada na Mesa e na janela independente (/combate-rapido).
 */
export type MasterCombatant = {
  id: string; kind: 'pc' | 'npc'; name: string;
  pv: number; pvMax: number; pf: number; pfMax: number;
  esquiva: number; bloqueio: number; initiative: number | null;
  reactionReady: boolean; lostAction?: 'standard' | 'all' | undefined;
};
export type MasterAttack = {
  id: string; name: string; damage: string; cost: number; kind: 'weapon' | 'power';
  powerLevel?: string | undefined;
};
export type MasterReactionChoice = { value: string; label: string; disabled?: boolean };
export type MasterQueueItem = {
  id: string; attacker: string; target: string; attack: string;
  canRequestReaction: boolean; reactionReady: boolean;
  choices: MasterReactionChoice[]; valid: boolean;
};
export type MasterPending = {
  heading: string; roll: number; esquiva: number; reaction: string;
  canRollDamage: boolean; damage?: { raw: number; final: number; block: number };
};
export type MasterReactionRequest = {
  id: string; target: string; attacker: string;
  answer?: string;
};

type Props = {
  combatActive: boolean; round: number; currentId?: string | undefined; currentName: string;
  connected: boolean; combatants: MasterCombatant[];
  attackerId?: string | undefined; targetId?: string | undefined; selectedOptionId?: string | undefined;
  options: MasterAttack[]; reactions: MasterReactionChoice[];
  selectedReaction: string; targetReactionReady: boolean;
  canRoll: boolean; canAskReaction: boolean;
  pending?: MasterPending | undefined; queue: MasterQueueItem[];
  request?: MasterReactionRequest | undefined; notice: string; log: string[];
  onToggleCombat: () => void; onNextTurn: () => void;
  onSelectAttacker: (id: string) => void; onSelectTarget: (id: string) => void;
  onSelectOption: (id: string) => void; onSelectReaction: (value: string) => void;
  onRollAttack: () => void; onRollDamage: () => void;
  onAskReaction: () => void | Promise<void>;
  onAskQueueReaction: (id: string) => void | Promise<void>;
  onResolveQueue: (id: string, reaction: string) => void;
  onCancelQueue: (id: string) => void | Promise<void>;
  onResolveReaction: () => void; onCancelReaction: () => void | Promise<void>;
  onAdjustPv: (id: string, delta: number) => void;
  onRollInitiative: (id: string) => void;
  onOpenSheet?: ((id: string) => void) | undefined;
  onShowDetailed: () => void;
};

const surface = 'rounded-2xl border border-border/75 bg-card/95 p-4 shadow-[0_8px_28px_rgba(0,0,0,0.05)] dark:bg-card/85 sm:p-5';
const label = 'text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground';

const reactionIcons: Record<string, typeof Shield> = {
  esquivar: ShieldCheck, bloquear: Shield, 'contra-atacar': Swords,
  danca: Users, parcial: ShieldCheck, completa: Sparkles,
};
const reactionShort: Record<string, string> = {
  esquivar: 'Esquivar', bloquear: 'Bloquear', 'contra-atacar': 'Contra-atacar',
  danca: 'Dança de Batalha', parcial: 'Bloqueio Parcial', completa: 'Bloqueio Completo',
};
function ResourceBar({ current, max, health = false }: { current: number; max: number; health?: boolean }) {
  const width = max ? Math.min(100, Math.max(0, current / max * 100)) : 0;
  return <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10" role="progressbar" aria-label={health ? 'Pontos de vida' : 'Pontos de recurso'} aria-valuenow={current} aria-valuemin={0} aria-valuemax={max}>
    <div className={`h-full rounded-full transition-[width] ${health ? 'bg-rose-500' : 'bg-violet-500'}`} style={{ width: `${width}%` }} />
  </div>;
}
function FighterIcon({ kind }: { kind: 'pc' | 'npc' }) {
  return kind === 'npc' ? <Skull className="h-4 w-4" /> : <UserRound className="h-4 w-4" />;
}
function ReactionButtons({ choices, disabled, selected, onSelect }: {
  choices: MasterReactionChoice[]; disabled?: boolean; selected?: string;
  onSelect: (value: string) => void;
}) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Reações disponíveis">
    {choices.filter(x => !x.disabled).map(choice => {
      const Icon = reactionIcons[choice.value] ?? Shield;
      const chosen = choice.value === selected;
      return <button key={choice.value} type="button" disabled={disabled} aria-pressed={selected === undefined ? undefined : chosen}
        onClick={() => onSelect(choice.value)} title={choice.label}
        className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center text-xs font-semibold leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-50 ${chosen ? 'border-violet-500 bg-violet-500/10 text-foreground' : 'border-border bg-background/60 hover:border-violet-500/50 hover:bg-violet-500/5'}`}>
        <Icon className={`h-4 w-4 ${chosen ? 'text-violet-500' : 'text-muted-foreground'}`} aria-hidden="true" />
        <span>{reactionShort[choice.value] ?? choice.label}</span>
      </button>;
    })}
  </div>;
}

export function MasterCombatDashboard(props: Props) {
  const {
    combatActive, round, currentId, currentName, connected, combatants,
    attackerId, targetId, selectedOptionId, options, reactions, selectedReaction,
    targetReactionReady, canRoll, canAskReaction, pending, queue, request, notice, log,
    onToggleCombat, onNextTurn, onSelectAttacker, onSelectTarget, onSelectOption,
    onSelectReaction, onRollAttack, onRollDamage, onAskReaction, onAskQueueReaction,
    onResolveQueue, onCancelQueue, onResolveReaction, onCancelReaction,
    onAdjustPv, onRollInitiative, onOpenSheet, onShowDetailed,
  } = props;
  const [attackTab, setAttackTab] = useState<'weapon' | 'power'>('weapon');
  const [queueOpen, setQueueOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [endConfirm, setEndConfirm] = useState(false);
  const [queueReaction, setQueueReaction] = useState<Record<string, string>>({});
  const [rosterKind, setRosterKind] = useState<'all' | 'npc' | 'pc'>('all');

  useEffect(() => { setEndConfirm(false); }, [combatActive]);
  useEffect(() => { setQueueReaction({}); }, [round, currentId]);
  useEffect(() => {
    const selected = options.find(o => o.id === selectedOptionId);
    if (selected) setAttackTab(selected.kind);
  }, [selectedOptionId, options.length]);

  const currentIndex = combatants.findIndex(c => c.id === currentId);
  const next = combatants.length && currentIndex >= 0 ? combatants[(currentIndex + 1) % combatants.length] : undefined;
  const attacker = combatants.find(c => c.id === attackerId);
  const target = combatants.find(c => c.id === targetId);
  const visibleFighters = combatants.filter(c => rosterKind === 'all' || c.kind === rosterKind);
  const shownOptions = options.filter(o => o.kind === attackTab);
  const chosenAttack = options.find(o => o.id === selectedOptionId);
  const safeReactions = targetReactionReady ? reactions.filter(r => !r.disabled) : [];
  const hasUnresolved = queue.length > 0 || !!request || !!pending?.canRollDamage;
  const hpLow = combatants.filter(c => c.pv > 0 && c.pvMax > 0 && c.pv / c.pvMax <= 0.3).length;

  function beginEnd() { if (combatActive) setEndConfirm(true); else onToggleCombat(); }
  function selectAttackTab(tab: 'weapon' | 'power') {
    setAttackTab(tab);
    if (!options.some(o => o.id === selectedOptionId && o.kind === tab)) {
      const first = options.find(o => o.kind === tab);
      if (first) onSelectOption(first.id);
    }
  }

  return <div className="mx-auto w-full max-w-7xl space-y-4 pb-24 text-foreground sm:space-y-5 sm:pb-10" aria-label="Painel visual de combate do Mestre">
    <header className="relative overflow-hidden rounded-[22px] border border-violet-500/45 bg-gradient-to-br from-violet-500/15 via-card to-card p-4 sm:p-6" role="status" aria-live="polite">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className={label}>CONTROLE DO MESTRE · {combatActive ? `RODADA ${round}` : 'AGUARDANDO COMBATE'}</p>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight sm:text-[27px]"><Swords className="h-6 w-6 shrink-0 text-violet-500" /> {combatActive ? `Vez de ${currentName}` : 'Preparar batalha'}</h2>
          <p className="text-sm text-muted-foreground">{combatActive ? <>Próximo: <strong className="text-foreground">{next?.name ?? '—'}</strong>. Selecione um combatente ou resolva uma ação pendente.</> : 'Confira a iniciativa e os participantes antes de iniciar.'}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${connected ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}><Radio className="h-3.5 w-3.5" />{connected ? 'Canal Realtime conectado' : 'Canal reconectando'}</span>
      </div>
      <div className="relative mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border/70 bg-background/70 p-3"><p className={label}>COMBATENTES</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{combatants.length}</p></div>
        <div className="rounded-xl border border-border/70 bg-background/70 p-3"><p className={label}>PENDÊNCIAS</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{queue.length + (request && !queue.some(q => q.id === request.id) ? 1 : 0)}</p></div>
        <div className="rounded-xl border border-border/70 bg-background/70 p-3"><p className={label}>PV BAIXO</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{hpLow}</p></div>
      </div>
      <div className="relative mt-4 flex flex-wrap gap-2">
        <Button className="min-h-12 flex-1 sm:flex-none" disabled={!combatants.length} onClick={beginEnd}>{combatActive ? 'Encerrar combate' : <><Swords className="h-4 w-4" /> Iniciar combate</>}</Button>
        <Button variant="outline" className="min-h-12 flex-1 sm:flex-none" disabled={!combatActive || hasUnresolved} onClick={onNextTurn}>Próximo turno <ArrowRight className="h-4 w-4" /></Button>
      </div>
      {endConfirm && <div className="relative mt-3 rounded-xl border border-amber-500/60 bg-amber-500/10 p-3 text-sm" role="alert">
        <strong>Encerrar a batalha?</strong><p className="mt-1 text-xs">O combate será encerrado para toda a mesa.</p>
        <div className="mt-3 flex gap-2"><Button size="sm" variant="destructive" className="min-h-11" disabled={hasUnresolved} onClick={() => { setEndConfirm(false); onToggleCombat(); }}>Confirmar encerramento</Button><Button size="sm" variant="outline" className="min-h-11" onClick={() => setEndConfirm(false)}>Cancelar</Button></div>
        {hasUnresolved && <p className="mt-2 text-xs">Resolva ações e danos pendentes antes de encerrar.</p>}
      </div>}
    </header>

    {notice && <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-500/45 bg-amber-500/10 p-3 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}

    {/* Pedidos não ficam escondidos abaixo do rolador. */}
    <section className={`${surface} space-y-3 ${queue.length || request ? 'border-amber-500/50' : ''}`} aria-label="Ações e reações recebidas">
      <button className="flex w-full items-center justify-between gap-2 text-left" type="button" onClick={() => setQueueOpen(v => !v)} aria-expanded={queueOpen}>
        <span className="flex min-w-0 items-center gap-2"><Shield className="h-5 w-5 shrink-0 text-amber-500" /><strong className="text-base sm:text-lg">Ações recebidas e reações</strong><span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold">{queue.length} na fila</span></span><ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${queueOpen ? 'rotate-180' : ''}`} />
      </button>
      {queueOpen && <div className="space-y-3 border-t border-border/60 pt-3">
        {request && <div className="rounded-xl border border-amber-500/50 bg-amber-500/5 p-3.5" role="status" aria-live="polite">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-500" /><strong className="text-sm">Reação solicitada: {request.target}</strong></div>
          <p className="mt-1 text-sm text-muted-foreground">{request.attacker} → {request.target} · {request.answer ? `Jogador escolheu: ${request.answer}` : 'Aguardando a resposta do jogador.'}</p>
          <div className="mt-3 flex flex-wrap gap-2">{request.answer && <Button className="min-h-11" size="sm" onClick={onResolveReaction}><Check className="h-4 w-4" /> Resolver com essa reação</Button>}<Button className="min-h-11" size="sm" variant="outline" onClick={() => void onCancelReaction()}>Cancelar solicitação</Button></div>
        </div>}
        {queue.length ? queue.map(item => <div key={item.id} className="rounded-xl border border-border bg-background/50 p-3.5 space-y-3">
          <div className="flex items-start gap-2"><div className="rounded-lg bg-violet-500/10 p-2 text-violet-500"><Crosshair className="h-4 w-4" /></div><div className="min-w-0 flex-1"><strong className="block break-words text-sm">{item.attacker} <ArrowRight className="inline h-3.5 w-3.5" /> {item.target}</strong><p className="mt-1 break-words text-xs text-muted-foreground">{item.attack}</p></div></div>
          {!item.valid ? <Button size="sm" variant="outline" className="min-h-11" onClick={() => void onCancelQueue(item.id)}>Descartar pedido inválido</Button> : <>
            {item.canRequestReaction && !request && <Button className="min-h-11 w-full" size="sm" variant="outline" disabled={!connected} onClick={() => void onAskQueueReaction(item.id)}><Shield className="h-4 w-4" /> Pedir reação ao jogador</Button>}
            <p className="text-xs text-muted-foreground">{item.reactionReady ? 'Ou resolva manualmente escolhendo uma reação:' : 'Alvo sem Reação: o ataque ainda é comparado com a Esquiva.'}</p>
            <ReactionButtons choices={item.reactionReady ? item.choices : [{ value:'esquivar',label:'Resolver sem Reação' }]} selected={queueReaction[item.id] ?? (item.reactionReady ? undefined : 'esquivar')} disabled={!!request} onSelect={value => setQueueReaction(p => ({...p,[item.id]:value}))} />
            <div className="flex flex-wrap gap-2"><Button className="min-h-11 flex-1" size="sm" disabled={!!request || (item.reactionReady && !queueReaction[item.id])} onClick={() => onResolveQueue(item.id, queueReaction[item.id] ?? 'esquivar')}><Check className="h-4 w-4" /> Resolver ação</Button><Button className="min-h-11" size="sm" variant="ghost" disabled={!connected} onClick={() => void onCancelQueue(item.id)}>Recusar</Button></div>
          </>}
        </div>) : !request && <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Nenhuma ação aguardando. Os ataques enviados pelos jogadores aparecerão aqui quando eles estiverem conectados. Você pode testar os ataques abaixo mesmo sozinho.</div>}
        {!connected && <p className="text-xs text-amber-600 dark:text-amber-400">Sem conexão Realtime: os pedidos dos jogadores podem não chegar. Não há confirmação de jogadores online nesta tela.</p>}
      </div>}
    </section>

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(290px,0.85fr)] lg:gap-5">
      <div className="min-w-0 space-y-4">
        <section className={`${surface} space-y-4`} aria-label="Executar um ataque">
          <div className="flex items-center gap-2"><Target className="h-5 w-5 text-violet-500" /><div><p className={label}>AÇÃO RÁPIDA</p><h3 className="text-lg font-extrabold">Montar ataque</h3></div></div>
          <p className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">Você pode experimentar os controles sem jogadores online. Use dois combatentes já cadastrados; nenhuma ficha de teste será criada automaticamente.</p>
          <div className="space-y-2"><p className={label}>1 · QUEM ATACA</p>
            <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3" role="group" aria-label="Escolher atacante">
              {combatants.map(c => <button type="button" key={c.id} aria-pressed={attackerId === c.id} onClick={() => onSelectAttacker(c.id)} className={`flex min-h-[66px] min-w-0 flex-col justify-center gap-1 rounded-xl border p-3 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-violet-500 ${attackerId === c.id ? 'border-violet-500 bg-violet-500/10' : 'border-border bg-background/50 hover:border-violet-500/50'}`}><span className="flex items-center gap-1.5 text-muted-foreground"><FighterIcon kind={c.kind} /> {c.kind === 'npc' ? 'MONSTRO / NPC' : 'HERDEIRO'}</span><strong className="break-words text-sm">{c.name}</strong>{currentId === c.id && combatActive && <span className="text-[11px] text-violet-500">● Turno atual</span>}</button>)}
            </div>
            {!combatants.length && <p className="text-sm text-muted-foreground">Cadastre um combatente para montar o ataque.</p>}
          </div>
          <div className="space-y-2"><p className={label}>2 · ESCOLHA O ALVO</p>
            <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3" role="group" aria-label="Escolher alvo">
              {combatants.filter(c => c.id !== attackerId).map(c => <button key={c.id} type="button" onClick={() => onSelectTarget(c.id)} aria-pressed={targetId === c.id} className={`min-h-[76px] min-w-0 space-y-1 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-violet-500 ${targetId === c.id ? 'border-violet-500 bg-violet-500/10' : 'border-border bg-background/50 hover:border-violet-500/50'}`}><span className="flex items-center gap-1 text-xs text-muted-foreground"><FighterIcon kind={c.kind}/> Esq {c.esquiva}</span><strong className="block break-words text-sm">{c.name}</strong><span className="block text-xs text-muted-foreground">PV {c.pv}/{c.pvMax}</span></button>)}
            </div>
            {attacker && combatants.filter(c => c.id !== attacker.id).length === 0 && <p className="text-xs text-muted-foreground">Adicione outro personagem ou monstro para selecionar um alvo.</p>}
          </div>
          <div className="space-y-3"><p className={label}>3 · ARMA OU PODER</p>
            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted/70 p-1.5" role="tablist" aria-label="Tipos de ataque">
              {([{ kind:'weapon', icon:Swords, text:'Armas / golpes' },{ kind:'power', icon:Sparkles, text:'Poderes' }] as const).map(tab => <button type="button" role="tab" aria-selected={attackTab === tab.kind} key={tab.kind} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-bold sm:text-sm ${attackTab === tab.kind ? 'bg-card shadow-sm ring-1 ring-violet-500/30' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => selectAttackTab(tab.kind)}><tab.icon className="h-4 w-4" />{tab.text}</button>)}
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1" role="tabpanel" aria-label={attackTab === 'weapon' ? 'Armas e golpes' : 'Poderes'}>
              {shownOptions.map(o => <button key={o.id} type="button" aria-pressed={selectedOptionId === o.id} onClick={() => onSelectOption(o.id)} className={`flex min-h-[64px] w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-violet-500 ${selectedOptionId === o.id ? 'border-violet-500 bg-violet-500/10' : 'border-border bg-background/50 hover:border-violet-500/50'}`}><span className="min-w-0 flex-1"><strong className="block break-words text-sm">{o.name}</strong><span className="mt-1 block break-words text-xs text-muted-foreground">{o.powerLevel ? `${o.powerLevel} · ` : ''}Dano {o.damage}</span></span><span className="shrink-0 text-xs font-semibold">{o.cost ? `${o.cost} PF` : 'Sem custo'}</span>{selectedOptionId === o.id && <Check className="h-4 w-4 shrink-0 text-violet-500" />}</button>)}
              {!shownOptions.length && <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Nenhuma opção nesta categoria para o combatente selecionado.</p>}
            </div>
          </div>
          {target && <div className="space-y-3 rounded-xl border border-violet-500/25 bg-violet-500/5 p-3.5">
            <div><p className={label}>4 · REAÇÃO DO ALVO</p><p className="mt-1 text-sm text-muted-foreground">{targetReactionReady ? <>Escolha a reação do alvo ou solicite a escolha ao jogador.</> : <>A Reação do alvo já foi usada. A Esquiva continua valendo.</>}</p></div>
            {targetReactionReady && <ReactionButtons choices={safeReactions} selected={selectedReaction} onSelect={onSelectReaction} disabled={!!request} />}
            {canAskReaction && <Button variant="outline" className="min-h-11 w-full" disabled={!connected || !combatActive || !!request} onClick={() => void onAskReaction()}><Shield className="h-4 w-4" /> Pedir reação ao jogador</Button>}
          </div>}
          {chosenAttack && attacker && target && <div className="rounded-xl border border-border bg-background/50 p-3.5 text-sm"><p className={label}>RESUMO DO ATAQUE</p><p className="mt-1 break-words"><strong>{attacker.name}</strong> <ArrowRight className="inline h-4 w-4" /> <strong>{target.name}</strong></p><p className="mt-1 text-muted-foreground">{chosenAttack.name} · Dano {chosenAttack.damage}{chosenAttack.cost ? ` · Custo ${chosenAttack.cost} PF` : ''}</p></div>}
          <Button className="min-h-[52px] w-full text-sm font-bold sm:text-base" disabled={!canRoll || !!request} onClick={onRollAttack}><Dices className="h-5 w-5" />{!combatActive ? 'Inicie o combate para atacar' : !attacker || !target ? 'Escolha atacante e alvo' : !chosenAttack ? 'Escolha o golpe' : !canRoll ? 'Ataque indisponível' : 'Rolar ataque'}</Button>
          {pending && <div className={`rounded-xl border p-4 space-y-2 ${pending.canRollDamage ? 'border-emerald-500/45 bg-emerald-500/5' : 'border-border bg-background/50'}`} role="status" aria-live="polite"><p className={label}>RESULTADO DO ATAQUE</p><strong className="block text-base">{pending.heading}</strong><p className="text-sm text-muted-foreground">Rolagem {pending.roll} · Esquiva {pending.esquiva} · Reação {pending.reaction}</p>{pending.canRollDamage && <Button className="min-h-11 w-full" onClick={onRollDamage}><Dices className="h-4 w-4" /> Rolar e aplicar dano</Button>}{pending.damage && <p className="text-sm">Dano final <strong className="text-lg">{pending.damage.final}</strong> <span className="text-muted-foreground">({pending.damage.raw} bruto{pending.damage.block ? ` − ${pending.damage.block} de bloqueio` : ''})</span></p>}</div>}
          {!combatActive && <p className="text-xs text-muted-foreground">É possível selecionar combatentes enquanto prepara a cena; os ataques só serão resolvidos com combate ativo.</p>}
        </section>
      </div>
      <aside className="min-w-0 space-y-4">
        <section className={`${surface} space-y-3`} aria-label="Iniciativa e recursos dos combatentes">
          <div className="flex items-center justify-between gap-2"><div><p className={label}>MESA EM TEMPO REAL</p><h3 className="text-lg font-extrabold">Combatentes</h3></div><Users className="h-5 w-5 text-violet-500" /></div>
          <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-muted/65 p-1" role="group" aria-label="Filtrar combatentes">{([{id:'all',text:'Todos'},{id:'npc',text:'Monstros'},{id:'pc',text:'Herdeiros'}] as const).map(x => <button type="button" key={x.id} aria-pressed={rosterKind === x.id} onClick={() => setRosterKind(x.id)} className={`min-h-10 rounded-md px-1 text-xs font-semibold ${rosterKind===x.id ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>{x.text}</button>)}</div>
          <div className="max-h-[750px] space-y-2 overflow-y-auto pr-0.5">{visibleFighters.map(c => <div key={c.id} className={`rounded-xl border p-3 space-y-2 ${combatActive && currentId === c.id ? 'border-violet-500 bg-violet-500/5' : 'border-border bg-background/40'}`}>
            <div className="flex items-start justify-between gap-2"><div className="flex min-w-0 flex-1 items-start gap-2"><span className="rounded-lg bg-muted p-2 text-muted-foreground"><FighterIcon kind={c.kind}/></span><div className="min-w-0"><strong className="block break-words text-sm">{c.name}</strong><p className="text-[11px] text-muted-foreground">Ini. {c.initiative ?? '—'} · Esq {c.esquiva} · Bloq {c.bloqueio}</p>{combatActive && <span className={`text-[11px] ${c.reactionReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>{c.reactionReady ? '● Reação disponível' : '○ Reação usada'}{c.lostAction ? ' · Ação sacrificada' : ''}</span>}</div></div>{onOpenSheet && <Button size="sm" variant="outline" className="min-h-9" onClick={() => onOpenSheet(c.id)}>Ficha</Button>}</div>
            <div className="grid grid-cols-2 gap-3"><div><div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1 text-muted-foreground"><Heart className="h-3 w-3 text-rose-500" /> PV</span><strong className="tabular-nums">{c.pv}/{c.pvMax}</strong></div><ResourceBar current={c.pv} max={c.pvMax} health /></div><div><div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1 text-muted-foreground"><Zap className="h-3 w-3 text-violet-500"/> PF/PN</span><strong className="tabular-nums">{c.pf}/{c.pfMax}</strong></div><ResourceBar current={c.pf} max={c.pfMax} /></div></div>
            <div className="grid grid-cols-4 gap-1.5"><Button size="sm" variant="outline" className="min-h-10 px-1 text-xs" title={`Tirar 5 PV de ${c.name}`} onClick={() => onAdjustPv(c.id,-5)}>−5 PV</Button><Button size="sm" variant="outline" className="min-h-10 px-1 text-xs" title={`Tirar 1 PV de ${c.name}`} onClick={() => onAdjustPv(c.id,-1)}>−1 PV</Button><Button size="sm" variant="outline" className="min-h-10 px-1 text-xs" title={`Curar 5 PV de ${c.name}`} onClick={() => onAdjustPv(c.id,5)}>+5 PV</Button><Button size="sm" variant="outline" className="min-h-10 px-1 text-xs" title={`Rolar iniciativa de ${c.name}`} onClick={() => onRollInitiative(c.id)}><Dices className="h-3.5 w-3.5"/> Ini.</Button></div>
            <Button size="sm" variant="ghost" className="min-h-9 w-full text-xs" onClick={() => onSelectAttacker(c.id)}><Crosshair className="h-3.5 w-3.5" /> Escolher como atacante</Button>
          </div>)}{!visibleFighters.length && <p className="text-sm text-muted-foreground">Nenhum combatente neste filtro.</p>}</div>
        </section>
        <section className={`${surface} space-y-3`} aria-label="Histórico do combate"><button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setLogOpen(v => !v)} aria-expanded={logOpen}><span className="flex items-center gap-2 text-sm font-bold"><History className="h-4 w-4 text-violet-500" /> Crônica da batalha</span><ChevronDown className={`h-4 w-4 transition-transform ${logOpen ? 'rotate-180' : ''}`}/></button>{logOpen && <div className="max-h-52 space-y-2 overflow-y-auto border-t border-border pt-3">{log.length ? log.slice(0, 8).map((entry,i) => <p key={i} className="border-b border-border/50 pb-2 text-xs leading-relaxed text-muted-foreground break-words">{entry}</p>) : <p className="text-xs text-muted-foreground">Sem eventos ainda.</p>}</div>}</section>
        <Button variant="outline" className="min-h-11 w-full" onClick={onShowDetailed}><Eye className="h-4 w-4" /> Modo detalhado do Mestre</Button>
        <p className="text-xs leading-relaxed text-muted-foreground">Turnos e PV/PF são salvos na Mesa. Solicitações de ataque e reação ainda usam eventos temporários do Supabase Realtime: mantenha as janelas conectadas.</p>
      </aside>
    </div>
  </div>;
}
