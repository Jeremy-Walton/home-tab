# Plan 008: Spike — choose an RxDB replication path for future backend sync (decision memo, no code)

> **Executor instructions**: This is a research/design spike, not a build
> plan. The only deliverable is a memo at `docs/SYNC_SPIKE.md`. Do not
> modify any source code, dependency, or config. If anything in the "STOP
> conditions" section occurs, stop and report. When done, update the status
> row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ec0d5e2..HEAD -- docs/ src/storage/`
> Drift only matters if `src/storage/db.ts` no longer uses RxDB — then STOP.

## Status

- **Priority**: P3
- **Effort**: M (research + writing; timebox ~half a day)
- **Risk**: LOW (produces a document)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `ec0d5e2`, 2026-07-03

## Why this matters

RxDB was chosen *specifically* because "when a backend is introduced, RxDB
has official replication plugins … sync can likely be added by configuring a
plugin rather than writing a custom protocol"
(`docs/TECHNICAL_DESIGN.md`, "Why RxDB"). But the follow-through — "Which
RxDB replication plugin to adopt, deferred until a backend is chosen" — has
sat in Open Items untouched. This spike turns that deferral into a concrete,
evidenced recommendation so that when sync is wanted, the decision is a
lookup, not a research project. It deliberately produces a memo, not code.

## Current state (facts to carry into the memo)

- Storage layer: RxDB ^17.3.0, Dexie/IndexedDB adapter, two collections
  (`dashboards`, `links`) defined in `src/storage/schemas.ts`; database
  created in `src/storage/db.ts`.
- The PRD (`docs/PRD.md`) mandates: no backend today, works fully offline,
  **"requires no account or sign-in"**, and the persistence mechanism "must
  be swappable for a real backend/sync service later without changing any
  of the behavior described". Any sync design implies an identity story —
  the memo must confront the account-model question explicitly, since the
  current product promise is account-free.
- Data volume is tiny (tens of dashboards, hundreds of links, all text) —
  throughput is irrelevant; conflict handling and auth are the real axes.
- Maintainer context (for the backend-fit criterion): day-job stack is Ruby
  on Rails + PostgreSQL + Heroku; a sync backend they can host and maintain
  in that stack scores higher than one requiring a new platform, while a
  zero-maintenance hosted option (e.g. Supabase) is also acceptable.
- Hosting today: static GitHub Pages, no server component at all.
- `docs/TECHNICAL_DESIGN.md`'s "Why RxDB" also notes: "a few advanced
  plugins are paid, but everything needed for v1 (local storage + basic
  replication) is free" — the memo must verify which replication plugins are
  actually free vs. premium in the installed major version, since this
  claim drives the whole evaluation.

## Commands you will need

None against the repo beyond reading files. Web access to
https://rxdb.info documentation is required.

## Scope

**In scope**:
- `docs/SYNC_SPIKE.md` (create — the only file this plan produces)

**Out of scope** (do NOT touch):
- All source code, `package.json`, configs. No prototype is committed. If
  you prototype to answer a question, do it in a scratch directory outside
  the repo and report findings in the memo.
- Actually choosing to build sync — the memo recommends; the maintainer
  decides.

## Git workflow

- Branch: `advisor/008-backend-sync-spike`
- One commit: `Add backend sync decision memo`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Survey the replication options

From the RxDB docs (start at the replication overview page on rxdb.info),
catalog for the installed major version (17): the HTTP/REST replication
protocol, GraphQL replication, CouchDB replication, WebRTC (P2P, no
server), Firestore, and the Supabase integration. For each record: free or
premium, maturity/caveats stated in the docs, what the server must
implement (endpoints, checkpoints, conflict hooks), and auth patterns.

**Verify**: each option in the memo cites the specific rxdb.info page URL it
was read from.

### Step 2: Evaluate against this app's criteria

Score each option (short table + prose) against, in this order:

1. **Account model** — what's the minimal identity story, and how badly does
   it break the "no account or sign-in" promise? (Consider: sync as a
   strictly opt-in feature preserving anonymous local-first as default.)
2. **Backend fit** — can the maintainer host it with Rails/Postgres/Heroku
   (e.g. implementing the RxDB HTTP replication endpoints in a small Rails
   API), or does it demand new infrastructure? Note that the two-collection
   schema was explicitly designed to "map cleanly onto a relational/document
   backend" (`docs/TECHNICAL_DESIGN.md`, "Data Model").
3. **Conflict handling** — what happens when two devices edit the same link;
   is last-write-wins acceptable for this data (probably yes — argue it).
4. **Cost** — plugin licensing + hosting.
5. **Effort** — coarse S/M/L to a working v1, stated as rough.

### Step 3: Write the memo

`docs/SYNC_SPIKE.md` structure: Context (2 paragraphs, citing the PRD/design
constraints above) → Options table → Per-option notes with citations →
Recommendation (one primary, one fallback) → Open questions (account model
UX, migration of existing local data on first sync, whether the GitHub
Pages hosting stays) → Explicit "what would make this decision wrong"
paragraph. Keep it under ~2 pages; this is a decision memo, not a survey
paper.

**Verify**: `docs/SYNC_SPIKE.md` exists; every claim about a plugin's
pricing/maturity has a citation; the recommendation section names exactly
one primary option.

### Step 4: Cross-reference the design doc

Do NOT edit `docs/TECHNICAL_DESIGN.md` in this plan (keeping the spike
zero-risk); instead, end the memo with the exact one-line edit the
maintainer should make to the "Open Items" bullet once they accept the
recommendation.

## Test plan

Not applicable (no code). The verification is the citation discipline in
Steps 1–3.

## Done criteria

- [ ] `docs/SYNC_SPIKE.md` exists, ≤ ~2 pages, with the Step 3 structure
- [ ] Every option lists free-vs-premium status with a source URL
- [ ] The account-model tension with the PRD's "no account" promise is
      explicitly addressed
- [ ] Exactly one primary recommendation, with a fallback
- [ ] `git status` shows only `docs/SYNC_SPIKE.md` (and the plans index) changed
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- No web access to rxdb.info documentation — the memo would be guesswork.
- The installed RxDB major version's docs are unavailable and current docs
  describe a materially different replication API — note the version gap in
  the memo prominently rather than silently mixing versions.

## Maintenance notes

- The memo goes stale with RxDB major versions; stamp it with the RxDB
  version surveyed.
- If the maintainer accepts a recommendation, the follow-up build plan
  should start from the memo's open questions, not from scratch.
