# citation.is Frontend

This file provides persistent context for autonomous agents (Manus, goose, etc.) working on this repository.

## Architecture

- **Role:** Public product surface, developer documentation, MCP discovery layer.
- **Backend:** ttruthdesk-platform (proxied via `/api/*` and `/mcp`).
- **Stack:** React, Vite, Tailwind CSS, tRPC client.

## Key Pages

- `Verify.tsx`: Main user-facing verification interface.
- `DevelopersMcp.tsx`: Enterprise integration hub. Documents one-click setup, Live Routing, and Autonomous Ingestion.
- `Status.tsx`: Live corpus health dashboard — domain coverage widget with SLM training progress bars, scheduled jobs table, and system metrics.

## Proxy Configuration (`server/externalProxy.ts`)

- Routes `/api/*` to upstream backend.
- Routes `/mcp` and `/.well-known/mcp.json` to upstream backend.

## tRPC Procedures (`server/routers.ts`)

- `status.metrics` — system health metrics
- `status.jobs` — scheduled job registry
- `status.domains` — per-domain claim counts + SLM training status (proxies `/api/public/status/domains`)

## Development Rules

- Do not add backend logic here. This is a pure frontend + proxy layer.
- Run `pnpm check` to verify TypeScript.
- Run `npx vitest run` to verify tests (27 tests, all passing).

## AAIF Toolchain — Mandatory Pre-Sprint Validation

Before starting any sprint on this repository, the agent MUST complete the following steps. See `ttruthdesk-platform/AGENTS.md` for the full validation sequence.

### Quick reference

```bash
# 1. Read Letta memory
python3 /home/ubuntu/manus-persistent-drive/scripts/memory.py read sprint_state

# 2. Verify MCP is live
curl -s -X POST https://citation.is/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_claim","arguments":{"id":1}}}' \
  --max-time 10

# 3. Check production stats
curl -s https://ttruthdesk.claims/api/public/stats

# 4. Start agentgateway
agentgateway -f /home/ubuntu/ttruthdesk-platform/infra/agentgateway/config.yaml &

# 5. Write sprint results to Letta memory at end of sprint
python3 /home/ubuntu/manus-persistent-drive/scripts/memory.py write sprint_state '{...}'
```

## Deployment

This frontend is a Manus webdev deployment at `citation.is`. Code changes pushed to `main` are **not** automatically deployed — the webdev project must be republished from the Manus UI after each sprint.
