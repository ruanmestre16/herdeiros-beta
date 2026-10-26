import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, BookOpen, Check, ChevronDown, ChevronRight,
  Clock3, Crosshair, Eye, Footprints, Heart, History, LockKeyhole, Radio,
  Shield, ShieldCheck, Skull, Sparkles, Swords, Target, UserRound, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Somente apresentação: regras, custos, rolagens e sincronização continuam no CombatPanel.
 * O mesmo painel é usado na Mesa e na janela /combate-rapido (PC, navegador e APK).
 */
export type QuickCombatant = {
  id: string;
  kind: 'pc' | 'npc';
  name: string;
  pv: number; pvMax: number; pf: number; pfMax: number;
  esquiva: number; bloqueio: number; initiative: number | null;
};
export type QuickAttack = {
  id: string; label: string; nomenclature: boolean; pfCost: number;
  dice: string[]; extra: string[]; fixed: number; karma: number;
  hitAttr: string; nomKind?: string;
};
export type QuickReaction = { value: string; label: string; disabled?: boolean };

type Props = {
  combatActive: boolean; round: number; isMyTurn: boolean; currentId?: string;
  currentName: string; combatants: QuickCombatant[];
  character?: QuickCombatant; target?: QuickCombatant;
  targets: QuickCombatant[]; options: QuickAttack[]; selectedOption?: QuickAttack;
  abilities: { id: string; name: string; kind: string }[];
  skillName: string; resourceName: string;
  reactionReady: boolean; hasLostAction: boolean;
  reactionRequest?: { id: string; attackerName: string; attackName: string };
  reactionChoices: QuickReaction[];
  reactionSent: boolean; sentAttack: boolean; connected: boolean;
  canSend: boolean; notice: string; log: string[];
  onSelectTarget: (id: string) => void;
  onSelectOption: (id: string) => void;
  onSendAttack: () => void | Promise<void>;
  onChooseReaction: (value: string) => void | Promise<void>;
  onShowDetailed: () => void;
};

type Tab = 'arma' | 'nomenclatura' | 'defesa';
const tabNames: Record<Tab, string> = { arma: 'Armas', nomenclatura: 'Nomenclaturas', defesa: 'Defesa' };
const reactions: Record<string, { title: string; description: string; icon: typeof Shield }> = {
  esquivar: { title: 'Esquivar', description: 'Sem rolagem: compara o ataque com sua Esquiva. Empate favorece o atacante.', icon: Footprints },
  bloquear: { title: 'Bloquear', description: 'Recebe o golpe e reduz o dano pelo seu Bloqueio, automaticamente.', icon: Shield },
  'contra-atacar': { title: 'Contra-atacar', description: 'Disputa 1d20 + dado do atributo com o ataque inimigo. Precisa superar.', icon: Swords },
  danca: { title: 'Dança de Batalha', description: 'Defesa contra múltiplos ataques corpo a corpo, quando autorizada.', icon: Activity },
  parcial: { title: 'Bloqueio Parcial', description: '4 PF/PN e a ação padrão da próxima rodada. Reduz dano de uma Parcial.', icon: ShieldCheck },
  completa: { title: 'Bloqueio Completo', description: 'Sacrifica a próxima ação inteira. Só contra Nomenclatura Completa.', icon: Sparkles },
};
const pane = 'rounded-2xl border border-border/75 bg-card/95 shadow-[0_8px_28px_rgba(0,0,0,0.05)] dark:bg-card/80';
const head = 'text-[11px] font-bold tracking-[0.16em] uppercase text-muted-foreground';

function Meter({ current, max, type }: { current: number; max: number; type: 'pv' | 'pf' }) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  return <div className="h-2 overflow-hidden rounded-full bg-foreground/10" role="progressbar" aria-label={type === 'pv' ? 'Vida atual' : 'Recurso atual'} aria-valuemin={0} aria-valuemax={Math.max(0, max)} aria-valuenow={Math.max(0, current)}>
    <div className={`h-full rounded-full transition-[width] duration-300 ${type === 'pv' ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-violet-600 to-fuchsia-400'}`} style={{ width: `${percent}%` }} />
  </div>;
}

export function PlayerCombatDashboard({
  combatActive, round, isMyTurn, currentId, currentName, combatants, character, target, targets, options,
  selectedOption, abilities, skillName, resourceName, reactionReady, hasLostAction,
  reactionRequest, reactionChoices, reactionSent, sentAttack, connected, canSend,
  notice, log, onSelectTarget, onSelectOption, onSendAttack, onChooseReaction, onShowDetailed,
}: Props) {
  const [tab, setTab] = useState<Tab>('arma');
  const [targetFilter, setTargetFilter] = useState<'npc' | 'pc' | 'all'>('npc');
  const [reactionPick, setReactionPick] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => { setReactionPick(null); setSending(false); }, [reactionRequest?.id]);
  useEffect(() => { if (!sentAttack) setSending(false); }, [sentAttack]);
  useEffect(() => {
    if (selectedOption?.nomenclature) setTab(current => current === 'defesa' ? current : 'nomenclatura');
  }, [selectedOption?.id, selectedOption?.nomenclature]);

  const weapons = useMemo(() => options.filter(o => !o.nomenclature), [options]);
  const nomenclatures = useMemo(() => options.filter(o => o.nomenclature), [options]);
  const displayed = tab === 'nomenclatura' ? nomenclatures : weapons;
  const filteredTargets = targets.filter(t => targetFilter === 'all' || t.kind === targetFilter);
  const activeOption = displayed.find(o => o.id === selectedOption?.id);
  const activeSelection = tab !== 'defesa' ? activeOption : undefined;
  const resourceWord = resourceName.toUpperCase();
  const nameOf = (option: QuickAttack): string => option.id.startsWith('nom-')
    ? abilities.find(a => a.id === option.id)?.name ?? option.label
    : option.label.replace(/\s*\([^)]*\)\s*$/, '');
  const damageOf = (o: QuickAttack): string => [...o.dice, ...o.extra, ...(o.fixed ? [String(o.fixed)] : []), ...(o.karma ? [`${o.karma} Karma`] : [])].join(' + ');
  const selectable = !!character && isMyTurn && !hasLostAction && !sentAttack && !reactionRequest;
  const busy = !!reactionRequest && !reactionSent;
  const currentIndex = combatants.findIndex(c => c.id === currentId);
  const nextFighters = currentIndex >= 0
    ? [...combatants.slice(currentIndex + 1), ...combatants.slice(0, currentIndex)].slice(0, 4)
    : combatants.slice(0, 4);

  const selectTab = (next: Tab) => {
    setTab(next);
    if (next === 'defesa') return;
    const first = next === 'arma' ? weapons[0] : nomenclatures[0];
    if (first && !((next === 'arma' ? weapons : nomenclatures).some(o => o.id === selectedOption?.id))) onSelectOption(first.id);
  };

  return <div className="mx-auto w-full max-w-5xl space-y-4 pb-24 sm:space-y-5 sm:pb-10" aria-label="Combate do jogador">
    {/* Barra principal: mostra estado da mesa em qualquer tamanho de tela. */}
    <header className={`relative overflow-hidden rounded-[22px] border px-4 py-5 sm:px-6 sm:py-6 ${busy ? 'border-amber-500/65 bg-amber-500/10' : isMyTurn ? 'border-violet-500/55 bg-gradient-to-br from-violet-500/15 via-card to-fuchsia-500/5' : 'border-border bg-card'}`} role="status" aria-live="polite">
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <p className={head}>{combatActive ? `COMBATE ATIVO · RODADA ${round}` : 'MESA · COMBATE EM ESPERA'}</p>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight sm:text-[27px]">
            {busy ? <Shield className="h-6 w-6 shrink-0 text-amber-500" /> : isMyTurn ? <Swords className="h-6 w-6 shrink-0 text-violet-500" /> : <Clock3 className="h-5 w-5 shrink-0 text-muted-foreground" />}
            <span>{busy ? 'Você está sendo atacado!' : !combatActive ? 'Aguardando o combate' : isMyTurn ? 'É a sua vez!' : 'Acompanhe a batalha'}</span>
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{busy ? 'Escolha como reagir. O Mestre vai resolver o ataque.' : !combatActive ? 'O Mestre ainda não iniciou a batalha.' : isMyTurn ? 'Escolha um alvo, selecione sua ação e confirme o envio.' : <>Turno de <strong className="text-foreground">{currentName}</strong>. Suas reações continuam disponíveis quando você for atacado.</>}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${connected ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>
          <Radio className="h-3.5 w-3.5" />{connected ? 'Mesa conectada' : 'Reconectando'}
        </span>
      </div>
    </header>

    {/* Recursos e aviso de reação são acessíveis sem mudar de aba. */}
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <section className={`${pane} space-y-2 p-3.5 sm:p-4`} aria-label="Pontos de vida">
        <div className="flex items-center justify-between gap-2"><span className={head}>VIDA · PV</span><Heart className="h-4 w-4 text-rose-500" aria-hidden="true" /></div>
        <p className="font-extrabold tabular-nums tracking-tight text-[25px] sm:text-[30px]">{character?.pv ?? '—'} <span className="text-base font-medium text-muted-foreground">/ {character?.pvMax ?? '—'}</span></p>
        <Meter current={character?.pv ?? 0} max={character?.pvMax ?? 0} type="pv" />
      </section>
      <section className={`${pane} space-y-2 p-3.5 sm:p-4`} aria-label={`Pontos de ${resourceName}`}>
        <div className="flex items-center justify-between gap-2"><span className={head}>{resourceWord} · ENERGIA</span><Zap className="h-4 w-4 text-violet-500" aria-hidden="true" /></div>
        <p className="font-extrabold tabular-nums tracking-tight text-[25px] sm:text-[30px]">{character?.pf ?? '—'} <span className="text-base font-medium text-muted-foreground">/ {character?.pfMax ?? '—'}</span></p>
        <Meter current={character?.pf ?? 0} max={character?.pfMax ?? 0} type="pf" />
      </section>
    </div>
    {character && <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="rounded-full border border-border bg-card px-3 py-1.5"><UserRound className="mr-1 inline h-3.5 w-3.5" /> {character.name}</span>
      <span className="rounded-full border border-border bg-card px-3 py-1.5"><Footprints className="mr-1 inline h-3.5 w-3.5" /> Esquiva <strong>{character.esquiva}</strong></span>
      <span className="rounded-full border border-border bg-card px-3 py-1.5"><Shield className="mr-1 inline h-3.5 w-3.5" /> Bloqueio <strong>{character.bloqueio}</strong></span>
      <span className={`rounded-full border px-3 py-1.5 ${reactionReady ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-border bg-muted text-muted-foreground'}`}>{reactionReady ? '● Reação disponível' : '○ Reação utilizada'}</span>
    </div>}

    {/* Reação é PRIORIDADE: aparece antes de atacar, mesmo fora do turno do jogador. */}
    {reactionRequest && <section className="space-y-4 rounded-[22px] border-2 border-amber-500/70 bg-amber-500/[0.07] p-4 shadow-[0_0_30px_rgba(245,158,11,0.09)] sm:p-5" role="region" aria-labelledby="reacao-titulo">
      <div className="flex items-start gap-3"><div className="rounded-xl bg-amber-500/15 p-2.5 text-amber-600 dark:text-amber-300"><AlertTriangle className="h-6 w-6" /></div><div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">AÇÃO DO INIMIGO · SUA REAÇÃO</p><h3 id="reacao-titulo" className="text-xl font-extrabold">Defenda-se agora</h3><p className="mt-1 text-sm"><strong>{reactionRequest.attackerName}</strong> está usando <strong>{reactionRequest.attackName}</strong>.</p></div></div>
      {reactionSent ? <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm"><Check className="h-5 w-5 shrink-0 text-emerald-500" /> Reação enviada! Aguarde o Mestre resolver o ataque.</div> : reactionChoices.length === 0 ? <p className="rounded-xl border border-border bg-card p-3 text-sm">Você não tem uma reação disponível para este ataque. Aguarde a resolução do Mestre.</p> : <>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {reactionChoices.filter(r => !r.disabled).map(choice => {
            const detail = reactions[choice.value] ?? { title: choice.label, description: choice.label, icon: Shield };
            const Icon = detail.icon; const chosen = reactionPick === choice.value;
            return <button type="button" key={choice.value} aria-pressed={chosen} onClick={() => setReactionPick(choice.value)} className={`group flex min-h-[94px] items-start gap-3 rounded-xl border p-3.5 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${chosen ? 'border-amber-500 bg-amber-500/15 shadow-sm' : 'border-border bg-card hover:border-amber-400/70 hover:bg-amber-500/5'}`}>
              <div className={`rounded-xl p-2 ${chosen ? 'bg-amber-500/20 text-amber-700 dark:text-amber-200' : 'bg-muted text-muted-foreground'}`}><Icon className="h-5 w-5" /></div>
              <span className="min-w-0 flex-1"><strong className="block text-sm">{detail.title}</strong><small className="mt-1 block text-xs leading-relaxed text-muted-foreground">{detail.description}</small></span>
              {chosen && <Check className="h-4 w-4 shrink-0 text-amber-600" />}
            </button>;
          })}
        </div>
        <Button className="min-h-12 w-full text-base font-bold" disabled={!connected || !reactionPick || sending} onClick={() => { if (!reactionPick) return; setSending(true); Promise.resolve(onChooseReaction(reactionPick)).finally(() => setSending(false)); }}><ShieldCheck className="h-5 w-5" /> {sending ? 'Enviando reação...' : reactionPick ? `Confirmar: ${reactions[reactionPick]?.title ?? reactionPick}` : 'Escolha sua reação acima'}</Button>
      </>}
    </section>}

    {!character && <section className={`${pane} p-4 text-sm`}><AlertTriangle className="mb-2 h-5 w-5 text-amber-500" /><strong className="block">Falta selecionar seu Herdeiro.</strong><p className="mt-1 text-muted-foreground">Abra a Mesa e escolha sua ficha na opção “Sua ficha nesta mesa”.</p></section>}

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
      <div className="min-w-0 space-y-4">
        <section className={`${pane} space-y-3 p-4 sm:p-5`} aria-labelledby="alvos-titulo">
          <div className="flex items-center justify-between gap-3"><div><p className={head}>PASSO 01</p><h3 id="alvos-titulo" className="mt-0.5 text-lg font-extrabold">Escolha seu alvo</h3></div><Target className="h-5 w-5 text-violet-500" aria-hidden="true" /></div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar combatentes">
            {([{ key: 'npc', title: 'Monstros / NPCs' }, { key: 'pc', title: 'Herdeiros' }, { key: 'all', title: 'Todos' }] as const).map(f => <button key={f.key} type="button" aria-pressed={targetFilter === f.key} onClick={() => setTargetFilter(f.key)} className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${targetFilter === f.key ? 'border-violet-500/50 bg-violet-500/15 text-foreground' : 'border-border text-muted-foreground hover:bg-accent'}`}>{f.title}</button>)}
          </div>
          {filteredTargets.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {filteredTargets.map(t => {
              const chosen = target?.id === t.id;
              const visibleDefense = t.esquiva >= 0; // O Mestre pode ocultar defesas dos NPCs.
              return <button key={t.id} type="button" aria-pressed={chosen} disabled={!selectable} onClick={() => onSelectTarget(t.id)} className={`relative min-w-0 rounded-xl border p-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-65 ${chosen ? 'border-violet-500 bg-violet-500/10 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.25)]' : 'border-border bg-background/50 hover:border-violet-500/50 hover:bg-violet-500/5'}`}>
                {chosen && <span className="absolute right-2 top-2 rounded-full bg-violet-500 p-1 text-white"><Check className="h-3 w-3" /></span>}
                <span className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${t.kind === 'npc' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>{t.kind === 'npc' ? <Skull className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}</span>
                <strong className="block break-words pr-3 text-sm leading-tight">{t.name}</strong>
                <small className="mt-1 block text-[11px] text-muted-foreground">{t.kind === 'npc' ? 'Criatura / NPC' : 'Herdeiro'}{visibleDefense ? ` · Esq. ${t.esquiva}` : ''}</small>
              </button>;
            })}
          </div> : <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Nenhum combatente neste filtro. Experimente “Todos”.</div>}
          {target && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Crosshair className="h-3.5 w-3.5 text-violet-500" /> Alvo selecionado: <strong className="text-foreground">{target.name}</strong></p>}
        </section>

        <section className={`${pane} space-y-3 p-4 sm:p-5`} aria-labelledby="acoes-titulo">
          <div className="flex items-center justify-between gap-3"><div><p className={head}>PASSO 02</p><h3 id="acoes-titulo" className="mt-0.5 text-lg font-extrabold">Escolha sua ação</h3></div><Swords className="h-5 w-5 text-violet-500" aria-hidden="true" /></div>
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/70 p-1.5" role="tablist" aria-label="Tipos de ação">
            {([{ id: 'arma', Icon: Swords }, { id: 'nomenclatura', Icon: Sparkles }, { id: 'defesa', Icon: Shield }] as const).map(({ id, Icon }) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => selectTab(id)} className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[11px] font-bold leading-tight transition-all sm:flex-row sm:gap-1.5 sm:text-sm ${tab === id ? 'bg-card text-foreground shadow-sm ring-1 ring-violet-500/30' : 'text-muted-foreground hover:text-foreground'}`}><Icon className="h-4 w-4 shrink-0" />{id === 'nomenclatura' ? 'Poderes' : id === 'defesa' ? 'Defesa' : 'Armas'}</button>)}
          </div>
          {tab === 'defesa' ? <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-4">
            <strong className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-violet-500" /> Preparar-se para reagir</strong>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">O Códice permite <strong>1 Reação por rodada</strong>, recuperada quando sua vez chega. Ao ser atacado, o Mestre solicitará a escolha: Esquivar, Bloquear ou Contra-atacar.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{['Esquivar', 'Bloquear', 'Contra-atacar'].map(x => <span key={x} className="rounded-full border border-border bg-card px-2.5 py-1 text-xs">{x}</span>)}</div>
            <p className="mt-3 text-xs text-muted-foreground">Abrir esta guia não gasta sua Reação nem envia uma ação ao Mestre. Quando houver um ataque, a escolha aparecerá automaticamente no topo.</p>
          </div> : displayed.length ? <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1" role="tabpanel" aria-label={tabNames[tab]}>
            {displayed.map(o => {
              const chosen = selectedOption?.id === o.id;
              const unaffordable = o.pfCost > (character?.pf ?? 0);
              const ability = abilities.find(a => a.id === o.id);
              return <button key={o.id} type="button" disabled={!selectable || unaffordable} aria-pressed={chosen} onClick={() => onSelectOption(o.id)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-55 ${chosen ? 'border-violet-500 bg-violet-500/10' : 'border-border bg-background/40 hover:border-violet-500/50 hover:bg-violet-500/5'}`}>
                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${o.nomenclature ? 'bg-fuchsia-500/10 text-fuchsia-500' : 'bg-violet-500/10 text-violet-500'}`}>{o.nomenclature ? <Sparkles className="h-5 w-5" /> : <Swords className="h-5 w-5" />}</span>
                <span className="min-w-0 flex-1"><strong className="block break-words text-sm">{nameOf(o)}</strong><small className="mt-1 block text-xs leading-relaxed text-muted-foreground">{ability?.kind ? `${ability.kind} · ` : ''}Dano: {damageOf(o)}</small></span>
                <span className="flex shrink-0 flex-col items-end gap-1.5">{o.pfCost > 0 && <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${unaffordable ? 'bg-rose-500/10 text-rose-600' : 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300'}`}>{o.pfCost} {resourceWord}</span>}{chosen ? <Check className="h-4 w-4 text-violet-500" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}</span>
              </button>;
            })}
          </div> : <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{tab === 'nomenclatura' ? `Nenhuma ${skillName.toLowerCase()} cadastrada na ficha.` : 'Nenhuma arma disponível.'}</div>}
          {activeSelection && <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.055] p-3.5 text-sm">
            <p className={head}>RESUMO DA AÇÃO</p><strong className="mt-1 block break-words">{nameOf(activeSelection)}</strong>
            {activeSelection.nomKind === 'Parcial' && <p className="mt-2 text-xs text-muted-foreground">Recitação Parcial: usa ação padrão e deslocamento.</p>}
            {activeSelection.nomKind === 'Completa' && <p className="mt-2 text-xs text-muted-foreground">Recitação Completa: canalização até sua vez voltar; o Mestre resolve a conclusão.</p>}
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs"><span className="rounded-lg bg-background/60 p-2">Dano <strong className="block text-sm">{damageOf(activeSelection)}</strong></span><span className="rounded-lg bg-background/60 p-2">Custo <strong className="block text-sm">{activeSelection.pfCost} {resourceWord}</strong></span></div>
          </div>}
          {hasLostAction && <p className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm"><LockKeyhole className="h-4 w-4 shrink-0" /> Uma ação do turno foi sacrificada por uma defesa anterior. Consulte o Mestre.</p>}
          {sentAttack && <p className="flex gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm"><Check className="h-4 w-4 shrink-0 text-emerald-600" /> Ação enviada. Aguardando o Mestre resolver ou recusar.</p>}
          {!isMyTurn && combatActive && <p className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-muted-foreground"><Clock3 className="h-4 w-4 shrink-0" /> Aguarde sua vez. Você ainda pode responder a uma reação solicitada.</p>}
          {tab !== 'defesa' && <Button className="min-h-[52px] w-full text-sm font-bold sm:text-base" disabled={!canSend || !selectable || !connected || !activeSelection} onClick={() => void onSendAttack()}><ArrowRight className="h-5 w-5" />{sentAttack ? 'Enviado · aguardando Mestre' : !combatActive ? 'Aguardando o Mestre iniciar' : !isMyTurn ? 'Aguarde seu turno' : !target ? 'Escolha um alvo' : !connected ? 'Aguardando conexão' : 'Confirmar e enviar ao Mestre'}</Button>}
        </section>
      </div>

      <aside className="min-w-0 space-y-4">
        <section className={`${pane} space-y-3 p-4`} aria-label="Ordem da batalha">
          <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-violet-500" /><h3 className="text-sm font-bold">Ordem de batalha</h3></div>
          <p className="text-xs text-muted-foreground">Atual: <strong className="text-foreground">{combatActive ? currentName : '—'}</strong></p>
          <div className="space-y-2">{nextFighters.length ? nextFighters.map(c => <div key={c.id} className="flex items-center gap-2 text-xs"><span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">{c.kind === 'npc' ? <Skull className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}</span><span className="min-w-0 flex-1 truncate">{c.name}</span><span className="font-semibold tabular-nums text-muted-foreground">{c.initiative ?? '—'}</span></div>) : <span className="text-xs text-muted-foreground">Sem combatentes adicionais.</span>}</div>
        </section>
        <section className={`${pane} space-y-2 p-4`}>
          <button type="button" aria-expanded={helpOpen} onClick={() => setHelpOpen(v => !v)} className="flex w-full items-center justify-between gap-2 text-left"><span className="flex items-center gap-2 text-sm font-bold"><BookOpen className="h-4 w-4 text-violet-500" /> Regras rápidas</span><ChevronDown className={`h-4 w-4 transition-transform ${helpOpen ? 'rotate-180' : ''}`} /></button>
          {helpOpen && <div className="space-y-2 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground"><p><strong>Esquiva:</strong> sem rolagem do defensor; empate favorece atacante.</p><p><strong>Bloqueio:</strong> reduz dano automaticamente.</p><p><strong>Contra-ataque:</strong> supera o total do ataque.</p><p><strong>Reação:</strong> 1 por rodada, volta quando chega sua vez; habilidades podem criar exceções.</p></div>}
        </section>
        <section className={`${pane} space-y-2 p-4`}>
          <button type="button" aria-expanded={logOpen} onClick={() => setLogOpen(v => !v)} className="flex w-full items-center justify-between gap-2 text-left"><span className="flex items-center gap-2 text-sm font-bold"><History className="h-4 w-4 text-violet-500" /> Crônica recente</span><ChevronDown className={`h-4 w-4 transition-transform ${logOpen ? 'rotate-180' : ''}`} /></button>
          {logOpen && <div className="max-h-60 space-y-2 overflow-y-auto border-t border-border pt-3">{log.length ? log.slice(0, 6).map((entry, index) => <p key={index} className="border-b border-border/50 pb-2 text-xs leading-relaxed text-muted-foreground break-words">{entry}</p>) : <p className="text-xs text-muted-foreground">Nenhum evento registrado.</p>}</div>}
        </section>
        <Button type="button" size="sm" variant="outline" className="min-h-10 w-full" onClick={onShowDetailed}><Eye className="h-4 w-4" /> Modo detalhado</Button>
        <p className="text-xs leading-relaxed text-muted-foreground">Ações e reações são enviadas ao Mestre pelo Supabase. Mantenha a conexão ativa durante a sessão.</p>
      </aside>
    </div>
    {notice && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm" role="alert"><AlertTriangle className="mr-2 inline h-4 w-4" />{notice}</div>}
  </div>;
}
