import { createFileRoute } from '@tanstack/react-router';
import { GameApp } from '@/components/game/GameApp';
export const Route = createFileRoute('/mesa')({ head: () => ({ meta: [
 {title:'Mesa Viva — Herdeiros: O Despertar'}, {name:'description',content:'Acompanhe a cena e os acontecimentos da mesa de Herdeiros.'}, {property:'og:title',content:'Mesa Viva — Herdeiros'}, {property:'og:description',content:'O palco da sua próxima história está pronto.'}, {property:'og:type',content:'website'}, {name:'twitter:card',content:'summary_large_image'}
] }), component: GameApp });
