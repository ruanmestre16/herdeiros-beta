# Herdeiros rpg

Importe o projeto https://github.com/ruanmestrerpg13/rpg-completo.git (clone/cópia do código) mantendo a identidade visual (tema dark fantasy, cores flux/ciano, karma/carmesim, layout em abas Jogador/Mesa/Mestre/Rolador/Regras) e aplique as seguintes mudanças:

1. AUTENTICAÇÃO
- Ativar Lovable Cloud com login. O jogador entra com login social (Google) — login com um clique. O mestre convida jogadores; quem entra na mesa faz login pelo Google e entra direto.
- Fichas, mesas e NPCs salvos no banco com RLS por dono; visitantes sem conta continuam com estado de demonstração transitório.

2. MESA — PERMISSÕES
- Hoje a opção de mesa está muito limitada. Quem entra na mesa deve VER tudo o que está acontecendo na mesa (fichas, combate, rolagens, cena, crônica), mas NÃO pode mexer nas coisas que só o mestre pode mexer — apenas o mestre edita.
- Na parte do MESTRE: ele deve ver quem está na mesa, ver o combate, poder diminuir o HP (PV) dos personagens/inimigos ele mesmo direto, sem precisar estar em combate, e poder abrir e editar a ficha completa de qualquer jogador (aumentar karma, alterar atributos, PV/PF, etc.).

3. NOVO ITEM — ÂNCORA SENTIMENTAL
- Adicionar um item/inventário chamado "Âncora Sentimental". Quando o jogador for fazer um teste de karma, ele pode usar a Âncora Sentimental para reduzir a DP (dificuldade/penalidade) do teste em até 4 pontos.

4. VISUAL — FORÇAR O FLUXO
- O botão/ação "Forçar o Fluxo" deve ficar roxo, na mesma família de cor do Karma (o texto diz "Fluxo", mas a ação é de karma). Botão mais roxo.

NÃO remover nenhuma funcionalidade que já funciona (Nomenclaturas, combate do mestre, iniciativa, esquiva, bloqueio, inventário, rolador, sincronia, habilidades, Absorver PF).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/680905a9-3029-46bd-a9a7-b39a130d6e4d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
