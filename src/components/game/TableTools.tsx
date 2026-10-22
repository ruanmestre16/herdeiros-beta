import { useCallback, useEffect, useRef, useState } from 'react';
import { Dices, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Stepper } from './Controls';
import { attrLabelFor, dieFor, rollDice, type Attr, type Character } from '@/lib/game';

/**
 * Exploração (Cap. IV e VII do Códice): Investigação por Pontos de Interesse, Dano de Queda e Domínios de Fluxo.
 * O Mestre cria os pontos e domínios; jogadores e Mestre veem as mudanças ao vivo (canal em tempo real da mesa).
 * Os dados do Mestre ficam guardados no navegador dele (por mesa) e são reenviados aos jogadores quando entram.
 */
const ATTRS: Attr[] = ['corpo', 'mente', 'espirito'];
type Poi = { id: string; name: string; dt: number; secret: string; status: 'aberto' | 'investigado'; by?: string; success?: boolean };
type PublicPoi = { id: string; name: string; status: 'aberto' | 'investigado'; by?: string; success?: boolean; reveal?: string };
type Domain = { id: string; name: string; region: string; mode: 'Purificar' | 'Selar' | 'Derrotar'; status: 'ativo' | 'resolvido'; notes: string; revealed: boolean };
type PublicDomain = Omit<Domain, 'revealed'>;
type TestMsg = { id: string; pointId: string; pointName: string; who: string; kind: 'teste' | 'auxilio'; attrs: Attr[]; dice: number[]; total: number; ts: number };
const REGIONS = ['Caixa', 'Grande Floresta', 'Grande Deserto', 'Ruínas'];
const MODES: Domain['mode'][] = ['Purificar', 'Selar', 'Derrotar'];
const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random()).slice(2));
const txt = (v: unknown, n: number) => String(v ?? '').slice(0, n);
const load = <T,>(k: string, d: T): T => { try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

function cleanPoi(p: unknown): PublicPoi | null {
  const o = p as Partial<PublicPoi> | null; if (!o || typeof o.id !== 'string') return null;
  return { id: txt(o.id, 64), name: txt(o.name, 80), status: o.status === 'investigado' ? 'investigado' : 'aberto', ...(o.by ? { by: txt(o.by, 40) } : {}), ...(typeof o.success === 'boolean' ? { success: o.success } : {}), ...(o.reveal ? { reveal: txt(o.reveal, 400) } : {}) };
}
function cleanDomain(p: unknown): PublicDomain | null {
  const o = p as Partial<PublicDomain> | null; if (!o || typeof o.id !== 'string') return null;
  return { id: txt(o.id, 64), name: txt(o.name, 80), region: txt(o.region, 40), mode: MODES.includes(o.mode as Domain['mode']) ? (o.mode as Domain['mode']) : 'Purificar', status: o.status === 'resolvido' ? 'resolvido' : 'ativo', notes: txt(o.notes, 400) };
}
function cleanTest(p: unknown): TestMsg | null {
  const o = p as Partial<TestMsg> | null; if (!o || typeof o.id !== 'string' || !Array.isArray(o.dice)) return null;
  const dice = o.dice.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 12).slice(0, 4);
  if (!dice.length) return null;
  return { id: txt(o.id, 64), pointId: txt(o.pointId, 64), pointName: txt(o.pointName, 80), who: txt(o.who, 40), kind: o.kind === 'auxilio' ? 'auxilio' : 'teste', attrs: (Array.isArray(o.attrs) ? o.attrs : []).filter((a): a is Attr => ATTRS.includes(a as Attr)).slice(0, 2), dice, total: dice.reduce((a, b) => a + b, 0), ts: Number(o.ts) || Date.now() };
}

export function ExplorationTab({ campaignId, userId, isMaster, name, character, onApply }: { campaignId: string | null; userId: string | null; isMaster: boolean; name: string; character?: Character; onApply?: (patch: Partial<Character>) => void }) {
  const poiKey = `herdeiros-poi-${campaignId}`; const domKey = `herdeiros-domains-${campaignId}`;
  const [pois, setPois] = useState<Poi[]>([]);            // só o Mestre tem a lista completa (com DT e segredo)
  const [domains, setDomains] = useState<Domain[]>([]);
  const [pubPois, setPubPois] = useState<PublicPoi[]>([]);  // o que os jogadores veem
  const [pubDomains, setPubDomains] = useState<PublicDomain[]>([]);
  const [tests, setTests] = useState<TestMsg[]>([]);
  const [online, setOnline] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const poisRef = useRef<Poi[]>([]); const domainsRef = useRef<Domain[]>([]);
  poisRef.current = pois; domainsRef.current = domains;

  const toPublic = (list: Poi[]): PublicPoi[] => list.map(p => ({ id: p.id, name: p.name, status: p.status, ...(p.by ? { by: p.by } : {}), ...(typeof p.success === 'boolean' ? { success: p.success } : {}), ...(p.status === 'investigado' && p.success && p.secret ? { reveal: p.secret } : {}) }));
  const toPublicDomains = (list: Domain[]): PublicDomain[] => list.filter(d => d.revealed).map(({ revealed: _r, ...d }) => d);
  const broadcast = useCallback((event: string, payload: unknown) => { const ch = channelRef.current; if (ch) void ch.send({ type: 'broadcast', event, payload }); }, []);
  const publish = useCallback((nextPois: Poi[], nextDomains: Domain[]) => {
    save(poiKey, nextPois); save(domKey, nextDomains);
    setPubPois(toPublic(nextPois)); setPubDomains(toPublicDomains(nextDomains));
    broadcast('poi_sync', { points: toPublic(nextPois) }); broadcast('domain_sync', { domains: toPublicDomains(nextDomains) });
  }, [poiKey, domKey, broadcast]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isMaster) return;
    const p = load<Poi[]>(poiKey, []); const d = load<Domain[]>(domKey, []);
    setPois(p); setDomains(d); setPubPois(toPublic(p)); setPubDomains(toPublicDomains(d));
  }, [isMaster, poiKey, domKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!campaignId || !userId) { setOnline(false); return; }
    const channel = supabase.channel(`herdeiros-explore-${campaignId}`, { config: { broadcast: { self: false } } });
    channelRef.current = channel;
    channel.on('broadcast', { event: 'poi_sync' }, ({ payload }) => { if (isMaster) return; const l = (payload as { points?: unknown[] })?.points; if (Array.isArray(l)) setPubPois(l.map(cleanPoi).filter((x): x is PublicPoi => !!x).slice(0, 60)); })
      .on('broadcast', { event: 'domain_sync' }, ({ payload }) => { if (isMaster) return; const l = (payload as { domains?: unknown[] })?.domains; if (Array.isArray(l)) setPubDomains(l.map(cleanDomain).filter((x): x is PublicDomain => !!x).slice(0, 60)); })
      .on('broadcast', { event: 'poi_test' }, ({ payload }) => { const t = cleanTest(payload); if (t) setTests(prev => [t, ...prev.filter(x => x.id !== t.id)].slice(0, 30)); })
      .on('broadcast', { event: 'poi_request' }, () => { if (!isMaster) return; broadcast('poi_sync', { points: toPublic(poisRef.current) }); broadcast('domain_sync', { domains: toPublicDomains(domainsRef.current) }); })
      .subscribe(status => { const ok = status === 'SUBSCRIBED'; setOnline(ok); if (ok && !isMaster) void channel.send({ type: 'broadcast', event: 'poi_request', payload: {} }); });
    return () => { channelRef.current = null; setOnline(false); void supabase.removeChannel(channel); };
  }, [campaignId, userId, isMaster, broadcast]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Investigação ----------
  const [target, setTarget] = useState('');
  const [attrA, setAttrA] = useState<Attr>('mente');
  const [combine, setCombine] = useState(false);
  const [attrB, setAttrB] = useState<Attr>('espirito');
  const [newPoi, setNewPoi] = useState({ name: '', dt: 8, secret: '' });
  const list = isMaster ? pois : pubPois;
  function rollTest(kind: 'teste' | 'auxilio') {
    if (!character) return;
    const point = pubPois.find(p => p.id === target) ?? (isMaster ? pois.find(p => p.id === target) : undefined); if (!point) return;
    const attrs: Attr[] = kind === 'auxilio' ? ['mente'] : combine && attrB !== attrA ? [attrA, attrB] : [attrA];
    const dice = attrs.map(a => rollDice(1, dieFor(character[a]) ?? 4)[0] ?? 1);
    const t: TestMsg = { id: uid(), pointId: point.id, pointName: point.name, who: name, kind, attrs, dice, total: dice.reduce((a, b) => a + b, 0), ts: Date.now() };
    setTests(prev => [t, ...prev].slice(0, 30)); broadcast('poi_test', t);
  }
  function resolve(id: string, success: boolean, by?: string) {
    const next = pois.map(p => p.id === id ? { ...p, status: 'investigado' as const, success, ...(by ? { by } : {}) } : p);
    setPois(next); publish(next, domains);
  }

  // ---------- Queda ----------
  const [meters, setMeters] = useState(6); const [fallDt, setFallDt] = useState(8);
  const [fall, setFall] = useState<{ dice: number[]; raw: number; test: number; ok: boolean; final: number } | null>(null);
  function rollFall() {
    if (!character) return;
    const n = Math.floor(meters / 3); const dice = rollDice(n, 6); const raw = dice.reduce((a, b) => a + b, 0);
    const test = rollDice(1, dieFor(character.corpo) ?? 4)[0] ?? 1; const ok = test >= fallDt;
    setFall({ dice, raw, test, ok, final: ok ? Math.floor(raw / 2) : raw });
  }

  const myTests = tests.slice(0, 12);
  return <div className="two-col room-section">
    <section className="game-panel col-span-full"><div className="panel-head"><h3>Investigação · Pontos de Interesse</h3><span className="muted-copy text-xs">{campaignId && userId ? (online ? 'ao vivo' : 'conectando…') : 'só local'}</span></div>
      <div className="field-stack">
        <p className="muted-copy text-xs">O Mestre anuncia os pontos do local (normalmente três). Quem investiga escolhe o atributo conforme a narração e rola o dado dele (ou soma dois, num teste combinado). Outro jogador pode auxiliar com um teste de MENTE, avisando antes. O Mestre compara com a DT e decide.</p>
        {isMaster && <div className="field-stack">
          <div className="input-grid">
            <label className="field"><span className="field-label">NOVO PONTO DE INTERESSE</span><input value={newPoi.name} onChange={e => setNewPoi({ ...newPoi, name: e.target.value })} placeholder="Ex.: Terminal quebrado" /></label>
            <label className="field"><span className="field-label">O QUE REVELA SE DER CERTO (SÓ APARECE NO SUCESSO)</span><input value={newPoi.secret} onChange={e => setNewPoi({ ...newPoi, secret: e.target.value })} placeholder="Pista, objeto, passagem…" /></label>
          </div>
          <Stepper label="DT DESTE PONTO (SÓ O MESTRE VÊ)" value={newPoi.dt} min={1} max={20} onChange={dt => setNewPoi({ ...newPoi, dt })} />
          <Button variant="outline" disabled={!newPoi.name.trim()} onClick={() => { const next = [...pois, { id: uid(), name: newPoi.name.trim(), dt: newPoi.dt, secret: newPoi.secret.trim(), status: 'aberto' as const }]; setPois(next); publish(next, domains); setNewPoi({ name: '', dt: newPoi.dt, secret: '' }); }}><Plus /> Adicionar ponto</Button>
        </div>}
        {!list.length && <p className="empty-copy">{isMaster ? 'Nenhum ponto de interesse criado ainda.' : 'O Mestre ainda não anunciou pontos de interesse.'}</p>}
        {list.map(p => { const pt = tests.filter(t => t.pointId === p.id); const mp = isMaster ? pois.find(x => x.id === p.id) : undefined; const pub = pubPois.find(x => x.id === p.id);
          return <div className="editable-row" key={p.id}>
            <div style={{ flex: 1 }}>
              <strong>{p.name}</strong> <small className="muted-copy">{p.status === 'aberto' ? 'não investigado' : `investigado${p.by ? ` por ${p.by}` : ''} · ${p.success ? 'sucesso' : 'falhou'}`}</small>
              {pub?.reveal && <p className="auth-message">{pub.reveal}</p>}
              {isMaster && mp && <div className="flex flex-wrap items-center gap-2"><small className="muted-copy">DT {mp.dt}{mp.secret ? ` · segredo: ${mp.secret}` : ''}</small>
                <Stepper label="DT" value={mp.dt} min={1} max={20} onChange={dt => { const next = pois.map(x => x.id === mp.id ? { ...x, dt } : x); setPois(next); publish(next, domains); }} /></div>}
              {pt.slice(0, 4).map(t => <small className="block muted-copy" key={t.id}>{t.who}: {t.kind === 'auxilio' ? 'auxílio (MENTE)' : t.attrs.map(a => attrLabelFor(a, character?.lineage ?? '')).join(' + ')} → {t.dice.join(' + ')} = <strong>{t.total}</strong>{isMaster && mp ? (t.kind === 'teste' ? (t.total >= mp.dt ? ' · alcança a DT' : ' · abaixo da DT') : '') : ''}</small>)}
              {isMaster && mp && mp.status === 'aberto' && <div className="flex flex-wrap gap-2 pt-1"><Button size="sm" variant="outline" onClick={() => resolve(mp.id, true, pt.find(t => t.kind === 'teste')?.who)}>Sucesso</Button><Button size="sm" variant="ghost" onClick={() => resolve(mp.id, false, pt.find(t => t.kind === 'teste')?.who)}>Falhou</Button></div>}
              {isMaster && mp && mp.status === 'investigado' && <Button size="sm" variant="ghost" onClick={() => { const next = pois.map(x => x.id === mp.id ? { ...x, status: 'aberto' as const, success: undefined, by: undefined } : x); setPois(next); publish(next, domains); }}>Reabrir ponto</Button>}
            </div>
            {isMaster && <Button size="icon" variant="ghost" title="Remover ponto" aria-label="Remover ponto" onClick={() => { const next = pois.filter(x => x.id !== p.id); setPois(next); publish(next, domains); }}><Trash2 /></Button>}
          </div>; })}
        {character && list.length > 0 && <div className="field-stack">
          <label className="field"><span className="field-label">PONTO QUE VOCÊ INVESTIGA</span><select value={target} onChange={e => setTarget(e.target.value)}><option value="">Escolher ponto</option>{pubPois.filter(p => p.status === 'aberto').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <div className="input-grid">
            <label className="field"><span className="field-label">ATRIBUTO (CONFORME A NARRAÇÃO)</span><select value={attrA} onChange={e => setAttrA(e.target.value as Attr)}>{ATTRS.map(a => <option key={a} value={a}>{attrLabelFor(a, character.lineage)} · 1d{dieFor(character[a]) ?? 4}</option>)}</select></label>
            <label className="field"><span className="field-label">TESTE COMBINADO (MESTRE PEDIU)</span><select value={combine ? attrB : ''} onChange={e => { if (e.target.value) { setCombine(true); setAttrB(e.target.value as Attr); } else setCombine(false); }}><option value="">Teste simples</option>{ATTRS.filter(a => a !== attrA).map(a => <option key={a} value={a}>+ {attrLabelFor(a, character.lineage)}</option>)}</select></label>
          </div>
          <div className="flex flex-wrap gap-2"><Button disabled={!target} onClick={() => rollTest('teste')}><Dices /> Investigar</Button><Button variant="outline" disabled={!target} onClick={() => rollTest('auxilio')} title="Anuncie a ajuda antes de o colega rolar. Só um auxiliar por teste."><Dices /> Auxiliar (MENTE)</Button></div>
        </div>}
        {myTests.length > 0 && <small className="muted-copy">Últimos testes da mesa: {myTests.map(t => `${t.who} ${t.total}`).join(' · ')}</small>}
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
        <p className="muted-copy text-xs">Regiões onde o Fluxo se acumula ou se corrompe. Alguns precisam ser purificados, outros selados e outros derrotados pela força. O Mestre escolhe quais os jogadores veem.</p>
        {isMaster && <DomainForm onAdd={d => { const next = [...domains, { ...d, id: uid(), status: 'ativo' as const, revealed: false }]; setDomains(next); publish(pois, next); }} />}
        {(isMaster ? domains : pubDomains).length === 0 && <p className="empty-copy">{isMaster ? 'Nenhum domínio criado.' : 'Nenhum domínio revelado pelo Mestre.'}</p>}
        {(isMaster ? domains : pubDomains).map(d => <div className="editable-row" key={d.id}>
          <div style={{ flex: 1 }}><strong>{d.name}</strong> <small className="muted-copy">{d.region} · {d.mode} · {d.status}</small>{d.notes && <p className="empty-copy">{d.notes}</p>}
            {isMaster && 'revealed' in d && <div className="flex flex-wrap gap-2 pt-1">
              <label className="anchor-toggle"><input type="checkbox" checked={(d as Domain).revealed} onChange={e => { const next = domains.map(x => x.id === d.id ? { ...x, revealed: e.target.checked } : x); setDomains(next); publish(pois, next); }} /> Revelar aos jogadores</label>
              <Button size="sm" variant="ghost" onClick={() => { const next = domains.map(x => x.id === d.id ? { ...x, status: x.status === 'ativo' ? 'resolvido' as const : 'ativo' as const } : x); setDomains(next); publish(pois, next); }}>{d.status === 'ativo' ? 'Marcar como resolvido' : 'Reativar'}</Button></div>}
          </div>
          {isMaster && <Button size="icon" variant="ghost" title="Remover domínio" aria-label="Remover domínio" onClick={() => { const next = domains.filter(x => x.id !== d.id); setDomains(next); publish(pois, next); }}><Trash2 /></Button>}
        </div>)}
      </div>
    </section>
  </div>;
}

function DomainForm({ onAdd }: { onAdd: (d: { name: string; region: string; mode: Domain['mode']; notes: string }) => void }) {
  const [d, setD] = useState({ name: '', region: REGIONS[0]!, mode: 'Purificar' as Domain['mode'], notes: '' });
  return <div className="field-stack">
    <label className="field"><span className="field-label">NOME DO DOMÍNIO</span><input value={d.name} onChange={e => setD({ ...d, name: e.target.value })} placeholder="Ex.: Clareira dos Nomes Perdidos" /></label>
    <div className="input-grid">
      <label className="field"><span className="field-label">REGIÃO</span><select value={d.region} onChange={e => setD({ ...d, region: e.target.value })}>{REGIONS.map(r => <option key={r}>{r}</option>)}</select></label>
      <label className="field"><span className="field-label">COMO RESOLVER</span><select value={d.mode} onChange={e => setD({ ...d, mode: e.target.value as Domain['mode'] })}>{MODES.map(m => <option key={m}>{m}</option>)}</select></label>
    </div>
    <label className="field"><span className="field-label">O QUE ACONTECE LÁ</span><input value={d.notes} onChange={e => setD({ ...d, notes: e.target.value })} placeholder="Clima, terreno, criaturas, técnicas alteradas…" /></label>
    <Button variant="outline" disabled={!d.name.trim()} onClick={() => { onAdd({ ...d, name: d.name.trim(), notes: d.notes.trim() }); setD({ ...d, name: '', notes: '' }); }}><Plus /> Adicionar domínio</Button>
  </div>;
}
