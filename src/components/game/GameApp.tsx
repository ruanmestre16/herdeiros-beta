import { useEffect, useState } from 'react';
import { ArrowRight, ExternalLink, BookOpen, Check, ChevronDown, Copy, Dices, Eye, EyeOff, HeartPulse, LogIn, LogOut, Menu, Plus, ScrollText, Shield, Skull, Sparkles, Swords, Trash2, Users, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Stepper, Meter, SectionHeading } from './Controls';
import { useGameData } from './useGameData';
import { derived, dieFor, roll, karmaMaximum, karmaStage, splitStory, joinStory, isTechAgent, attrLabelFor, resourceStageLabel, resourceBarLabel, LINEAGE_STAGES, stageIndexFor, forceActionLabel, nomenclatureLabel, normalizeCharacter, forceFlux, attackRoll, weaponAttrFor, v8SheetPatch, attributeInfo, sheetState, withSheetState, agonyStatus, agonyLabel, agonyEnter, type Character, type Npc } from '@/lib/game';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import scene from '@/assets/flux-scene.jpg';
import { KarmaTest, hasAnchor, ANCHOR_NAME, SyncEditor, GakiPassive, WeaponPanel, AbsorbPfAction, AgonyPanel, NomenclaturesTab, AbilitiesTab, CoinsPanel, RestPanel, GsPanel, PathPanel, EgoWeaponPanel, FluxLinkToggle, type RollEntry } from './SheetExtras';
import { CombatPanel } from './CombatPanel';
import { CharacterCreationWizard } from './CharacterCreationWizard';
import { PlayerSheetUnified } from './PlayerSheetUnified';
import { GsControl } from './GsControl';
import { NewNpcDialog, type MonsterSheet, type BestiaryMeta } from './NewNpcDialog';
import { BestiaryPage } from './BestiaryPage';
import { readBestiaryAttacks } from '@/lib/bestiary';
import { splitBestiaryAbilities, nucleusAsNomenclatures } from '@/lib/master-bestiary';
import { MasterAbilityCards } from './MasterAbilityCards';
import { WeaponDamageEditor } from './WeaponDamageEditor';
import { rollDamageFormula } from '@/lib/weapon-damage';
import { NpcFullSheet } from './NpcFullSheet';
import { MonsterDashboard } from './MonsterDashboard';
import { LineagesPage } from './LineagesPage';
import { KillCallFx } from './KillCallFx';
import { TabletopDice } from './TabletopDice';
import './herdeiros-navigation.css';
import { ExplorationTab } from './TableTools';
import { WEAPONS, npcShows, hideNpcNames } from '@/lib/game';

type Area = 'jogador'|'mesa'|'mestre'|'rolador'|'regras'|'bestiario'|'linhagens';
type SheetTab = 'Geral'|'Nomenclaturas'|'Habilidades'|'Inventário'|'História';
const resourceText = (text: string) => text.split(/(crític[oa]s?|fluxo|karma|\bPF\b)/gi).map((part, i) => /crític|fluxo|^PF$/i.test(part) ? <span className="text-flux" key={i}>{part}</span> : /^karma$/i.test(part) ? <span className="text-karma" key={i}>{part}</span> : part);
const nav: { key: Area; label: string; icon: typeof Users }[] = [{key:'jogador',label:'Jogador',icon:Users},{key:'mesa',label:'Mesa / Mestre',icon:Shield},{key:'regras',label:'Regras',icon:ScrollText},{key:'linhagens',label:'Linhagens',icon:Sparkles},{key:'bestiario',label:'Bestiário',icon:BookOpen}];
const ruleSections = [
 {title:'Os três pilares e a criação', items:['Corpo: força bruta, velocidade e resistência. Mente: intelecto, estratégia e disciplina. Espírito: conexão com o Fluxo e autoridade da alma sobre a realidade.','Nível 1: cada atributo começa em 1 e você recebe +3 pontos para distribuir. Na criação, só um atributo pode chegar a 3.','Teto por estágio: Estágio 1 = 3 (só um atributo no 3) · Estágio 2 = 4 (só um no 4, os outros até 3) · Estágio 3 = 5 (só um no 5, até dois no 4). A cada avanço de estágio, +1 ponto em qualquer atributo. Não é permitido tirar pontos de um atributo para pôr em outro.','Dado do atributo: 1 = d4 · 2 = d6 · 3 = d8 · 4 = d10 · 5 = d12. A história pesa mais que o número: uma boa ideia narrada vale mais que um dado alto, e rende Moedas do Destino.']},
 {title:'Ataque, crítico e dano', items:['Acerto: 1d20 + dado do atributo contra a Esquiva. O empate favorece quem ataca. Humano ataca com MENTE (Arma de Vínculo), Arcadiano com ESPÍRITO (Arma de Ego), Gaki com CORPO (corpo moldado). Arma comum, sem Vínculo nem Ego, e desarmado usam CORPO. Nomenclaturas usam ESPÍRITO.','Crítico: 20 natural, mas só se o total superar ou igualar a Esquiva (se ela for alta demais, o 20 não acerta). Dobra todos os dados de dano, inclusive o dado do atributo; valores fixos não dobram. Falha crítica: 1 natural em ataque é sempre falha, qualquer que seja a soma.','Dano: dado base + valor fixo do atributo. Com Arma / Corpo Evoluído (5 GS) o dado do atributo substitui o valor fixo; com Dominado (7 GS) soma dado + valor fixo. Armas comuns nunca evoluem.','Iniciativa: role tantos d20 quanto o Corpo, mantenha o maior e some o Corpo.']},
 {title:'Dano base das armas', items:WEAPONS.map(w=>`${w.label}: ${w.note}`)},
 {title:'Turno, reações e pressão', items:['Por turno: 1 ação livre, 1 ação padrão e 1 ação de deslocamento. Deslocamento por Corpo: 7 / 9 / 11 / 12 / 13 m.','1 Reação por rodada, que só volta no seu próximo turno. Esquivar: não rola nada; o total do atacante é comparado com a sua Esquiva. Bloquear: o ataque o atinge e você anula dano igual ao Bloqueio. Contra-atacar: 1d20 + dado do seu maior atributo precisa superar o total do atacante (empate favorece o atacante); se vencer, narra um ataque livre.','Dança de Batalha (alvo de 2 ou mais inimigos, só corpo a corpo): 2 inimigos, Esquiva normal · 3 ou 4, cada ataque evitado reduz a Esquiva em 1 · 5 ou mais, em 2. Se qualquer ataque acertar, o ritmo se quebra.','Queda: 1d6 a cada 3 m; teste de CORPO bem-sucedido reduz o dano pela metade.']},
 {title:'Defesas contra Nomenclaturas', items:['Direta: só as Reações comuns. Parcial: Bloqueio Parcial (Reação, 4 PF e a ação padrão da próxima rodada): dado de ESPÍRITO + Bloqueio, descontado do dano. Completa: Bloqueio contra Nomenclatura Completa (Reação e a próxima ação inteira, não consecutivo): maior de ESPÍRITO d20 + Bloqueio.','Proteção Compartilhada: um aliado com 3 ou mais de Elo faz o Bloqueio contra Completa em si mesmo e o resultado se soma ao seu.']},
 {title:'Fluxo e Nomenclaturas', items:['Nomeação Direta (Nome Curto): 1d6, crítico 2d6, 2 PF. Recitação Parcial (O Chamado): 2d8, crítico 4d8, 5 PF. Recitação Completa (Verdadeira): 6d8, crítico 12d8 puro, 12 PF. Acerto: 1d20 + dado de ESPÍRITO.','Aprimorada (5 GS): dado de ESPÍRITO entra no dano. Dominada (7 GS): dado + valor fixo; Parcial custa 3 PF e Completa 10 PF. Favorita (10 GS): versão superior combinada com o Mestre.','Agente Tecnológico: Ativação Padrão, Ativação Forçada e Liberação Total de Núcleo equivalem a Direta, Parcial e Completa.','Absorção de PF: role os d20 de Espírito e some. O maior dado define a faixa da soma inteira: 1-7 um terço · 8-14 metade · 15-19 inteira · 20 dobro. Depois some ESPÍRITO. Limite: ESPÍRITO × 20; o excedente pode ser partilhado (Elo 2+, ação padrão) ou mantido por 1d4 rodadas.','Forçar o Fluxo (ação livre, quando os PF não bastam): role de novo os d20 de Espírito; ganhe PF igual à metade da soma (para baixo) e receba Karma igual à metade dos PF gerados.']},
 {title:'GS (Grau de Sincronia) e marcos', items:['O GS vai de 0 a 10 e não é gasto. O Mestre concede GS ao final de sessões marcantes, após grandes feitos ou ao superar traumas. Ele acumula (6, 7, 8...) e, ao chegar a 5, 7 e 10, libera um marco. No marco de 5 GS o jogador define o caminho (Arma, Corpo Moldado ou Nomenclatura no Estágio 1) e os marcos de 7 e 10 seguem esse mesmo caminho; os outros ficam fechados.','Estágio 1 · ARMA — 5 GS, Arma Evoluída: o dado do atributo entra no lugar do valor fixo (1d8 + 1d6 em vez de 1d8 + 2); opção de Vínculo de Fluxo: 2 PF para o dano de Fluxo contar como dano normal contra Gakis. 7 GS, Arma Dominada: soma dado + valor fixo (1d8 + 1d6 + 2). 10 GS, Arma Estilizada: efeito especial definido com o Mestre e Crítico Triplo (10 PF antes do ataque: a margem de crítico do d20 passa a ser 20 menos o atributo de ataque da linhagem e, se for crítico, os dados de dano ×3; os PF são gastos mesmo sem crítico).','Estágio 1 · CORPO MOLDADO — 5 GS, Corpo Evoluído: o dado de CORPO substitui o valor fixo no dano. 7 GS, Corpo Dominado: soma dado + valor fixo de CORPO e libera Ataque Extra (3 PF após acertar, 2d20 ficando com o menor + dado de CORPO, 1x por rodada). 10 GS, Corpo Estilizado: O Chamado (5 PF, os alvos fazem teste de ESPÍRITO) e Ataque Extra Refinado (10 PF, dois ataques normais sem desvantagem).','Estágio 1 · NOMENCLATURA — 5 GS, Aprimorada: o dado de ESPÍRITO entra no dano de Direta, Parcial e Completa (ESPÍRITO 3 = +1d8 em vez de +3). 7 GS, Dominada: soma dado + valor fixo de ESPÍRITO; Parcial passa a 3 PF e Completa a 10 PF (Direta segue 2 PF). 10 GS, Favorita: uma Nomenclatura evolui para versão superior (mais dados, efeito novo ou alcance maior) combinada com o Mestre.','Avanço de estágio: ao resolver o marco de 10, o GS zera e você avança. Humano, Gaki e Agente Tecnológico ganham +1 ponto de atributo e +1 Nomenclatura nova; Arcadiano ganha +1 ponto de atributo e +2 Nomenclaturas novas. O teto de atributo do estágio sempre vale.']},
 {title:'Marcos do Estágio 2', items:['Quando o GS zera e você avança para o Estágio 2, a barra recomeça do 0 e você passa de novo pelos marcos de 5, 7 e 10; as evoluções do Estágio 1 continuam valendo. Há três caminhos: Mimetismo do Fluxo, Vingança Karmática e Nomenclatura Avançada. O caminho é definido no marco de 5 GS e os marcos de 7 e 10 seguem o mesmo; os outros dois ficam fechados.','MIMETISMO DO FLUXO · 5 GS, Registro e Inventário: guarda até MENTE + ESPÍRITO habilidades copiadas (as antigas podem ser substituídas); ao presenciar uma técnica, faça um teste de MENTE + ESPÍRITO contra a DT do Mestre gastando 5 PF para gravá-la; se falhar, a oportunidade se fecha permanentemente para aquela técnica (receber o ataque facilita; técnicas de aliados exigem Elo alto ou dano proposital). 7 GS, Mimetismo Dominado: ativar a habilidade junto com o ataque custa 3 PF, com teste de MENTE + ESPÍRITO e efeito em escala reduzida. 10 GS, Mimetismo Absoluto: 12 PF, sem testes, na escala máxima.','VINGANÇA KARMÁTICA · 5 GS: 3 PF antes do ataque; se acertar, devolve 1/3 do dano recebido até ali como dano bônus (se errar, os PF se perdem). 7 GS, Aprimorada: 5 PF antes do ataque; devolve 1/2 do dano acumulado como dano fixo bônus. 10 GS, Absoluta: 12 PF, sem nenhum teste; descarrega 100% do dano recebido no combate no próximo ataque e aplica ao alvo Karma igual à metade do dano devolvido.','NOMENCLATURA AVANÇADA · 5 GS, Favorita Dupla: uma segunda Nomenclatura Favorita. 7 GS, A Voz e o Eco da Arma de Ego: 1x por cena, ação livre, 5 PF; só vale até uma versão parcial da técnica da arma, nunca uma completa; se errar o ataque o efeito se desfaz e os PF são consumidos. 10 GS, Fusão de Nomenclaturas: 12 PF para fundir duas Nomenclaturas conhecidas numa técnica nova; o ataque precisa acertar, senão os 12 PF são consumidos.','Custos do Estágio 1 que também valem aqui como referência: Ataque Extra do Corpo Moldado (7 GS) 3 PF, O Chamado (10 GS) 5 PF e Ataque Extra Refinado (10 GS) 10 PF.','Depois do Estágio 3, os marcos são conversa livre com o Mestre, narrada e justificada.']},
 {title:'Elo e Moedas do Destino', items:['Elo: Proteger aliado de perigo real +1 · Dividir segredo ou trauma +1 · Salvar de morte ou Agonia +2 · Luta em dupla marcante +1. Elo 2+ partilha PFs; Elo 3+ permite Proteção Compartilhada.','Moedas do Destino: 1 por grande narração ou sacada, sem limite. Erga a Âncora Sentimental (fica exposta) para gastar: rerrolagem de aliado, auxílio narrativo ou firmar a própria mente. O Mestre define o custo. Âncora quebrada: teste de MENTE; se falhar, o Karma recebido é dobrado.']},
 {title:'Karma, descanso e Agonia', items:['Limite de Karma = metade do máximo dos d20 de MENTE + um quarto do máximo dos d20 de ESPÍRITO (cada d20 vale 20). Distorção em 50% (+3 de dano em todo ataque), Berserker em 70% (+5, imune à dor, se falhar em MENTE ataca sem distinção), Consumido em 100%.','Descanso: padrão 2d8 PV e −2d6 Karma · focado em vida 2d12 PV e −1d6 · focado em Karma 1d8 PV e −3d6.','Agonia: 0 PV. DT inicial 6, que cai com a boa narração; teste de um dado de atributo. 1ª tentativa sozinho, 2ª com socorro de um aliado, 3ª escolha final (tentar sair ou Nomenclatura do Sacrifício). Sucesso: volta com 1 PV. Três falhas: Morte Definitiva.','Morte com Karma alto (acima de 50%): o Mestre decide se desperta como Gaki Irracional. Habilidades Próprias: teste MENTE + ESPÍRITO ou MENTE + CORPO; modos Padrão, Tempo Dedicado e Com Pressa.']},
];

function TextInput({ label, value, onChange, placeholder }: { label:string; value:string; onChange:(s:string)=>void; placeholder?:string }) { return <label className="field"><span className="field-label">{label}</span><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} /></label>; }
function Panel({ title, children, action, className = '' }: { title: string; children: React.ReactNode; action?: React.ReactNode; className?: string }) { return <section className={`game-panel ${className}`}><div className="panel-head"><h3>{title}</h3>{action}</div>{children}</section>; }
function TabBar<T extends string>({ tabs, active, onSelect, labels }: { tabs: readonly T[]; active:T; onSelect:(tab:T)=>void; labels?: Partial<Record<T, string>> }) { return <div className="tabbar" role="tablist">{tabs.map(t=><Button key={t} role="tab" aria-selected={active===t} variant="ghost" onClick={()=>onSelect(t)} className={`tab ${active===t?'tab-active':''}`}>{labels?.[t] ?? t}</Button>)}</div>; }

export function GameApp({ combatOnly = false }: { combatOnly?: boolean } = {}) {
 const data=useGameData();
 const [wizardOpen,setWizardOpen]=useState(false);
 const [wizardLineage,setWizardLineage]=useState<'Humano'|'Arcadiano'|'Gaki'|'Agente Tecnológico'>('Humano');
 const [newNpcOpen,setNewNpcOpen]=useState(false); const [newNpcTemplateId,setNewNpcTemplateId]=useState(''); const [newNpcStep,setNewNpcStep]=useState<'choose'|'templates'|'lineage'|'monster'>('choose'); const [openNpcId,setOpenNpcId]=useState(''); const [area,setArea]=useState<Area>('jogador'); const [sheetTab,setSheetTab]=useState<SheetTab>('Geral'); const [sheetId,setSheetIdRaw]=useState<string|null>(null); const setSheetId=(id:string|null)=>{setSheetIdRaw(id); try{ if(id)sessionStorage.setItem('herdeiros-sheet',id); else sessionStorage.removeItem('herdeiros-sheet'); }catch{/* ignore */}}; const [campaignId,setCampaignId]=useState<string|null>(null); const [masterTab,setMasterTab]=useState('NPCs e inimigos'); const [mobileNav,setMobileNav]=useState(false); const [authOpen,setAuthOpen]=useState(false);
 const [roomPassword,setRoomPassword]=useState(''); const [passwordFeedback,setPasswordFeedback]=useState(''); const [joinCode,setJoinCode]=useState(''); const [joinPassword,setJoinPassword]=useState(''); const [joinFeedback,setJoinFeedback]=useState(''); 
 const [rolls,setRolls]=useState<{id:string; expression:string; dice:number[]; modifier:number; total:number; source?:string|undefined; crit?:boolean}[]>([]);
 const allSheetsEarly=[...data.characters,...data.partyCharacters.filter(c=>!data.characters.some(own=>own.id===c.id))]; const character=allSheetsEarly.find(c=>c.id===sheetId) ?? data.characters[0]; const campaign=data.campaigns.find(c=>c.id===campaignId) ?? data.campaigns[0]; const isMaster=!!data.userId && !!campaign && ('master_id' in campaign) && campaign.master_id===data.userId; const campaignNpcs=data.npcs.filter(n=>!('campaign_id' in n) || n.campaign_id===campaign?.id);
 const allSheets=[...data.characters,...data.partyCharacters.filter(c=>!data.characters.some(own=>own.id===c.id))];
 const combatParty=data.userId?data.memberships.filter(m=>m.campaign_id===campaign?.id&&m.character_id).map(m=>allSheets.find(c=>c.id===m.character_id)).filter((c):c is Character=>!!c):data.characters;
 const ownsCharacter=!!character&&data.characters.some(c=>c.id===character.id);
 const masteredCampaignIds=data.campaigns.filter(c=>'master_id' in c&&(c as {master_id:string}).master_id===data.userId).map(c=>c.id);
 const masterOfCharacter=!!character&&data.memberships.some(m=>m.character_id===character.id&&masteredCampaignIds.includes(m.campaign_id));
 const canEditSheet=!data.userId||ownsCharacter||masterOfCharacter;
 const canEditTable=!data.userId||isMaster;
 const myTableIds=character?data.memberships.filter(m=>m.character_id===character.id).map(m=>m.campaign_id):[];
 const tablemates:Character[]=!character?[]:data.userId
  ?data.memberships.filter(m=>myTableIds.includes(m.campaign_id)&&m.character_id&&m.character_id!==character.id).map(m=>allSheets.find(c=>c.id===m.character_id)).filter((c):c is Character=>!!c).filter((c,i,a)=>a.findIndex(x=>x.id===c.id)===i)
  :data.characters.filter(c=>c.id!==character.id);
 const tableMembers=campaign?data.memberships.filter(m=>m.campaign_id===campaign.id):[];
 const visibleNpcs=campaignNpcs.filter(n=>isMaster||!data.userId||!n.hidden);
 const [inviteMsg,setInviteMsg]=useState('');
 const myMembership=campaign?data.memberships.find(m=>m.campaign_id===campaign.id&&m.user_id===data.userId):undefined;
 const myCharacterId=myMembership?.character_id??null;
 const openCombatSheet=(combatant:{id:string;kind:'pc'|'npc';pc?:Character;npc?:Npc})=>{
   if(combatant.pc){setSheetId(combatant.pc.id);setSheetTab('Geral');go('jogador');return;}
   if(combatant.npc){setOpenNpcId(combatant.npc.id);setMasterTab('NPCs e inimigos');go('mestre');}
 };
 useEffect(()=>{ const token=new URLSearchParams(window.location.search).get('convite'); if(!token||!data.ready)return; if(!data.userId){setAuthOpen(true);return;} void data.joinInvite(token).then(id=>{ if(id){setCampaignId(id);setArea('mesa');setInviteMsg('Você entrou na mesa pelo convite!');window.history.replaceState({},'','/mesa');} });
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[data.ready,data.userId]);
 useEffect(()=>{ try{ const saved=sessionStorage.getItem('herdeiros-sheet'); if(saved)setSheetIdRaw(saved); }catch{/* ignore */} },[]);
 // A janela do Mestre abre a ficha solicitada na área completa, sem duplicar o editor na janela pequena.
 useEffect(()=>{
   if(combatOnly || !data.ready) return;
   const params=new URLSearchParams(window.location.search);
   const id=params.get('combat_sheet');
   if(!id) return;
   const pc=[...data.characters,...data.partyCharacters].find(c=>c.id===id);
   const npc=data.npcs.find(n=>n.id===id);
   if(pc){setSheetId(id);setSheetTab('Geral');setArea('jogador');}
   else if(npc && isMaster){setOpenNpcId(id);setMasterTab('NPCs e inimigos');setArea('mestre');}
   else return;
   window.history.replaceState({},'',pc?'/':'/mestre');
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[combatOnly,data.ready,data.characters,data.partyCharacters,data.npcs,isMaster]);
 useEffect(()=>{
   if (!combatOnly || !data.ready) return;
   const requested = new URLSearchParams(window.location.search).get('mesa');
   if (requested && data.campaigns.some(c=>c.id===requested)) setCampaignId(requested);
 },[combatOnly, data.ready, data.campaigns]);
 useEffect(()=>{ const path=window.location.pathname; if(path.includes('mestre'))setArea('mestre'); else if(path.includes('mesa'))setArea('mesa'); else if(path.includes('rolador'))setArea('mesa'); /* URL antiga: os dados agora aparecem no pop-up inferior. */ else if(path.includes('bestiario'))setArea('bestiario'); else if(path.includes('regras'))setArea('regras'); else if(path.includes('linhagens'))setArea('linhagens'); },[]);
 useEffect(()=>{
   if(!openNpcId || area!=='mestre' || masterTab!=='NPCs e inimigos' || !campaignNpcs.some(n=>n.id===openNpcId))return;
   const frame=requestAnimationFrame(()=>document.getElementById(`npc-card-${openNpcId}`)?.scrollIntoView({behavior:'smooth',block:'nearest'}));
   return ()=>cancelAnimationFrame(frame);
 },[openNpcId,area,masterTab,campaignNpcs.length]);
 function go(next:Area) { setArea(next); setMobileNav(false); window.history.replaceState({},'',next==='jogador'?'/':`/${next}`); window.scrollTo({top:0,behavior:'smooth'}); }
 /** Toda rolagem do app aparece para a mesa: a janela de dados recebe este aviso e a envia a todos (nomes de NPCs ocultos viram genéricos para os jogadores). */
 function announceRoll(e:{expression:string;dice:number[];total:number;source?:string}) { if(typeof window==='undefined')return; const pub=(t:string)=>hideNpcNames(t,campaignNpcs); window.dispatchEvent(new CustomEvent('herdeiros:roll',{detail:{expression:e.expression,dice:e.dice,total:e.total,source:e.source??'Rolagem',publicExpression:pub(e.expression),publicSource:pub(e.source??'Rolagem')}})); }
 function throwDice(expression:string,source?:string) { const result=roll(expression); if(result) { const entry={...result,id:crypto.randomUUID(),source}; setRolls(prev=>[entry,...prev].slice(0,40)); announceRoll({expression:result.expression,dice:result.dice,total:result.total,source}); return result; } return null; }
 function addRoll(entry:RollEntry){ setRolls(prev=>[{...entry,id:crypto.randomUUID()},...prev].slice(0,40)); announceRoll(entry); }
 const [attrNotice,setAttrNotice]=useState('');
 function updateCharacter(partial:Partial<Character>) { if(!character||!canEditSheet)return; const patch=v8SheetPatch(character,partial); if(Object.keys(partial).length&&!Object.keys(patch).length){setAttrNotice('Atributo não alterado: respeite o teto do estágio (3/4/5), os pontos disponíveis e a regra de que não se tiram pontos de um atributo para pôr em outro.');return;} setAttrNotice(''); void data.saveCharacter({...character,...patch}); }
 async function createGuidedCharacter(initial:Partial<Character>) { const id=await data.addCharacter(initial); if(!id)return false; setSheetId(id);setSheetTab('Geral');setWizardOpen(false);return true; }
 function updateNpc(npc:Npc,partial:Partial<Npc>) { void data.saveNpc({...npc,...partial}); }
 function setPcInitiative(id:string,total:number) { const sheet=allSheets.find(c=>c.id===id); if(sheet) void data.saveCharacter({...sheet,initiative:total},true); }
  async function importNpcSheet(npc:Npc) {
  // Exporta UMA CÓPIA para a conta do Mestre. O NPC original e seu combate continuam intactos.
  const full=npcSheet(npc) ?? normalizeCharacter({
    id:crypto.randomUUID(),name:npc.name,concept:splitNpcNotes(npc.notes).text,
    lineage:'Humano',stage:LINEAGE_STAGES.Humano?.[0]?.name??'',
    corpo:npc.corpo,mente:npc.mente,espirito:npc.espirito,
    pv_current:npc.pv_current,pv_max:npc.pv_max,pf_current:npc.pf_current,pf_max:npc.pf_max,
  });
  // O banco de fichas pessoais não possui colunas bestiary/gaki. O conteúdo do monstro
  // é exportado para os campos já existentes (Habilidades e História) sem perder os poderes.
  const {gaki:_gaki,bestiary:meta,...clean}=full as MonsterSheet;
  const powers = meta ? [...(meta.abilityCards ?? splitBestiaryAbilities(meta.habilidades)),...(meta.nucleusCards??[]),...(meta.gsCards??[])] : [];
  const importedAbilities = powers.map(a=>({name:a.name,description:`${a.cost?`Custo: ${a.cost}. `:''}${a.description}`}));
  const sourceInfo = meta ? [
    `BESTIÁRIO: ${meta.category} · NA ${meta.threat}`,
    `Esquiva original: ${npc.esquiva} · Bloqueio original: ${npc.bloqueio}`,
    `Ataques do modelo:\n${meta.ataques}`,
    meta.dt?`DTs e testes:\n${meta.dt}`:'',
    meta.observacoes?`Reservas e notas especiais:\n${meta.observacoes}`:'',
    meta.mkPreset?`Progressão MK: ${meta.mkPreset.path}`:'',
  ].filter(Boolean).join('\n\n') : '';
  const id=await data.addCharacter({
    ...clean,id:crypto.randomUUID(),initiative:null,
    abilities:[...clean.abilities,...importedAbilities],
    story:sourceInfo ? `${clean.story}${clean.story?'\n\n':''}${sourceInfo}` : clean.story,
  });
  if(!id)return;
  setSheetId(id);setSheetTab('Geral');setOpenNpcId('');go('jogador');
 }

 function openCombatWindow(){
   if (!campaign) return;
   const url=`/combate-rapido?mesa=${encodeURIComponent(campaign.id)}`;
   const smallScreen=window.matchMedia('(max-width: 767px)').matches;
   // WebView/APK e celulares usam navegação comum, pois window.open pode ser bloqueado ou virar uma aba.
   if(smallScreen){window.location.assign(url);return;}
   const win=window.open(url,`herdeiros-combate-${campaign.id}`,'popup=yes,width=480,height=780,resizable=yes,scrollbars=yes');
   if(win){win.focus();return;}
   // Fallback quando o navegador bloqueia pop-ups.
   window.location.assign(url);
 }
 const myChar=ownsCharacter&&character?character:data.characters[0];
  const myName=isMaster?'Mestre':(myChar?.name??'Jogador');
  const myApply=(patch:Partial<Character>)=>{ if(!myChar)return; if(ownsCharacter&&character){updateCharacter(patch);return;} void data.saveCharacter({...myChar,...v8SheetPatch(myChar,patch)}); };
  if(combatOnly) return <main className="min-h-screen bg-background text-foreground px-3 py-4 sm:px-5">
    <div className="mx-auto max-w-[560px] space-y-4">
      <header className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div><p className="field-kicker">HERDEIROS · O DESPERTAR</p><h1 className="font-bold text-lg">⚔ {isMaster ? 'Controle do Mestre' : 'Combate rápido'}</h1></div>
        <Button variant="outline" size="sm" onClick={()=>window.location.assign('/mesa')}>Mesa completa</Button>
      </header>
      {!data.ready ? <div className="game-panel">Carregando sua mesa...</div> : !data.userId ? <div className="game-panel"><h2>Entre na sua conta</h2><p>Faça login no site principal para usar a janela de combate da sua mesa.</p><Button onClick={()=>window.location.assign('/mesa')}>Ir para o login</Button></div> : !campaign ? <div className="game-panel">Nenhuma mesa encontrada. Abra a área Mesa e entre em uma campanha.</div> : <>
        {data.campaigns.length>1 && <label className="field"><span className="field-label">MESA</span><select value={campaign.id} onChange={e=>setCampaignId(e.target.value)}>{data.campaigns.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>}
        <CombatPanel compact campaign={campaign} party={combatParty} npcs={visibleNpcs} saveCampaign={c=>void data.saveCampaign(c)} saveNpc={n=>void data.saveNpc(n)} updateSheet={(id,pv,pf,clear)=>void data.updateSheetResources(id,pv,pf,clear)} patchSheet={(c,patch)=>void data.saveCharacter({...c,...patch},true)} addRoll={addRoll} setPcInitiative={setPcInitiative} resetStandard={c=>{if(sheetState(c).standard)void data.saveCharacter({...c,abilities:withSheetState(c,{standard:false})},true)}} enterAgony={c=>void data.saveCharacter(agonyEnter(c),true)} isMaster={isMaster} userId={data.userId} myCharacterId={myCharacterId} openSheet={c=>{const url=`/mesa?combat_sheet=${encodeURIComponent(c.id)}`;const w=window.open(url,'_blank');if(w)w.opener=null;else window.location.assign(url);}} />
      </>}
      <p className="text-xs text-muted-foreground">Sincronizado com a mesa via Supabase. No PC, você pode mover e redimensionar esta janela ao lado do seu Tabletop.</p>
    </div>
  </main>;
  return <div className="app-shell"><KillCallFx campaigns={data.campaigns}/><TabletopDice campaignId={campaign?.id??null} userId={data.userId} name={myName} character={myChar} onApply={myChar?myApply:undefined} addRoll={addRoll} isMaster={isMaster}/>
  <header className="topbar"><div className="topbar-inner"><Button variant="ghost" className="brand" onClick={()=>go('jogador')}><span className="brand-mark">✦</span><span>HERDEIROS<span className="brand-dot">.</span></span></Button><nav className={`main-nav ${mobileNav?'nav-open':''}`} aria-label="Navegação principal">{nav.map(item=><Button key={item.key} variant="ghost" className={`nav-item ${area===item.key||(item.key==='mesa'&&area==='mestre')?'nav-active':''}`} onClick={()=>go(item.key)}><item.icon size={15}/>{item.label}</Button>)}</nav><div className="topbar-actions"><span className="live-indicator"><i/> MESA VIVA</span><Button variant="outline" size="sm" onClick={()=>setAuthOpen(true)} className="account-button">{data.userId?<><Users/> {data.profileName || 'Definir perfil'}</>:<><LogIn/> Entrar</>}</Button><Button variant="ghost" size="icon" className="mobile-menu" onClick={()=>setMobileNav(!mobileNav)} aria-label="Abrir menu">{mobileNav?<X/>:<Menu/>}</Button></div></div></header>
  <main className="main-wrap">
   {(area==='mesa'||area==='mestre')&&<div className="herdeiros-hub" aria-label="Navegação da mesa e do mestre">
     <div className="herdeiros-hub-title"><span>SESSÃO ATIVA</span><strong>Mesa / Mestre</strong><small>Jogar, narrar e administrar no mesmo lugar.</small></div>
     <div className="herdeiros-hub-actions" role="group" aria-label="Visão da sessão">
       <Button type="button" variant={area==='mesa'?'default':'outline'} aria-pressed={area==='mesa'} onClick={()=>go('mesa')}><Users size={16}/> Visão da Mesa</Button>
       <Button type="button" variant={area==='mestre'?'default':'outline'} aria-pressed={area==='mestre'} onClick={()=>go('mestre')}><Shield size={16}/> Ferramentas do Mestre</Button>
     </div>
   </div>}

   {area==='jogador' && <>{wizardOpen && <CharacterCreationWizard initialLineage={wizardLineage} onClose={()=>{setWizardOpen(false);setWizardLineage('Humano')}} onCreate={createGuidedCharacter}/>}<div className="scene-banner"><img src={scene} width={1536} height={1024} alt="Herdeiro diante de um portal de Fluxo ancestral"/><div className="scene-content"><span className="eyebrow"><span className="eyebrow-line"/> O DESPERTAR COMEÇA AQUI</span><h1>Seu destino.<br/><em>Sua história.</em></h1><p>Cada escolha deixa uma marca no <span className="text-flux">Fluxo</span>.</p></div><span className="scene-corner">HERDEIROS / FICHA DE PERSONAGEM</span></div>
    <div className="page-heading"><div><span className="eyebrow subtle">ÁREA DO JOGADOR <span className="slash">/</span> FICHAS</span><h2>Personagem <em>jogável</em></h2><p className="muted-copy">Dê forma ao seu Herdeiro e acompanhe cada mudança da jornada.</p></div><div className="flex flex-wrap items-center gap-2">
      {campaign && myMembership?.character_id && <Button variant="outline" className="min-h-11" onClick={openCombatWindow}><Swords/> Abrir combate {campaign.combat_active ? '· ao vivo' : ''}</Button>}
      <Button onClick={()=>setWizardOpen(true)}><Plus/> Criar nova ficha</Button>
    </div></div>
    <div className="workspace-layout"><aside className="sidebar"><SectionHeading title="Suas fichas" aside={<span className="tiny-count">{data.characters.length.toString().padStart(2,'0')}</span>}/><div className="sheet-list">{data.characters.map(c=><Button variant="ghost" className={`sheet-list-item ${character?.id===c.id?'selected':''}`} key={c.id} onClick={()=>{setSheetId(c.id);setSheetTab('Geral')}}><span className="sheet-avatar">{c.name.slice(0,1).toUpperCase()}</span><span className="sheet-list-info"><strong>{c.name||'Sem nome'}</strong><small>{c.lineage} · Estágio {stageIndexFor(c.lineage,c.stage)+1}</small></span><ArrowRight size={14}/></Button>)}{!data.characters.length&&<div className="empty-side">Nenhuma ficha criada.</div>}</div><div className="sidebar-note"><Sparkles size={16}/><span>O <span className="text-flux">Fluxo</span> muda com suas escolhas.</span></div></aside>
    <div className="workspace-content">{character ? <>{!ownsCharacter&&data.userId&&<div className="readonly-banner">{masterOfCharacter?'Você está editando esta ficha como Mestre da mesa.':'Visualizando a ficha de outro jogador — somente leitura.'}</div>}<div className="hu-sheet-topbar"><span>FICHA INTERATIVA · TODAS AS FUNÇÕES EM UM SÓ LUGAR</span><Button size="sm" variant="ghost" title="Excluir ficha" aria-label={`Excluir ficha de ${character.name}`} onClick={()=>{if(confirm(`Excluir definitivamente a ficha ${character.name}?`))void data.deleteCharacter(character.id)}}><Trash2 size={16}/> Excluir ficha</Button></div>
     <div className="readonly-scope">
       <PlayerSheetUnified
         character={character} update={updateCharacter} addRoll={addRoll} onRoll={throwDice}
         tablemates={tablemates} onShare={toId=>data.sharePf(character.id,toId)}
         notice={attrNotice} onCombat={campaign && myMembership?.character_id===character.id ? openCombatWindow : undefined}
         externalTab={sheetTab} onTabChange={setSheetTab} isMaster={!data.userId||masterOfCharacter} readOnly={!canEditSheet}
       />
     </div></>:<div className="empty-stage"><Sparkles size={26}/><h2>O próximo Herdeiro ainda não despertou.</h2><Button onClick={()=>setWizardOpen(true)}><Plus/> Criar ficha</Button></div>}</div></div></>}
   {area==='mestre' && <><div className="page-heading standalone"><div><span className="eyebrow subtle">ÁREA DO MESTRE / O MUNDO RESPONDE</span><h1>À frente do <em className="text-flux">Fluxo.</em></h1><p className="muted-copy">Dê vida aos personagens, conduza a cena e acompanhe o combate.</p></div><Button onClick={async()=>{const id=await data.addCampaign();setCampaignId(id)}}><Plus/> Nova mesa</Button></div><div className="campaign-picker"><span className="field-kicker">MESA ATIVA</span><select value={campaign?.id??''} onChange={e=>setCampaignId(e.target.value)}>{data.campaigns.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select><span className="room-code">CÓDIGO <strong>{campaign?.code??'—'}</strong></span><Button variant="ghost" size="icon" title="Copiar código" aria-label="Copiar código" onClick={()=>campaign&&navigator.clipboard.writeText(campaign.code)}><Copy/></Button></div>{campaign ? <><TabBar tabs={['Mesa','NPCs e inimigos','Combate','Exploração','Eventos']} active={masterTab} onSelect={setMasterTab}/>{!canEditTable&&<div className="readonly-banner">Você é jogador nesta mesa: pode ver tudo, mas as decisões do combate ficam disponíveis no seu próprio turno.</div>}
{masterTab!=='Combate'&&<fieldset disabled={!canEditTable} className="readonly-scope">
    {masterTab==='Mesa'&&<div className="two-col room-section"><Panel title="Dados da mesa"><div className="field-stack"><TextInput label="NOME DA MESA" value={campaign.name} onChange={name=>void data.saveCampaign({...campaign,name})}/><TextInput label="CENA ATUAL" value={campaign.scene} onChange={scene=>void data.saveCampaign({...campaign,scene})}/>{isMaster&&<><label className="field"><span className="field-label">SENHA DA MESA</span><input type="password" value={roomPassword} onChange={e=>setRoomPassword(e.target.value)} placeholder="Mínimo de 4 caracteres"/></label><Button disabled={roomPassword.length<4} onClick={async()=>{const result=await data.setRoomPassword(campaign.id,roomPassword);setPasswordFeedback(result||'Senha da mesa salva. Envie código e senha aos jogadores.');if(!result)setRoomPassword('')}}><Shield/> Salvar senha</Button>{passwordFeedback&&<p role="status" className="auth-message">{passwordFeedback}</p>}</>}</div><div className="room-note"><ScrollText/><span>Compartilhe o código com os jogadores. Ou copie o link de convite: quem abrir entra com o Google direto na mesa.</span></div></Panel><Panel title="Resumo da sessão"><div className="session-metrics"><div><strong>{campaignNpcs.length}</strong><span>NPCs</span></div><div><strong>{campaign.round}</strong><span>RODADA</span></div><div><strong>{campaign.log.length}</strong><span>EVENTOS</span></div></div><Button className="w-full mt-6" onClick={()=>setMasterTab('Combate')}><Swords/> Ir para combate</Button></Panel>
      <Panel title="Quem está na mesa" className="col-span-full" action={isMaster&&'invite_token' in campaign?<Button size="sm" variant="outline" onClick={()=>{void navigator.clipboard.writeText(`${window.location.origin}/mesa?convite=${(campaign as {invite_token:string}).invite_token}`);setInviteMsg('Link de convite copiado! Quem abrir entra com o Google direto na mesa.')}}><Copy/> Copiar convite</Button>:undefined}>
       {inviteMsg&&<p role="status" className="auth-message">{inviteMsg}</p>}
       {'master_id' in campaign&&<p className="muted-copy mb-3">Mestre: <strong>{data.memberProfiles[(campaign as {master_id:string}).master_id]||'—'}</strong></p>}
       {tableMembers.map(m=>{const sheet=allSheets.find(c=>c.id===m.character_id);return <div className="roster-row" key={m.user_id}><span className="sheet-avatar">{(data.memberProfiles[m.user_id]||'?').slice(0,1).toUpperCase()}</span><span className="flex-1"><strong>{data.memberProfiles[m.user_id]||'Jogador'}</strong><small>{sheet?`${sheet.name} · ${sheet.pv_current}/${sheet.pv_max} PV · ${sheet.pf_current}/${sheet.pf_max} ${isTechAgent(sheet.lineage)?"PN":"PF"} · ${resourceBarLabel(sheet.lineage)} ${sheet.karma}${agonyLabel(sheet)}`:'Ainda sem ficha escolhida'}</small></span>{sheet&&isMaster&&<GsControl compact character={sheet} onChange={gs=>void data.saveCharacter({...sheet,gs},true)}/>}{sheet&&isMaster&&<><Button size="sm" variant="outline" onClick={()=>void data.saveCharacter({...sheet,pv_current:Math.max(0,sheet.pv_current-1)})}>−1 PV</Button><Button size="sm" variant="outline" onClick={()=>void data.saveCharacter({...sheet,pv_current:Math.max(0,sheet.pv_current-5)})}>−5 PV</Button><Button size="sm" variant="outline" onClick={()=>void data.saveCharacter({...sheet,pv_current:Math.min(sheet.pv_max,sheet.pv_current+1)})}>+1 PV</Button><Button size="sm" variant="outline" className="action-agony" title="Entrar em Agonia" aria-label={`Entrar em Agonia: ${sheet.name}`} disabled={agonyStatus(sheet).active||agonyStatus(sheet).dead} onClick={()=>void data.saveCharacter(agonyEnter(sheet),true)}>☠ Agonia</Button></>}{sheet&&<Button size="sm" onClick={()=>{setSheetId(sheet.id);setSheetTab('Geral');go('jogador')}}>{isMaster?'Editar ficha':'Ver ficha'} <ArrowRight/></Button>}{isMaster&&<Button size="icon" variant="ghost" title="Remover da mesa" aria-label="Remover da mesa" onClick={()=>{if(confirm('Remover este jogador da mesa?'))void data.kickMember(campaign.id,m.user_id)}}><Trash2/></Button>}</div>})}
       {!tableMembers.length&&<p className="empty-copy">{data.userId?'Nenhum jogador entrou ainda. Envie o convite.':'Entre na sua conta para convidar jogadores.'}</p>}
       {campaignNpcs.length>0&&<><span className="field-kicker mt-4 block">NPCs E INIMIGOS</span>{campaignNpcs.map(n=><div className="roster-row" key={n.id}><span className="sheet-avatar">{n.name.slice(0,1)}</span><span className="flex-1"><strong>{n.name}</strong><small>{n.pv_current}/{n.pv_max} PV{n.hidden?' · oculto':''}</small></span><Button size="sm" variant="outline" onClick={()=>updateNpc(n,{pv_current:Math.max(0,n.pv_current-1)})}>−1 PV</Button><Button size="sm" variant="outline" onClick={()=>updateNpc(n,{pv_current:Math.max(0,n.pv_current-5)})}>−5 PV</Button><Button size="sm" variant="outline" onClick={()=>updateNpc(n,{pv_current:Math.min(n.pv_max,n.pv_current+1)})}>+1 PV</Button></div>)}</>}
      </Panel></div>}
         {masterTab==='NPCs e inimigos'&&<div className="master-area">
       <div className="hu-npc-new hm-table-sheets">
         <div className="hm-table-sheets-head">
           <UserRound size={23} aria-hidden="true"/>
           <div className="hm-table-sheets-heading"><strong>Fichas da Mesa</strong><p>Escolha que tipo de ficha vai entrar na sessão. Todas aparecem abaixo e podem ser usadas ou exportadas para Minhas Fichas.</p></div>
           <span className="hm-table-count">{campaignNpcs.length} {campaignNpcs.length===1?'ficha':'fichas'}</span>
         </div>
         <div className="hm-table-types" role="group" aria-label="Criar ficha por tipo">
           <button type="button" onClick={()=>{setNewNpcTemplateId('');setNewNpcStep('templates');setNewNpcOpen(true)}}><BookOpen size={19}/><span><strong>Bestiário</strong><small>Criatura do livro</small></span><ArrowRight size={15}/></button>
           <button type="button" onClick={()=>{setNewNpcTemplateId('');setNewNpcStep('lineage');setNewNpcOpen(true)}}><UserRound size={19}/><span><strong>Herdeiro / NPC</strong><small>Humano, Arcadiano, Gaki ou Agente</small></span><ArrowRight size={15}/></button>
           <button type="button" onClick={()=>{setNewNpcTemplateId('');setNewNpcStep('monster');setNewNpcOpen(true)}}><Skull size={19}/><span><strong>Monstro original</strong><small>Criação do zero</small></span><ArrowRight size={15}/></button>
         </div>
       </div>
       <SectionHeading number="01" title={`Fichas criadas · ${campaignNpcs.length}`}/>
       {openNpcId&&campaignNpcs.some(n=>n.id===openNpcId)&&<div className="hu-npc-new" role="status"><Check size={19}/><strong>Ficha criada na mesa!</strong><span>Ela está destacada abaixo. Abra e edite os valores, ou exporte uma cópia para suas fichas.</span><Button size="sm" variant="ghost" onClick={()=>setOpenNpcId('')}>Entendi</Button></div>}
       <div className="npc-list">{campaignNpcs.map(npc=><div key={npc.id} id={`npc-card-${npc.id}`} className={openNpcId===npc.id?'hu-npc-selected':''}>
          <NpcEditor defaultOpen={npc.id===openNpcId} npc={npc} update={partial=>updateNpc(npc,partial)} remove={()=>{if(confirm(`Excluir ${npc.name}?`))void data.deleteNpc(npc.id)}} throwDice={throwDice} addRoll={addRoll} importSheet={()=>void importNpcSheet(npc)}/>
       </div>)}</div>
       {!campaignNpcs.length&&<div className="hm-table-empty"><Skull size={20}/><span>Nenhuma ficha na mesa ainda. Escolha Bestiário, Herdeiro / NPC ou Monstro original acima para começar.</span></div>}
     </div>}
{masterTab==='Eventos'&&<div className="single-section"><SectionHeading number="02" title="Registro da sessão"/><div className="event-composer"><input id="new-event" placeholder="O que aconteceu na mesa?" onKeyDown={e=>{if(e.key==='Enter'&&e.currentTarget.value.trim()){void data.saveCampaign({...campaign,log:[e.currentTarget.value.trim(),...campaign.log]});e.currentTarget.value=''}}}/><Button onClick={()=>{const input=document.getElementById('new-event') as HTMLInputElement|null;if(input?.value.trim()){void data.saveCampaign({...campaign,log:[input.value.trim(),...campaign.log]});input.value=''}}}><Plus/> Registrar</Button></div>{campaign.log.filter(l=>!l.startsWith('☠KILL:')).map((item,i)=><p className="log-entry" key={i}><span>✦</span>{resourceText(item)}</p>)}{!campaign.log.length&&<p className="empty-copy">Nenhum evento registrado.</p>}</div>}
    </fieldset>}{masterTab==='Combate'&&<>{isMaster&&<div className="flex gap-2 flex-wrap mb-4"><Button size="sm" onClick={()=>setNewNpcOpen(true)}><Plus/> Criar monstro / Herdeiro</Button><Button size="sm" variant="outline" onClick={openCombatWindow}><ExternalLink size={16}/> Abrir painel rápido do Mestre</Button><Button size="sm" variant="outline" onClick={()=>go('bestiario')}><BookOpen/> Consultar Bestiário</Button></div>}{isMaster&&<div className="kill-call-bar"><Button className="kill-call-button" onClick={()=>void data.saveCampaign({...campaign,log:[`☠KILL:${Date.now()}|Como você quer matar ele?`,...campaign.log]})}>☠ Como você quer matar ele?</Button></div>}<CombatPanel campaign={campaign} party={combatParty} npcs={campaignNpcs} saveCampaign={c=>void data.saveCampaign(c)} saveNpc={n=>void data.saveNpc(n)} updateSheet={(id,pv,pf,clear)=>void data.updateSheetResources(id,pv,pf,clear)} patchSheet={(c,patch)=>void data.saveCharacter({...c,...patch},true)} addRoll={addRoll} setPcInitiative={setPcInitiative} resetStandard={c=>{if(sheetState(c).standard)void data.saveCharacter({...c,abilities:withSheetState(c,{standard:false})},true)}} enterAgony={c=>void data.saveCharacter(agonyEnter(c),true)} isMaster={isMaster} userId={data.userId} myCharacterId={myCharacterId} openSheet={openCombatSheet}/></>}{masterTab==='Rolador'&&<DiceRoller rolls={rolls} throwDice={throwDice} clear={()=>setRolls([])}/>}{masterTab==='Exploração'&&<ExplorationTab campaignId={campaign.id} userId={data.userId} isMaster={isMaster} name={myName} character={myChar} onApply={myChar?myApply:undefined} onRoll={addRoll}/>}</>:<div className="empty-stage"><h2>Crie uma mesa para começar.</h2></div>}</>}
   {area==='mesa'&&<><div className="page-heading standalone"><div><span className="eyebrow subtle">MESA VIVA / SESSÃO</span><h1>O palco está <em>pronto.</em></h1><p className="muted-copy">Acompanhe a cena, o grupo e cada momento da história.</p></div><Button variant="outline" onClick={()=>go('mestre')}>Abrir visão do Mestre <ArrowRight/></Button></div><div className="scene-mini"><img src={scene} alt="Portal do Fluxo" width={1536} height={1024}/><div><span className="eyebrow">CENA ATUAL</span><h2>{campaign?.scene??'O limiar'}</h2><p>{campaign?.name??'Nova mesa'} <span>·</span> Rodada {campaign?.round??1}</p></div></div><div className="two-col room-section"><Panel title="Entrar em uma mesa"><div className="field-stack"><TextInput label="CÓDIGO DA MESA" value={joinCode} onChange={setJoinCode} placeholder="Ex.: DM3JUT"/><label className="field"><span className="field-label">SENHA DA MESA</span><input type="password" value={joinPassword} onChange={e=>setJoinPassword(e.target.value)}/></label><Button disabled={!joinCode.trim()||!joinPassword.trim()} onClick={async()=>{const result=await data.joinRoom(joinCode,joinPassword);if(typeof result==='string'&&!/^[0-9a-f-]{36}$/i.test(result)){setJoinFeedback(result)}else{setJoinFeedback('Você entrou na mesa!');setCampaignId(result as string);setJoinCode('');setJoinPassword('')}}}><ArrowRight/> Entrar com código e senha</Button>{!data.userId&&<p className="empty-copy">Entre na sua conta para participar de uma mesa online.</p>}{joinFeedback&&<p role="status" className="auth-message">{joinFeedback}</p>}</div></Panel><Panel title="Herdeiros da mesa">{data.campaigns.length>1&&<label className="field mb-3"><span className="field-label">MESA</span><select value={campaign?.id??''} onChange={e=>setCampaignId(e.target.value)}>{data.campaigns.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>}{inviteMsg&&<p role="status" className="auth-message">{inviteMsg}</p>}{(data.userId?combatParty:data.characters).map(c=><div className="roster-row" key={c.id}><span className="sheet-avatar">{c.name.slice(0,1)}</span><span><strong>{c.name}</strong><small>{c.lineage} · {c.pv_current}/{c.pv_max} PV{agonyLabel(c)}</small></span>{isMaster&&<GsControl compact character={c} onChange={gs=>void data.saveCharacter({...c,gs},true)}/>}<Button variant="ghost" size="icon" aria-label={`Abrir ${c.name}`} title={`Abrir ${c.name}`} onClick={()=>{setSheetId(c.id);go('jogador')}}><ArrowRight/></Button></div>)}{!(data.userId?combatParty:data.characters).length&&<p className="empty-copy">Nenhuma ficha na mesa.</p>}{visibleNpcs.filter(n=>!n.hidden).map(n=><div className="roster-row" key={n.id}><span className="sheet-avatar">{n.name.slice(0,1)}</span><span><strong>{n.name}</strong><small>{n.kind} · {n.pv_current}/{n.pv_max} PV</small></span></div>)}</Panel><Panel title="Crônica recente">{campaign&&data.userId&&data.memberships.some(m=>m.campaign_id===campaign.id&&m.user_id===data.userId)&&<div className="field-stack"><label className="field"><span className="field-label">SUA FICHA NESTA MESA</span><select value={data.memberships.find(m=>m.campaign_id===campaign.id&&m.user_id===data.userId)?.character_id??''} onChange={e=>void data.selectMemberCharacter(campaign.id,e.target.value||null)}><option value="">Escolher ficha</option>{data.characters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><Button variant="outline" onClick={()=>void data.leaveRoom(campaign.id)}>Sair desta mesa</Button></div>}{campaign?.log.length?campaign.log.slice(0,8).map((l,i)=><p className="log-entry" key={i}><span>✦</span>{l}</p>):<p className="empty-copy">A história aguarda o primeiro acontecimento.</p>}</Panel></div>{campaign&&<div className="mt-8"><div className="flex flex-wrap items-center justify-between gap-3"><SectionHeading title={campaign.combat_active?`Combate em andamento · Rodada ${campaign.round}`:'Combate'}/><Button variant="outline" className="min-h-11" onClick={openCombatWindow}><ExternalLink size={16}/> Abrir janela de combate</Button></div>{!canEditTable&&<div className="readonly-banner">Acompanhe o combate ao vivo. No seu turno, escolha alvo e ação; ao ser atacado, escolha sua reação quando o Mestre solicitar.</div>}<CombatPanel compact={!isMaster && !!data.userId} campaign={campaign} party={combatParty} npcs={visibleNpcs} saveCampaign={c=>void data.saveCampaign(c)} saveNpc={n=>void data.saveNpc(n)} updateSheet={(id,pv,pf,clear)=>void data.updateSheetResources(id,pv,pf,clear)} patchSheet={(c,patch)=>void data.saveCharacter({...c,...patch},true)} addRoll={addRoll} isMaster={isMaster} userId={data.userId} myCharacterId={myCharacterId} openSheet={openCombatSheet}/></div>}</>}
   {area==='rolador'&&<><div className="page-heading standalone"><div><span className="eyebrow subtle">A SORTE TAMBÉM ESCREVE HISTÓRIAS</span><h1>Rolador de <em>dados.</em></h1><p className="muted-copy">Cada resultado deixa uma marca na mesa.</p></div></div><DiceRoller rolls={rolls} throwDice={throwDice} clear={()=>setRolls([])}/></>}
   {area==='linhagens'&&<><div className="herdeiros-subnav"><Button variant="ghost" onClick={()=>go('regras')}><ArrowRight size={15} style={{transform:'rotate(180deg)'}}/> Voltar às Regras</Button></div><LineagesPage onCreate={lineage=>{setWizardLineage(lineage);setWizardOpen(true);go('jogador')}}/></>}
   {area==='bestiario'&&<BestiaryPage onManage={isMaster ? template=>{setNewNpcTemplateId(template.id);setMasterTab('NPCs e inimigos');go('mestre');setNewNpcOpen(true);} : undefined}/>}
   {area==='regras'&&<><div className="page-heading standalone"><div><span className="eyebrow subtle">CÓDICE / CONSULTA RÁPIDA</span><h1>As regras do <em>Despertar.</em></h1><p className="muted-copy">O essencial para manter a história em movimento.</p></div><Button variant="outline" onClick={()=>go('linhagens')}><Sparkles size={16}/> Consultar Linhagens</Button></div><div className="rules-layout"><aside className="rules-index"><span className="field-kicker">NESTA PÁGINA</span>{ruleSections.map((r,i)=><a key={i} href={`#regra-${i}`}><span>{String(i+1).padStart(2,'0')}</span>{resourceText(r.title)}</a>)}</aside><div className="rules-content">{ruleSections.map((r,i)=><section id={`regra-${i}`} key={i} className="rule-block"><SectionHeading number={String(i+1).padStart(2,'0')} title={r.title}/>{r.items.map((item,j)=><p key={j}>{resourceText(item)}</p>)}</section>)}<div className="rule-block"><SectionHeading number={String(ruleSections.length+1).padStart(2,'0')} title="Atributos derivados"/><div className="rule-table"><div><span>CORPO</span><span>PV</span><span>ESQUIVA</span><span>BLOQUEIO · DESLOC.</span></div>{[1,2,3,4,5].map(n=><div key={n}><strong>{n} (d{dieFor(n)})</strong><span>{derived(n).pv}</span><span>{derived(n).esquiva}</span><span>{derived(n).bloqueio} · {derived(n).deslocamento} m</span></div>)}</div></div></div></div></>}
  </main><footer className="site-footer"><span>✦ HERDEIROS <i>·</i> O DESPERTAR</span><span>O <span className="text-flux">Fluxo</span> nunca permanece o mesmo.</span></footer>
  {data.error&&<div role="alert" className="error-toast">{data.error}<Button variant="ghost" size="icon" aria-label="Fechar aviso" onClick={()=>window.location.reload()}><X/></Button></div>}
  {newNpcOpen&&campaign&&<NewNpcDialog initialTemplateId={newNpcTemplateId || undefined} initialStep={newNpcStep} close={()=>{setNewNpcOpen(false);setNewNpcTemplateId('');setNewNpcStep('choose')}} create={async r=>{const id=await data.addNpc(campaign.id,{...r.npc,notes:joinNpcNotes('',r.sheet)});if(id){setNewNpcOpen(false);setNewNpcTemplateId('');setNewNpcStep('choose');setOpenNpcId(id);setMasterTab('NPCs e inimigos');go('mestre');}}}/>}
  {authOpen&&<AuthDialog userId={data.userId} profileName={data.profileName} saveProfile={data.saveProfile} close={()=>setAuthOpen(false)}/>}</div>;
}
const SHEET_MARK = '\n\n<<<FICHA>>>\n';
const NPC_MIRROR = ['name','corpo','mente','espirito','pv_current','pv_max','pf_current','pf_max'] as const;

/** Separa o texto das Observações da ficha completa guardada junto. */
function splitNpcNotes(notes: string): { text: string; sheet: Character | null } {
  const raw = notes ?? '';
  const i = raw.indexOf(SHEET_MARK);
  if (i < 0) return { text: raw, sheet: null };
  const text = raw.slice(0, i);
  try {
    const parsed = JSON.parse(raw.slice(i + SHEET_MARK.length));
    return { text, sheet: parsed && typeof parsed === 'object' ? normalizeCharacter(parsed as Partial<Character> & { id: string }) : null };
  } catch { return { text, sheet: null }; }
}
function joinNpcNotes(text: string, sheet: Character | null) { return sheet ? `${text}${SHEET_MARK}${JSON.stringify(sheet)}` : text; }
/** Ficha do NPC: PV, PF, atributos e nome sempre iguais aos do próprio NPC. */
function npcSheet(npc: Npc): Character | null {
  const { sheet } = splitNpcNotes(npc.notes);
  if (!sheet) return null;
  return { ...sheet, id: npc.id, name: npc.name, corpo: npc.corpo, mente: npc.mente, espirito: npc.espirito, pv_current: npc.pv_current, pv_max: npc.pv_max, pf_current: npc.pf_current, pf_max: npc.pf_max };
}

function NpcEditor({npc,update,remove,throwDice,addRoll,importSheet,defaultOpen=false}:{defaultOpen?:boolean;npc:Npc;update:(partial:Partial<Npc>)=>void;remove:()=>void;throwDice:(s:string,source?:string)=>unknown;addRoll:(entry:RollEntry)=>void;importSheet:()=>void}) {
  const [open,setOpen]=useState(defaultOpen);
  const [expanded,setExpanded]=useState(defaultOpen);
  useEffect(()=>{if(defaultOpen){setExpanded(true);setOpen(true)}},[defaultOpen]);
  const { text } = splitNpcNotes(npc.notes);
  const sheet = npcSheet(npc);
  const monsterMeta = (sheet as MonsterSheet | null)?.bestiary;
  const beastAttacks = monsterMeta ? readBestiaryAttacks(monsterMeta.ataques) : [];
  const weaponEdits = monsterMeta?.attackOverrides ?? {};
  const updateSheet=(partial:Partial<Character>)=>{
    if(!sheet)return;
    const next={...sheet,...partial};
    const mirror:Record<string,unknown>={};
    for(const k of NPC_MIRROR) if(k in partial) mirror[k]=(partial as Record<string,unknown>)[k];
    if('corpo' in partial && !(sheet as MonsterSheet).bestiary){const d=derived(next.corpo);mirror['esquiva']=d.esquiva;mirror['bloqueio']=d.bloqueio;}
    const beastPatch=(partial as Partial<MonsterSheet>).bestiary;
    if(beastPatch && monsterMeta){if(beastPatch.esquiva!==monsterMeta.esquiva)mirror['esquiva']=beastPatch.esquiva;if(beastPatch.bloqueio!==monsterMeta.bloqueio)mirror['bloqueio']=beastPatch.bloqueio;}
    update({ ...(mirror as Partial<Npc>), notes: joinNpcNotes(text, next) });
  };
  return <Panel title={monsterMeta?.category || (sheet?.lineage && sheet.lineage !== 'Criatura' ? sheet.lineage : npc.kind==='inimigo' ? 'Inimigo da Mesa' : 'NPC da Mesa')} action={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>update({hidden:!npc.hidden})} title={npc.hidden?'Mostrar aos jogadores':'Ocultar dos jogadores'}>{npc.hidden?<EyeOff/>:<Eye/>}<span className="hide-mobile">{npc.hidden?'Oculto':'Visível'}</span></Button>{([['name','Nome','os jogadores veem o nome'],['hp','Vida','os jogadores veem a vida'],['sheet','Ficha','os jogadores podem abrir a ficha']] as const).map(([k,label,tip])=>{const on=npcShows(npc,k);return <Button key={k} size="sm" variant="outline" aria-pressed={on} onClick={()=>update(({[`show_${k}`]:!on} as Partial<Npc>))} title={`${on?'Ligado':'Desligado'}: ${tip}`}>{on?<Eye/>:<EyeOff/>}<span className="hide-mobile">{label}</span></Button>;})}<Button size="icon" variant="ghost" onClick={remove} title="Excluir NPC" aria-label="Excluir NPC"><Trash2/></Button></div>}>
    <div className="h-npc-summary"><div className="h-npc-summary-info"><span className="h-sheet-kicker">{npc.kind==='inimigo'?'AMEAÇA':'NPC'} · {npc.hidden?'OCULTO':'VISÍVEL'}</span><strong>{npc.name}</strong><small>{npc.pv_current}/{npc.pv_max} PV · {npc.pf_current}/{npc.pf_max} {sheet && isTechAgent(sheet.lineage)?'PN':'PF'} · Esquiva {npc.esquiva} · Bloqueio {npc.bloqueio}</small></div><div className="h-npc-summary-actions"><Button size="sm" variant="outline" onClick={()=>update({pv_current:Math.max(0,npc.pv_current-5)})}>−5 PV</Button><Button size="sm" variant="outline" onClick={()=>update({pv_current:Math.min(npc.pv_max,npc.pv_current+5)})}>+5 PV</Button><Button size="sm" variant="outline" onClick={importSheet}><Plus size={15}/> Exportar para minhas fichas</Button><Button size="sm" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>{expanded?'Recolher':'Abrir ficha'} <ChevronDown size={14}/></Button></div></div>
    {expanded && (sheet && (monsterMeta || (sheet as MonsterSheet).gaki) ? <MonsterDashboard character={sheet} update={updateSheet} addRoll={addRoll} setInitiative={n=>update({initiative:n})} notesText={text} onNotesChange={value=>update({notes:joinNpcNotes(value,sheet)})} npcKind={npc.kind} onKindChange={kind=>update({kind})}/> : <> 
    <details className="hu-block hu-npc-section" open>
      <summary><HeartPulse size={19}/><span><strong>Identidade, PV e atributos</strong><small>Valores rápidos e defensivos da ficha</small></span><ChevronDown size={17}/></summary>
      <div className="hu-block-body">
    <div className="npc-identity"><TextInput label="NOME" value={npc.name} onChange={name=>update({name})}/><label className="field"><span className="field-label">TIPO</span><select value={npc.kind} onChange={e=>update({kind:e.target.value})}><option value="inimigo">Inimigo</option><option value="npc">NPC</option></select></label></div>
    <div className="resource-grid npc-resources"><Stepper label="PV" value={npc.pv_current} max={npc.pv_max} tone="health" onChange={pv_current=>update({pv_current})}/><Stepper label="PV MÁX." value={npc.pv_max} tone="health" onChange={pv_max=>update({pv_max,pv_current:Math.min(npc.pv_current,pv_max)})}/><Stepper label="PF" value={npc.pf_current} max={npc.pf_max} tone="flux" onChange={pf_current=>update({pf_current})}/><Stepper label="PF MÁX." value={npc.pf_max} tone="flux" onChange={pf_max=>update({pf_max,pf_current:Math.min(npc.pf_current,pf_max)})}/></div>
    <div className="npc-stats">{(['corpo','mente','espirito','esquiva','bloqueio'] as const).map(stat=><Stepper key={stat} label={stat.toUpperCase()} value={npc[stat]} min={['corpo','mente','espirito'].includes(stat)?1:0} max={['corpo','mente','espirito'].includes(stat)?5:99} onChange={value=>{const patch:Partial<Npc>={[stat]:value};if(stat==='corpo' && !(sheet as MonsterSheet | null)?.bestiary){const s=derived(value);patch.esquiva=s.esquiva;patch.bloqueio=s.bloqueio;}if((stat==='esquiva'||stat==='bloqueio') && (sheet as MonsterSheet | null)?.bestiary){patch.notes=joinNpcNotes(text,{...sheet!,bestiary:{...(sheet as MonsterSheet).bestiary,[stat]:value}} as MonsterSheet)}update(patch)}}/>)}</div>
      </div>
    </details>
    <details className="hu-block hu-npc-section">
      <summary><BookOpen size={19}/><span><strong>Bestiário, DT e poderes especiais</strong><small>Regras e números específicos deste monstro</small></span><ChevronDown size={17}/></summary>
      <div className="hu-block-body">
    {(sheet as MonsterSheet | null)?.bestiary && (()=>{
      const meta=(sheet as MonsterSheet).bestiary as BestiaryMeta;
      const setMeta=(patch:Partial<BestiaryMeta>) => {
        const next={...sheet, bestiary:{...meta,...patch}, ...(patch.nucleusCards?{nomenclatures:nucleusAsNomenclatures(patch.nucleusCards)}:{})} as MonsterSheet;
        update({notes:joinNpcNotes(text,next), ...('esquiva' in patch?{esquiva:patch.esquiva}:{ }), ...('bloqueio' in patch?{bloqueio:patch.bloqueio}:{ })});
      };
      return <div className="field-stack mt-4" style={{padding:14,border:'1px solid var(--border, #7774)',borderRadius:10}}>
        <div className="field-kicker">FICHA DE BESTIÁRIO · TODOS OS CAMPOS EDITÁVEIS</div>
        <Stepper label="NÍVEL DE AMEAÇA (NA)" value={meta.threat} min={1} max={99} onChange={threat=>setMeta({threat})}/>
        <label className="field"><span className="field-label">CATEGORIA</span><input value={meta.category} onChange={e=>setMeta({category:e.target.value})}/></label>
        <label className="field"><span className="field-label">DESLOCAMENTO</span><input value={meta.deslocamento} onChange={e=>setMeta({deslocamento:e.target.value})}/></label>
        <label className="field"><span className="field-label">DTs / TESTES</span><textarea rows={3} value={meta.dt} onChange={e=>setMeta({dt:e.target.value})}/></label>
        <label className="field"><span className="field-label">ATAQUES, ACERTOS, DANOS E CRÍTICOS</span><textarea rows={5} value={meta.ataques} onChange={e=>setMeta({ataques:e.target.value})}/></label>
        <MasterAbilityCards title="Habilidades individuais" abilities={meta.abilityCards ?? splitBestiaryAbilities(meta.habilidades)} onChange={abilityCards=>setMeta({abilityCards})}/>
        {(meta.nucleusCards?.length??0)>0&&<MasterAbilityCards title="Habilidades de Núcleo · três ativações" abilities={meta.nucleusCards!} onChange={nucleusCards=>setMeta({nucleusCards})} type="nucleo"/>}
        {(meta.gsCards?.length??0)>0&&<MasterAbilityCards title="Marcos de GS · Agente Tecnológico" abilities={meta.gsCards!} onChange={gsCards=>setMeta({gsCards})} type="gs"/>}
        {meta.mkPreset&&<div className="mb-quick-banner"><div><strong>{meta.mkPreset.edition==='campanha'?'Versão reforçada da campanha':'Modelo original do livro'}</strong><br/><small>{meta.mkPreset.path} · {meta.mkPreset.description}</small></div></div>}
        <details className="hm-step-section"><summary>Texto original e detalhes brutos do livro</summary><div className="hm-step-body">
         <label className="field"><span className="field-label">HABILIDADES TRANSCRITAS</span><textarea rows={5} value={meta.habilidades} onChange={e=>setMeta({habilidades:e.target.value,abilityCards:splitBestiaryAbilities(e.target.value)})}/></label>
        </div></details>
        <label className="field"><span className="field-label">NOTAS / RESERVAS ESPECIAIS</span><textarea rows={2} value={meta.observacoes} onChange={e=>setMeta({observacoes:e.target.value})}/></label>
        {meta.pdfPage>0&&<a className="text-flux" href={`/bestiario/Herdeiros_Bestiario_Completo.pdf#page=${meta.pdfPage}`} target="_blank" rel="noreferrer">Abrir ficha original · página {meta.pdfPage}</a>}
        <p className="empty-copy">PV, PF, Esquiva e Bloqueio são editáveis acima. Alterar CORPO não redefine as defesas de monstros.</p>
      </div>;
    })()}
      </div>
    </details>
    <details className="hu-block hu-npc-section">
      <summary><Swords size={19}/><span><strong>Ataques, dano e detalhes da ficha</strong><small>Rolagens, personalização, anotações e ficha completa</small></span><ChevronDown size={17}/></summary>
      <div className="hu-block-body">
    <label className="field mt-4"><span className="field-label">OBSERVAÇÕES DO MESTRE</span><textarea rows={2} value={text} onChange={e=>update({notes:joinNpcNotes(e.target.value,sheet)})} placeholder="Motivações, táticas, segredos..."/></label>
    <div className="row-actions">
      {beastAttacks.length ? <div className="field-stack" style={{width:'100%'}}>
        <span className="field-kicker">ATAQUES DO BESTIÁRIO · ROLAGENS COMPARTILHADAS</span>
        {beastAttacks.map((a,i)=>{
          const override = weaponEdits[String(i)];
          const damage = override?.damage || a.damage;
          const critical = override?.critical || (override?.damage ? '' : a.critical);
          const saveAttack = (changes: {damage?: string; critical?: string; damageType?: string}) => {
            if (!monsterMeta || !sheet) return;
            const next = {...weaponEdits, [String(i)]: {...override, ...changes}};
            update({notes:joinNpcNotes(text,{...sheet,bestiary:{...monsterMeta,attackOverrides:next}} as MonsterSheet)});
          };
          return <div key={i} className="field-stack" style={{width:'100%',padding:10,border:'1px solid var(--border, #7774)',borderRadius:10}}>
            <strong>{a.name}</strong>
            <div className="flex gap-2 flex-wrap items-center">
              <Button size="sm" variant="outline" onClick={()=>{const r=attackRoll(a.attribute);addRoll({expression:r.expression,dice:r.dice,modifier:0,total:r.total,source:`${npc.name} · ${a.name}${r.fumble?' — FALHA CRÍTICA':r.crit?' — CRÍTICO':''}`,crit:r.crit});}}><Swords/> Acerto</Button>
              {damage&&<Button size="sm" variant="outline" onClick={()=>{const r=rollDamageFormula(damage,0,false);addRoll({expression:r.expression,dice:r.dice,modifier:r.bonus,total:r.total,source:`Dano · ${npc.name} · ${a.name}${override?.damageType ? ` (${override.damageType})` : ''}`});}}>Dano: {damage}</Button>}
              {damage&&<Button size="sm" variant="outline" onClick={()=>{const r=rollDamageFormula(critical || damage,0,!critical);addRoll({expression:r.expression,dice:r.dice,modifier:r.bonus,total:r.total,source:`Crítico · ${npc.name} · ${a.name}`});}}>Crítico: {critical || `2× (${damage})`}</Button>}
            </div>
            {a.damage && <WeaponDamageEditor label={`DANO · ${a.name}`} base={a.damage} value={damage} damageType={override?.damageType ?? ''} onSave={(nextDamage,nextType)=>saveAttack({damage:nextDamage,damageType:nextType})}/>}
            {damage && <WeaponDamageEditor label="CRÍTICO ESPECIAL (OPCIONAL)" base={a.critical || damage} value={critical || (!override?.damage && a.critical ? a.critical : damage)} onSave={(nextCritical)=>saveAttack({critical:nextCritical})}/>}
            <Button size="sm" variant="ghost" onClick={()=>saveAttack({critical:''})}>Usar crítico automático (dobrar dados atuais)</Button>
            <p className="empty-copy">Sem crítico especial, o sistema dobra os dados personalizados no combate. Valores fixos não dobram.</p>
          </div>;
        })}
      </div> : <Button size="sm" variant="outline" onClick={()=>{const r=attackRoll(npc.corpo);addRoll({expression:r.expression,dice:r.dice,modifier:0,total:r.total,source:`Ataque de ${npc.name}${r.fumble?' — FALHA CRÍTICA':r.crit?' — CRÍTICO':''}`,crit:r.crit});}}><Swords/> Rolar ataque</Button>}
      {!sheet
        ? <Button size="sm" variant="outline" onClick={()=>{const first=normalizeCharacter({id:npc.id,name:npc.name,corpo:npc.corpo,mente:npc.mente,espirito:npc.espirito,pv_current:npc.pv_current,pv_max:npc.pv_max,pf_current:npc.pf_current,pf_max:npc.pf_max,lineage:'Gaki',stage:LINEAGE_STAGES['Gaki']?.[0]?.name??''});update({notes:joinNpcNotes(text,first)});setOpen(true)}}><Sparkles/> Ativar ficha completa</Button>
        : <><Button size="sm" variant="outline" onClick={()=>setOpen(!open)}><Sparkles/> {open?'Fechar ficha completa':'Abrir ficha completa'}</Button><Button size="sm" variant="outline" onClick={importSheet}><Plus/> Exportar para minhas fichas</Button></>}
    </div>
    {sheet&&open&&<NpcFullSheet character={sheet} update={updateSheet} addRoll={addRoll} setInitiative={n=>update({initiative:n})}/>}
      </div>
    </details>
    </>)}
  </Panel>;
}
function DiceRoller({rolls,throwDice,clear}:{rolls:{id:string;expression:string;dice:number[];modifier:number;total:number;source?:string|undefined}[];throwDice:(expression:string,source?:string)=>unknown;clear:()=>void}) { const [quantity,setQuantity]=useState(1);const [expression,setExpression]=useState('1d20');const [invalid,setInvalid]=useState(false); const submit=()=>{if(!throwDice(expression)){setInvalid(true)}else setInvalid(false)}; return <div className="dice-layout"><div className="stack"><Panel title="Dados rápidos"><label className="field"><span className="field-label">QUANTIDADE</span><input className="quantity-input" type="number" value={quantity} min={1} max={30} onChange={e=>setQuantity(Math.max(1,Math.min(30,Number(e.target.value)||1)))}/></label><div className="dice-grid">{[4,6,8,10,12,20].map(sides=><Button key={sides} variant="outline" className="die-button" onClick={()=>{setExpression(`${quantity}d${sides}`);throwDice(`${quantity}d${sides}`)}}><Dices/><strong>d{sides}</strong></Button>)}</div></Panel><Panel title="Expressão livre"><div className="event-composer"><input value={expression} onChange={e=>{setExpression(e.target.value);setInvalid(false)}} onKeyDown={e=>e.key==='Enter'&&submit()} aria-label="Expressão de dados" placeholder="2d20+3"/><Button onClick={submit}><Dices/> Rolar</Button></div>{invalid&&<p className="form-error">Use uma expressão como 2d20+3 (até 30 dados).</p>}</Panel></div><Panel title="Histórico" action={<Button size="sm" variant="ghost" onClick={clear} disabled={!rolls.length}><Trash2/> Limpar</Button>}>{rolls.length?rolls.map((r)=><div className="roll-row" key={r.id}><div><span className="field-kicker">{r.source||r.expression}</span><p>{r.expression} <span>·</span> [{r.dice.join(', ')}]{r.modifier?` ${r.modifier>0?'+':''}${r.modifier}`:''}</p></div><strong>{r.total}</strong></div>):<div className="empty-roll"><Dices size={28}/><p>Nenhuma rolagem ainda.</p></div>}</Panel></div>; }
function AuthDialog({userId,profileName,saveProfile,close}:{userId:string|null;profileName:string;saveProfile:(name:string)=>Promise<void>;close:()=>void}) { const [register,setRegister]=useState(false);const [displayName,setDisplayName]=useState(profileName);const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');async function submit(e:React.FormEvent){e.preventDefault();setBusy(true); const {error}=register?await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin,data:{display_name:displayName.trim().slice(0,60)}}}):await supabase.auth.signInWithPassword({email,password});setBusy(false);if(error)setMessage(error.message);else if(register)setMessage('Confira seu e-mail para confirmar sua conta. Depois, defina seu nome de perfil aqui.');else window.location.reload();}return <div className="modal-backdrop" onMouseDown={close}><div className="auth-modal" role="dialog" aria-modal="true" aria-label="Acesso à mesa" onMouseDown={e=>e.stopPropagation()}><Button variant="ghost" size="icon" className="modal-close" onClick={close} aria-label="Fechar"><X/></Button><span className="eyebrow subtle">HERDEIROS / SUA JORNADA</span><h2>{userId?'Sua conta':register?'Criar conta':'Entrar na mesa'}</h2>{userId?<><p className="muted-copy">Seu nome aparece no canto superior direito. Altere quando quiser.</p><div className="field-stack mt-5"><TextInput label="NOME DE PERFIL" value={displayName} onChange={setDisplayName} placeholder="Como quer aparecer na mesa?"/><Button disabled={!displayName.trim()} onClick={async()=>{await saveProfile(displayName);setMessage('Nome de perfil salvo.')}}>Salvar nome</Button>{message&&<p role="status" className="auth-message">{message}</p>}</div><Button variant="outline" className="w-full mt-6" onClick={async()=>{await supabase.auth.signOut();window.location.reload()}}><LogOut/> Sair da conta</Button></>:<><Button className="w-full mt-6" onClick={async()=>{const result=await lovable.auth.signInWithOAuth('google',{redirect_uri:window.location.origin+window.location.pathname+window.location.search});if(result.error)setMessage(result.error.message);else if(!result.redirected)window.location.reload()}}>Entrar com Google — um clique</Button><div className="auth-divider">OU COM E-MAIL</div><form onSubmit={submit} className="field-stack">{register&&<TextInput label="NOME DE PERFIL" value={displayName} onChange={setDisplayName} placeholder="Como quer aparecer na mesa?"/>}<TextInput label="E-MAIL" value={email} onChange={setEmail} placeholder="voce@exemplo.com"/><label className="field"><span className="field-label">SENHA</span><input type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)}/></label><Button disabled={busy} type="submit" className="w-full">{busy?'Aguarde...':register?'Criar conta':'Entrar'} <ArrowRight/></Button></form><Button variant="ghost" className="w-full mt-3" onClick={()=>{setRegister(!register);setMessage('')}}>{register?'Já tem conta? Entrar':'Ainda não tem conta? Criar agora'}</Button>{message&&<p role="status" className="auth-message">{message}</p>}</>}</div></div>; }

