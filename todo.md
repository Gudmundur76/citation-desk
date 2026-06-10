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
- [ ] Add tRPC procedure for audit request submission (Audit page form currently client-only) — deferred
- [x] Bind custom domain citation.is + www.citation.is via Manus Settings → Domains (citations.is deferred — separate domain purchase required)
- [x] Publish to production via Manus Publish button
- [x] Disable CopilotKit telemetry (set COPILOTKIT_TELEMETRY_DISABLED=true in env)
- [x] Tune CopilotKit model — using gpt-4.1-mini via Manus forge endpoint
- [x] Code-split large chunks — Vite manualChunks: copilotkit/charts/react/router/radix/query/vendor
- [x] Proxy ttruthdesk.claims API through Express server to fix CORS/network issues in sandbox and production
