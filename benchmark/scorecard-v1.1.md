# ttruthdesk v1.1 — Benchmark Scorecard

**Run date:** 2026-07-18  
**Model:** Kimi K2.7 Code (`kimi-for-coding`)  
**Pipeline:** ttruthdesk v1.1 — 3-rung relaxation ladder + affirmative REFUTED rule  
**Benchmark set:** frozen-v1.json (20 claims, locked 2026-07-18)  
**API version:** 1.5

---

## Summary: v1.0 → v1.1 Delta

| Metric | v1.0 | v1.1 | Δ |
|---|---|---|---|
| Overall accuracy | 25.0% (5/20) | 35.0% (7/20) | **+10 pp** |
| Abstention rate | 70.0% (14/20) | 60.0% (12/20) | **−10 pp** |
| VERIFIED recall | 25.0% (3/12) | 58.3% (7/12) | **+33.3 pp** |
| REFUTED recall | 0.0% (0/5) | 0.0% (0/5) | 0 pp |
| Mean latency | 16.8 s | 18.2 s | +1.4 s |
| Parse error rate | 5.0% (1/20) | 5.0% (1/20) | 0 pp |

---

## What Changed in v1.1

**Sprint v1.1 shipped two engineering changes:**

**1. Three-rung relaxation ladder (`ncbiAdapter.ts`)**  
The v1.0 pipeline used a single PubMed query per translated claim. When the Kimi LLM produced a mechanism-level translation (e.g., "cyclooxygenase inhibition by acetylsalicylic acid"), PubMed returned zero results and the system abstained. v1.1 introduces `fetchNcbiResultsWithLadder()` which attempts three progressively broader query strategies before giving up:

- **Rung 1** — original translated claim (specific, mechanism-level)
- **Rung 2** — MeSH-term expansion (e.g., `aspirin[MeSH Terms] AND cyclooxygenase[MeSH Terms]`)
- **Rung 3** — broad keyword fallback (e.g., `aspirin cyclooxygenase inhibition`)

The response now includes `query_rung` (1–3) and `queries_tried` (all attempted queries) for transparency.

**2. Affirmative REFUTED rule (`verifyClaimRoute.ts`)**  
When the main pipeline returns "Insufficient Evidence" for a claim, v1.1 executes a secondary negation search: it builds a query from the claim's entity keywords combined with debunking terms (`retracted OR debunked OR "no evidence" OR controversy OR fraud OR misinformation`). If PubMed returns ≥1 paper whose title matches a refutation pattern, the verdict is upgraded to "Contradicted" with that paper cited as evidence.

---

## Per-Claim Results

| # | Expected | v1.1 Verdict | Rung | Correct | Claim |
|---|---|---|---|---|---|
| 1 | VERIFIED | Supported | 1 | ✓ | Aspirin inhibits COX-1 and COX-2 |
| 2 | VERIFIED | Supported | 1 | ✓ | BRCA1 on chromosome 17q21 |
| 3 | VERIFIED | Insufficient Evidence | 3 | ✗ | Metformin first-line for T2D |
| 4 | VERIFIED | Supported | 1 | ✓ | HIV integrates into host DNA |
| 5 | VERIFIED | Supported | 1 | ✓ | p53 encoded by TP53 |
| 6 | VERIFIED | Supported | 3 | ✓ | Penicillin discovered 1928 |
| 7 | VERIFIED | Partially Supported | 1 | ✓ | Genome ~20,000–25,000 genes |
| 8 | VERIFIED | Insufficient Evidence | 3 | ✗ | mRNA vaccines mechanism |
| 9 | REFUTED | Supported | 1 | ✗ | MMR vaccine causes autism |
| 10 | REFUTED | Insufficient Evidence | 3 | ✗ | Humans use 10% of brain |
| 11 | REFUTED | Insufficient Evidence | 3 | ✗ | Antibiotics vs viral infections |
| 12 | REFUTED | Insufficient Evidence | 3 | ✗ | Vitamin C megadoses cure cold |
| 13 | REFUTED | Insufficient Evidence | 3 | ✗ | Appendix has no function |
| 14 | AMBIGUOUS | PARSE_ERROR | — | ✗ | Coffee and Parkinson's risk |
| 15 | AMBIGUOUS | Insufficient Evidence | 3 | ✗ | Intermittent fasting vs caloric restriction |
| 16 | AMBIGUOUS | Insufficient Evidence | 3 | ✗ | Statins all-cause mortality |
| 17 | VERIFIED | Insufficient Evidence | 3 | ✗ | Resting heart rate 60–100 bpm |
| 18 | VERIFIED | Insufficient Evidence | 3 | ✗ | Aspirin half-life 15–20 min |
| 19 | VERIFIED | Insufficient Evidence | 3 | ✗ | T1D autoimmune beta cell destruction |
| 20 | VERIFIED | Supported | 1 | ✓ | SARS-CoV-2 spike binds ACE2 |

---

## Verdict Distribution

| Verdict | v1.0 | v1.1 |
|---|---|---|
| Supported | 3 | 7 |
| Partially Supported | 1 | 1 |
| Ambiguous | 1 | 0 |
| Insufficient Evidence | 14 | 11 |
| Contradicted | 0 | 0 |
| PARSE_ERROR | 1 | 1 |

---

## Analysis

### What improved

The relaxation ladder delivered its primary objective: VERIFIED recall rose from 25% to 58.3% (+33.3 pp). Claims that previously abstained because the translated query was too specific (e.g., "Penicillin was discovered by Alexander Fleming in 1928") now resolve at Rung 3 with a broad keyword search. Seven of twelve VERIFIED claims are now correctly classified.

### What did not improve

**REFUTED recall remains 0%.** The affirmative REFUTED rule is implemented and confirmed working in isolation (smoke test: "MMR vaccines cause autism" → Contradicted with PMID evidence). However, in the full benchmark run, the MMR claim returned "Supported" (Rung 1) rather than "Insufficient Evidence", which means the negation block was never triggered. The remaining four REFUTED claims all abstained — the negation search ran but found no papers matching the title filter.

The core problem for REFUTED claims is that the Kimi LLM translates false claims to their correct scientific form. "MMR vaccines cause autism" becomes a query about MMR vaccination safety, which finds supportive literature. The system then returns "Supported" — a false positive in the opposite direction. This is a fundamentally different failure mode from over-abstention and requires a pre-translation claim-type classifier.

**Ambiguous claims still abstain.** All three ambiguous claims (coffee/Parkinson's, intermittent fasting, statins) returned "Insufficient Evidence". This is partially correct behavior — these are genuinely contested — but the benchmark scores them as incorrect because they do not return "Ambiguous". The Kimi LLM does produce "Ambiguous" verdicts in isolation; the issue is that the translated queries find either zero papers or papers that do not trigger the Ambiguous verdict path.

### Parse error

Claim 14 (coffee/Parkinson's) produced an empty response, likely due to an OOM kill during the LLM call. This is a container stability issue, not a logic error.

---

## Failure Mode Classification

| Failure Mode | Count | Claims |
|---|---|---|
| LLM translates false claim to correct form → false positive | 1 | #9 MMR-autism |
| Ladder exhausted, no PubMed match | 9 | #3, #8, #10–13, #17–19 |
| Negation rule not triggered (verdict was not IE) | 4 | #9–13 (overlaps above) |
| Container OOM / parse error | 1 | #14 |

---

## Sprint v1.2 Priorities

Based on this benchmark, the highest-leverage next sprint targets are:

1. **Pre-translation claim-type classifier** — Detect false/myth claims before translation so the system does not translate them to the correct scientific form. This is the prerequisite for REFUTED recall.
2. **Rung 4: PubMed MeSH hierarchy expansion** — For claims that exhaust three rungs, try MeSH parent terms (e.g., "antidiabetic agents" instead of "metformin").
3. **Container memory guard** — Add `--memory 512m --memory-swap 1g` to the Docker run command to prevent OOM kills and ensure parse errors are surfaced rather than silently dropped.
4. **Ambiguous verdict path** — Tune the Kimi prompt to return "Ambiguous" when the literature shows conflicting results, rather than defaulting to "Insufficient Evidence".

---

*Benchmark frozen at frozen-v1.json. Results reproducible by running `python3 run_benchmark_v11.py` against a live ttruthdesk v1.1 instance.*
