# Get Off My Lawn (G.O.M.Y.)

A suburban trap-chaining tower defense. The "towers" are lawn equipment wired into one absurd machine: rotate each contraption to route intruders through it, or blow them off the property.

The playable prototype lives at **https://goml.gary-m-gealy.workers.dev/play**. It has one lawn, five contraptions (leaf blower, spring gnome, sprinkler, rake, motion sensor), dog walkers and kids, and a five-wave campaign.

The design spec and implementation plan live in [idea-forge](https://github.com/GaryGealy/idea-forge): `docs/superpowers/specs/2026-09-25-get-off-my-lawn-design.md` and `docs/superpowers/plans/2026-09-26-get-off-my-lawn.md`.

## Stack

The site is a SvelteKit app in `app/`, on the same stack as Dealops: Svelte 5, TypeScript, Tailwind CSS v4, and `@sveltejs/adapter-cloudflare` deploying to Cloudflare Workers with static assets. Vitest handles unit and component tests, Playwright handles e2e, and ESLint + Prettier handle linting.

## Develop

```bash
cd app
npm install
npm run dev        # http://localhost:5173 (game at /play)
npm run check      # svelte-check + wrangler types
npm run lint
npm run test:unit -- --run
npm run build && npm run preview   # production-like, via wrangler dev
```

## Deploy

Deploys are tag-gated. Merging to `main` runs CI only. Pushing a `v*` tag runs `.github/workflows/deploy.yml`, which builds `app/` and deploys it to the `goml` Cloudflare Worker. The repo needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.

## Controls

Click a slot to place the selected contraption. Click a contraption to rotate it, including mid-wave. Right-click removes a contraption (build phase only). Hover to preview the chain. Keys: 1–5 select, R rotates, Space starts the wave.

## Tuning panel

The **Tuning** button at the bottom right of `/play` opens sliders for every value in `core/constants.ts`, plus each intruder's speed, sympathy and lawn damage. Changes apply immediately, even mid-wave, and are saved in your browser. **Copy JSON** copies only the values you've changed, ready to fold back into `constants.ts` / `intruders.ts` once they feel right. **Reset all** goes back to the source defaults.

## Layout

- `app/src/lib/game/core/`: game rules, with no browser dependencies
- `app/src/lib/game/render/`: Canvas2D renderer
- `app/src/lib/game/ui/`: HUD, overlays, save
- `app/src/lib/game/tuning.ts` + `TuningPanel.svelte`: runtime tuning (gameplay reads `TUNING.X` at the moment of use)
- `app/src/lib/game/start.ts`: fixed-step loop and input; `startGame()` returns a cleanup
- `app/src/lib/game/tests/`: Vitest tests for the rules, layout, camera and save
- `app/src/routes/play/`: the `/play` page that mounts the game
