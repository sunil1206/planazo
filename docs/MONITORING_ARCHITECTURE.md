# Planazo — Monitoring, Logging & Production-Readiness Audit

Audit date: 2026-08-08. Read-only inspection of the repository at
`D:\startup\planazo\planazo-v3\planazo`. `.env` was **not** read (only
`.env.example`), per instruction. This document describes what is
*actually configured today*, distinct from what merely appears to be
running in `docker compose ps`.

> **Headline finding, read first:** the two compose files describe two
> different security postures, and it is not obvious from the repo alone
> which one is live where. `docker-compose.yml` (dev) publishes Postgres,
> Redis, Prometheus and Grafana on all host interfaces with weak/hardcoded
> credentials. `docker-compose.prod.yml` keeps everything off published
> ports except nginx — but its Prometheus/Grafana blocks are **currently
> uncommitted** in git (`git status` shows `docker-compose.prod.yml` as
> `modified`, not committed). The service list the task description
> observed via `docker compose ps` (postgres:5433, redis:6380, api:8000,
> fastapi:8001, frontend:5173, nginx:8080, grafana:3001, prometheus:9090)
> matches `docker-compose.yml` (dev) port-for-port, not the committed prod
> file. If that stack is running anywhere other than a developer's own
> laptop, Postgres/Redis/Grafana/Prometheus are directly reachable from the
> network with no auth (DB/Redis) or default creds (Grafana). See §1 and §8.

---

## 1. Docker Compose topology

### 1.1 Dev vs prod — structural differences

| Aspect | `docker-compose.yml` (dev) | `docker-compose.prod.yml` |
|---|---|---|
| Networking | default bridge, no `networks:` block — every service gets a host-published port | explicit `internal` bridge network (line 172-174); **only nginx publishes ports** (`80:80`, `443:443`, lines 108-110) |
| Postgres/Redis exposure | `5433:5432`, `6380:6379` published to all interfaces (lines 14-15, 25-26) | no `ports:` on postgres/redis at all — reachable only inside `internal` network |
| Secrets | `DB_PASSWORD` defaults to hardcoded `planazo123` (line 11); Grafana admin password hardcoded `planazo123` (line 168) | `DB_PASSWORD` has no fallback — must come from `.env.production`; `GRAFANA_ADMIN_PASSWORD` uses the fail-fast form `${GRAFANA_ADMIN_PASSWORD:?set GRAFANA_ADMIN_PASSWORD in .env}` (line 155, in the uncommitted working copy — see §8) |
| Monitoring stack | prometheus (`9090:9090`, all interfaces) and grafana (`3001:3000`, all interfaces) committed in the file, lines 139-176 | prometheus/grafana **not present in the committed HEAD version** of this file; present only in the current uncommitted working-tree edit, bound to `127.0.0.1` only (SSH-tunnel-only, per the comment at prod file lines 122-126) |
| Frontend | `frontend` service runs the Vite dev server directly (`5173:5173`, hot reload) | `frontend` is built via `Dockerfile.prod` into static files served by its own nginx, no published port, proxied by the edge nginx |
| Healthchecks | postgres + redis only (lines 16-20, 27-31) | postgres + redis only (lines 21-25, 33-37) |

### 1.2 Port exposure table (as configured in each file)

| Port | Service | Dev compose | Prod compose (committed) | Prod compose (working tree) | Flag |
|---|---|---|---|---|---|
| 5433→5432 | postgres | published, all interfaces | not published | not published | **Unsafe if this dev file is ever run on a network-reachable host** — no auth beyond the DB password, default `planazo123` |
| 6380→6379 | redis | published, all interfaces | not published | not published | **Unsafe for the same reason** — Redis has no auth configured (`REDIS_URL=redis://redis:6379/0`, no password) |
| 8000 | api (FastAPI) | published | not published (nginx-only ingress) | not published | Expected in dev; correctly hidden in prod |
| 8001 | fastapi (legacy) | published | not published | not published | Expected in dev; correctly hidden in prod |
| 5173 | frontend (Vite dev server) | published | N/A (static build in prod) | N/A | Fine — dev tool only |
| 8080→80 | nginx (dev) | published | — | — | Fine for local dev |
| 80, 443 | nginx (prod) | — | published | published | Correct — only intended public surface |
| 9090 | prometheus | published, all interfaces | absent | `127.0.0.1:9090:9090` (loopback only) | Dev version is **unsafe on a shared/public host**; prod (working-tree) version is fine but not yet committed |
| 3001→3000 | grafana | published, all interfaces, admin/`planazo123` | absent | `127.0.0.1:3001:3000`, admin password from required env var | Dev version is **unsafe** (hardcoded weak default admin password, publicly reachable); prod (working-tree) version is fine but not yet committed |

### 1.3 Healthchecks

- Only `postgres` and `redis` have Docker `healthcheck:` blocks, in **both** compose files.
- `api`, `fastapi`, `frontend`, `nginx`, `celery_worker`/`celery`, `celery_beat`, `prometheus`, and `grafana` have **no** healthcheck in either compose file.
- None of the Dockerfiles (`app/Dockerfile`, `fastapi/Dockerfile`, `frontend/Dockerfile`, `frontend/Dockerfile.prod`) define a `HEALTHCHECK` instruction either — confirmed via grep, no matches.
- Practical effect: `docker compose ps` will show these containers as "running" (as observed) but never as "healthy" — there is no automated signal that the API, nginx, or Celery workers are actually serving traffic/processing tasks, only that the process hasn't crashed. `depends_on: condition: service_healthy` is used for postgres/redis (e.g. docker-compose.yml lines 48-51) but nothing downstream gates on api/nginx health because none exists to gate on.

### 1.4 Volumes / secrets wiring

- `env_file: .env` (dev) / `env_file: .env.production` (prod) is used consistently for api/fastapi/celery — no compose file interpolates a raw secret value for these services (good).
- The two hardcoded exceptions are the dev-only Grafana admin password (`docker-compose.yml:168`) and the dev Postgres password default (`docker-compose.yml:11`, `${DB_PASSWORD:-planazo123}`) — both are fallback defaults for local dev convenience, not literal production secrets, but see §8 for why the Grafana one is still worth fixing.
- `docker-compose.prod.yml` mounts `/etc/letsencrypt:/etc/letsencrypt:ro` into nginx (line 114) for TLS certs — standard, read-only, fine.

---

## 2. Prometheus

### 2.1 Scrape configuration (`monitoring/prometheus.yml`)

```yaml
scrape_configs:
  - job_name: api            # api:8000/metrics, 15s
  - job_name: fastapi-legacy # fastapi:8001/metrics, 15s
  - job_name: prometheus     # self-scrape, localhost:9090, default interval
```

- Global `scrape_interval` / `evaluation_interval`: 15s (lines 2-3).
- A commented-out placeholder for a Postgres exporter exists (lines 32-35) but nothing is configured or deployed — no `postgres-exporter` service in either compose file.
- **No Redis exporter at all** — not even a commented placeholder.
- **No `rule_files:` section** — confirmed via grep across `monitoring/`, no alert-rule YAML files exist anywhere in the repo.
- The file's own comments (lines 9-13) note this config was recently fixed: it used to point at a `django:8000` target that no longer exists post-migration to FastAPI, so Prometheus was silently scraping nothing from the main app until that was corrected. That fix itself is currently **uncommitted** (`git diff` shows `monitoring/prometheus.yml` modified against HEAD, changing `job_name: django` → `job_name: api` and `project: snapshare` → `project: planazo`).

### 2.2 Does the app actually expose `/metrics`?

Yes, on both FastAPI services:
- Main API — `app/main.py:195`: `Instrumentator().instrument(app).expose(app, endpoint="/metrics")`, using `prometheus-fastapi-instrumentator==7.0.0` (`app/requirements.txt:58`).
- Legacy AI service — `fastapi/main.py:31`: `Instrumentator().instrument(app).expose(app)` (default `/metrics` path), same library pinned in `fastapi/requirements.txt:14`.

### 2.3 What metrics are actually collected today

Only what `prometheus-fastapi-instrumentator` provides out of the box: HTTP request counts by method/handler/status, request latency histograms, and requests-in-progress. There is **no custom instrumentation** anywhere in the codebase — a repo-wide search for `Counter(`, `Histogram(`, `Gauge(`, or direct `prometheus_client` imports outside the instrumentator library returned nothing. Concretely:
- No DB-level metrics (connection pool usage, query latency) beyond generic HTTP timing.
- No Redis/Celery metrics (queue depth, task success/failure counts, task duration).
- No business metrics (signups, bookings, payments, vendor actions, gallery uploads, etc.) — none of the domain routers (`app/routers/*.py`) touch a metrics object.

### 2.4 Alerting

Absent entirely:
- No Prometheus alert rule files (`*.rules.yml` or similar) anywhere under `monitoring/`.
- No `rule_files:` stanza in `monitoring/prometheus.yml`.
- No Alertmanager service in either compose file.
- No Grafana-native alerting config found under `monitoring/grafana/provisioning/` (only `dashboards/` and `datasources/` provisioners exist — see §3).
- The only alerting mentioned anywhere in the docs is aspirational: `DEPLOYMENT_HANDBOOK.md:1993-2000` ("Light-touch monitoring stack... Alerts — Email or Slack from your uptime checker") describing external uptime-checker services (Healthchecks.io/BetterUptime/UptimeRobot), not Prometheus/Grafana alerting, and this section predates the current FastAPI architecture (see §9 doc staleness note).

---

## 3. Grafana

### 3.1 Provisioning state

- Datasource: `monitoring/grafana/provisioning/datasources/prometheus.yml` — one Prometheus datasource, `url: http://prometheus:9090`, marked `isDefault: true`. This is correctly wired and would work.
- Dashboard provider: `monitoring/grafana/provisioning/dashboards/dashboards.yml` — provider name **`Snapshare`** (line 4) and folder **`Snapshare`** (line 5), pointing at `/var/lib/grafana/dashboards`. This is leftover naming from the project's prior identity as "Snapshare" (see §9) — dashboards will be organized under a folder literally called "Snapshare" inside a Grafana instance labeled Planazo.
- Dashboard files present: **exactly one** — `monitoring/grafana/dashboards/django.json`. No infra dashboard, no Postgres dashboard, no Redis dashboard, no business-metrics dashboard.

### 3.2 The one dashboard that exists is stale/broken

`django.json` (uid `snapshare-django`, title "Snapshare — Django & API") queries metric names emitted by `django-prometheus`:
- `django_http_requests_total_by_method_total` (line 29)
- `django_db_execute_total` (line 51)
- `django_http_responses_total_by_status_total{status=~"4.."}` (line 73)

None of these metrics exist anymore. The app was migrated from Django to FastAPI (per `app/main.py`'s own docstring: "Replaces the entire Django backend/ monolith"), and `prometheus-fastapi-instrumentator` emits differently-named metrics (`http_requests_total`, `http_request_duration_seconds`, etc., no `django_` prefix). Every panel in this dashboard will render "No data" against the current stack.

### 3.3 Mismatched default-home-dashboard path

Both compose files set:
```
GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH=/var/lib/grafana/dashboards/fastapi.json
```
(`docker-compose.yml:171`, `docker-compose.prod.yml:158` in the working tree). No `fastapi.json` file exists anywhere under `monitoring/grafana/dashboards/` — only `django.json`. Grafana's home dashboard setting points at a file that doesn't exist.

### 3.4 Admin credential handling

- Dev (`docker-compose.yml:167-168`): `GF_SECURITY_ADMIN_USER=admin`, `GF_SECURITY_ADMIN_PASSWORD=planazo123` — hardcoded literal, not from an env var, sitting directly in a git-tracked file. Low severity in isolation (it's the dev compose file, matching the rest of that file's dev-convenience defaults) but see §8 for why this specific one is worth fixing regardless.
- Prod (`docker-compose.prod.yml:155`, working tree only): `GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:?set GRAFANA_ADMIN_PASSWORD in .env}` — correctly externalized and fails startup loudly if unset. Good practice. However, `GRAFANA_ADMIN_PASSWORD` is **not documented in `.env.example`** (grep for `GRAFANA|PROMETHEUS|MONITORING` across `.env.example` returns nothing) — someone following the example file to build their `.env.production` would not know this variable is required until the container fails to start.
- `GF_SERVER_ROOT_URL=http://localhost:3001` is set identically in both dev and the prod working-tree file. In prod this is cosmetic (affects only links Grafana generates for itself, e.g. in alert notifications) since access is via SSH tunnel per the design comment, but it's worth setting to the real tunnel-access URL if alert links are ever used.

---

## 4. Alerting

**Absent.** No Prometheus alert rules, no Alertmanager, no Grafana alert rules/contact points/notification policies. See §2.4 for full detail. This is the single largest gap relative to the stated goal ("alerting").

---

## 5. Logging

- `app/main.py:29-33` calls `logging.basicConfig()` once at import time with a **plain-text** formatter: `"%(asctime)s %(levelname)s %(name)s: %(message)s"`. This is a real fix noted in the surrounding comment (nothing else called `basicConfig`, so most loggers were silently dropped below WARNING before this) — but the output format is unstructured text, not JSON.
- No `structlog`, no `python-json-logger`, no other structured-logging library anywhere in `app/requirements.txt` or `fastapi/requirements.txt` — confirmed via grep, no matches.
- **No request-ID concept anywhere in the codebase.** A repo-wide search for `request_id`, `X-Request-ID`, and `RequestID` (case-insensitive) across `app/` returned nothing. There is no middleware that generates/propagates a request ID, and log lines have no way to be correlated to a specific HTTP request or to each other across a request's lifecycle.
- No log shipping/aggregation is configured — logs go to container stdout only (`docker logs`). `DEPLOYMENT_HANDBOOK.md:1998` explicitly defers this: "`docker logs` for now; ship to a log aggregator (Loki, Datadog) when scale demands."
- Sentry is wired (`app/main.py:62-67`, `sentry_sdk.init(...)` gated on `settings.SENTRY_DSN`) and captures unhandled exceptions with 10% trace sampling — this is the only structured, centralized error signal that exists today, and only fires when `SENTRY_DSN` is set (it's blank by default in `.env.example:51`).

---

## 6. Error handling

This part is in solid shape. `app/middleware/error_handling.py`, wired once from `app/main.py:183` via `register_error_handlers(app)`, is a genuine centralized handler, not per-router ad hoc handling:

- `ValidationError` (app-internal) → 422, `{"detail", "error": "validation_error", "path"}` (lines 63-68).
- `RequestValidationError` (Pydantic/FastAPI) → 422, same shape with encoded Pydantic errors (lines 70-79).
- `StarletteHTTPException` → passthrough status code, `{"detail", "error": "http_error", "path"}` (lines 81-87).
- Catch-all `Exception` → 500, `{"detail": "Internal server error", "error": "internal_error", "path"}`, plus a `logger.error(..., exc_info=exc)` call (lines 92-105).

Two things worth noting:
1. The envelope does **not** include a request ID (see §5) — `path` and `error` code are present, but there's no correlation field to tie a client-visible error back to a specific server-side log line.
2. The module docstring (lines 1-29) documents a real, previously-encountered bug well: registering a handler for the base `Exception` class causes Starlette to route that response through the outermost `ServerErrorMiddleware`, bypassing `CORSMiddleware` entirely, which silently strips CORS headers from every 500 response. The fix (`_cors_headers_for()`, lines 46-59) manually re-applies the CORS allow-origin header on the 500 path by replicating the same origin allowlist. This is a correct, non-obvious fix and is already in place.

---

## 7. Health checks

`app/main.py:198-200`:
```python
@app.get("/health", tags=["ops"])
async def health():
    return {"status": "ok", "version": app.version}
```
This is a **static** check — it returns 200 unconditionally as long as the process is up and able to route a request. It does **not**:
- Check Postgres connectivity (no query against `engine`/`get_db`).
- Check Redis connectivity (the only Redis ping happens once, at startup, inside the `lifespan` context manager — `app/main.py:102-110` — and only logs a warning on failure; it does not affect `/health` afterward and does not run again).
- Distinguish liveness from readiness — there is no `/health/live` or `/health/ready` split anywhere in the routers.

The legacy `fastapi/` service has its own independent, equally static health check: `fastapi/main.py:39-41` returns `{"status": "ok", "service": "snapshare-fastapi"}` (note: still branded "snapshare", see §9).

**Production reachability gap:** `nginx/planazo.conf` (the prod nginx config) has **no `/health` location block at all** — compare to `nginx/nginx.conf` (dev), which explicitly proxies `/health` to the API at lines 67-71. In prod, a request to `https://planazo.in/health` falls through to the catch-all `location /` (`nginx/planazo.conf:150-162`), which proxies to the frontend container, which in turn (`frontend/nginx.spa.conf:10-12`) serves `index.html` for any unmatched path via SPA fallback. So the health-check command documented in `PLANAZO_DIGITALOCEAN_DEPLOY_STEPS.md:333` —
```
curl https://planazo.in/health   # expect {"status":"ok",...}
```
— would in production actually return the SPA's HTML shell, not JSON, and would not verify the API is up at all. This looks like a genuine gap between documentation and nginx config, not a deliberate design choice (unlike `/metrics`, which is correctly *absent* from the public prod nginx config — see below).

Also worth noting as a positive: `nginx/planazo.conf` does **not** proxy `/metrics` publicly (no location block for it), unlike the dev `nginx/nginx.conf:61-65` which does proxy `/metrics` on `:8080`. In prod, Prometheus reaches `api:8000/metrics` directly over the internal Docker network, so the metrics endpoint is correctly never exposed to the internet — this is good and should be preserved when the /health gap above is fixed (add `/health` to the public prod nginx, but do not add `/metrics`).

---

## 8. Secrets hygiene

- `.gitignore:1` excludes `.env`. `.gitignore:42-44` also excludes `.env.production`, `frontend/.env.production`, `frontend/.env.local`. **Confirmed: real secret files are git-ignored.**
- `.env.example` contains only placeholder values (`your-google-client-id...`, `rzp_test_xxxxxxxxxxxx`, `re_xxxxxxxxxxxx`, etc.) — no real secrets present, as expected for an example file.
- `.env.example` still has legacy Django-era variables (`DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_SETTINGS_MODULE`) and Snapshare-era DB naming (`DB_NAME=snapshare`, `DB_USER=snapshare`, `DB_PASSWORD=snapshare123`, lines 16-18) even though the app is now FastAPI and the compose files default to `planazo`/`planazo123`. Not a security issue by itself, but it's confusing surface area — someone provisioning a new environment from this file alone would create a DB named `snapshare`, mismatched from what `docker-compose.yml`'s own defaults expect (`planazo`).
- `.env.example`'s own "Production checklist" (lines 71-83) still references Django settings (`DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_SETTINGS_MODULE=core.settings.prod`) and `NEXT_PUBLIC_API_URL` — none of which apply to the current FastAPI/Vite stack. This checklist is stale and would mislead someone following it literally.
- Hardcoded values flagged (file:line, values not reproduced per instruction):
  - `docker-compose.yml:168` — Grafana admin password hardcoded (not `${VAR}`-sourced), dev file only.
  - `docker-compose.yml:11` — Postgres password has a hardcoded fallback default (`${DB_PASSWORD:-planazo123}`), dev file only, matches the dev-convenience pattern used throughout that file.
  - `app/core/config.py:25` and `app/core/config.py:28` — `DB_PASSWORD` and `DJANGO_SECRET_KEY` `Settings` fields have hardcoded fallback defaults (`"planazo123"`, `"change-me-in-production"`) used only if the corresponding env var is absent. These are Pydantic-settings defaults, not committed secrets, but they mean a misconfigured production deployment that forgets to set `DB_PASSWORD`/`SECRET_KEY` would silently start up with a well-known weak value instead of failing loudly — worth switching to the same fail-fast pattern already used for `GRAFANA_ADMIN_PASSWORD` in the prod compose file.
  - No API keys, tokens, or connection strings with real-looking values were found hardcoded in any compose file, nginx config, or `monitoring/` file.
- `docker-compose.prod.yml` correctly sources all app secrets via `env_file: .env.production` (lines 48, 66, 84) rather than inline `environment:` blocks — good separation.
- As noted in the headline: `docker-compose.prod.yml`'s monitoring block (with its loopback-only port binding, the safe pattern) is **currently uncommitted**. Until it's committed, the version of this file that would be checked out on a fresh clone/deploy has no Prometheus/Grafana at all, and if anyone reintroduces monitoring to that file without the `127.0.0.1:` prefix, it would default to publishing on all interfaces the same way the dev file does.

---

## 9. Gap list — what's needed to reach the stated goal

Ordered roughly by leverage/urgency, not strictly by section:

1. **Alerting — build from zero.** No Prometheus alert rules, no Alertmanager, no Grafana alerting exist. Needs: a `monitoring/alerts/*.rules.yml` file wired via a `rule_files:` entry in `prometheus.yml`, an Alertmanager service (or Grafana-native alerting off the existing Prometheus datasource) added to the compose files, and at minimum rules for: API error-rate spike, API latency p95/p99, service-down (via `up == 0` per job), Postgres/Redis down or connection saturation, disk/volume pressure for the Postgres/Prometheus volumes.
2. **Business metrics instrumentation — missing entirely.** No `Counter`/`Histogram`/`Gauge` usage anywhere in `app/`. Needs explicit `prometheus_client` metrics added at the points that matter (signups, logins, bookings/orders, payment success/failure via the Razorpay webhook router, vendor actions, gallery/photo uploads, Celery task outcomes) and a way to expose them through the same `/metrics` endpoint already wired.
3. **Infra-level metrics — no exporters running.** No Postgres exporter (`prometheus.yml:32-35` is commented out and nothing implements it), no Redis exporter at all, no cAdvisor/node-exporter for container/host resource metrics. All three would need new services in the compose files plus corresponding scrape jobs.
4. **Grafana dashboards — effectively an empty shell today.** Only one dashboard exists (`django.json`) and it queries metric names that no longer exist post-Django migration (§3.2). Needs: a working "API" dashboard built against the real `prometheus-fastapi-instrumentator` metric names, plus new dashboards for infra (once exporters from item 3 exist), DB, Redis, and business metrics (once item 2 exists). Also fix the folder name (`Snapshare` → `Planazo`, `monitoring/grafana/provisioning/dashboards/dashboards.yml:4-5`) and the dangling `GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH` pointing at a nonexistent `fastapi.json`.
5. **Structured JSON logging with request IDs — missing entirely.** Current logging is plain-text (`app/main.py:29-33`) with no request-ID field and no correlation mechanism at all (§5). Needs a request-ID middleware (generate/accept `X-Request-ID`, bind it to a context var, include it in every log line and in the error envelope from §6) and a switch to a JSON formatter (structlog or `python-json-logger`) with at least `timestamp`, `level`, `service`, `request_id`, and (where available) `user_id`.
6. **`/health/live` + `/health/ready` split — missing.** Today's `/health` (§7) is a single static check. Needs a liveness probe (process up, no dependency checks — fast, for restart decisions) separated from a readiness probe (actually queries Postgres and pings Redis, used to gate traffic/load-balancer routing).
7. **Prod nginx `/health` gap — fix or the documented health-check command lies.** `nginx/planazo.conf` has no `/health` location (§7); the documented `curl https://planazo.in/health` check in `PLANAZO_DIGITALOCEAN_DEPLOY_STEPS.md:333` currently would hit the SPA fallback, not the API. Add a `/health` (and, once item 6 lands, `/health/live`/`/health/ready`) location mirroring the existing `/metrics`-style proxy pattern in `nginx/nginx.conf:67-71` — but keep `/metrics` itself un-proxied in prod, which is already correctly the case.
8. **Commit the prod monitoring changes.** The loopback-only Prometheus/Grafana block in `docker-compose.prod.yml`, and the `job_name` fix in `monitoring/prometheus.yml`, are both currently uncommitted working-tree edits (§1, §2.1, §8). Until committed, a fresh deploy from git has no monitoring stack in prod at all, and the currently-good "bind to 127.0.0.1" pattern isn't protected from being lost or altered without review.
9. **Reconcile which compose file is actually deployed where.** The observed running ports match the dev file's exposure pattern (§1.2 headline). Confirm explicitly (e.g. via `docker compose -f <which file> ps` on whatever host is being audited) that Postgres/Redis/Grafana/Prometheus are not reachable from outside wherever this stack actually runs; if the dev compose file is ever used on a shared or internet-facing host, harden it (bind DB/Redis/monitoring ports to `127.0.0.1`, stop hardcoding the Grafana password) or simply don't publish those ports at all.
10. **Document `GRAFANA_ADMIN_PASSWORD` in `.env.example`.** The prod compose file requires it (fail-fast), but it's undocumented in the example env file (§3.4) — a straightforward doc fix.
11. **General cleanup, not blocking but worth doing alongside the above:** the Grafana provisioning folder/tag is still "Snapshare" (§3.1), the legacy `fastapi/` service still identifies itself as "Snapshare FastAPI Service" / `snapshare-fastapi` in its title and health response, `.env.example` still carries Django-era variables and a stale "production checklist" (§8), and `deploy.sh` (lines 9, 21, 25, 32) still targets a `docker compose exec django python manage.py migrate/collectstatic` and echoes `https://linuslearning.in` — none of which apply to the current FastAPI/Alembic/planazo.in stack, so `deploy.sh` as committed would fail on the `django` exec step if run as-is. `DEPLOYMENT_HANDBOOK.md` (2543 lines) also describes an older architecture (Django + Traefik + Next.js) that no longer matches the repo; `PLANAZO_DIGITALOCEAN_DEPLOY_STEPS.md` is the more current/grounded doc (its own header says it's grounded in the actual current prod files) and is the one worth building on rather than the handbook.

---

## What already works and doesn't need rebuilding

- `/metrics` is genuinely wired on both FastAPI services (main API and legacy AI service) via `prometheus-fastapi-instrumentator` — don't re-instrument from scratch, extend it.
- The Prometheus → Grafana datasource link is correctly provisioned and would work as-is (`monitoring/grafana/provisioning/datasources/prometheus.yml`).
- The centralized error-handling envelope (§6) is solid, already covers validation/HTTP/unhandled-exception paths consistently, and includes a non-obvious, well-documented CORS fix — just needs a request-ID field added, not a redesign.
- `.env` / `.env.production` are correctly git-ignored; no real secrets found committed anywhere in the inspected files.
- The prod nginx's decision to keep `/metrics` off the public internet (while dev's does proxy it) is correct and should be preserved.
- The prod compose file's use of an isolated `internal` Docker network with no published ports except nginx (once the monitoring-block changes are committed) is the right shape for the DB/Redis/monitoring surface.
