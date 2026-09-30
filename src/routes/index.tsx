import { createFileRoute } from '@tanstack/react-router';
import { GameApp } from '@/components/game/GameApp';
export const Route = createFileRoute('/')({
 head: () => ({ meta: [
  { title: 'Herdeiros: O Despertar — Fichas e mesa de RPG' },
  { name: 'description', content: 'Crie fichas, conduza mesas, role dados e consulte as regras de Herdeiros: O Despertar.' },
  { property: 'og:title', content: 'Herdeiros: O Despertar — Fichas e mesa de RPG' },
  { property: 'og:description', content: 'Uma mesa viva para criar personagens, conduzir combates e jogar Herdeiros.' },
  { property: 'og:type', content: 'website' },
  { name: 'twitter:card', content: 'summary_large_image' },
 ] }), component: GameApp,
});
