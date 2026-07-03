# tooltip

2026-07-03 — golden pair via CLI registry (style `radix-luma` → `base-luma` variant fetched by URL; progressive mode, no `--overwrite`). Verdict: wrapper was PRISTINE (byte-identical to the stock radix golden), so the base-luma golden was adopted verbatim. This was the last remaining Radix wrapper in the project — `components.json` flipped to `base-luma` and the `radix-ui` dependency was removed as part of this run.

## Changed

- `src/components/ui/tooltip.tsx` — replaced with the base-luma registry variant. `TooltipProvider`'s `delayDuration` prop renamed to `delay` (default `0` preserved, per `consumer-props.md`). `Content` → `Portal > Positioner > Popup` (side/sideOffset/align/alignOffset move to `Positioner`, gain explicit defaults `side="top"` `sideOffset={4}` `align="center"` `alignOffset={0}` vs. the old wrapper's implicit Radix defaults plus a locally-overridden `sideOffset={0}`); CSS var `--radix-tooltip-content-transform-origin` → `--transform-origin`. `Arrow` gains full per-side positioning classes (`tooltip.tsx`'s arrow className) instead of the old left/right-only offset, since Base UI's Arrow doesn't self-position the way Radix's did.
- `src/App.tsx:7` — repointed `TooltipProvider` import during the strangler step; no props passed at this call site (`App.tsx:60`), so no call-site change needed beyond the import.
- `src/components/DashboardTabs.tsx:11,66-78` — repointed import; `TooltipTrigger asChild` wrapping a plain `Button` converted to `TooltipTrigger render={<Button>...</Button>}`.
- `src/components/EntityOptionsMenu.tsx:12,41-61` and `src/components/ImportExportBar.tsx:12,38-54` — repointed imports; both stack `TooltipTrigger` over the already-migrated `DropdownMenuTrigger` over a `Button`. Converted the outer `asChild` to nested `render` composition: `TooltipTrigger render={<DropdownMenuTrigger render={<Button>...</Button>} />}`. Verified against `node_modules/@base-ui/react/tooltip/trigger/TooltipTrigger.js`: like `MenuTrigger`, it forwards unrecognized props (including a `render` element and an externally supplied `ref`) straight through `elementProps` into its own `useRenderElement` merge, so nesting two Base UI trigger components this way composes correctly (same mechanism already confirmed for `dropdown-menu`'s migration, now the last two `asChild` sites in the app are gone).
- `components.json:3` — style flipped `radix-luma` → `base-luma` (last wrapper finalized).
- `package.json` / `yarn.lock` — removed the `radix-ui` dependency via `yarn remove radix-ui` (only the unified package was present; no individual `@radix-ui/react-*` packages existed to clean up).

Leftover scan clean: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder"` on all five touched files → no matches. Project-wide `grep -rl "radix-ui" src` → **zero files**. Typecheck, ESLint, Vitest (10/10), and production build all pass, matching the pre-migration baseline.

## Left alone

None — this was the final Radix wrapper in the project.

## Behavior changes

None expected. `TooltipProvider`'s default `delay` is `0`, same as the old `delayDuration` default; no consumer passed `delayDuration`/`disableHoverableContent`/`skipDelayDuration` explicitly, so there was nothing to flag on that front. The nested-trigger composition (`TooltipTrigger render={<DropdownMenuTrigger render={<Button/>} />}`) is structurally the same pattern verified during `dropdown-menu`'s migration, just with both layers now on Base UI instead of one Radix + one Base UI.

## Verify by hand

- Hover any tile/tab/bar icon button (add-dashboard "+", link tile "…", dashboard tab "…", import/export "…"): tooltip text appears after the usual short hover delay, positioned above the trigger by default.
- With the dropdown-menu-adjacent tooltips (link/dashboard "…", import/export "…"): hover to see the tooltip, then click to open the dropdown menu — tooltip should not remain stuck open once the menu is open, and reappear correctly on a later hover after the menu closes.
- Keyboard: Tab to a trigger button — tooltip should appear on focus (not just hover), and disappear on blur/Esc.
- Visual check: tooltip arrow should still point correctly at the trigger on every side the tooltip can appear (mostly top-anchored in this app, but the CSS now covers all four sides plus logical inline-start/end).

## Project status

Zero wrappers remain on Radix. All UI wrappers (`button`, `alert-dialog`, `dialog`, `label`, `separator`, `badge`, `aspect-ratio`, `tabs`, `dropdown-menu`, `tooltip`) are on Base UI; `field`/`input`/`empty` never had Radix imports. `components.json` now reads `base-luma`, and the `radix-ui` package has been removed from `package.json`/`yarn.lock`.
