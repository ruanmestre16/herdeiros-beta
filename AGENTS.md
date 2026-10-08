<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Use Lovable Cloud tables for signed-in sheets, campaigns, and NPCs with owner-scoped RLS; signed-out visitors use transient demo state so the experience is inspectable without an account.
- Keep RPG interaction logic in client-safe modules and never assume the public reference site's private authenticated data is available.
- Resolve every attack accuracy roll through the shared attackRoll helper and use its expression and dice in histories; this keeps sheets, NPCs, and combat consistent.
- Weapon and Nomenclature damage come only from the capped tables in src/lib/game.ts (WEAPONS, NOMENCLATURE_RANGES); combat and sheets must reuse them so no damage exceeds the rulebook.
- Resolve lineage-specific nomenclature display names through shared game.ts label helpers, while keeping stored kinds and capped dice unchanged; this keeps sheet, rolls, and combat consistent.
- The campaign master may edit any member sheet (RLS `is_master_of_sheet`); members read all table sheets/campaign/visible NPCs, and non-master UI is wrapped in a disabled fieldset. Why: players see everything, only the master edits.
- Invites use `campaigns.invite_token` + `join_campaign_invite` RPC via `/mesa?convite=`. Why: one-click Google entry without a password.
- Sheet notes (Anotações) are stored inside the existing `story` column after a marker (splitStory/joinStory in src/lib/game.ts), so no database change is needed and the original backend keeps working.
- Keep the shared kill-call overlay in KillCallFx with its campaign-log interface; uploaded filenames must match imports so synced versions remain loadable.
