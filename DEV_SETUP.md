# Development Setup Guide

This guide covers how to run citation-desk (frontend) and ttruthdesk-platform (backend) together in a unified local development environment, how the API contract test works, and the workflow for adding new API endpoints without drift.

---

## Repository Layout

The three repositories that make up this system are:

| Repository | Role | URL |
|---|---|---|
| `ttruthdesk-platform` | Backend — claim pipeline, database, public API | https://github.com/Gudmundur76/ttruthdesk-platform |
| `citation-desk` | Frontend — proxy layer, public site, agent discovery | https://github.com/Gudmundur76/citation-desk |
| `manus-persistent-drive` | Memory — phase logs, session history, compounding knowledge base | https://github.com/Gudmundur76/manus-persistent-drive |

citation-desk has **no direct database access** to ttruthdesk-platform. All data flows through the public API at `ttruthdesk.claims`, proxied server-side through `server/externalProxy.ts`.

---

## Prerequisites

- Docker Desktop (or Docker Engine + Compose v2)
- Node.js 22 and pnpm 9 (for running tests outside Docker)
- GitHub CLI (`gh`) authenticated to the `Gudmundur76` account

---

## Option A — Docker Compose (recommended for full-stack work)

This runs both repos in containers with hot-reload, connected via an internal Docker network. The frontend proxy automatically points to the local backend.

**Step 1 — Clone all three repos as siblings:**

```bash
mkdir ttruthdesk && cd ttruthdesk
gh repo clone Gudmundur76/ttruthdesk-platform
gh repo clone Gudmundur76/citation-desk
gh repo clone Gudmundur76/manus-persistent-drive
```

**Step 2 — Copy and fill in the shared secrets file:**

```bash
cd citation-desk/dev-environment   # or wherever docker-compose.dev.yml lives
cp .env.dev.example .env.dev
# Edit .env.dev — fill in DATABASE_URL, JWT_SECRET, and any API keys
```

**Step 3 — Start both services:**

```bash
docker compose -f docker-compose.dev.yml up
```

The backend starts on `http://localhost:4000` and the frontend on `http://localhost:3000`. The frontend proxy is automatically configured to forward all `/api/external/*` and `/api/public/*` requests to the local backend via `TTRUTHDESK_BASE_URL=http://backend:4000`.

**Step 4 — Run tests:**

```bash
# In the citation-desk container or locally with pnpm:
SKIP_CONTRACT_TESTS=true pnpm test   # unit + integration tests only
pnpm test server/apiContract.test.ts  # contract test against local backend
```

---

## Option B — Run each repo independently

If you only need to work on one side:

```bash
# Backend only
cd ttruthdesk-platform && pnpm dev   # starts on port 4000

# Frontend only (pointing to local backend)
cd citation-desk
TTRUTHDESK_BASE_URL=http://localhost:4000 pnpm dev   # starts on port 3000

# Frontend only (pointing to production backend — default)
cd citation-desk && pnpm dev
```

---

## API Contract Test

The contract test in `server/apiContract.test.ts` validates that the ttruthdesk.claims API response shape matches the `ClaimRecord` / `GlobalClaimsRegistry` types that citation-desk depends on. It runs against the live API by default and is the primary guard against silent drift between the two repos.

```bash
# Run against live ttruthdesk.claims (default)
pnpm test server/apiContract.test.ts

# Run against local backend
TTRUTHDESK_BASE_URL=http://localhost:4000 pnpm test server/apiContract.test.ts

# Skip (when backend is unavailable)
SKIP_CONTRACT_TESTS=true pnpm test server/apiContract.test.ts
```

The test validates:
- All required top-level fields on `GlobalClaimsRegistry` (`$schema`, `standard`, `generated_at`, `license`, `attribution`, `count`, `claims`)
- All required fields on each `ClaimRecord` (`id`, `value`, `label`, `claim_type`, `extracted_value`, `verdict`, `verdict_rationale`, `manually_reviewed`, `evidence_checked_at`, `source_refs`, `page_anchors`, `date_observed`)
- The `id` field matches the `ptd-<docId>-<claimId>` pattern
- The `verdict` field is from the allowed enum
- The `date_observed` field is a valid ISO 8601 date-time

---

## Adding a New API Endpoint (Contract-First Workflow)

This is the discipline that prevents drift. Follow this order strictly:

**Step 1 — Define the shape in ttruthdesk-platform first.** Add the new route, write the response type in `claimsRegistrySerializer.ts` or a new file, and add a test in `claimsRoutes.test.ts`.

**Step 2 — Update the contract test in citation-desk.** Before writing any proxy code, add the new field or endpoint to `server/apiContract.test.ts`. This test will fail until the backend is deployed — that is intentional. It is the contract.

**Step 3 — Add the proxy route in citation-desk.** Update `server/externalProxy.ts` to forward the new endpoint.

**Step 4 — Consume the new data in the frontend.** Update `llmsFullTxt.ts`, `rssFeed.ts`, `oaiPmh.ts`, or the relevant page component.

**Step 5 — Run all tests.** Both repos must pass before merging.

```bash
# ttruthdesk-platform
cd ttruthdesk-platform && pnpm test

# citation-desk
cd citation-desk && pnpm test
TTRUTHDESK_BASE_URL=http://localhost:4000 pnpm test server/apiContract.test.ts
```

---

## CI / CD

Both repos have GitHub Actions workflows that enforce quality on every push to `main`.

**citation-desk CI** (`.github/workflows/ci.yml`):

| Job | Trigger | What it does |
|---|---|---|
| `quality` | push + PR | TypeScript check + unit tests (contract tests skipped) |
| `contract` | push to main only | Contract test against live `ttruthdesk.claims` |
| `drive-staleness` | push to main only | Warns if `manus-persistent-drive` > 48h stale |

**ttruthdesk-platform CI** (`.github/workflows/ci.yml`):

| Job | Trigger | What it does |
|---|---|---|
| `quality` | push + PR | TypeScript check + all tests |
| `drive-staleness` | push to main only | Same staleness check |

---

## Memory Repository

The `manus-persistent-drive` repo is the compounding knowledge base for this project. Every development phase is logged to `logs/phase-log.md` and a structured JSON file is written to `sessions/history/`. The drive staleness check in both CI workflows enforces that it is updated within 48 hours of any push to main.

To update the drive after a session:

```bash
cd manus-persistent-drive
cat >> logs/phase-log.md << 'EOF'
## Phase NNN — YYYY-MM-DD
...
EOF
git add -A && git commit -m "phase NNN: ..." && git push
```

---

## Key Files

| File | Purpose |
|---|---|
| `server/externalProxy.ts` | All proxy routes to ttruthdesk.claims. Read `TTRUTHDESK_BASE_URL` from env. |
| `server/apiContract.test.ts` | Contract test — the single source of truth for the API shape citation-desk depends on. |
| `server/llmsFullTxt.ts` | `/llms-full.txt` — full claim corpus for AI agents. |
| `server/oaiPmh.ts` | `/oai` — OAI-PMH 2.0 endpoint for OpenAIRE and BASE harvesting. |
| `server/rssFeed.ts` | `/rss.xml` — RSS feed of recent claims. |
| `server/agentHeaders.ts` | Middleware that adds `Link:` headers and handles Markdown content negotiation. |
| `client/index.html` | Static semantic shell + JSON-LD + llms.txt/llms-full.txt references. |
| `client/public/llms.txt` | Agent-era sitemap. |
| `client/public/llms-full.txt` | Redirect to `/llms-full.txt` server endpoint. |
| `Dockerfile.dev` | Development container for use with docker-compose.dev.yml. |
| `.env.development.example` | Template for local env vars. Copy to `.env.development`. |
