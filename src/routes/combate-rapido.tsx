import { createFileRoute } from '@tanstack/react-router';
import { GameApp } from '@/components/game/GameApp';

/** Rota comum do site: janela independente no PC; página cheia no celular/APK. */
export const Route = createFileRoute('/combate-rapido')({
  head: () => ({ meta: [{ title: 'Combate Rápido — Herdeiros: O Despertar' }] }),
  component: () => <GameApp combatOnly />,
});
