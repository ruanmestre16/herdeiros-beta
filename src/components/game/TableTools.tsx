import { useCallback, useEffect, useRef, useState } from 'react';
import { Dices, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Stepper } from './Controls';
import type { RollEntry } from './SheetExtras';
import { attrLabelFor, dieFor, rollDice, type Attr, type Character } from '@/lib/game';

/**
 * Exploração (Cap. IV e VII do Códice): Investigação por Pontos de Interesse, Dano de Queda e Domínios de Fluxo.
 * Pontos e Domínios ficam guardados no banco (Supabase), por mesa: o Mestre não perde nada se trocar de navegador
 * ou de aparelho. Tudo é visível a todos por padrão; o Mestre liga e desliga a visibilidade de cada item e é o único
 * que vê a DT e o segredo dos pontos (essas colunas ficam numa tabela só dele, protegida no servidor).
 * Requer a migração supabase/migrations/20261021120000_exploration_and_visibility.sql.
 */
const ATTRS: Attr[] = ['corpo', 'mente', 'espirito'];
type PointRow = { id: string; campaign_id: string; name: string; status: 'aberto' | 'investigado'; by_name: string; success: boolean | null; reveal: string; visible: boolean };
type SecretRow = { point_id: string; dt: number; secret: string };
type DomainRow = { id: string; campaign_id: string; name: string; region: string; mode: 'Purificar' | 'Selar' | 'Derrotar'; status: 'ativo' | 'resolvido'; notes: string; visible: boolean };
type TestMsg = { id: string; pointId: string; pointName: string; who: string; kind: 'teste' | 'auxilio'; attrs: Attr[]; dice: number[]; total: number; ts: number };
const REGIONS = ['Caixa', 'Grande Floresta', 'Grande Deserto', 'Ruínas'];
const MODES: DomainRow['mode'][] = ['Purificar', 'Selar', 'Derrotar'];
const MIGRATION_HINT = 'A Exploração precisa da migração do banco (arquivo supabase/migrations/20261021120000_exploration_and_visibility.sql). Rode-a no Supabase e recarregue a página.';
const txt = (v: unknown, n: number) => String(v ?? '').slice(0, n);
// As tabelas novas ainda não estão nos tipos gerados do Supabase: acesso solto, validado pelas políticas do banco.
const db = supabase as unknown as { from: (t: string) => any };
const missingTable = (m?: string) => !!m && /does not exist|schema cache|relation|could not find/i.test(m);

function cleanTest(p: unknown): TestMsg | null {
  const o = p as Partial<TestMsg> | null; if (!o || typeof o.id !== 'string' || !Array.isArray(o.dice)) return null;
  const dice = o.dice.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 12).slice(0, 4);
  if (!dice.length) return null;
  return { id: txt(o.id, 64), pointId: txt(o.pointId, 64), pointName: txt(o.pointName, 80), who: txt(o.who, 40), kind: o.kind === 'auxilio' ? 'auxilio' : 'teste', attrs: (Array.isArray(o.attrs) ? o.attrs : []).filter((a): a is Attr => ATTRS.includes(a as Attr)).slice(0, 2), dice, total: dice.reduce((a, b) => a + b, 0), ts: Number(o.ts) || Date.now() };
}

export function ExplorationTab({ campaignId, userId, isMaster, name, character, onApply, onRoll }: { campaignId: string | null; userId: string | null; isMaster: boolean; name: string; character?: Character; onApply?: (patch: Partial<Character>) => void; onRoll?: (e: RollEntry) => void }) {
  const [points, setPoints] = useState<PointRow[]>([]);
  const [secrets, setSecrets] = useState<Record<string, SecretRow>>({});
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [tests, setTests] = useState<TestMsg[]>([]);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState('');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const live = !!campaignId && !!userId;

  const reload = useCallback(async () => {
    if (!campaignId || !userId) return;
    const [p, s, d] = await Promise.all([
      db.from('exploration_points').select('*').eq('campaign_id', campaignId).order('created_at'),
      isMaster ? db.from('exploration_point_secrets').select('*').eq('campaign_id', campaignId) : Promise.resolve({ data: [], error: null }),
      db.from('flux_domains').select('*').eq('campaign_id', campaignId).order('created_at'),
    ]);
    const err = p.error ?? s.error ?? d.error;
    if (err) { setError(missingTable(err.message) ? MIGRATION_HINT : String(err.message)); return; }
    setError('');
    setPoints((p.data ?? []) as PointRow[]);
    setSecrets(Object.fromEntries(((s.data ?? []) as SecretRow[]).map(r => [r.point_id, r])));
    setDomains((d.data ?? []) as DomainRow[]);
  }, [campaignId, userId, isMaster]);

  const notify = useCallback(() => { const ch = channelRef.current; if (ch) void ch.send({ type: 'broadcast', event: 'explore_changed', payload: {} }); }, []);
  /** Executa uma escrita no banco, recarrega e avisa a mesa inteira para recarregar também. */
  const write = useCallback(async (op: PromiseLike<{ error: { message: string } | null }>) => {
    const { error: err } = await op;
    if (err) { setError(missingTable(err.message) ? MIGRATION_HINT : err.message); return false; }
    await reload(); notify(); return true;
  }, [reload, notify]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    if (!campaignId || !userId) { setOnline(false); return; }
    const channel = supabase.channel(`herdeiros-explore-${campaignId}`, { config: { broadcast: { self: false } } });
    channelRef.current = channel;
    channel.on('broadcast', { event: 'explore_changed' }, () => { void reload(); })
      .on('broadcast', { event: 'poi_test' }, ({ payload }) => { const t = cleanTest(payload); if (t) setTests(prev => [t, ...prev.filter(x => x.id !== t.id)].slice(0, 30)); })
      .subscribe(status => setOnline(status === 'SUBSCRIBED'));
    return () => { channelRef.current = null; setOnline(false); void supabase.removeChannel(channel); };
  }, [campaignId, userId, reload]);

  // ---------- Investigação ----------
  const [target, setTarget] = useState('');
  const [attrA, setAttrA] = useState<Attr>('mente');
  const [combine, setCombine] = useState(false);
  const [attrB, setAttrB] = useState<Attr>('espirito');
  const [newPoi, setNewPoi] = useState({ name: '', dt: 8, secret: '' });
  function rollTest(kind: 'teste' | 'auxilio') {
    if (!character) return;
    const point = points.find(p => p.id === target); if (!point) return;
    const attrs: Attr[] = kind === 'auxilio' ? ['mente'] : combine && attrB !== attrA ? [attrA, attrB] : [attrA];
    const dice = attrs.map(a => rollDice(1, dieFor(character[a]) ?? 4)[0] ?? 1);
    const total = dice.reduce((a, b) => a + b, 0);
    const t: TestMsg = { id: crypto.randomUUID(), pointId: point.id, pointName: point.name, who: name, kind, attrs, dice, total, ts: Date.now() };
    setTests(prev => [t, ...prev].slice(0, 30));
    const ch = channelRef.current; if (ch) void ch.send({ type: 'broadcast', event: 'poi_test', payload: t });
    onRoll?.({ expression: attrs.map(a => `1d${dieFor(character[a]) ?? 4}`).join(' + '), dice, modifier: 0, total, source: `${kind === 'auxilio' ? 'Auxílio (MENTE)' : 'Investigação'} · ${point.name}` });
  }
  async function addPoint() {
    if (!campaignId || !newPoi.name.trim()) return;
    const { data, error: err } = await db.from('exploration_points').insert({ campaign_id: campaignId, name: newPoi.name.trim() }).select().single();
    if (err || !data) { setError(missingTable(err?.message) ? MIGRATION_HINT : (err?.message ?? 'Não foi possível criar o ponto.')); return; }
    await write(db.from('exploration_point_secrets').insert({ point_id: data.id, campaign_id: campaignId, dt: newPoi.dt, secret: newPoi.secret.trim() }));
    setNewPoi({ name: '', dt: newPoi.dt, secret: '' });
  }
  const resolve = (p: PointRow, success: boolean, by?: string) => write(db.from('exploration_points').update({ status: 'investigado', success, by_name: by ?? '', reveal: success ? (secrets[p.id]?.secret ?? '') : '' }).eq('id', p.id));
  const reopen = (p: PointRow) => write(db.from('exploration_points').update({ status: 'aberto', success: null, by_name: '', reveal: '' }).eq('id', p.id));

  // ---------- Queda ----------
  const [meters, setMeters] = useState(6); const [fallDt, setFallDt] = useState(8);
  const [fall, setFall] = useState<{ dice: number[]; raw: number; test: number; ok: boolean; final: number } | null>(null);
  function rollFall() {
    if (!character) return;
    const n = Math.floor(meters / 3); const dice = rollDice(n, 6); const raw = dice.reduce((a, b) => a + b, 0);
    const test = rollDice(1, dieFor(character.corpo) ?? 4)[0] ?? 1; const ok = test >= fallDt;
    const final = ok ? Math.floor(raw / 2) : raw;
    setFall({ dice, raw, test, ok, final });
    onRoll?.({ expression: `${n}d6 (queda de ${meters} m) · teste de CORPO 1d${dieFor(character.corpo) ?? 4} contra DT ${fallDt}`, dice: [...dice, test], modifier: 0, total: final, source: `Queda · ${ok ? 'CORPO passou, dano pela metade' : 'CORPO falhou'}` });
  }

  if (!live) return <div className="game-panel"><div className="panel-head"><h3>Exploração</h3></div><p className="empty-copy">Entre numa mesa para usar a Investigação, o dano de queda e os Domínios de Fluxo: tudo fica guardado no banco da mesa.</p></div>;
  return <div className="two-col room-section">
    {error && <p role="alert" className="auth-message col-span-full" style={{ color: '#e0505d' }}>{error}</p>}
    <section className="game-panel col-span-full"><div className="panel-head"><h3>Investigação · Pontos de Interesse</h3><span className="muted-copy text-xs">{online ? 'ao vivo' : 'conectando…'}</span></div>
      <div className="field-stack">
        <p className="muted-copy text-xs">O Mestre anuncia os pontos do local (normalmente três). Quem investiga escolhe o atributo conforme a narração e rola o dado dele (ou soma dois, num teste combinado). Outro jogador pode auxiliar com um teste de MENTE, avisando antes. O Mestre compara com a DT e decide. Tudo o que é rolado aparece para a mesa toda.</p>
        {isMaster && <div className="field-stack">
          <div className="input-grid">
            <label className="field"><span className="field-label">NOVO PONTO DE INTERESSE</span><input value={newPoi.name} onChange={e => setNewPoi({ ...newPoi, name: e.target.value })} placeholder="Ex.: Terminal quebrado" /></label>
            <label className="field"><span className="field-label">O QUE REVELA SE DER CERTO</span><input value={newPoi.secret} onChange={e => setNewPoi({ ...newPoi, secret: e.target.value })} placeholder="Pista, objeto, passagem…" /></label>
          </div>
          <Stepper label="DT DESTE PONTO (SÓ O MESTRE VÊ)" value={newPoi.dt} min={1} max={20} onChange={dt => setNewPoi({ ...newPoi, dt })} />
          <Button variant="outline" disabled={!newPoi.name.trim()} onClick={() => void addPoint()}><Plus /> Adicionar ponto</Button>
        </div>}
        {!points.length && <p className="empty-copy">{isMaster ? 'Nenhum ponto de interesse criado ainda.' : 'O Mestre ainda não anunciou pontos de interesse.'}</p>}
        {points.map(p => { const pt = tests.filter(t => t.pointId === p.id); const sec = secrets[p.id];
          return <div className="editable-row" key={p.id}>
            <div style={{ flex: 1 }}>
              <strong>{p.name}</strong> <small className="muted-copy">{p.status === 'aberto' ? 'não investigado' : `investigado${p.by_name ? ` por ${p.by_name}` : ''} · ${p.success ? 'sucesso' : 'falhou'}`}{isMaster && !p.visible ? ' · oculto dos jogadores' : ''}</small>
              {p.reveal && <p className="auth-message">{p.reveal}</p>}
              {isMaster && sec && <div className="flex flex-wrap items-center gap-2"><small className="muted-copy">{sec.secret ? `segredo: ${sec.secret}` : 'sem segredo'}</small>
                <Stepper label="DT" value={sec.dt} min={1} max={20} onChange={dt => void write(db.from('exploration_point_secrets').update({ dt }).eq('point_id', p.id))} /></div>}
              {pt.slice(0, 4).map(t => <small className="block muted-copy" key={t.id}>{t.who}: {t.kind === 'auxilio' ? 'auxílio (MENTE)' : t.attrs.map(a => attrLabelFor(a, character?.lineage ?? '')).join(' + ')} → {t.dice.join(' + ')} = <strong>{t.total}</strong>{isMaster && sec && t.kind === 'teste' ? (t.total >= sec.dt ? ' · alcança a DT' : ' · abaixo da DT') : ''}</small>)}
              {isMaster && <div className="flex flex-wrap items-center gap-2 pt-1">
                {p.status === 'aberto' ? <><Button size="sm" variant="outline" onClick={() => void resolve(p, true, pt.find(t => t.kind === 'teste')?.who)}>Sucesso</Button><Button size="sm" variant="ghost" onClick={() => void resolve(p, false, pt.find(t => t.kind === 'teste')?.who)}>Falhou</Button></> : <Button size="sm" variant="ghost" onClick={() => void reopen(p)}>Reabrir ponto</Button>}
                <label className="anchor-toggle"><input type="checkbox" checked={p.visible} onChange={e => void write(db.from('exploration_points').update({ visible: e.target.checked }).eq('id', p.id))} /> Visível aos jogadores</label>
              </div>}
            </div>
            {isMaster && <Button size="icon" variant="ghost" title="Remover ponto" aria-label="Remover ponto" onClick={() => void write(db.from('exploration_points').delete().eq('id', p.id))}><Trash2 /></Button>}
          </div>; })}
        {character && points.some(p => p.status === 'aberto') && <div className="field-stack">
          <label className="field"><span className="field-label">PONTO QUE VOCÊ INVESTIGA</span><select value={target} onChange={e => setTarget(e.target.value)}><option value="">Escolher ponto</option>{points.filter(p => p.status === 'aberto').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <div className="input-grid">
            <label className="field"><span className="field-label">ATRIBUTO (CONFORME A NARRAÇÃO)</span><select value={attrA} onChange={e => setAttrA(e.target.value as Attr)}>{ATTRS.map(a => <option key={a} value={a}>{attrLabelFor(a, character.lineage)} · 1d{dieFor(character[a]) ?? 4}</option>)}</select></label>
            <label className="field"><span className="field-label">TESTE COMBINADO (MESTRE PEDIU)</span><select value={combine ? attrB : ''} onChange={e => { if (e.target.value) { setCombine(true); setAttrB(e.target.value as Attr); } else setCombine(false); }}><option value="">Teste simples</option>{ATTRS.filter(a => a !== attrA).map(a => <option key={a} value={a}>+ {attrLabelFor(a, character.lineage)}</option>)}</select></label>
          </div>
          <div className="flex flex-wrap gap-2"><Button disabled={!target} onClick={() => rollTest('teste')}><Dices /> Investigar</Button><Button variant="outline" disabled={!target} onClick={() => rollTest('auxilio')} title="Anuncie a ajuda antes de o colega rolar. Só um auxiliar por teste."><Dices /> Auxiliar (MENTE)</Button></div>
        </div>}
        {tests.length > 0 && <small className="muted-copy">Últimos testes da mesa: {tests.slice(0, 12).map(t => `${t.who} ${t.total}`).join(' · ')}</small>}
      </div>
    </section>

    <section className="game-panel"><div className="panel-head"><h3>Dano de queda</h3></div>
      <div className="field-stack">
        <p className="muted-copy text-xs">1d6 a cada 3 metros de queda livre. Um teste de CORPO bem-sucedido (dado do atributo contra a DT do Mestre) reduz o dano total pela metade.</p>
        <Stepper label="ALTURA DA QUEDA (METROS)" value={meters} min={0} max={90} onChange={setMeters} />
        <Stepper label="DT DO TESTE DE CORPO (MESTRE)" value={fallDt} min={1} max={12} onChange={setFallDt} />
        <Button variant="outline" disabled={!character || meters < 3} onClick={rollFall}><Dices /> Rolar queda ({Math.floor(meters / 3)}d6 + teste de CORPO)</Button>
        {fall && <div className="passive"><p>{Math.floor(meters / 3)}d6: {fall.dice.join(' + ')} = <strong>{fall.raw}</strong>. Teste de CORPO: {fall.test} contra DT {fallDt} — {fall.ok ? 'sucesso, dano pela metade' : 'falhou'}.</p><p>Dano final: <strong>{fall.final}</strong></p>
          {character && onApply && <Button onClick={() => { onApply({ pv_current: Math.max(0, character.pv_current - fall.final) }); setFall(null); }}>Aplicar −{fall.final} PV na ficha</Button>}
          {character && character.pv_current - fall.final <= 0 && <small className="muted-copy">Isso leva a 0 PV: o Mestre pode colocar o personagem em Agonia.</small>}</div>}
      </div>
    </section>

    <section className="game-panel"><div className="panel-head"><h3>Domínios de Fluxo</h3></div>
      <div className="field-stack">
        <p className="muted-copy text-xs">Regiões onde o Fluxo se acumula ou se corrompe. Alguns precisam ser purificados, outros selados e outros derrotados pela força. Todos veem os domínios; o Mestre pode ocultar qualquer um.</p>
        {isMaster && <DomainForm onAdd={d => void write(db.from('flux_domains').insert({ campaign_id: campaignId, ...d }))} />}
        {domains.length === 0 && <p className="empty-copy">{isMaster ? 'Nenhum domínio criado.' : 'Nenhum domínio anunciado.'}</p>}
        {domains.map(d => <div className="editable-row" key={d.id}>
          <div style={{ flex: 1 }}><strong>{d.name}</strong> <small className="muted-copy">{d.region} · {d.mode} · {d.status}{isMaster && !d.visible ? ' · oculto dos jogadores' : ''}</small>{d.notes && <p className="empty-copy">{d.notes}</p>}
            {isMaster && <div className="flex flex-wrap gap-2 pt-1">
              <label className="anchor-toggle"><input type="checkbox" checked={d.visible} onChange={e => void write(db.from('flux_domains').update({ visible: e.target.checked }).eq('id', d.id))} /> Visível aos jogadores</label>
              <Button size="sm" variant="ghost" onClick={() => void write(db.from('flux_domains').update({ status: d.status === 'ativo' ? 'resolvido' : 'ativo' }).eq('id', d.id))}>{d.status === 'ativo' ? 'Marcar como resolvido' : 'Reativar'}</Button></div>}
          </div>
          {isMaster && <Button size="icon" variant="ghost" title="Remover domínio" aria-label="Remover domínio" onClick={() => void write(db.from('flux_domains').delete().eq('id', d.id))}><Trash2 /></Button>}
        </div>)}
      </div>
    </section>
  </div>;
}

function DomainForm({ onAdd }: { onAdd: (d: { name: string; region: string; mode: DomainRow['mode']; notes: string }) => void }) {
  const [d, setD] = useState({ name: '', region: REGIONS[0]!, mode: 'Purificar' as DomainRow['mode'], notes: '' });
  return <div className="field-stack">
    <label className="field"><span className="field-label">NOME DO DOMÍNIO</span><input value={d.name} onChange={e => setD({ ...d, name: e.target.value })} placeholder="Ex.: Clareira dos Nomes Perdidos" /></label>
    <div className="input-grid">
      <label className="field"><span className="field-label">REGIÃO</span><select value={d.region} onChange={e => setD({ ...d, region: e.target.value })}>{REGIONS.map(r => <option key={r}>{r}</option>)}</select></label>
      <label className="field"><span className="field-label">COMO RESOLVER</span><select value={d.mode} onChange={e => setD({ ...d, mode: e.target.value as DomainRow['mode'] })}>{MODES.map(m => <option key={m}>{m}</option>)}</select></label>
    </div>
    <label className="field"><span className="field-label">O QUE ACONTECE LÁ</span><input value={d.notes} onChange={e => setD({ ...d, notes: e.target.value })} placeholder="Clima, terreno, criaturas, técnicas alteradas…" /></label>
    <Button variant="outline" disabled={!d.name.trim()} onClick={() => { onAdd({ ...d, name: d.name.trim(), notes: d.notes.trim() }); setD({ ...d, name: '', notes: '' }); }}><Plus /> Adicionar domínio</Button>
  </div>;
}
