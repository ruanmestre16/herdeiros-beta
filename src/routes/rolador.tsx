import { createFileRoute } from '@tanstack/react-router';
import { GameApp } from '@/components/game/GameApp';
export const Route = createFileRoute('/rolador')({ head: () => ({ meta: [
 {title:'Rolador de Dados — Herdeiros: O Despertar'}, {name:'description',content:'Role dados de d4 a d20 e expressões livres para sua mesa de RPG.'}, {property:'og:title',content:'Rolador de Dados — Herdeiros'}, {property:'og:description',content:'Dados rápidos e histórico de rolagens para sua mesa.'}, {property:'og:type',content:'website'}, {name:'twitter:card',content:'summary_large_image'}
] }), component: GameApp });
