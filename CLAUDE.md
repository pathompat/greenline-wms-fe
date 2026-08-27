# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server (default port 5173, configurable via PORT env)
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

There is no test runner, linter, or formatter configured. The only tooling is Vite.

## Stack

Vue 3 (Composition API, `<script setup>` exclusively) · Vite · Pinia · Vue Router (hash history) · PrimeVue 4 (Aura preset) · `@vueuse/core`. The `@` alias resolves to `src/`. UI text is Thai throughout.

## Architecture

This is a **frontend-only prototype with no backend**. Every "API" is simulated in-memory.

### Mock data is the source of truth
`src/data/mockData.js` exports all seed arrays (`USERS`, `PRODUCTS`, `WAREHOUSES`, `CATEGORIES`, `UNITS`, `MACHINES`, `MIXSIZES`, `SUPPLIERS`, `STOCK`, `LOTS`, `FORMULAS`, `PRODUCTION_ORDERS`, `DOCUMENTS`, etc.) plus number generators (`generateDocNo`, `generatePONo`). Each Pinia store copies these arrays into `ref`s at init (`ref([...PRODUCTS])`) and mutates the local copy — **state is not persisted and resets on reload** (except auth, see below). New records get IDs via a `makeId(prefix)` helper using `Date.now()`. When adding a domain entity, add its seed array to `mockData.js` and follow the existing add/update/delete + `getXById` pattern in the relevant store.

### Stores (`src/stores/`) and cross-store dependencies
Each store owns one domain: `auth`, `master` (products/categories/units/warehouses/suppliers/machines/mixsizes/users), `stock`, `documents`, `production`, `packing`, `notifications`. Stores call other stores inside actions rather than at module scope — e.g. `production` and `documents` call `useStockStore()` to deduct/add stock and FIFO-match lots. Stock lots are consumed **FIFO by `receiveDate`** (`stock.getLotsForProduct`, `production.matchLots` / `matchLotsForMixsize`).

### Auth & permissions
`stores/auth.js` validates credentials against the `USERS` mock array and persists a fake token + user to `localStorage` (`gl_token`, `gl_user`) — this is the only state that survives reload. Roles: `super_admin`, `warehouse_staff`, `doc_control`. Permission checks go through `auth.can('domain.action')` (wildcard `*` for super_admin); the route guard in `src/router/index.js` enforces `meta.requiresAuth`, `meta.public`, and `meta.adminOnly` (super_admin only) in `router.beforeEach`.

### Routing & layout
`src/router/index.js` is the full route map (all views lazy-loaded). Authenticated routes are children of `components/layout/AppLayout.vue` (sidebar + header shell); `LoginView` is the only public route. Views are grouped by domain folders under `src/views/`: `master/`, `documents/`, `stock/`, `production/`, `admin/`. The app is mounted in `src/main.js`, which also registers the custom **GreenlineTheme** PrimeVue preset (indigo-based primary `#0D2461`) and the global Toast/Confirmation services consumed in `App.vue`.

### Domain notes
Products carry a `stockStatus` of `RM` (raw material), `Semi`, or `FG` (finished goods). Categories drive `requireLot` / `hasExpiry` behavior. Production flows from **formulas → production orders → process (with mixsizes/machines) → packing → report**. Documents (`receipt` / `requisition` / `return`) move stock through the stock store.

## CI/CD and deployment
`.github/workflows/ci-cd.yml` runs on every push to **`develop`** and does
**build → test → deploy** as three jobs, every stage over SSH on the same
AlmaLinux 9 VM as the backend (`APP_DIR=/opt/app/greenline-wms-fe`). No registry:
the image built in the first job is the one tested and deployed. Operator guide:
`deploy/README.md`.


`.github/workflows/release.yml` is the **production** path: it triggers on a push
to `main` — i.e. the moment a pull request is merged — deploys to a **different
VM** (`app.greenlinepetcare.co.th`, `202.129.16.144`), and reuses the same
`deploy/ci/pipeline.sh` stages unchanged. Two things make it a release pipeline
rather than a second CI one:

- **The commit must be on `main`, and that is checked.** A push to `main`
  satisfies this by construction, but `workflow_dispatch` can name any ref, so the
  build job resolves it and runs
  `git merge-base --is-ancestor <sha> origin/main`, failing before the VM is
  touched. The dispatch input exists for one reason — naming an *older* commit on
  `main` is the rollback path.
- **Deploy is gated on a human.** Build and test use the *unprotected*
  `production-build` environment; only `deploy` names `production`, which carries
  required reviewers. The split exists because a protection rule applies to every
  job that names the environment — putting them all on `production` would make a
  merge wait for an approval before it even compiles. The reviewers are a
  repository **setting**, not something the YAML can assert: without them
  configured, deploy runs unattended.

`VITE_API_URL` lives on `production-build`, not `production`, because Vite inlines
it at **build** time — the job that needs it is the one that runs unattended. It
defaults to `https://app.greenlinepetcare.co.th` in the workflow: unset is not a
build failure, it is a bundle pointing at `http://localhost:3000` that passes every
healthcheck and reaches no API. Production images are tagged with the first 12
chars of the commit sha, the same scheme develop uses, with the full commit in the
image's `org.opencontainers.image.revision` label.
- **This repo has its own compose project** (`./docker-compose.yml`, service
  `web`, container `greenline-wms-fe`). It used to be a service of the backend's
  compose file, driven through a `STACK_DIR` path — it no longer is. The two
  stacks meet only on the shared docker network `greenline-net`, declared
  `external: true` in both files so neither `docker compose down` removes it and
  neither pipeline touches the other's containers. `deploy/ci/pipeline.sh`
  creates the network if it is missing, so this stack no longer needs the backend
  to have been deployed first.
- **The edge addresses this container by name, not by compose alias.** A compose
  service alias is only resolvable inside its own project; a container name is
  resolvable across a shared network. `WEB_CONTAINER` here and `WEB_UPSTREAM`
  (`greenline-wms-fe:80`) in the backend's `deploy/.env` must agree.
- **`docker compose up -d --build` works standalone**, serving the built bundle on
  `127.0.0.1:8080` (`WEB_BIND=0.0.0.0` to publish it). `deploy/.env` is optional —
  every key in the compose file has a default.
- **`VITE_API_URL` is baked in at build time**, so the image is specific to one
  origin. It is the API's *origin* — `src/api/axios.js` appends `/api/...` — so no
  trailing slash and no `/api`. Unset, the bundle silently falls back to
  `http://localhost:3000`; the test stage greps the built assets for the expected
  value and fails rather than shipping that. Once the edge has a certificate it
  must be `https://` — the backend's `SSL_DOMAIN`, e.g.
  `https://dev-app.greenlinepetcare.co.th`. Changing that domain requires
  re-running **this** pipeline; a backend deploy cannot rebuild this bundle.
- **The remote shell lives in `deploy/ci/pipeline.sh`, not in the workflow.**
  `appleboy/ssh-action` (drone-ssh) rewrites multi-line scripts in transit and
  breaks them mid-token; each workflow step sends one short command instead, and
  the script arrives byte-exact via `git reset --hard`. "Sync checkout" is the one
  step that stays inline, because it is what updates the script.
- **There is no test runner**, so the test stage is a smoke test of the image:
  it serves the app shell, the built assets exist, and the expected API origin is
  present in the bundle. That last check is the one that catches a misconfigured
  deploy before users do.
- The Dockerfile is multi-stage (`npm ci` → `vite build` → nginx serving
  `dist/`). `deploy/nginx.conf` handles SPA fallback and cache headers:
  fingerprinted assets are immutable for a year, `index.html` is never cached.
