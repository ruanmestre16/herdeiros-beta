import { createFileRoute } from '@tanstack/react-router';
import { GameApp } from '@/components/game/GameApp';
export const Route = createFileRoute('/mestre')({ head: () => ({ meta: [
 {title:'Mesa do Mestre — Herdeiros: O Despertar'}, {name:'description',content:'Conduza cenas, NPCs, inimigos e combates em Herdeiros.'}, {property:'og:title',content:'Mesa do Mestre — Herdeiros'}, {property:'og:description',content:'Sua mesa de RPG, NPCs e combate em um só lugar.'}, {property:'og:type',content:'website'}, {name:'twitter:card',content:'summary_large_image'}
] }), component: GameApp });
