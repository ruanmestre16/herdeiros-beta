import { createFileRoute } from '@tanstack/react-router';
import { GameApp } from '@/components/game/GameApp';

export const Route = createFileRoute('/bestiario')({
  head: () => ({ meta: [
    { title: 'Bestiário — Herdeiros: O Despertar' },
    { name: 'description', content: 'Consulte o bestiário completo e ilustrado com as criaturas de Arcádia.' },
    { property: 'og:title', content: 'Bestiário — Herdeiros: O Despertar' },
    { property: 'og:type', content: 'website' },
  ] }),
  component: GameApp,
});
