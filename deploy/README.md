# Deployment — frontend

This app is the **`web` service of the stack defined in the backend repo**
(`greenline-wms-be/docker-compose.yml`): one edge nginx on :80/:443 proxies
`/api/*` to the API container and everything else here.

```
nginx :80/:443  ──┬── /api/*  → api  (greenline-wms-be:<sha>)
                  └── /*      → web  (greenline-wms-web:<sha>, this repo)
```

`.github/workflows/ci-cd.yml` runs **build → test → deploy** as three jobs, all
over SSH on the same AlmaLinux 9 VM as the backend:

| Job | What it does |
|---|---|
| **build** | syncs this checkout on the VM, `docker build` → `greenline-wms-web:<sha>` (+ `:latest`) |
| **test** | starts that image with no network and checks it serves the app shell, has built assets, and has the expected API origin baked in |
| **deploy** | points the stack's `web` service at the tested image, waits for its healthcheck, rolls back to the previous tag on failure, prunes old images |

The steps only invoke `deploy/ci/pipeline.sh <stage>` on the VM — the SSH action
rewrites multi-line scripts in transit, so the shell lives in a committed file.
Run any stage by hand:

```bash
sudo -iu clounstx2 bash -c 'cd /opt/app/greenline-wms-fe && deploy/ci/pipeline.sh deploy <tag>'
```

## Setup

The backend's `deploy/README.md` covers the VM itself (Docker, firewall, SELinux,
the `clounstx2` account). This repo needs only:

1. **A checkout next to the backend**, which is where `FRONTEND_CONTEXT` and the
   pipeline's `APP_DIR` both point:

   ```
   /opt/app/
   ├── greenline-wms-be/
   └── greenline-wms-fe/     ← APP_DIR
   ```

   ```bash
   sudo -iu clounstx2 git -C /opt/app clone https://github.com/nattapong5720187/greenline-wms-fe.git
   ```

2. **Secrets and variables** on a `develop` GitHub environment in *this* repo
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
✅  https://wms.example.com
❌  https://wms.example.com/          trailing slash
❌  https://wms.example.com/api       the app adds /api itself → /api/api/...
```

If it is unset the build warns and the bundle falls back to
`http://localhost:3000`, which works on your machine and fails for every real
user — so the test job fails the build rather than shipping that quietly.

Serve the site over HTTPS and this must be `https://`, or the browser blocks the
API calls as mixed content.

## Day-to-day

| Task | How |
|---|---|
| Deploy | push to `develop`, or **Actions → CI/CD → Run workflow** |
| Deploy a specific ref | Run workflow → `ref` = branch, tag or full SHA |
| Change the API origin | edit the `VITE_API_URL` variable, then re-run the workflow (a rebuild is required) |
| Roll back | Run workflow with `ref` set to the previous commit, or on the VM: `deploy/ci/pipeline.sh deploy <older-sha12>` |
| Logs | `docker logs -f greenline-wms-web` |

The two pipelines are independent: a backend deploy touches only `api` and
`nginx`, and this one touches only `web`.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `no docker-compose.yml in /opt/app/greenline-wms-be` | the backend is not checked out there, or `STACK_DIR` in the workflow is wrong |
| `no deploy/.env in …` | the backend has never been deployed on this host — run its pipeline once first |
| `VITE_API_URL … was not baked into the bundle` | the variable changed after the image was built, or the build silently used a different value — re-run the build job |
| App loads but every request fails / CORS or mixed-content errors in the console | `VITE_API_URL` points somewhere the browser cannot reach (localhost, http from an https page, or a trailing `/api`) |
| nginx 502 on `/` | the web container is not running: `docker logs greenline-wms-web` |
