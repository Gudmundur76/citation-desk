# Science Visibility Registration Guide — citation.is

**Date:** 2026-06-11  
**Status:** Ready to submit — all technical prerequisites are live on citation.is

---

## Overview

This guide covers the three registrations that will place citation.is inside the scholarly discovery infrastructure used by researchers, funders, and LLM training pipelines worldwide. All technical prerequisites have been added to the site in Phase 106. Common Crawl requires no action — `CCBot` is now explicitly allowed in `robots.txt` and will pick up the site on its next monthly crawl.

| Registry | What it unlocks | Technical prerequisite | Effort |
|---|---|---|---|
| **re3data.org** | Indexed as a research data repository; prerequisite for OpenAIRE | Public URL + open access data + clear terms of use | ~30 min form |
| **BASE** | Indexed in 400M+ academic record search engine used by libraries worldwide | OAI-PMH endpoint at `/oai` | ~15 min form |
| **OpenAIRE** | Integrated into the European Open Science Cloud (EOSC) Research Graph | re3data registration first, then OAI-PMH with DataCite metadata | ~20 min form |
| **Common Crawl** | Feeds most LLM training corpora (GPT, Claude, Gemini, Llama) | `CCBot` allowed in `robots.txt` | **Already done** |

---

## What Was Added to citation.is

The following technical assets are now live and ready for harvesters:

### 1. OAI-PMH 2.0 Endpoint — `https://citation.is/oai`

The endpoint implements all six required OAI-PMH verbs and exposes two metadata formats:

| Verb | URL | Purpose |
|---|---|---|
| `Identify` | `/oai?verb=Identify` | Repository identity card for harvesters |
| `ListMetadataFormats` | `/oai?verb=ListMetadataFormats` | Declares `oai_dc` and `datacite` |
| `ListSets` | `/oai?verb=ListSets` | Six domain sets (structural_biology, salmon_biotech, etc.) |
| `ListIdentifiers` | `/oai?verb=ListIdentifiers&metadataPrefix=oai_dc` | Claim identifiers for incremental harvesting |
| `ListRecords` | `/oai?verb=ListRecords&metadataPrefix=oai_dc` | Full Dublin Core records |
| `ListRecords` | `/oai?verb=ListRecords&metadataPrefix=datacite` | Full DataCite 4.x records (required by OpenAIRE) |
| `GetRecord` | `/oai?verb=GetRecord&identifier=oai:citation.is:claim.300002&metadataPrefix=oai_dc` | Single record by OAI identifier |

Each claim is assigned a persistent OAI identifier of the form `oai:citation.is:claim.<id>`.

### 2. robots.txt — `https://citation.is/robots.txt`

Explicitly allows CCBot, GPTBot, ClaudeBot, Google-Extended, PerplexityBot, BaseBot, SemanticScholarBot, and all other academic and AI crawlers. Points to `sitemap.xml`.

### 3. sitemap.xml — `https://citation.is/sitemap.xml`

Covers all key routes including the OAI-PMH endpoint URLs, the machine-readable data endpoints (`claims.json`, `graph.json`), and the developer documentation page.

### 4. Dataset Descriptor — `https://citation.is/.well-known/opendata.json`

A Schema.org `DataCatalog` JSON-LD descriptor listing all distribution formats, the OAI-PMH endpoint, the REST API, and the MCP endpoint. Used by search engines and data aggregators for structured discovery.

---

## Registration Steps

### Step 1 — re3data.org (do this first)

re3data is a prerequisite for OpenAIRE registration.

1. Go to **https://www.re3data.org/suggest**
2. Fill in the suggestion form with the following values:

| Field | Value |
|---|---|
| Repository name | citation.is — Verified Scientific Claims Registry |
| Repository URL | https://citation.is |
| Repository type | Disciplinary |
| Subject area | Life Sciences → Biochemistry, Molecular Biology |
| Content type | Scientific and statistical data formats |
| Data access | Open |
| Data upload | Closed (read-only registry) |
| Persistent identifier | URL (claim page URLs are stable) |
| License | CC BY 4.0 |
| Institution | citation.is |
| Description | A public registry of verified scientific claims from structural biology, salmon biotechnology, genomics, and related life-science domains. Each claim is cross-referenced against authoritative databases (PDB, UniProt, NCBI, PubMed) by the Protein Truth Desk pipeline. Machine-readable exports available via REST API, OAI-PMH, and JSON-LD. |

3. Submit. The re3data team reviews submissions manually; expect 2–4 weeks for indexing.
4. **Save the re3data DOI** assigned to the repository record — you will need it for the OpenAIRE registration form.

---

### Step 2 — BASE (Bielefeld Academic Search Engine)

BASE harvests via OAI-PMH. The endpoint at `https://citation.is/oai` is ready.

1. Go to **https://www.base-search.net/about/en/suggest.php**
2. Fill in the suggestion form:

| Field | Value |
|---|---|
| Repository name | citation.is — Verified Scientific Claims Registry |
| OAI base URL | https://citation.is/oai |
| Contact email | admin@citation.is |
| Description | Verified scientific claims registry with OAI-PMH 2.0 endpoint exposing Dublin Core and DataCite metadata for 3,900+ claims across structural biology, salmon biotechnology, and genomics. CC BY 4.0. |
| Subject | Life Sciences |

3. BASE staff will validate the OAI-PMH endpoint manually. You can pre-validate by running:

```bash
curl "https://citation.is/oai?verb=Identify"
curl "https://citation.is/oai?verb=ListRecords&metadataPrefix=oai_dc"
```

4. Expect indexing within 2–6 weeks of approval.

---

### Step 3 — OpenAIRE (do after re3data)

OpenAIRE requires the repository to be registered in re3data first.

1. Go to **https://provide.openaire.eu** and sign in (ORCID or institutional login).
2. Click **Register a new data source**.
3. Select **Data Repository** as the source type.
4. Fill in the registration form:

| Field | Value |
|---|---|
| Name | citation.is — Verified Scientific Claims Registry |
| URL | https://citation.is |
| OAI-PMH base URL | https://citation.is/oai |
| Metadata prefix | `datacite` (primary) and `oai_dc` (secondary) |
| re3data ID | *(paste the DOI from Step 1)* |
| Access | Open Access |
| License | CC BY 4.0 |
| Research subject | Life Sciences |
| Description | (same as re3data) |

5. Click **Validate** — OpenAIRE will test the OAI-PMH endpoint automatically. The validator checks:
   - `Identify` response is well-formed
   - `ListRecords?metadataPrefix=datacite` returns valid DataCite 4.x XML
   - Each record has a `<identifier>`, `<title>`, `<creator>`, `<publicationYear>`, and `<rights>` element
6. If validation passes, click **Register**. OpenAIRE will begin harvesting on its next cycle (typically weekly).

---

### Step 4 — Common Crawl (no action required)

`CCBot` is now explicitly allowed in `robots.txt`. Common Crawl runs monthly crawls; citation.is will be picked up automatically. The `sitemap.xml` and `/.well-known/opendata.json` descriptor further improve crawl quality and structured data extraction.

To verify after the next crawl cycle, search Common Crawl's index:

```bash
curl "https://index.commoncrawl.org/CC-MAIN-2026-24-index?url=citation.is/*&output=json" | head -20
```

---

## Validation Checklist

Before submitting to any registry, confirm these endpoints return valid responses:

```bash
# OAI-PMH identity
curl "https://citation.is/oai?verb=Identify"

# Dublin Core records
curl "https://citation.is/oai?verb=ListRecords&metadataPrefix=oai_dc"

# DataCite records (required for OpenAIRE)
curl "https://citation.is/oai?verb=ListRecords&metadataPrefix=datacite"

# Dataset descriptor
curl "https://citation.is/.well-known/opendata.json"

# robots.txt
curl "https://citation.is/robots.txt"

# Sitemap
curl "https://citation.is/sitemap.xml"

# Machine-readable claims export
curl "https://citation.is/api/public/claims.json"
```

---

## Future Improvements

The following would further strengthen the registry's academic standing and are recommended for Phase 107 or later:

**Mint real DOIs via DataCite.** The current DataCite records use placeholder DOIs (`10.0000/citation.is.claim.*`). Registering with DataCite (free for open repositories) and minting real DOIs would make each claim independently citable and resolvable via `https://doi.org/...`. This is the single highest-leverage improvement for academic credibility.

**Apply for CoreTrustSeal certification.** CoreTrustSeal is the standard certification for trustworthy research data repositories. re3data and OpenAIRE both display certification badges. The application requires a self-assessment against 16 requirements; most are already met by citation.is (open access, CC BY 4.0, stable URLs, documented methodology).

**Add `<dc:relation>` links to PubMed / DOI.** Where a claim's source document has a PubMed ID or DOI, adding it as a `<dc:relation>` in the OAI-PMH record creates a direct link in the OpenAIRE Research Graph between the claim and the publication.

**Register with Zenodo as a community.** Zenodo (CERN) allows creating open communities. Registering citation.is as a Zenodo community would allow researchers to deposit related datasets and have them automatically linked to the registry.

---

*Generated by Manus AI — Phase 106 — 2026-06-11*
