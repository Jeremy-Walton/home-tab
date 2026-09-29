# Launch Tabs

Browser Dashboard to quickly navigate to your favorite websites

Live at <https://www.launchtabs.com>.

## Setup

Requires Node 24. Yarn comes from Corepack (the version is pinned in `package.json`).

```sh
corepack enable
yarn install
yarn cf-typegen   # generates worker-configuration.d.ts (gitignored)
yarn dev
```

`yarn dev` runs the app, the Cloudflare Worker, and the sync Durable Object
together. Local sync data lives in `.wrangler/state`, separate from the live
site.

Run `yarn cf-typegen` again whenever `wrangler.jsonc` changes. Without it,
`yarn build` and `yarn tsc -b` fail with missing types in `worker/`.

Optional, once per clone, so `git blame` skips the whole-repo reformat commits:

```sh
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

## Commands and docs

- [AGENTS.md](./AGENTS.md) — every command, and what to run before a change is done
- [docs/PRD.md](./docs/PRD.md) — what the app does
- [docs/TECHNICAL_DESIGN.md](./docs/TECHNICAL_DESIGN.md) — stack, architecture, known gotchas
- [docs/DATA_FORMATS.md](./docs/DATA_FORMATS.md) — export/import file formats

## Deploy

Pushing to `main` deploys to Cloudflare through `.github/workflows/deploy.yml`.
It needs two GitHub repo secrets:

- `CLOUDFLARE_API_TOKEN` — a token made from the "Edit Cloudflare Workers" template
- `CLOUDFLARE_ACCOUNT_ID` — shown on the Cloudflare Workers overview page, or by `yarn wrangler whoami`
