# tabs

2026-07-03 — golden pair via CLI registry (style `radix-luma` → `base-luma` variant fetched by URL; progressive mode, no `--overwrite`). Verdict: wrapper was PRISTINE (byte-identical to the stock radix golden), so the base-luma golden was adopted verbatim.

## Changed

- `src/components/ui/tabs.tsx` — replaced with the base-luma registry variant. Part mapping: `Root` → `Root` (unchanged name), `List` → `List` (unchanged name, gains an `activateOnFocus`/`loopFocus` prop surface not otherwise used here), `Trigger` → `Tab` (keeps the `TabsTrigger` export name), `Content` → `Panel` (keeps the `TabsContent` export name). `TabsTrigger`'s className gained one extra clause vs the radix version — `aria-disabled:pointer-events-none aria-disabled:opacity-50` alongside the existing `disabled:...` variants (`tabs.tsx:60`) — part of the stock base-luma registry output, not a local change; no consumer currently passes `disabled` to a tab.
- `src/components/DashboardTabs.tsx:9` — sole consumer; repointed during the strangler step, byte-identical after the finalize rename. Usage is `<Tabs value={activeDashboardId ?? ''} onValueChange={setActiveDashboardId}>` plus `<TabsList>`/`<TabsTrigger value={dashboard.id}>` (no `orientation`, no `disabled`, no `asChild`) — all valid unchanged on the Base UI props surface, so no call-site changes were needed.

Leftover scan clean: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder"` on `src/components/ui/tabs.tsx` and `src/components/DashboardTabs.tsx` → no matches. Typecheck, ESLint, Vitest (10/10), and production build all pass, matching the pre-migration baseline.

## Left alone

- Other radix wrappers (`dropdown-menu`, `tooltip`) — untouched, progressive mode.

## Behavior changes

- **Arrow-key navigation between dashboard tabs no longer auto-activates the focused tab.** Radix's `Tabs.Root` defaults to `activationMode="automatic"` — moving focus with arrow keys immediately switches the active tab/panel. Base UI's `Tabs.List` defaults `activateOnFocus` to `false` — arrow keys move focus between tabs, but the tab (and the visible dashboard) only activates on an explicit `Enter`/`Space` press. This is the base registry's own default (not overridden by the wrapper), matching the migration's stated target of idiomatic Base UI behavior; per the hard rules this is flagged, not patched. Concretely: arrowing through the dashboard tab list with a screen reader or keyboard now requires a confirming keypress before the grid below switches dashboards, where it previously switched immediately.

## Verify by hand

- Click a dashboard tab: it activates and the link grid below switches to that dashboard, same as before.
- Click "+" to add a dashboard: new tab appears and can be selected.
- **Keyboard check (the flagged delta)**: focus the tab list, then press the arrow keys — the tab underline/highlight should move between tabs *without* switching the dashboard grid; press `Enter` or `Space` on the focused tab to actually switch. Confirm this feels intentional rather than broken (Radix previously switched immediately on arrow-key focus).
- Hover a dashboard tab: the options menu (rename/delete) and drag-to-move-link behavior should be unaffected (they're outside `TabsTrigger`, wired directly in `DashboardTabItem`).
