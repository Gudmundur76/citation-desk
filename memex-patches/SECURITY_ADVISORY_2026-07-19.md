# Memex Security Advisory — 2026-07-19

## Summary
Three P0 unauthenticated write endpoints were discovered and patched.

## Affected Endpoints
| Endpoint | Issue | Fix |
|---|---|---|
| `POST /v1/admin/keys` | No auth — anyone could mint API keys | Gated behind `x-internal-secret` header |
| `POST /v1/claim/verify` | No auth — anyone could forge verdicts | Gated behind API key auth |
| `POST /v1/claim/frame` | No auth — anyone could write frames | Gated behind API key auth |

## Exposure Window
- `/v1/admin/keys`: 1 confirmed external mint (IP: 102.216.51.165, 101.200.132.59)
- `/v1/claim/verify`: 10 confirmed external calls (IPs: 37.212.13.52, 41.201.77.62, 160.177.5.249)
- Exposure window: from deployment until 2026-07-19 patch

## Forensic Findings
- All `verified_by` entries in production feed accounted for: `cowork` ×7, `manus-cowork` ×5
- No foreign verdicts found in `citation-is` namespace
- Probe key from external auditor (37.212.13.52) revoked
- All pre-patch keys rotated as precaution

## Response Actions
1. All three endpoints patched and deployed
2. All pre-patch API keys revoked
3. New production key issued via now-gated admin endpoint
4. Wire-verified: all three attack paths return 401/403 without auth
5. Audit mol minted to trust store

## Disclosure
Discovered by external security audit (Kimi cowork session 2026-07-19).
Fixed by Manus agent in same session.
