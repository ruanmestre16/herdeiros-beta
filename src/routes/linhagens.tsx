import { createFileRoute } from '@tanstack/react-router';
import { GameApp } from '@/components/game/GameApp';
export const Route = createFileRoute('/linhagens')({ head: () => ({ meta: [
 {title:'Linhagens — Herdeiros: O Despertar'}, {name:'description',content:'Arcadianos, Humanos e Gakis: lore, estágios de evolução e passivas de cada linhagem.'}, {property:'og:title',content:'Linhagens — Herdeiros: O Despertar'}, {property:'og:description',content:'Conheça as linhagens de Arcádia e suas passivas por nível.'}, {property:'og:type',content:'website'}, {name:'twitter:card',content:'summary_large_image'}
] }), component: GameApp });
