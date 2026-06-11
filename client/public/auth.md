# Auth.md

> citation.is — Agent Authentication Guide

**No authentication required.** citation.is is a fully open scientific data registry. All endpoints are publicly accessible without API keys, tokens, or registration.

## Access Policy

All agents, crawlers, and automated systems are welcome to access citation.is. The site is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), which means you may freely use, redistribute, and build upon the data with attribution.

## Available Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/external/public/claims` | GET | Search and list verified claims |
| `/api/public/claims.json` | GET | Full claims registry export |
| `/api/public/graph.json` | GET | Knowledge graph export |
| `/api/public/verify-claim` | POST | Submit a claim for verification |
| `/api/md` | GET | Markdown summary for LLM grounding |
| `/oai` | GET | OAI-PMH 2.0 harvesting endpoint |
| `/mcp` | GET | MCP endpoint |
| `/openapi.json` | GET | OpenAPI 3.0 specification |

## Rate Limits

There are no enforced rate limits for reasonable use. If you are running a bulk harvest, please use the OAI-PMH endpoint (`/oai?verb=ListRecords&metadataPrefix=oai_dc`) which is optimised for batch access.

## Attribution

When using data from citation.is, please attribute as:

> citation.is — Verified Scientific Claims Registry. https://citation.is. CC BY 4.0.

## Contact

For questions or to report issues: admin@citation.is
