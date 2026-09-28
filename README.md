# Get Off My Lawn (G.O.M.Y.)

A suburban trap-chaining tower defense. The "towers" are lawn equipment wired into one absurd machine: rotate each contraption to route intruders through it, or blow them off the property.

This is the first browser prototype: one lawn, five contraptions (leaf blower, spring gnome, sprinkler, rake, motion sensor), dog walkers and kids, and a five-wave campaign.

Design spec and implementation plan live in [idea-forge](https://github.com/GaryGealy/idea-forge): `docs/superpowers/specs/2026-09-25-get-off-my-lawn-design.md` and `docs/superpowers/plans/2026-09-26-get-off-my-lawn.md`.

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # Vitest (game rules in src/core are pure and fully tested)
npm run build    # type-check + production bundle in dist/
```

## Deploy (Cloudflare)

Served as static assets by Cloudflare Workers (`wrangler.jsonc`).

```bash
npx wrangler login   # once
npm run deploy       # build + wrangler deploy
```

For auto-deploy on push, connect this repo under Workers & Pages → get-off-my-lawn → Settings → Build (build command `npm run build`, deploy command `npx wrangler deploy`).

## Controls

Click a slot to place the selected contraption; click a contraption to rotate it (also mid-wave). Right-click removes (build phase only). Hover to preview the chain. Keys: 1–5 select, R rotates, Space starts the wave.

## Layout

- `src/core/` — game rules, no browser dependencies
- `src/render/` — Canvas2D renderer
- `src/ui/` — HUD, overlays, save
- `src/main.ts` — fixed-step loop and input

## Website (`app/`)

SvelteKit site, using the same stack as Dealops: Svelte 5, TypeScript, Tailwind CSS v4, and `@sveltejs/adapter-cloudflare` targeting Cloudflare Workers (static assets). Vitest handles unit and component tests (browser mode), Playwright handles e2e, and ESLint + Prettier handle linting.

```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm run check      # svelte-check + wrangler types
npm run lint
npm run test:unit -- --run
npm run build && npm run preview   # production-like, via wrangler dev
```

Deploys are tag-gated: pushing a `v*` tag runs `.github/workflows/deploy.yml`, which builds `app/` and deploys it to the `goml` Cloudflare Worker. The repo needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.
