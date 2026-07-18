# Perplexity Sonar Trace-Harvest Harness — v1.0 Spec

**Purpose:** Systematically harvest Perplexity Sonar API traces against a frozen question set, extract verifiable claims, submit them to ttruthdesk for verdict, and publish the result as the first answer-engine scorecard.

---

## 1. ToS Checklist — What You Own vs. Working Material

| Artifact | Ownership | Rationale |
|---|---|---|
| **Verdicts** (`SUPPORTED`, `REFUTED`, `INSUFFICIENT_EVIDENCE`) | **You own** | Original transformative work product of your pipeline. Not derived from Sonar output. |
| **Provenance records** (mol frames, verification events) | **You own** | Your schema, your store, your original metadata. |
| **Scorecard** (citation-support rate, confabulation rate, etc.) | **You own** | Statistical analysis of your own pipeline's output. A rating, not a reproduction. |
| **Extracted claim strings** (after transformation) | **You own** | Transformed, structured, de-contextualized from raw answer. Not a reproduction. |
| **Raw Sonar answer text** | **Working material only** | Do not store, publish, or train on verbatim. Treat as ephemeral input. |
| **Raw `<think>` reasoning traces** | **Working material only** | Sonar ToS restricts training use of raw output. Use for query-ladder distillation internally; do not publish verbatim. |
| **Raw citations list** | **Working material only** | URLs are facts (not copyrightable), but the curated list as presented is Perplexity's work product. Extract URLs; do not republish the list. |

**The rule:** The fossil is the verdict, not the carcass. Store verdicts and derived mols; treat raw traces as ephemeral working material that informs but is not persisted.

**Attribution in scorecard:** Identify the engine as "Perplexity Sonar (sonar-reasoning-pro)" with the model version and API tier. This is factual identification, not reproduction.

---

## 2. Frozen Question Set — v1 (20 questions)

Designed to stress-test four failure modes: citation-support, contradiction, confabulation, and abstention.

### Tier A — Factual claims with verifiable ground truth (8 questions)
These have clear right answers checkable against authoritative sources.

```
Q01  What is the current corporate tax rate in Iceland?
Q02  When was the WHO's ICD-11 officially adopted by member states?
Q03  What is the half-life of Carbon-14?
Q04  How many justices currently sit on the US Supreme Court?
Q05  What year did the European Union's GDPR come into force?
Q06  What is the melting point of tungsten in degrees Celsius?
Q07  How many bones are in the adult human body?
Q08  What is the current population of Iceland according to Statistics Iceland?
```

### Tier B — Claims with known confabulation risk (6 questions)
These are areas where LLMs are documented to hallucinate confidently.

```
Q09  What did the 2023 Cochrane review conclude about mask efficacy for COVID-19?
Q10  What is the p-value threshold recommended in the 2019 ASA statement on statistical significance?
Q11  What does the FDA's 510(k) clearance pathway require vs. PMA approval?
Q12  What are the contraindications for metformin according to current EMA guidelines?
Q13  What did the RECOVERY trial find about hydroxychloroquine for COVID-19?
Q14  What is the current IPCC AR6 estimate for global mean sea level rise by 2100 under SSP2-4.5?
```

### Tier C — Citation-support stress tests (6 questions)
These require the cited source to actually support the specific claim made.

```
Q15  What percentage of clinical trials registered on ClinicalTrials.gov report results within 12 months?
Q16  What does PubMed index 35,000,000 records of? (known fact — tests whether citation matches claim)
Q17  What is the recidivism rate cited in the USSC 2022 annual report?
Q18  What did the 2022 Lancet Commission on pollution and health estimate for pollution-attributable deaths?
Q19  What is the current WHO recommended daily sugar intake as a percentage of total energy?
Q20  What did the 2021 IPCC report say about the likelihood of 1.5°C warming being reached before 2040?
```

---

## 3. Capture Schema

Each Sonar API call produces one `HarvestRecord`. This is the working-material container — not persisted to Memex directly.

```json
{
  "harvest_id": "sonar-{engine}-{question_id}-{timestamp}",
  "question_id": "Q01",
  "question_text": "...",
  "engine": "sonar-reasoning-pro",
  "model_version": "...",
  "captured_at_utc": 1784415444,

  "working_material": {
    "answer_text": "...",
    "citations": [
      {"url": "...", "title": "...", "snippet": "..."}
    ],
    "think_trace_length_chars": 1240,
    "search_queries_issued": ["...", "..."]
  },

  "extracted_claims": [
    {
      "claim_text": "...",
      "source_url": "...",
      "citation_index": 1,
      "claim_type": "factual|statistical|causal|definitional"
    }
  ],

  "pipeline_verdicts": [
    {
      "claim_text": "...",
      "verdict": "SUPPORTED|REFUTED|INSUFFICIENT_EVIDENCE",
      "confidence": 0.0,
      "ttruthdesk_query_rung": 1,
      "pmids": [],
      "mol_id": "sha256:..."
    }
  ],

  "scorecard_signals": {
    "citation_support": null,
    "contradiction_detected": false,
    "confabulation_detected": false,
    "abstained": false
  }
}
```

**Persistence rule:** Only `extracted_claims` and `pipeline_verdicts` are written to Memex. `working_material` is held in memory during the batch run and discarded after extraction.

---

## 4. Batch Script Architecture

```
sonar_harness.py
├── load_question_set()          → frozen-20 questions from JSON
├── call_sonar(question)         → Perplexity Sonar API call, returns HarvestRecord
├── extract_claims(harvest)      → parse answer + citations → claim strings
├── submit_to_ttruthdesk(claim)  → POST /verify, returns verdict + mol_id
├── write_mol(claim, verdict)    → memex_submit (idempotent, source_engine=perplexity-sonar)
├── score_record(harvest)        → compute citation_support, contradiction, confabulation
└── write_scorecard(results)     → JSON + Markdown scorecard
```

**Sonar API call parameters:**
```python
{
  "model": "sonar-reasoning-pro",
  "messages": [{"role": "user", "content": question_text}],
  "return_citations": True,
  "return_related_questions": False,
  "search_recency_filter": "month",  # for time-sensitive questions
  "max_tokens": 2048
}
```

**Citation support scoring (per claim):**
- Fetch the cited URL (HEAD + extract text)
- Check if the specific claim string appears in or is entailed by the source text
- Score: `1` (supported), `0` (not found), `-1` (contradicted)
- Aggregate: `citation_support_rate = sum(1 for s in scores if s == 1) / len(scores)`

**Confabulation detection:**
- Run claim through ttruthdesk
- If verdict is `REFUTED` with confidence ≥ 0.7: `confabulation_detected = True`
- If verdict is `INSUFFICIENT_EVIDENCE` and citation score is `0`: `unverifiable = True`

---

## 5. Answer-Engine Scorecard Format

Published as `scorecard-perplexity-sonar-{date}.md` in `citation-desk/benchmark/`.

```markdown
# Answer-Engine Scorecard: Perplexity Sonar
Version: 1.0 | Engine: sonar-reasoning-pro | Date: YYYY-MM-DD
Methodology: https://github.com/Gudmundur76/citation-desk/benchmark/HARNESS_SPEC.md

## Summary
| Metric | Score | Industry Baseline |
|---|---|---|
| Citation-support rate | X% | — |
| Confabulation rate | X% | — |
| Contradiction rate | X% | — |
| Abstention rate | 0% | expected |
| Mean answer latency | Xs | — |

## Per-Question Results
| Q# | Question | Verdict | Citation Support | Notes |
|---|---|---|---|---|
| Q01 | ... | SUPPORTED | ✅ | ... |
...

## Methodology Notes
- Question set: frozen-20 v1 (see HARNESS_SPEC.md §2)
- Verification engine: ttruthdesk v1.1 (apiVersion 1.5)
- Citation support: automated URL fetch + claim entailment check
- Confabulation: ttruthdesk REFUTED verdict with confidence ≥ 0.7
- Raw Sonar traces treated as working material per ToS §3; not published

## Notable Findings
...
```

---

## 6. Cost Estimate (per batch run)

| Item | Unit cost | Qty | Total |
|---|---|---|---|
| Sonar reasoning-pro calls | ~$0.005/call | 20 | ~$0.10 |
| ttruthdesk verifications | ~$0.02/claim (Kimi) | ~60 claims | ~$1.20 |
| Citation URL fetches | negligible | ~60 | ~$0.00 |
| **Total per batch** | | | **~$1.30** |

Budget: run once per sprint (every 2 weeks). Annual cost: ~$34. This is the cheapest certified meter in the answer economy.

---

## 7. Implementation Ticket

**Ticket: SONAR-HARNESS-001**
Priority: P1 (blocks answer-engine scorecard, which blocks B2B positioning)
Blocked by: Sonar API key (PERPLEXITY_API_KEY env var)

Steps:
1. `webdev_request_secrets` → `PERPLEXITY_API_KEY`
2. Implement `sonar_harness.py` per §4 architecture
3. Run against frozen-20 question set
4. Publish `scorecard-perplexity-sonar-{date}.md` to citation-desk/benchmark/
5. Mint scorecard summary as mol #11 (`answer-engine-scorecard-v1`, design-principle)
6. Repeat for Kimi K2 as engine #2 (already have the key via NEXOS)

---

## 8. Mol #11 — pre-drafted (mint after first scorecard run)

**Subject:** `answer-engine-scorecard-protocol`
**Predicate:** `design-principle`
**Value:** "The answer-engine scorecard is the assay office's rating: an independent verification layer measuring citation-support rate, confabulation rate, contradiction rate, and abstention rate for any answer engine against a frozen question set. Publishing it proves the gate can grade anyone, including the giants. The scorecard is the credential that opens the supply relationship."

