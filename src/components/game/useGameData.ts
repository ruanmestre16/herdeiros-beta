import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { makeCampaign, makeCharacter, makeNpc, normalizeCharacter, type Campaign, type Character, type Npc } from '@/lib/game';

type LiveRow = { id: string; [key: string]: unknown };
const upsertRow = <T extends { id: string }>(rows: T[], row: T) => {
  const index = rows.findIndex(item => item.id === row.id);
  if (index < 0) return [...rows, row];
  return rows.map(item => item.id === row.id ? row : item);
};

export function useGameData() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [characters, setCharacters] = useState<Character[]>(() => [makeCharacter()]);
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => [makeCampaign()]);
  const [npcs, setNpcs] = useState<Npc[]>(() => [makeNpc()]);
  const [error, setError] = useState('');
  const [profileName, setProfileName] = useState('');
  const [memberships, setMemberships] = useState<{campaign_id:string;user_id:string;character_id:string|null}[]>([]);
  const [partyCharacters, setPartyCharacters] = useState<Character[]>([]);
  const [demoHydrated, setDemoHydrated] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState<Record<string,string>>({});
  const sheetDrafts = useRef(new Map<string, Character>());
  const sheetTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const sheetWrites = useRef(new Map<string, Promise<void>>());
  const recentSheets = useRef(new Map<string, { row: Character; until: number }>());
  const recentNpcs = useRef(new Map<string, { row: Npc; until: number }>());
  const charactersRef = useRef(characters);
  const partyRef = useRef(partyCharacters);
  charactersRef.current = characters;
  partyRef.current = partyCharacters;
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('herdeiros-demo-v1');
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.characters)) setCharacters(saved.characters.map(normalizeCharacter));
        if (Array.isArray(saved.campaigns)) setCampaigns(saved.campaigns);
        if (Array.isArray(saved.npcs)) setNpcs(saved.npcs);
      } else {
        window.localStorage.setItem('herdeiros-demo-v1', JSON.stringify({ characters: [makeCharacter()], campaigns: [makeCampaign()], npcs: [makeNpc()] }));
      }
    } catch { /* Invalid demo data starts a fresh session. */ }
    setDemoHydrated(true);
  }, []);
  useEffect(() => {
    if (demoHydrated && ready && !userId) window.localStorage.setItem('herdeiros-demo-v1', JSON.stringify({ characters, campaigns, npcs }));
  }, [demoHydrated, ready, userId, characters, campaigns, npcs]);
  const load = useCallback(async (id: string) => {
    const [sheets, rooms, enemies, memberRows, profile] = await Promise.all([supabase.from('sheets').select('*').eq('user_id', id).order('created_at'), supabase.from('campaigns').select('*').order('created_at'), supabase.from('npcs').select('*').order('created_at'), supabase.from('campaign_members').select('*'),supabase.from('profiles').select('display_name').eq('id',id).maybeSingle()]);
    if (sheets.error || rooms.error || enemies.error || memberRows.error) setError(sheets.error?.message || rooms.error?.message || enemies.error?.message || memberRows.error?.message || 'Não foi possível carregar os dados.');
    else { const preserveDrafts=(rows:Character[])=>rows.map(row=>sheetDrafts.current.get(row.id) ?? (recentSheets.current.get(row.id)?.until ?? 0)>Date.now()?recentSheets.current.get(row.id)?.row ?? row:row); setCharacters(preserveDrafts(((sheets.data ?? []) as unknown as Character[]).map(normalizeCharacter))); setCampaigns((rooms.data ?? []) as unknown as Campaign[]); setNpcs(((enemies.data ?? []) as unknown as Npc[]).map(row=>(recentNpcs.current.get(row.id)?.until ?? 0)>Date.now()?recentNpcs.current.get(row.id)?.row ?? row:row)); setMemberships((memberRows.data ?? []) as {campaign_id:string;user_id:string;character_id:string|null}[]); const memberIds=(memberRows.data??[]).map(m=>m.character_id).filter((value):value is string=>!!value); if(memberIds.length){ const party=await supabase.from('sheets').select('*').in('id',memberIds); if(party.error)setError(party.error.message); else setPartyCharacters(preserveDrafts(((party.data??[]) as unknown as Character[]).map(normalizeCharacter))); }else setPartyCharacters([]); setProfileName(profile.data?.display_name || ''); { const ids=[...new Set([...(memberRows.data??[]).map(m=>m.user_id),...(rooms.data??[]).map(r=>r.master_id)])]; if(ids.length){ const pr=await supabase.from('profiles').select('id,display_name').in('id',ids); setMemberProfiles(Object.fromEntries((pr.data??[]).map(p=>[p.id,p.display_name]))); } } setError(''); }
    setReady(true);
  }, []);
  useEffect(() => { let active = true; supabase.auth.getUser().then(async ({ data }) => { if (!active) return; const id = data.user?.id ?? null; setUserId(id); if (id) { const name=data.user?.user_metadata?.['display_name']; if(typeof name==='string'&&name.trim()) await supabase.from('profiles').upsert({id,display_name:name.trim().slice(0,60)},{onConflict:'id',ignoreDuplicates:true}); if(active)void load(id); }else setReady(true); }); const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='USER_UPDATED')void supabase.auth.getUser().then(({data})=>{if(!active)return; const next=data.user?.id??null;setUserId(next);if(next)void load(next);else {setMemberships([]);setPartyCharacters([]);setReady(true)};});}); return () => { active = false; subscription.unsubscribe(); }; }, [load]);
  const flushSheet = useCallback((id: string): Promise<void> => {
    const timer = sheetTimers.current.get(id);
    if (timer) clearTimeout(timer);
    sheetTimers.current.delete(id);
    const previous = sheetWrites.current.get(id) ?? Promise.resolve();
    const write = previous.catch(() => {}).then(async () => {
      const character = sheetDrafts.current.get(id);
      if (!character) return;
      sheetDrafts.current.delete(id);
      const { user_id: _owner, created_at: _created, ...patch } = character as Character & { user_id?: string; created_at?: string };
      recentSheets.current.set(id, { row: character, until: Date.now() + 3000 });
      const { error: err } = await supabase.from('sheets').update(patch as never).eq('id', id);
      if (err) { setError(err.message); recentSheets.current.delete(id); }
      else recentSheets.current.set(id, { row: character, until: Date.now() + 1500 });
    });
    sheetWrites.current.set(id, write);
    void write.finally(() => { if (sheetWrites.current.get(id) === write) sheetWrites.current.delete(id); });
    return write;
  }, []);
  function saveCharacter(character: Character, immediate = false) {
    setCharacters(prev => prev.map(c => c.id === character.id ? character : c));
    setPartyCharacters(prev => prev.map(c => c.id === character.id ? character : c));
    if (!userId) return Promise.resolve();
    sheetDrafts.current.set(character.id, character);
    const old = sheetTimers.current.get(character.id);
    if (old) clearTimeout(old);
    if (immediate) return flushSheet(character.id);
    sheetTimers.current.set(character.id, setTimeout(() => { void flushSheet(character.id); }, 500));
    return Promise.resolve();
  }
  async function addCharacter() {
    const character = makeCharacter();
    if (userId) { const { data, error: err } = await supabase.from('sheets').insert({ ...character, user_id: userId }).select().single(); if (err) { setError(err.message); return null; } setCharacters(prev => [...prev, data as unknown as Character]); return data.id; }
    setCharacters(prev => [...prev, character]); return character.id;
  }
  async function deleteCharacter(id: string) { const timer=sheetTimers.current.get(id); if(timer)clearTimeout(timer); sheetTimers.current.delete(id); sheetDrafts.current.delete(id); await sheetWrites.current.get(id); if (userId) { const { error: err } = await supabase.from('sheets').delete().eq('id', id).eq('user_id', userId); if (err) { setError(err.message); return; } } recentSheets.current.delete(id); setCharacters(prev => prev.filter(c => c.id !== id)); }
  async function saveCampaign(campaign: Campaign) { setCampaigns(prev => prev.map(c => c.id === campaign.id ? campaign : c)); if (userId) { const { error: err } = await supabase.from('campaigns').update(campaign).eq('id', campaign.id).eq('master_id', userId); if (err) setError(err.message); } }
  async function addCampaign() { const campaign = { ...makeCampaign(), code: Math.random().toString(36).slice(2,8).toUpperCase() }; if (userId) { const { data, error: err } = await supabase.from('campaigns').insert({ ...campaign, master_id: userId }).select().single(); if (err) { setError(err.message); return null; } setCampaigns(prev => [...prev, data as unknown as Campaign]); return data.id; } setCampaigns(prev => [...prev, campaign]); return campaign.id; }
  async function saveNpc(npc: Npc) { setNpcs(prev => prev.map(n => n.id === npc.id ? npc : n)); if (userId) { recentNpcs.current.set(npc.id,{row:npc,until:Date.now()+1500}); const { error: err } = await supabase.from('npcs').update(npc).eq('id', npc.id); if (err) { recentNpcs.current.delete(npc.id); setError(err.message); } } }
  async function addNpc(campaignId: string) { const npc = makeNpc(); if (userId) { const { data, error: err } = await supabase.from('npcs').insert({ ...npc, campaign_id: campaignId }).select().single(); if (err) { setError(err.message); return null; } setNpcs(prev => [...prev, data as unknown as Npc]); return data.id; } setNpcs(prev => [...prev, npc]); return npc.id; }
  async function deleteNpc(id: string) { if (userId) { const { error: err } = await supabase.from('npcs').delete().eq('id', id); if (err) { setError(err.message); return; } } setNpcs(prev => prev.filter(n => n.id !== id)); }
  async function saveProfile(name: string) { if (!userId) return; const trimmed=name.trim().slice(0,60); if (!trimmed) { setError('Informe um nome de perfil.'); return; } const {error:err}=await supabase.from('profiles').upsert({id:userId,display_name:trimmed}); if(err)setError(err.message); else setProfileName(trimmed); }
  async function setRoomPassword(id:string,password:string) { if (!userId) return 'Entre na sua conta para criar uma senha.'; const {error:err}=await supabase.rpc('set_campaign_password',{p_campaign:id,p_password:password}); return err?.message??null; }
  async function joinRoom(code:string,password:string) { if (!userId) return 'Entre na sua conta para participar da mesa.'; const {data, error:err}=await supabase.rpc('join_campaign',{p_code:code,p_password:password}); if(err) return err.message; await load(userId); return data; }
  async function joinInvite(token:string) { if (!userId) return null; const {data,error:err}=await supabase.rpc('join_campaign_invite',{p_token:token}); if(err){setError(err.message);return null;} await load(userId); return data as string; }
  async function kickMember(campaignId:string,memberId:string){ const {error:err}=await supabase.from('campaign_members').delete().eq('campaign_id',campaignId).eq('user_id',memberId); if(err)setError(err.message); else if(userId) await load(userId); }
  async function selectMemberCharacter(campaignId:string,characterId:string|null) {if(!userId)return; const {error:err}=await supabase.from('campaign_members').update({character_id:characterId}).eq('campaign_id',campaignId).eq('user_id',userId); if(err)setError(err.message); else setMemberships(prev=>prev.map(m=>m.campaign_id===campaignId&&m.user_id===userId?{...m,character_id:characterId}:m));}
  async function leaveRoom(campaignId:string){if(!userId)return; const {error:err}=await supabase.from('campaign_members').delete().eq('campaign_id',campaignId).eq('user_id',userId); if(err)setError(err.message);else await load(userId);}
  const hasTable = !!userId && campaigns.some(c=>'master_id' in c && c.master_id===userId) || !!userId && memberships.some(m=>m.user_id===userId);
  useEffect(()=>{
    if(!userId || !hasTable)return;
    let timer:ReturnType<typeof setTimeout>|undefined;
    let reload=false;
    const sheetEvents = new Map<string, { eventType:string; new:LiveRow; old:LiveRow }>();
    const npcEvents = new Map<string, { eventType:string; new:LiveRow; old:LiveRow }>();
    const queue=()=>{
      if(timer)clearTimeout(timer);
      timer=setTimeout(()=>{
        timer=undefined;
        if(reload){ reload=false; sheetEvents.clear(); npcEvents.clear(); void load(userId); return; }
        for(const event of sheetEvents.values()){
          const id=event.new.id || event.old.id;
          if(!id)continue;
          if(event.eventType==='DELETE') {setCharacters(prev=>prev.filter(c=>c.id!==id));setPartyCharacters(prev=>prev.filter(c=>c.id!==id));continue;}
          const row=normalizeCharacter(event.new as Character);
          const draft=sheetDrafts.current.get(id);
          const recent=recentSheets.current.get(id);
          if(draft || (recent && recent.until>Date.now() && Object.keys(recent.row).every(key=>JSON.stringify((row as unknown as Record<string,unknown>)[key])===JSON.stringify((recent.row as unknown as Record<string,unknown>)[key]))))continue;
          if(recent && recent.until<=Date.now())recentSheets.current.delete(id);
          const own=charactersRef.current.some(c=>c.id===id);
          const party=partyRef.current.some(c=>c.id===id);
          if(own)setCharacters(prev=>upsertRow(prev,row));
          if(party)setPartyCharacters(prev=>upsertRow(prev,row));
        }
        for(const event of npcEvents.values()){
          const id=event.new.id || event.old.id;
          if(!id)continue;
          if(event.eventType==='DELETE'){setNpcs(prev=>prev.filter(n=>n.id!==id));continue;}
          const row=event.new as Npc;
          const recent=recentNpcs.current.get(id);
          if(recent && recent.until>Date.now() && Object.keys(recent.row).every(key=>JSON.stringify((row as unknown as Record<string,unknown>)[key])===JSON.stringify((recent.row as unknown as Record<string,unknown>)[key])))continue;
          if(recent && recent.until<=Date.now())recentNpcs.current.delete(id);
          setNpcs(prev=>upsertRow(prev,row));
        }
        sheetEvents.clear();npcEvents.clear();
      },300);
    };
    const channel=supabase.channel(`herdeiros-live-${userId}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'campaigns'},()=>{reload=true;queue()})
      .on('postgres_changes',{event:'*',schema:'public',table:'campaign_members'},()=>{reload=true;queue()})
      .on('postgres_changes',{event:'*',schema:'public',table:'sheets'},payload=>{const row=(payload.new && 'id' in payload.new?payload.new:payload.old) as LiveRow; if(row?.id){sheetEvents.set(row.id,{eventType:payload.eventType,new:payload.new as LiveRow,old:payload.old as LiveRow});queue();}})
      .on('postgres_changes',{event:'*',schema:'public',table:'npcs'},payload=>{const row=(payload.new && 'id' in payload.new?payload.new:payload.old) as LiveRow; if(row?.id){npcEvents.set(row.id,{eventType:payload.eventType,new:payload.new as LiveRow,old:payload.old as LiveRow});queue();}})
      .subscribe();
    return ()=>{if(timer)clearTimeout(timer);void supabase.removeChannel(channel)};
  },[userId,hasTable,load]);
  useEffect(()=>()=>{for(const timer of sheetTimers.current.values())clearTimeout(timer); for(const id of sheetDrafts.current.keys())void flushSheet(id);},[flushSheet]);
  /** Atualiza PV/PF (e limpa iniciativa) de uma ficha a partir do combate. Fichas de outros jogadores passam pela função segura do Mestre. */
  async function updateSheetResources(id: string, pv: number | null, pf: number | null, clearInitiative = false) {
    const own = charactersRef.current.find(c => c.id === id);
    const apply = (c: Character) => ({ ...c, pv_current: pv === null ? c.pv_current : Math.max(0, Math.min(c.pv_max, pv)), pf_current: pf === null ? c.pf_current : Math.max(0, Math.min(c.pf_max, pf)), initiative: clearInitiative ? null : c.initiative });
    if (own) { await saveCharacter(apply(sheetDrafts.current.get(id) ?? own),true); return; }
    setPartyCharacters(prev => prev.map(c => c.id === id ? apply(c) : c));
    if (!userId) return;
    const { error: err } = await supabase.rpc('master_update_sheet', { p_sheet: id, p_pv: pv as number, p_pf: pf as number, p_clear_initiative: clearInitiative });
    if (err) setError(err.message);
  }
  return { memberProfiles, joinInvite, kickMember, updateSheetResources, userId, ready, characters, partyCharacters, campaigns, npcs, memberships, profileName, error, saveProfile, setRoomPassword, joinRoom, selectMemberCharacter, leaveRoom, saveCharacter, addCharacter, deleteCharacter, saveCampaign, addCampaign, saveNpc, addNpc, deleteNpc };
}
