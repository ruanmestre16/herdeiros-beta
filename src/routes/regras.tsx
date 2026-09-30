import { createFileRoute } from '@tanstack/react-router';
import { GameApp } from '@/components/game/GameApp';
export const Route = createFileRoute('/regras')({ head: () => ({ meta: [
 {title:'Regras — Herdeiros: O Despertar'}, {name:'description',content:'Consulte atributos, combate, Fluxo, nomenclaturas e Karma de Herdeiros.'}, {property:'og:title',content:'Regras — Herdeiros: O Despertar'}, {property:'og:description',content:'O códice de consulta rápida para a sua mesa.'}, {property:'og:type',content:'website'}, {name:'twitter:card',content:'summary_large_image'}
] }), component: GameApp });
