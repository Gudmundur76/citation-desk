# citation.is Frontend

This file provides persistent context for autonomous agents (Manus, goose, etc.) working on this repository.

## Architecture
- **Role:** Public product surface, developer documentation, MCP discovery layer.
- **Backend:** ttruthdesk-platform (proxied via `/api/*` and `/mcp`).
- **Stack:** React, Vite, Tailwind CSS, tRPC client.

## Key Pages
- `Verify.tsx`: Main user-facing verification interface.
- `DevelopersMcp.tsx`: Enterprise integration hub. Documents one-click setup, Live Routing, and Autonomous Ingestion.

## Proxy Configuration (`server/externalProxy.ts`)
- Routes `/api/*` to upstream backend.
- Routes `/mcp` and `/.well-known/mcp.json` to upstream backend.

## Development Rules
- Do not add backend logic here. This is a pure frontend + proxy layer.
- Run `pnpm check` to verify TypeScript.
- Run `npx vitest run` to verify tests.
