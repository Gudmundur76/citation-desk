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

## CopilotKit Blank Page Fix + OAuth Migration (Phase 100)
- [x] Lazy-load CopilotSidebar in App.tsx via React.lazy() + Suspense — breaks 3.5MB sync bundle
- [x] Add magic_link_tokens table to drizzle/schema.ts + migration applied to production DB
- [x] Add magic-link DB helpers to server/db.ts (create, findValid, markUsed, countRecent)
- [x] Create server/magicLink.ts — POST /api/auth/magic-link/request + GET /api/auth/magic-link/verify
- [x] Register magic-link routes in server/_core/index.ts
- [x] Create client/src/components/citation/MagicLinkDialog.tsx
- [x] Rewrite client/src/const.ts — deprecate getLoginUrl(), export openSignInDialog()
- [x] Rewrite client/src/main.tsx — use openSignInDialog() on UNAUTHORIZED instead of redirect
- [x] Rewrite client/src/_core/hooks/useAuth.ts — use openSignInDialog() on redirectOnUnauthenticated
- [x] Migrate DashboardLayout.tsx sign-in button to openSignInDialog()
- [x] Remove unused getLoginUrl import from Home.tsx
- [x] Mount GlobalSignInDialog in App.tsx (listens for td:open-sign-in CustomEvent)
- [x] 8 new magic-link tests pass (34 total, 0 TypeScript errors)
- [ ] Save checkpoint and push to memory repo
