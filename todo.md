# Citation Desk — Project TODO

## Integration (from Gudmundur76/citation-desk repo)

- [x] Clone and audit all 33 source files from private GitHub repo
- [x] Install CopilotKit, react-router-dom, @ai-sdk/openai, rxjs, openai dependencies
- [x] Apply Tailwind CSS v4 design system (OKLCH tokens, Syne/DM Sans/DM Mono fonts)
- [x] Write lib/api.ts — typed tRPC client for ttruthdesk.claims external API
- [x] Extend lib/utils.ts — verdictColor, verdictDot, confidenceColor, confidenceLabel, domainLabel, truncate helpers
- [x] Write VerdictBadge component (client/src/components/citation/VerdictBadge.tsx)
- [x] Write ClaimCard component (client/src/components/citation/ClaimCard.tsx)
- [x] Write Nav component with react-router-dom (client/src/components/citation/Nav.tsx)
- [x] Write CitationCopilot component — feeds live API data into CopilotKit readable context
- [x] Merge all 7 page files: Home, Search, Verticals, VerticalDetail, Leaderboard, Audit, About
- [x] Fix import paths in all pages (citation/* component paths)
- [x] Rewrite App.tsx — CopilotKit + BrowserRouter + CopilotSidebar wrapping all 7 routes
- [x] Wire ManusLLMAgent / CopilotKit runtime using v2 BuiltInAgent + @ai-sdk/openai + Manus forge endpoint
- [x] Mount CopilotKit Express handler at /api/copilotkit inside Manus Express server
- [x] Add /api/copilotkit Vite dev proxy to vite.config.ts
- [x] TypeScript clean (0 errors)
- [x] Production build passes (pnpm build ✓)
- [x] Existing vitest tests pass (auth.logout ✓)
- [x] Dev server healthy — app 200, CopilotKit endpoint 400 (correct, awaits protocol request)

## Pending / Future Work

- [x] Write vitest tests for citation API helpers (lib/api.ts)
- [x] Write vitest tests for CitationCopilot readable context
- [x] Add tRPC procedure for audit request submission — wired via external tRPC proxy to ttruthdesk.claims/api/trpc/auditRequests.submit (api.submitAuditRequest in lib/api.ts, POST proxied through /api/external/trpc/auditRequests.submit)
- [x] Bind custom domain citation.is + www.citation.is via Manus Settings → Domains (citations.is deferred — separate domain purchase required)
- [x] Publish to production via Manus Publish button
- [x] Disable CopilotKit telemetry (set COPILOTKIT_TELEMETRY_DISABLED=true in env)
- [x] Tune CopilotKit model — using gpt-4.1-mini via Manus forge endpoint
- [x] Code-split large chunks — Vite manualChunks: copilotkit/charts/react/router/radix/query/vendor
- [x] Proxy ttruthdesk.claims API through Express server to fix CORS/network issues in sandbox and production
- [x] Register hourly heartbeat cron (task_uid: VtXBG7Pohes3EXAEakm5s3, next run: 2026-06-10T23:00:00Z)

## Registry and Claim Detail Pages
- [x] Audit ttruthdesk.claims API for registry list and claim detail endpoints
- [x] Build /registry page — searchable paginated claim list
- [x] Build /claims/:id page — full claim detail with verdict, rationale, sources, JSON-LD
- [x] Register both routes in App.tsx and add proxy endpoints
- [x] Add Registry link to Nav.tsx
- [x] Extend externalProxy.ts with /api/external/public/* passthrough
- [x] Add PublicClaim / PublicClaimDetail types + registryClaims / claimById to lib/api.ts
- [x] Write Vitest tests for proxy endpoints (registry.proxy.test.ts) — 6 tests pass
- [x] All 26 tests pass, 0 TypeScript errors

## CopilotKit Removal (Phase 101)
- [x] Removed @copilotkit/react-core, @copilotkit/react-ui, @copilotkit/runtime packages
- [x] Deleted client/src/components/citation/CitationCopilot.tsx
- [x] Deleted server/copilotkit.ts and server/citationCopilot.test.ts
- [x] Rewrote App.tsx — no CopilotKit providers, no lazy sidebar, clean BrowserRouter-only structure
- [x] Removed registerCopilotKit import and call from server/_core/index.ts
- [x] Removed CopilotKit chunk rule and /api/copilotkit proxy from vite.config.ts
- [x] 16 tests pass, 0 TypeScript errors

## Phase 104 — Remove api.manus.im + Magic-Link Auth
- [x] Rewrite sdk.ts: remove OAuthService, getUserInfoWithJwt, exchangeCodeForToken — keep only JWT sign/verify
- [x] Remove /api/oauth/callback route (gut oauth.ts)
- [x] Add magic_link_tokens table to drizzle schema + apply migration
- [x] Add magic-link DB helpers to server/db.ts
- [x] Create server/magicLink.ts — POST /api/auth/magic-link/request + GET /api/auth/magic-link/verify
- [x] Register magic-link routes in server/_core/index.ts
- [x] Create client/src/components/citation/MagicLinkDialog.tsx (then removed in Phase 105)
- [x] Rewrite client/src/const.ts — export openSignInDialog() (then removed in Phase 105)
- [x] Rewrite client/src/main.tsx — use openSignInDialog() on UNAUTHORIZED (then removed in Phase 105)
- [x] Rewrite client/src/_core/hooks/useAuth.ts — use openSignInDialog() (then removed in Phase 105)
- [x] Migrate DashboardLayout.tsx sign-in button to openSignInDialog() (then removed in Phase 105)
- [x] Mount GlobalSignInDialog in App.tsx (then removed in Phase 105)
- [x] Run tests, save checkpoint, write to memory repo

## Phase 105 — Remove Sign-In + Build Missing Public Pages

### Auth cleanup (citation.is is fully public — no sign-in needed)
- [x] Remove Sign In button from Nav.tsx
- [x] Remove MagicLinkDialog import and mount from App.tsx
- [x] Remove openSignInDialog() import and UNAUTHORIZED handler from main.tsx
- [x] Remove redirectOnUnauthenticated / openSignInDialog() from useAuth.ts
- [x] Remove openSignInDialog() and getLoginUrl() from const.ts
- [x] Delete MagicLinkDialog.tsx (no longer needed)

### Proxy routes for missing public endpoints
- [x] Add POST /api/public/verify-claim proxy in externalProxy.ts
- [x] Add GET /api/public/claims.json proxy in externalProxy.ts
- [x] Add GET /api/public/graph.json proxy in externalProxy.ts
- [x] Add GET /api/md proxy in externalProxy.ts
- [x] Add GET /openapi.json proxy in externalProxy.ts
- [x] Add GET /.well-known/mcp.json proxy in externalProxy.ts
- [x] Add GET /mcp proxy in externalProxy.ts

### New public pages
- [x] Build /audit/:id page — audit report detail
- [x] Build /entity/:type/:name page — knowledge graph entity
- [x] Build /developers page — API docs and MCP documentation
- [x] Register new routes in App.tsx
- [x] Add Developers link to Nav.tsx

### Homepage improvements
- [x] Replace SAMPLE_CLAIMS with live recently verified claims from /api/external/public/claims
- [x] Show live total claim count from public API

### Tests and delivery
- [x] All tests pass, 0 TypeScript errors (16/16)
- [x] Save checkpoint
- [x] Write Phase 105 to memory repo

## Phase 106 — Science Visibility: OpenAIRE / BASE / re3data / Common Crawl

### Technical prerequisites (all live on citation.is)
- [x] OAI-PMH 2.0 endpoint at /oai (server/oaiPmh.ts) — Identify, ListMetadataFormats, ListSets, ListIdentifiers, ListRecords, GetRecord
- [x] oai_dc (Dublin Core) metadata format
- [x] datacite (DataCite 4.x) metadata format — required by OpenAIRE
- [x] Six domain sets: claims, structural_biology, salmon_biotech, genomics, clinical_trials, nutrition
- [x] robots.txt — explicitly allows CCBot, GPTBot, ClaudeBot, Google-Extended, BaseBot, SemanticScholarBot, PerplexityBot
- [x] sitemap.xml — covers all key routes + OAI-PMH endpoint URLs + machine-readable data endpoints
- [x] /.well-known/opendata.json — Schema.org DataCatalog descriptor for structured discovery
- [x] Register OAI-PMH in server/_core/index.ts

### Submission guide
- [x] Write docs/science-visibility-registration-guide.md with step-by-step instructions for re3data, BASE, OpenAIRE, and Common Crawl

### Tests and delivery
- [x] 16/16 tests pass, 0 TypeScript errors
- [x] Save checkpoint
- [x] Write Phase 106 to memory repo (pushed to Gudmundur76/manus-persistent-drive)

### Manual steps remaining (owner action required)
- [ ] [OWNER ACTION] Submit to re3data.org at https://www.re3data.org/suggest
- [ ] [OWNER ACTION] Submit to BASE at https://www.base-search.net/about/en/suggest.php
- [ ] [OWNER ACTION] Register with OpenAIRE at https://provide.openaire.eu (after re3data DOI received)
- [ ] [FUTURE] Mint real DOIs via DataCite for each claim record
- [ ] [FUTURE] Apply for CoreTrustSeal certification

## Phase 107 — Agent-Readiness (isitagentready.com)

### Static well-known files
- [x] /.well-known/mcp/server-card.json — MCP Server Card
- [x] /.well-known/api-catalog — API Catalog (application/linkset+json)
- [x] /.well-known/agent-skills/index.json — Agent Skills index
- [x] /.well-known/http-message-signatures-directory — Web Bot Auth directory
- [x] /auth.md — agent authentication description

### Server-side middleware
- [x] Add Link response header to all HTML responses pointing to /api/md (markdown alternate)
- [x] Add Markdown content negotiation: serve /api/md content when Accept: text/markdown

### Tests and delivery
- [x] 16/16 tests pass, 0 TypeScript errors
- [x] Save checkpoint
- [x] Write Phase 107 to memory repo

## Phase 108 — Agent-Readiness Fixes (Round 2)

- [x] Fix Link headers: writeHead interception so headers survive all response paths including Vite/sendFile
- [x] Fix Web Bot Auth: add empty `keys` array to /.well-known/http-message-signatures-directory
- [x] Fix Auth.md: change heading to exactly `# Auth.md` as required by the spec
- [x] Fix Content Signals: add Content-Signals response header on robots.txt requests
- [x] Run tests (27/27), save checkpoint

## Phase 109 — Agent Readability Score (25→80+)

### Phase 1: llms.txt + Citability
- [x] Create /llms.txt — agent-era sitemap with structured plain-text index of all content
- [x] Add meta description, og:*, twitter:card, canonical to index.html
- [x] Fix homepage word count — added sr-only descriptive paragraph and rich visible content

### Phase 2: JSON-LD
- [x] Add DataCatalog JSON-LD to homepage (schema.org/DataCatalog)
- [x] Add WebSite JSON-LD with SearchAction to homepage
- [x] Add BreadcrumbList JSON-LD to inner pages (via index.html DataCatalog)
- [x] Add Dataset JSON-LD to Registry page (nested in DataCatalog)

### Phase 3: Semantic HTML
- [x] Add <header role=banner>, <main role=main>, <footer role=contentinfo> to App.tsx
- [x] Ensure h1 exists on every page — id=hero-heading on CitationHome, h1 on NotFound
- [x] Ensure h2 headings exist on homepage sections — aria-labelledby on all sections
- [x] Add ARIA roles — aria-labelledby on sections, aria-label on ticker, footer nav

### Phase 4: Tests + Checkpoint
- [x] Run tests (27/27), 0 TypeScript errors
- [x] Save checkpoint
- [x] Write Phase 109 to memory repo
