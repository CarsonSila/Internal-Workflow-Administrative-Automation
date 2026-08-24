"""
main.py — FastAPI backend for the PLP Identity Dashboard.

STATUS: working scaffold, not yet wired into the frontend (frontend still
reads its own hardcoded arrays — see SUMMARY.md "What's left" for the
component-by-component fetch() swap that turns this on).

Run it:
    cd backend
    python generate_data.py        # writes ./mock_data/*.csv
    pip install fastapi uvicorn pandas python-Levenshtein --break-system-packages
    uvicorn main:app --reload --port 8000

vite.config.ts already proxies /api/* to http://127.0.0.1:8000, so once a
component calls fetch("/api/overview") in dev, no CORS setup is needed.
"""
from difflib import SequenceMatcher
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

DATA_DIR = Path(__file__).parent / "mock_data"

app = FastAPI(title="PLP Identity Dashboard API")

# Permissive CORS for local dev without the Vite proxy (e.g. testing with curl
# from a different port). Tighten this before deploying anywhere real.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _load(name: str) -> pd.DataFrame:
    path = DATA_DIR / name
    if not path.exists():
        raise HTTPException(
            status_code=503,
            detail=f"{name} not found — run `python generate_data.py` first.",
        )
    return pd.read_csv(path)


def name_similarity(a: str, b: str) -> float:
    """Simple stand-in for Jaro-Winkler so this scaffold has zero extra
    dependencies beyond fastapi/pandas. Swap for python-Levenshtein's
    jaro_winkler_similarity or jellyfish for production-grade matching —
    the call site (compute_match_confidence) is the only place to change."""
    return SequenceMatcher(None, str(a).lower(), str(b).lower()).ratio()


def compute_match_confidence(rec_a: dict, rec_b: dict) -> float:
    """Weighted field-agreement score mirroring the settings-page thresholds
    (98 auto-merge / 75 review / below = reject). Exact-match fields carry
    the most weight since they're the strongest identity signal; name is
    fuzzy-matched since your generator deliberately varies it."""
    weights = {"national_id": 0.35, "phone": 0.25, "dob": 0.15, "name": 0.20, "email": 0.05}
    score = 0.0
    if rec_a.get("national_id") == rec_b.get("national_id"):
        score += weights["national_id"]
    if rec_a.get("phone") == rec_b.get("phone"):
        score += weights["phone"]
    if rec_a.get("dob") == rec_b.get("dob"):
        score += weights["dob"]
    score += weights["name"] * name_similarity(rec_a.get("name", ""), rec_b.get("name", ""))
    if rec_a.get("email") == rec_b.get("email"):
        score += weights["email"]
    return round(score * 100, 1)


@app.get("/api/overview")
def overview():
    """Powers Overview.tsx's METRICS cards + PROGRAMS breakdown."""
    records = _load("source_records.csv")
    beneficiaries = _load("beneficiaries.csv")
    quality = _load("quality_dimensions.csv")

    program_counts = records.groupby("program").size().to_dict()
    avg_health = round(quality["value"].mean(), 1)

    return {
        "sourceRecords": len(records),
        "trustedIdentities": len(beneficiaries),
        "pendingReviews": int((beneficiaries["status"] == "Review").sum()),
        "dataHealth": avg_health,
        "programs": [
            {"name": p, "records": int(c)} for p, c in program_counts.items()
        ],
    }


@app.get("/api/beneficiaries")
def list_beneficiaries(
    search: str = "",
    status: str = "all",
    page: int = 1,
    page_size: int = Query(default=25, le=200),
):
    """Powers IdentityExplorer.tsx — replaces the 8-row hardcoded RECORDS array
    and the fabricated '51,842 Master Identities' header with the real count."""
    df = _load("beneficiaries.csv")

    if search:
        mask = df["name"].str.contains(search, case=False, na=False) | \
               df["beneficiary_id"].str.contains(search, case=False, na=False)
        df = df[mask]
    if status != "all":
        df = df[df["status"].str.lower() == status.lower()]

    total = len(df)
    start = (page - 1) * page_size
    page_df = df.iloc[start:start + page_size]

    return {
        "total": total,
        "page": page,
        "pageSize": page_size,
        "results": page_df.to_dict(orient="records"),
    }


@app.get("/api/beneficiaries/{beneficiary_id}")
def beneficiary_detail(beneficiary_id: str):
    """Powers Beneficiary360.tsx — profile header, program tabs, source records tab."""
    beneficiaries = _load("beneficiaries.csv")
    records = _load("source_records.csv")

    row = beneficiaries[beneficiaries["beneficiary_id"] == beneficiary_id]
    if row.empty:
        raise HTTPException(status_code=404, detail="Beneficiary not found")

    ben_records = records[records["beneficiary_id"] == beneficiary_id]
    return {
        "beneficiary": row.iloc[0].to_dict(),
        "sourceRecords": ben_records.to_dict(orient="records"),
    }


@app.get("/api/duplicate-matches")
def duplicate_matches(limit: int = 25):
    """Powers DuplicateResolution.tsx and the Overview match-confidence
    visual. Finds source records sharing a national_id but disagreeing on
    at least one other field (the real signal your generator's 30%
    duplicate-injection produces), and scores each pair."""
    records = _load("source_records.csv")
    candidates = []

    for nid, group in records.groupby("national_id"):
        if len(group) < 2:
            continue
        rows = group.to_dict(orient="records")
        a, b = rows[0], rows[1]
        if a["record_id"] == b["record_id"]:
            continue
        confidence = compute_match_confidence(a, b)
        candidates.append({
            "recordA": a,
            "recordB": b,
            "confidence": confidence,
            "recommendation": "auto-merge" if confidence >= 98 else "review" if confidence >= 75 else "reject",
        })
        if len(candidates) >= limit:
            break

    candidates.sort(key=lambda c: c["confidence"], reverse=True)
    return {"matches": candidates}


@app.get("/api/audit-logs")
def audit_logs(limit: int = 50):
    """Powers AuditTrail.tsx and the GlassyTimeline visual on Overview."""
    df = _load("audit_logs.csv")
    df = df.sort_values(["date", "time"], ascending=False).head(limit)
    return {"events": df.to_dict(orient="records")}


@app.get("/api/anomalies")
def anomalies():
    """Powers Anomalies.tsx and the IconGrid visual on Overview."""
    df = _load("anomalies.csv")
    records = df.to_dict(orient="records")
    for r in records:
        # Empty CSV cells come back as float('nan'), not "" — pandas.notna
        # guards against calling .split() on a float when a row has no
        # affected records (ANO-004/ANO-005 in the generator).
        raw = r.get("records")
        r["records"] = raw.split("|") if isinstance(raw, str) and raw else []
    return {"anomalies": records}


@app.get("/api/quality-dimensions")
def quality_dimensions():
    """Powers DataQuality.tsx and the ChalkyBlockChart visual on Overview."""
    df = _load("quality_dimensions.csv")
    return {"dimensions": df.to_dict(orient="records")}
