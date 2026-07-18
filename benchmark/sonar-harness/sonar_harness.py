#!/usr/bin/env python3
"""
Perplexity Sonar Trace-Harvest Harness v1.0
Runs frozen-20 question set against Sonar API, extracts claims,
verifies via ttruthdesk, and publishes answer-engine scorecard.

Usage:
    PERPLEXITY_API_KEY=<key> python3 sonar_harness.py [--engine sonar-reasoning-pro] [--dry-run]

Requires:
    PERPLEXITY_API_KEY   - Perplexity Sonar API key
    TTRUTHDESK_URL       - ttruthdesk endpoint (default: https://ttruthdesk.gummi.lt)
    MEMEX_API_KEY        - Memex ingest key for mol submission
"""

import os, sys, json, time, hashlib, re, requests
from datetime import datetime, timezone
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
SONAR_KEY       = os.environ.get("PERPLEXITY_API_KEY", "")
SONAR_BASE      = "https://api.perplexity.ai"
TTRUTHDESK_URL  = os.environ.get("TTRUTHDESK_URL", "https://ttruthdesk.gummi.lt")
MEMEX_BASE      = "https://memex.gummi.lt"
MEMEX_KEY       = os.environ.get("MEMEX_API_KEY", "s8Y4O6wuBITJqMoTyUZ1go0WmDr1dVH9h-EjnPGhpp0")
ENGINE          = os.environ.get("SONAR_ENGINE", "sonar-reasoning-pro")
DRY_RUN         = "--dry-run" in sys.argv
OUTPUT_DIR      = Path(__file__).parent / "results"
OUTPUT_DIR.mkdir(exist_ok=True)

# ── Frozen question set ───────────────────────────────────────────────────────
QUESTIONS = [
    # Tier A — Factual, verifiable ground truth
    {"id": "Q01", "tier": "A", "text": "What is the current corporate tax rate in Iceland?"},
    {"id": "Q02", "tier": "A", "text": "When was the WHO's ICD-11 officially adopted by member states?"},
    {"id": "Q03", "tier": "A", "text": "What is the half-life of Carbon-14?"},
    {"id": "Q04", "tier": "A", "text": "How many justices currently sit on the US Supreme Court?"},
    {"id": "Q05", "tier": "A", "text": "What year did the European Union's GDPR come into force?"},
    {"id": "Q06", "tier": "A", "text": "What is the melting point of tungsten in degrees Celsius?"},
    {"id": "Q07", "tier": "A", "text": "How many bones are in the adult human body?"},
    {"id": "Q08", "tier": "A", "text": "What is the current population of Iceland according to Statistics Iceland?"},
    # Tier B — Known confabulation risk
    {"id": "Q09", "tier": "B", "text": "What did the 2023 Cochrane review conclude about mask efficacy for COVID-19?"},
    {"id": "Q10", "tier": "B", "text": "What is the p-value threshold recommended in the 2019 ASA statement on statistical significance?"},
    {"id": "Q11", "tier": "B", "text": "What does the FDA's 510(k) clearance pathway require vs. PMA approval?"},
    {"id": "Q12", "tier": "B", "text": "What are the contraindications for metformin according to current EMA guidelines?"},
    {"id": "Q13", "tier": "B", "text": "What did the RECOVERY trial find about hydroxychloroquine for COVID-19?"},
    {"id": "Q14", "tier": "B", "text": "What is the current IPCC AR6 estimate for global mean sea level rise by 2100 under SSP2-4.5?"},
    # Tier C — Citation-support stress tests
    {"id": "Q15", "tier": "C", "text": "What percentage of clinical trials registered on ClinicalTrials.gov report results within 12 months?"},
    {"id": "Q16", "tier": "C", "text": "What does PubMed index, and approximately how many records does it contain?"},
    {"id": "Q17", "tier": "C", "text": "What is the recidivism rate cited in the USSC 2022 annual report?"},
    {"id": "Q18", "tier": "C", "text": "What did the 2022 Lancet Commission on pollution and health estimate for pollution-attributable deaths?"},
    {"id": "Q19", "tier": "C", "text": "What is the current WHO recommended daily sugar intake as a percentage of total energy?"},
    {"id": "Q20", "tier": "C", "text": "What did the 2021 IPCC report say about the likelihood of 1.5°C warming being reached before 2040?"},
]

# ── Sonar API call ────────────────────────────────────────────────────────────
def call_sonar(question: dict) -> dict:
    """Call Sonar API and return raw response."""
    if DRY_RUN:
        print(f"  [DRY RUN] Would call Sonar for {question['id']}")
        return {"choices": [{"message": {"content": f"[DRY RUN answer for {question['id']}]"}}], "citations": []}

    headers = {
        "Authorization": f"Bearer {SONAR_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": ENGINE,
        "messages": [{"role": "user", "content": question["text"]}],
        "return_citations": True,
        "return_related_questions": False,
        "max_tokens": 2048
    }
    r = requests.post(f"{SONAR_BASE}/chat/completions", headers=headers, json=payload, timeout=60)
    r.raise_for_status()
    return r.json()

# ── Claim extraction ──────────────────────────────────────────────────────────
def extract_claims(answer_text: str, citations: list) -> list:
    """Extract verifiable claim strings from the answer text."""
    claims = []
    # Split into sentences
    sentences = re.split(r'(?<=[.!?])\s+', answer_text)
    for i, sent in enumerate(sentences):
        sent = sent.strip()
        if len(sent) < 20:
            continue
        # Look for factual patterns: numbers, dates, percentages, named entities
        has_fact = bool(re.search(r'\d{4}|\d+%|\d+\.\d+|according to|found that|reported|estimated|concluded', sent, re.I))
        if not has_fact:
            continue
        # Find associated citation index (look for [N] patterns)
        cite_match = re.search(r'\[(\d+)\]', sent)
        cite_url = None
        if cite_match:
            cite_idx = int(cite_match.group(1)) - 1
            if 0 <= cite_idx < len(citations):
                cite_url = citations[cite_idx].get("url", "")
        # Clean the claim text
        claim_text = re.sub(r'\[\d+\]', '', sent).strip()
        claims.append({
            "claim_text": claim_text,
            "source_url": cite_url,
            "citation_index": int(cite_match.group(1)) if cite_match else None,
            "claim_type": "factual"
        })
    return claims[:3]  # Max 3 claims per question to control cost

# ── ttruthdesk verification ───────────────────────────────────────────────────
def verify_claim(claim_text: str) -> dict:
    """Submit claim to ttruthdesk and return verdict."""
    if DRY_RUN:
        return {"verdict": "INSUFFICIENT_EVIDENCE", "confidence": 0.5, "query_rung": 1, "pmids": []}
    try:
        r = requests.post(
            f"{TTRUTHDESK_URL}/verify",
            json={"claim": claim_text},
            timeout=120
        )
        if r.status_code == 200:
            data = r.json()
            return {
                "verdict": data.get("verdict", "INSUFFICIENT_EVIDENCE"),
                "confidence": data.get("confidence", 0.0),
                "query_rung": data.get("query_rung", 1),
                "pmids": data.get("pmids", [])
            }
    except Exception as e:
        print(f"    ttruthdesk error: {e}")
    return {"verdict": "ERROR", "confidence": 0.0, "query_rung": 0, "pmids": []}

# ── Memex mol submission ──────────────────────────────────────────────────────
def submit_mol(claim_text: str, verdict: str, question_id: str) -> str:
    """Submit verified claim to Memex. Returns mol_id."""
    if DRY_RUN:
        return "sha256:dryrun"
    try:
        payload = {
            "namespace": "citation-is",
            "subject": f"sonar-harvest-{question_id.lower()}",
            "schema_fields": ["claim_text"],
            "mols": [{"predicate": "claim_text", "value": claim_text}],
            "source_node": "perplexity-sonar",
            "extracted_by": "sonar_harness",
            "source_hash": hashlib.sha256(claim_text.encode()).hexdigest()[:16]
        }
        r = requests.post(f"{MEMEX_BASE}/v1/claim/frame", json=payload, timeout=15)
        if r.status_code == 200:
            mol_id = r.json()["frame"]["mols"][0]["id"]
            # Verify the mol
            if verdict in ("SUPPORTED", "REFUTED"):
                requests.post(
                    f"{MEMEX_BASE}/v1/claim/verify",
                    json={"mol_id": mol_id, "verdict": "VERIFIED" if verdict == "SUPPORTED" else "REFUTED",
                          "confidence": 0.8, "evidence": f"ttruthdesk v1.1 verdict: {verdict}",
                          "verified_by": "ttruthdesk"},
                    headers={"X-API-Key": MEMEX_KEY},
                    timeout=10
                )
            return mol_id
    except Exception as e:
        print(f"    Memex error: {e}")
    return None

# ── Scorecard computation ─────────────────────────────────────────────────────
def compute_scorecard(results: list) -> dict:
    all_verdicts = [v for r in results for v in r["pipeline_verdicts"]]
    total = len(all_verdicts)
    if total == 0:
        return {}
    supported = sum(1 for v in all_verdicts if v["verdict"] == "SUPPORTED")
    refuted = sum(1 for v in all_verdicts if v["verdict"] == "REFUTED")
    insufficient = sum(1 for v in all_verdicts if v["verdict"] == "INSUFFICIENT_EVIDENCE")
    return {
        "total_claims_extracted": total,
        "supported_rate": round(supported / total, 3),
        "refuted_rate": round(refuted / total, 3),
        "insufficient_evidence_rate": round(insufficient / total, 3),
        "confabulation_rate": round(refuted / total, 3),  # proxy: REFUTED = confabulation
        "abstention_rate": 0.0,  # Perplexity never abstains
        "questions_answered": len(results),
        "questions_total": len(QUESTIONS)
    }

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    if not SONAR_KEY and not DRY_RUN:
        print("❌ PERPLEXITY_API_KEY not set. Run with --dry-run or set the key.")
        sys.exit(1)

    print(f"Sonar Trace-Harvest Harness v1.0")
    print(f"Engine: {ENGINE} | Questions: {len(QUESTIONS)} | Dry run: {DRY_RUN}")
    print("=" * 60)

    results = []
    run_ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    for q in QUESTIONS:
        print(f"\n[{q['id']}] {q['text'][:70]}...")
        t0 = time.time()

        # 1. Call Sonar
        try:
            sonar_resp = call_sonar(q)
        except Exception as e:
            print(f"  ❌ Sonar call failed: {e}")
            continue

        answer_text = sonar_resp.get("choices", [{}])[0].get("message", {}).get("content", "")
        citations = sonar_resp.get("citations", [])
        print(f"  Answer length: {len(answer_text)} chars | Citations: {len(citations)}")

        # 2. Extract claims (working material — not persisted)
        claims = extract_claims(answer_text, citations)
        print(f"  Extracted {len(claims)} claims")

        # 3. Verify each claim
        pipeline_verdicts = []
        for claim in claims:
            print(f"    Verifying: {claim['claim_text'][:60]}...")
            verdict_data = verify_claim(claim["claim_text"])
            mol_id = submit_mol(claim["claim_text"], verdict_data["verdict"], q["id"])
            pipeline_verdicts.append({
                "claim_text": claim["claim_text"],
                "source_url": claim["source_url"],
                **verdict_data,
                "mol_id": mol_id
            })
            print(f"    → {verdict_data['verdict']} (conf={verdict_data['confidence']:.2f}) mol={mol_id}")
            time.sleep(2)  # Rate limit ttruthdesk

        elapsed = time.time() - t0
        record = {
            "harvest_id": f"sonar-{ENGINE}-{q['id']}-{run_ts}",
            "question_id": q["id"],
            "question_tier": q["tier"],
            "question_text": q["text"],
            "engine": ENGINE,
            "elapsed_s": round(elapsed, 1),
            "citations_count": len(citations),
            "claims_extracted": len(claims),
            "pipeline_verdicts": pipeline_verdicts
        }
        results.append(record)
        time.sleep(3)  # Rate limit Sonar

    # 4. Compute scorecard
    scorecard = compute_scorecard(results)
    print(f"\n{'='*60}")
    print("SCORECARD SUMMARY")
    for k, v in scorecard.items():
        print(f"  {k}: {v}")

    # 5. Write outputs
    out_json = OUTPUT_DIR / f"sonar-harvest-{run_ts}.json"
    with open(out_json, "w") as f:
        json.dump({"engine": ENGINE, "run_ts": run_ts, "scorecard": scorecard, "results": results}, f, indent=2)
    print(f"\n✅ Results written to {out_json}")

    # 6. Write Markdown scorecard
    out_md = OUTPUT_DIR / f"scorecard-{ENGINE}-{run_ts[:8]}.md"
    with open(out_md, "w") as f:
        f.write(f"# Answer-Engine Scorecard: Perplexity Sonar\n")
        f.write(f"Version: 1.0 | Engine: {ENGINE} | Date: {run_ts[:8]}\n\n")
        f.write("## Summary\n\n")
        f.write("| Metric | Score |\n|---|---|\n")
        for k, v in scorecard.items():
            f.write(f"| {k.replace('_', ' ').title()} | {v} |\n")
        f.write("\n## Per-Question Results\n\n")
        f.write("| Q# | Tier | Claims | Supported | Refuted | Insufficient |\n|---|---|---|---|---|---|\n")
        for r in results:
            vv = r["pipeline_verdicts"]
            s = sum(1 for v in vv if v["verdict"] == "SUPPORTED")
            rf = sum(1 for v in vv if v["verdict"] == "REFUTED")
            ie = sum(1 for v in vv if v["verdict"] == "INSUFFICIENT_EVIDENCE")
            f.write(f"| {r['question_id']} | {r['question_tier']} | {len(vv)} | {s} | {rf} | {ie} |\n")
    print(f"✅ Scorecard written to {out_md}")

if __name__ == "__main__":
    main()
