# Deployment — frontend

This app has **its own compose project** (`./docker-compose.yml`): a multi-stage
build that runs `vite build` and serves the result from nginx. It joins the
backend's stack on a shared docker network — `external: true` in both compose
files — and nothing else. Either stack can be built, restarted or torn down
without disturbing the other.

```
                    ┌─ compose project: greenline-wms-be ─────────┐
  :80 / :443  ──────▶  nginx (edge) ──┬── /api/*  ─▶ greenline-wms-be :3000
                    │                 │                            │
                    │        certbot ─┘  Let's Encrypt, auto-renew │
                    └─────────────────┼──────────────────────────  ┘
                                      │ /*
          ═══ docker network: greenline-net (external to both) ═══
                                      │
                    ┌─ compose project: greenline-wms-fe (this repo) ─┐
                    │  greenline-wms-fe :80 — nginx serving dist/    │
                    └────────────────────────────────────────────────┘
```

The edge finds this container by its **name** (`greenline-wms-fe`), which is what
Docker's embedded DNS resolves across a shared network — a compose service alias
would only be visible inside this project. That is why the container name is
pinned in `docker-compose.yml` and in the backend's `WEB_UPSTREAM`.

### Running this stack on its own

```bash
docker compose up -d --build
```

That builds the bundle, serves it on `http://127.0.0.1:8080` and joins
`greenline-net` (creating it first if needed: `docker network create greenline-net`).
No backend, no edge, no `deploy/.env` required — every key has a default. Set
`WEB_BIND=0.0.0.0` to serve it publicly when there is no edge in front of it.

`.github/workflows/ci-cd.yml` runs **build → test → deploy** as three jobs, all
over SSH on the same AlmaLinux 9 VM as the backend:

| Job | What it does |
|---|---|
| **build** | syncs this checkout on the VM, `docker build` → `greenline-wms-fe:<sha>` (+ `:latest`) |
| **test** | starts that image with no network and checks it serves the app shell, has built assets, and has the expected API origin baked in |
| **deploy** | `docker compose up -d --no-build web` on this repo's own compose file, waits for the healthcheck, rolls back to the previous tag on failure, prunes old images |

The steps only invoke `deploy/ci/pipeline.sh <stage>` on the VM — the SSH action
rewrites multi-line scripts in transit, so the shell lives in a committed file.
Run any stage by hand:

```bash
sudo -iu clounstx2 bash -c 'cd /opt/app/greenline-wms-fe && deploy/ci/pipeline.sh deploy <tag>'
```

## Setup

The backend's `deploy/README.md` covers the VM itself (Docker, firewall, SELinux,
the `clounstx2` account). This repo needs only:

1. **A checkout on the VM** at the pipeline's `APP_DIR`:

   ```
   /opt/app/
   ├── greenline-wms-be/
   └── greenline-wms-fe/     ← APP_DIR
   ```

   ```bash
   sudo -iu clounstx2 git -C /opt/app clone https://github.com/nattapong5720187/greenline-wms-fe.git
   ```

   The two are siblings only for tidiness: neither compose file reads the other's
   directory any more.

2. **The shared network**, which both compose files declare `external` and neither
   creates:

   ```bash
   sudo -iu clounstx2 docker network create greenline-net
   ```

   Both pipelines create it when it is missing, so this only matters for a
   hand-run `docker compose up`, which otherwise fails with *network
   greenline-net declared as external, but could not be found*.

3. **Secrets and variables** on a `develop` GitHub environment in *this* repo
   (**Settings → Environments → develop**) — they are not shared with the backend
   repo, so they must be set here too:

   | Kind | Name | Value |
   |---|---|---|
   | secret | `SSH_HOST` | the VM |
   | secret | `SSH_USER` | `clounstx2` |
   | secret | `SSH_PASSWORD` | that account's password |
   | secret | `SSH_PORT` | optional, defaults to 22 |
   | **variable** | `VITE_API_URL` | **the site's public origin** |

### VITE_API_URL

Vite **inlines** this at build time, so the image is specific to one origin —
changing it means a rebuild, not a restart. Give it the site's own public URL,
with no trailing slash and no `/api`: the app appends `/api/...` itself, and the
edge nginx serves both from the same host.

```
✅  https://dev-app.greenlinepetcare.co.th
❌  https://dev-app.greenlinepetcare.co.th/       trailing slash
❌  https://dev-app.greenlinepetcare.co.th/api    the app adds /api itself → /api/api/...
```

If it is unset the build warns and the bundle falls back to
`http://localhost:3000`, which works on your machine and fails for every real
user — so the test job fails the build rather than shipping that quietly.

Serve the site over HTTPS and this must be `https://`, or the browser blocks the
API calls as mixed content. The edge redirects `:80` to `:443` once its
certificate exists, so an `http://` value would also cost every call a redirect
even before the browser refused it.

Changing the backend's `SSL_DOMAIN` therefore means changing this too, and
re-running **this** workflow — a backend deploy cannot rebuild this bundle.

## Production releases (`release.yml`)

`ci-cd.yml` deploys `develop` to **dev-app.greenlinepetcare.co.th** on every push.
`release.yml` is the production path, and differs in three ways:

| | develop (`ci-cd.yml`) | production (`release.yml`) |
|---|---|---|
| Trigger | push to `develop` | push to `main` — i.e. a merged pull request |
| Source | whatever was pushed | the merged commit, **verified to be on `main`** |
| Deploy | automatic | **held for a required reviewer** |
| Host | `202.129.16.145` | `202.129.16.144` (a separate VM) |
| Domain | `dev-app.greenlinepetcare.co.th` | `app.greenlinepetcare.co.th` |
| Image tag | first 12 chars of the commit sha | the same |

Shipping a release is merging into `main`. Nothing else is required — no tag, no
manual step to start the run:

```bash
gh pr create --base main --head develop --title 'Release'   # or the web UI
# merge it
```

Build and test start on the merge; the deploy job then sits in **Waiting** until
an approver clicks *Review deployments → Approve and deploy*. Several merges can
be waiting for approval at once — they build in parallel, but only one rollout
touches the host at a time.

**Rolling back** is a `workflow_dispatch` naming the commit you want to return to:
*Actions → Release → Run workflow*, and put an earlier `main` sha in the `ref`
box. Leave the box blank and it builds the current head of `main`.

**The `main` check is enforced, not assumed.** A push to `main` satisfies it by
construction, but a manual dispatch can name any ref, so the build job resolves
it and runs `git merge-base --is-ancestor <sha> origin/main`. A commit that was
never merged fails the run before the VM is touched at all.

Merge the two repos independently. They are separate compose projects that meet
only on the shared network, so a backend release and a frontend release are
unrelated events — but a change that alters the API contract needs both, and the
backend should land first.

### The two environments

A GitHub protection rule applies to **every** job that names the environment, so
splitting them is what lets build and test run unattended while only the deploy
waits:

| Environment | Protection | Holds |
|---|---|---|
| `production-build` | none | `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_PASSWORD` for the production VM, and `VITE_API_URL` |
| `production` | **required reviewers** | the same four `SSH_*` values |

Set the reviewers under **Settings → Environments → production → Required
reviewers**, and add the admins/maintainers who may release. Without this the
deploy job runs on its own and the release is no longer manual — it is the one
setting that carries the whole requirement.

`VITE_API_URL` belongs on `production-build`, not `production`: Vite inlines it at
**build** time, so it is the build and test jobs that need it. It defaults to
`https://app.greenlinepetcare.co.th` when unset, because the fallback is otherwise
`http://localhost:3000` — an app that looks perfectly healthy and cannot reach the
API from anybody's browser.

The production VM needs the same one-time setup as above: a clone at
`/opt/app/greenline-wms-fe` and the `greenline-net` network.

## Day-to-day

| Task | How |
|---|---|
| Deploy | push to `develop`, or **Actions → CI/CD → Run workflow** |
| Deploy a specific ref | Run workflow → `ref` = branch, tag or full SHA |
| Change the API origin | edit the `VITE_API_URL` variable, then re-run the workflow (a rebuild is required) |
| Roll back | Run workflow with `ref` set to the previous commit, or on the VM: `deploy/ci/pipeline.sh deploy <older-sha12>` |
| Logs | `docker logs -f greenline-wms-fe` |
| Serve without the edge | `WEB_BIND=0.0.0.0 docker compose up -d` |
| Stop just this stack | `docker compose down` — leaves `greenline-net` and the backend alone |

The two pipelines are fully independent: this one drives only its own compose
project (`web`), the backend's drives only its own (`api`, `nginx`, `certbot`), and
neither reads the other's directory. TLS is entirely the backend stack's business —
the edge terminates it, this container only ever speaks plain HTTP on :80 behind
it.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `network greenline-net declared as external, but could not be found` | `docker network create greenline-net`; the pipeline does this itself, so only a hand-run `docker compose up` hits it |
| `VITE_API_URL … was not baked into the bundle` | the variable changed after the image was built, or the build silently used a different value — re-run the build job |
| App loads but every request fails / CORS or mixed-content errors in the console | `VITE_API_URL` points somewhere the browser cannot reach (localhost, `http://` from an https page, or a trailing `/api`) |
| The edge answers 502 on `/` but this container is healthy | it is not on the shared network: `docker network inspect greenline-net` should list `greenline-wms-fe`. A `docker compose down` here disconnects it until the next `up` |
| The edge answers 502 on `/` and the container is gone | `docker logs greenline-wms-fe`, then `docker compose up -d` |
| Site loads over HTTP but not HTTPS | TLS lives in the backend stack — see `greenline-wms-be/deploy/README.md` → *TLS certificates* |
