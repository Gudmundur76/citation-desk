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
- [x] Proxy ttruthdesk.claims API through Express server to fix CORS/network issues

## Notifications Feature

- [x] Database schema: notifications table (userId, type, title, body, link, read, createdAt)
- [x] Database schema: pushSubscriptions table (userId, endpoint, p256dh, auth, createdAt)
- [x] Generate and apply DB migration for both tables
- [x] Server: notificationsDb.ts — CRUD helpers for both tables
- [x] Server: pushDispatch.ts — VAPID web-push sender with expired subscription cleanup
- [x] Server: dispatchNotification.ts — central helper (DB insert + push send)
- [x] Server: routers/notifications.ts — tRPC procedures (list, unreadCount, markRead, markAllRead, subscribePush, unsubscribePush)
- [x] Server: ENV helper updated with vapidPublicKey and vapidPrivateKey
- [x] VAPID keys generated and saved as project secrets
- [x] Client: service worker sw.js for push background delivery
- [x] Client: usePushNotifications hook — subscribe/unsubscribe with VAPID
- [x] Client: NotificationBell component — badge, inbox drawer, push toggle
- [x] Client: Nav updated to include NotificationBell
- [x] Wire: Audit page — toast on submit + owner notification
- [x] Wire: Search page — toast on results returned
- [x] All vitest tests pass (4/4)
- [x] TypeScript clean (0 errors)

## Pending / Future Work

- [ ] Write vitest tests for citation API helpers (lib/api.ts)
- [ ] Write vitest tests for CitationCopilot readable context
- [ ] Add tRPC procedure for audit request submission (Audit page form currently client-only)
- [ ] Bind custom domain citation.is / citations.is via Manus Settings → Domains
- [ ] Publish to production via Manus Publish button
- [ ] Disable CopilotKit telemetry (set COPILOTKIT_TELEMETRY_DISABLED=true in env)
- [ ] Tune CopilotKit model — discover available forge model IDs and pick the best one
- [ ] Code-split large chunks (index-DDtaqSWB.js is 3.3 MB) with dynamic imports
- [ ] Wire dispatchNotification to periodic claim-verified events (heartbeat job)
