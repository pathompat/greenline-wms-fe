#!/usr/bin/env bash
#
# Remote stage runner for .github/workflows/ci-cd.yml.
#
# The logic lives in this committed file rather than inline in the workflow
# because appleboy/ssh-action (drone-ssh) rewrites multi-line scripts in transit
# and eventually breaks one mid-token. Each workflow step sends one short command;
# this file arrives byte-exact with the checkout. Same arrangement as the backend.
#
# Usage: deploy/ci/pipeline.sh <command> [args]
#   build  <tag> <sha>   docker build the Vite bundle into an nginx image
#   test   <tag>         smoke-test that image: it serves the app and the API
#                        origin really was baked in
#   deploy <tag>         point the stack's `web` service at it, health-gate it,
#                        roll back to the previous tag on failure
#   prune  <tag>         drop all but the newest KEEP_IMAGES images
#
# Environment (exported by the workflow):
#   WEB_IMAGE       image name          (default greenline-wms-web)
#   WEB_CONTAINER   container name      (default greenline-wms-web)
#   STACK_DIR       backend checkout that owns docker-compose.yml and deploy/.env
#   VITE_API_URL    API origin baked into the bundle at build time
#   HEALTH_TIMEOUT, KEEP_IMAGES

set -Eeuo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

WEB_IMAGE="${WEB_IMAGE:-greenline-wms-web}"
WEB_CONTAINER="${WEB_CONTAINER:-greenline-wms-web}"
STACK_DIR="${STACK_DIR:-/opt/app/greenline-wms-be}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-90}"
KEEP_IMAGES="${KEEP_IMAGES:-5}"
SMOKE_CONTAINER="greenline-wms-web-smoke"

die() { echo "$*" >&2; exit 1; }

# The stack (edge nginx + api + web) is defined in the backend repo, so `web` is
# deployed by driving that compose file. WEB_IMAGE_TAG is passed in the
# environment, which compose ranks above every --env-file — the same mechanism
# the backend pipeline uses for its own tag.
compose() {
  local tag="$1"; shift
  [ -f "$STACK_DIR/docker-compose.yml" ] \
    || die "no docker-compose.yml in $STACK_DIR — is the backend repo checked out there?"
  [ -f "$STACK_DIR/deploy/.env" ] \
    || die "no deploy/.env in $STACK_DIR — deploy the backend once first"
  local extra=()
  [ -f "$STACK_DIR/deploy/.env.ci" ] && extra+=(--env-file "$STACK_DIR/deploy/.env.ci")
  [ -f "$STACK_DIR/deploy/.env.image" ] && extra+=(--env-file "$STACK_DIR/deploy/.env.image")
  WEB_IMAGE="$WEB_IMAGE" WEB_IMAGE_TAG="$tag" \
    docker compose -f "$STACK_DIR/docker-compose.yml" \
      --env-file "$STACK_DIR/deploy/.env" \
      "${extra[@]}" \
      "$@"
}

container_state() {
  docker container inspect \
    -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
    "$WEB_CONTAINER" 2>/dev/null || echo missing
}

wait_for_health() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT)) status
  while [ "$SECONDS" -lt "$deadline" ]; do
    status="$(container_state)"
    if [ "$status" = healthy ]; then
      return 0
    fi
    if [ "$status" = unhealthy ] || [ "$status" = exited ] || [ "$status" = dead ]; then
      return 1
    fi
    sleep 3
  done
  return 1
}

cmd_build() {
  local tag="$1" sha="$2"
  export DOCKER_BUILDKIT=1
  if [ -z "${VITE_API_URL:-}" ]; then
    echo "###############################################################"
    echo "  WARNING — VITE_API_URL is not set."
    echo "  Vite inlines it at build time, so the bundle will fall back to"
    echo "  http://localhost:3000 and the app will not reach the API from"
    echo "  anyone else's browser. Set it as a variable on the 'develop'"
    echo "  environment: the site's public origin, no trailing slash, no /api."
    echo "###############################################################"
  fi
  echo "==> Building $WEB_IMAGE:$tag (VITE_API_URL=${VITE_API_URL:-<unset>})"
  docker build \
    --build-arg "VITE_API_URL=${VITE_API_URL:-}" \
    --label "org.opencontainers.image.revision=$sha" \
    --tag "$WEB_IMAGE:$tag" \
    --tag "$WEB_IMAGE:latest" \
    .
  docker image inspect "$WEB_IMAGE:$tag" --format "==> Built $WEB_IMAGE:$tag ({{.Size}} bytes)"
}

# There is no test runner in this project, so the check that carries weight is:
# does the image actually serve the app, and did the build bake in the API origin
# we asked for? Both fail silently otherwise — a wrong VITE_API_URL produces a
# perfectly healthy container that cannot talk to the backend.
cmd_test() {
  local tag="$1" body=""
  docker image inspect "$WEB_IMAGE:$tag" >/dev/null \
    || die "image $WEB_IMAGE:$tag not found — did the build job run?"

  docker rm -f "$SMOKE_CONTAINER" >/dev/null 2>&1 || true
  trap 'docker rm -f "$SMOKE_CONTAINER" >/dev/null 2>&1 || true' EXIT

  echo "==> Smoke-testing $WEB_IMAGE:$tag"
  docker run -d --name "$SMOKE_CONTAINER" --network none "$WEB_IMAGE:$tag" >/dev/null

  local i=0
  while [ "$i" -lt 20 ]; do
    if body="$(docker exec "$SMOKE_CONTAINER" wget -qO- http://127.0.0.1/ 2>/dev/null)"; then
      break
    fi
    i=$((i + 1))
    sleep 1
  done
  [ -n "$body" ] || die "nginx in $WEB_IMAGE:$tag never served / "

  echo "$body" | grep -q '<div id="app">' || die "/ did not return the app shell"
  echo "    serves the app shell"

  docker exec "$SMOKE_CONTAINER" sh -c 'ls /usr/share/nginx/html/assets/*.js >/dev/null 2>&1' \
    || die "no built JS in /usr/share/nginx/html/assets"
  echo "    built assets present"

  if [ -n "${VITE_API_URL:-}" ]; then
    docker exec "$SMOKE_CONTAINER" \
      grep -rq -- "$VITE_API_URL" /usr/share/nginx/html/assets \
      || die "VITE_API_URL ($VITE_API_URL) was not baked into the bundle"
    echo "    VITE_API_URL baked in: $VITE_API_URL"
  fi

  docker rm -f "$SMOKE_CONTAINER" >/dev/null 2>&1 || true
  trap - EXIT
  echo "==> Smoke test passed"
}

cmd_deploy() {
  local tag="$1" previous=""
  docker image inspect "$WEB_IMAGE:$tag" >/dev/null \
    || die "image $WEB_IMAGE:$tag not found — did the build job run?"

  if docker container inspect "$WEB_CONTAINER" >/dev/null 2>&1; then
    previous="$(docker container inspect -f '{{.Config.Image}}' "$WEB_CONTAINER" | awk -F: '{print $NF}')"
    if [ "$previous" = "$tag" ]; then
      previous=""
    fi
  fi
  echo "==> Previously deployed tag: ${previous:-(none)}"

  # --no-deps so the api and edge nginx are left alone; --no-build because the
  # image was built and tested above and compose must not silently rebuild it.
  echo "==> Deploying $WEB_IMAGE:$tag"
  compose "$tag" up -d --no-deps --no-build web

  echo "==> Waiting up to ${HEALTH_TIMEOUT}s for $WEB_CONTAINER to become healthy"
  if wait_for_health; then
    echo "==> Deployed $WEB_IMAGE:$tag — web is healthy"
    return 0
  fi

  echo "web did not become healthy; last 40 log lines:"
  docker logs --tail 40 "$WEB_CONTAINER" 2>&1 | sed 's/^/    /' || true

  if [ -n "$previous" ] && docker image inspect "$WEB_IMAGE:$previous" >/dev/null 2>&1; then
    echo "==> Rolling back to $WEB_IMAGE:$previous"
    compose "$previous" up -d --no-deps --no-build web
    if wait_for_health; then
      echo "==> Rolled back to $previous — the site is still up"
    else
      echo "the rollback did not become healthy either"
    fi
  else
    echo "no previous image to roll back to"
  fi
  die "deploy failed for $WEB_IMAGE:$tag"
}

cmd_prune() {
  local tag="$1"
  echo "==> Pruning old images (keeping the newest $KEEP_IMAGES)"
  docker image ls "$WEB_IMAGE" --format '{{.Tag}}\t{{.CreatedAt}}' \
    | grep -Ev "^(latest|$tag)\b" \
    | sort -k2 -r \
    | tail -n +"$((KEEP_IMAGES + 1))" \
    | cut -f1 \
    | while read -r old; do
        [ -n "$old" ] || continue
        docker image rm "$WEB_IMAGE:$old" >/dev/null 2>&1 \
          && echo "    removed $WEB_IMAGE:$old" || true
      done || true   # nothing to prune is not a failure (pipefail + empty grep)

  docker ps --filter "name=greenline-wms-" --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
}

case "${1:-}" in
  build)  cmd_build "${2:?tag}" "${3:?sha}" ;;
  test)   cmd_test "${2:?tag}" ;;
  deploy) cmd_deploy "${2:?tag}" ;;
  prune)  cmd_prune "${2:?tag}" ;;
  *) die "usage: $0 {build|test|deploy|prune} [args]" ;;
esac
