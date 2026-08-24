import os
import math
import pandas as pd
from collections import Counter
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from rapidfuzz import fuzz
from auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    USERS_DB,
    LoginRequest,
    TokenResponse,
    User,
    create_access_token,
    require_role,
    verify_password,
)

app = FastAPI(
    title="Inuka Unified Beneficiary Intelligence API",
    description="Intelligent deduplication & identity resolution API for KPC Inuka Fellowship Hackathon Stage 2",
    version="1.0.0"
)

# CORS Configuration for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dynamic path resolution for Mock Data CSVs
MOCK_DATA_DIR = os.environ.get("MOCK_DATA_DIR", "/app/mock_data")
if not os.path.exists(MOCK_DATA_DIR):
    for path in ["/app/mock_data", "/workspace/scratch/mock_data", "mock_data", "./mock_data"]:
        if os.path.exists(path):
            MOCK_DATA_DIR = path
            break

def get_file_path(filename: str) -> str:
    return os.path.join(MOCK_DATA_DIR, filename)

# Global variables for dataframes
beneficiaries_df = pd.DataFrame()
source_records_df = pd.DataFrame()
audit_logs_df = pd.DataFrame()
anomalies_df = pd.DataFrame()
quality_dimensions_df = pd.DataFrame()
kdpa_masking_enabled = False
mismatch_threshold = 15
holding_on_mismatch = True

def load_data():
    global beneficiaries_df, source_records_df, audit_logs_df, anomalies_df, quality_dimensions_df
    print(f"🔍 Attempting to load data from: {MOCK_DATA_DIR}")
    print(f"📁 Directory exists: {os.path.exists(MOCK_DATA_DIR)}")
    if os.path.exists(MOCK_DATA_DIR):
        files = os.listdir(MOCK_DATA_DIR)
        print(f"📄 Files in directory: {files}")
    try:
        beneficiaries_df = pd.read_csv(get_file_path("beneficiaries.csv"))
        source_records_df = pd.read_csv(get_file_path("source_records.csv"))
        audit_logs_df = pd.read_csv(get_file_path("audit_logs.csv"))
        anomalies_df = pd.read_csv(get_file_path("anomalies.csv"))
        quality_dimensions_df = pd.read_csv(get_file_path("quality_dimensions.csv"))
        print(f"✅ Successfully loaded datasets from {MOCK_DATA_DIR}")
        print(f"   Beneficiaries: {len(beneficiaries_df)} rows")
        print(f"   Source records: {len(source_records_df)} rows")
        print(f"   Audit logs: {len(audit_logs_df)} rows")
        print(f"   Anomalies: {len(anomalies_df)} rows")
        print(f"   Quality dimensions: {len(quality_dimensions_df)} rows")
    except Exception as e:
        print(f"❌ Error loading datasets: {str(e)}")
        import traceback
        traceback.print_exc()
        # Fallbacks to prevent application crashes
        beneficiaries_df = pd.DataFrame()
        source_records_df = pd.DataFrame()
        audit_logs_df = pd.DataFrame()
        anomalies_df = pd.DataFrame()
        quality_dimensions_df = pd.DataFrame()

load_data()

# Helper Functions
def convert_to_short_code(program_full_name: str) -> str:
    mapping = {
        "Scholarship": "SCH",
        "Plus": "PLU",
        "Vocational": "VOC",
        "Tech": "TEC"
    }
    # Handle if there's any prefix or suffix from raw datasets
    cleaned = program_full_name.strip()
    for key, code in mapping.items():
        if key in cleaned:
            return code
    return "UNK"

def map_to_status(score: float) -> str:
    if score == 100:
        return "exact"
    elif score >= 85:
        return "strong"
    elif score >= 50:
        return "partial"
    else:
        return "conflict"

def apply_kdpa_masking(value: str, field_type: str) -> str:
    if not kdpa_masking_enabled or not value:
        return value
    value = str(value).strip()
    if field_type == "national_id":
        return f"{value[:2]}••••{value[-2:]}" if len(value) > 4 else "••••"
    if field_type == "phone":
        return f"{value[:4]} ••• ••• {value[-2:]}" if len(value) > 6 else "••••"
    if field_type == "email":
        parts = value.split("@")
        return f"{parts[0][0]}••••@{parts[1]}" if len(parts) == 2 and parts[0] else "••••@••••"
    return value

# Pydantic Schemas matching React TypeScript Interfaces exactly

class MetricResponse(BaseModel):
    total_records: int
    trusted_identities: int
    pending_reviews: int
    data_health: float
    potential_duplicates: int = 0
    confirmed_duplicates: int = 0
    unique_beneficiaries: int = 0
    records_merged: int = 0

class ProgramDuplicateStats(BaseModel):
    program: str
    uniques: int
    duplicates: int
    rate: float
    color: str

class BeneficiaryProgramShare(BaseModel):
    name: str
    value: int
    color: str

class MatchConfidenceBucket(BaseModel):
    range: str
    count: int

class MergeTimelinePoint(BaseModel):
    date: str
    merges: int
    scans: int

class OverviewChartsResponse(BaseModel):
    duplicates_by_program: List[ProgramDuplicateStats]
    beneficiaries_by_program: List[BeneficiaryProgramShare]
    match_confidence: List[MatchConfidenceBucket]
    merges_over_time: List[MergeTimelinePoint]

class ProgramMetrics(BaseModel):
    name: str
    records: int
    color: str
    short: str

class IdentityItem(BaseModel):
    id: str
    name: str
    nid: str
    programs: List[str]  # short codes e.g. ["SCH", "PLU"]
    confidence: int
    health: int
    status: str

class BeneficiaryProfile(BaseModel):
    id: str
    name: str
    national_id: str
    programs: List[str]  # full names e.g. ["Scholarship", "Plus"]
    confidence: int
    health: int
    status: str
    phone: str
    email: str
    location: str

class TimelineEvent(BaseModel):
    date: str
    time: str
    event: str
    type: str
    detail: str

class RecordDetail(BaseModel):
    id: str
    name: str
    phone: str
    email: str
    national_id: str
    location: str
    program: str

class ComparisonField(BaseModel):
    key: str
    label: str
    score: float
    status: str

class DuplicateCompareResponse(BaseModel):
    record_a: RecordDetail
    record_b: RecordDetail
    comparisons: List[ComparisonField]
    overall_confidence: float

class DimensionDetail(BaseModel):
    label: str
    value: int
    color: str
    issues: int
    desc: str

class QualityDimensionsResponse(BaseModel):
    dimensions: List[DimensionDetail]

class TrendResponse(BaseModel):
    data: List[int]

class AnomalyItem(BaseModel):
    id: str
    title: str
    detail: str
    level: str
    program: str
    detected: str
    records: List[str]
    color: str

class GovernanceToggleResponse(BaseModel):
    masking_enabled: bool
    status: str

class FinancialReconciliationSummary(BaseModel):
    total_disbursed: float
    duplicate_leakage_prevented: float
    high_risk_payments_flagged: float
    reconciliation_rate: float
    at_risk_records_count: int

class LeakageTrendItem(BaseModel):
    month: str
    amount: float

class HighRiskPaymentItem(BaseModel):
    id: str
    beneficiary_id: str
    name: str
    program: str
    code: str
    reason: str
    amount: float
    status: str

class ReconciliationSettingsRequest(BaseModel):
    mismatch_threshold: int = Field(..., ge=5, le=40)
    holding_on_mismatch: bool

class ReconciliationSettingsResponse(BaseModel):
    mismatch_threshold: int
    holding_on_mismatch: bool

class NotificationRequest(BaseModel):
    channel: str = Field(..., pattern="^(sms|whatsapp)$")
    recipient: str = Field(..., min_length=3)
    message: str = Field(..., min_length=1, max_length=500)
    reference_id: Optional[str] = None

class NotificationResponse(BaseModel):
    status: str
    channel: str
    recipient: str
    reference_id: Optional[str] = None

class ResolveDuplicateRequest(BaseModel):
    record_a: str = Field(..., alias="record_a_id")
    record_b: str = Field(..., alias="record_b_id")
    action: str = Field(..., description="Action to take, either 'merge' or 'reject'")
    user: str = "admin_kamau"

    class Config:
        populate_by_name = True

# ----------------- API ENDPOINTS -----------------

@app.post("/api/auth/login", response_model=TokenResponse)
def login(req: LoginRequest):
    user_dict = USERS_DB.get(req.username)
    if not user_dict or not verify_password(req.password, user_dict["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    access_token = create_access_token(
        data={"sub": req.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=User(**user_dict),
    )

@app.get("/api/overview/metrics", response_model=MetricResponse)
def get_overview_metrics():
    global beneficiaries_df, source_records_df
    if beneficiaries_df.empty or source_records_df.empty:
        return MetricResponse(total_records=0, trusted_identities=0, pending_reviews=0, data_health=0.0)
    
    total_records = len(source_records_df)
    trusted_identities = len(beneficiaries_df)
    
    # Count beneficiaries with status "Review" or "Conflict"
    pending_reviews = len(beneficiaries_df[beneficiaries_df["status"].isin(["Review", "Conflict", "Needs review"])])
    
    # Average of data_quality_score from source_records rounded to 1 decimal
    avg_health = float(source_records_df["data_quality_score"].mean())
    if math.isnan(avg_health):
        avg_health = 0.0
    
    potential_duplicates = max(total_records - trusted_identities, 0)
    records_merged = int((audit_logs_df["event"].astype(str) == "Master Records Merged").sum()) if not audit_logs_df.empty else 0
    return MetricResponse(
        total_records=total_records,
        trusted_identities=trusted_identities,
        pending_reviews=pending_reviews,
        data_health=round(avg_health, 1),
        potential_duplicates=potential_duplicates,
        confirmed_duplicates=potential_duplicates,
        unique_beneficiaries=trusted_identities,
        records_merged=records_merged,
    )

@app.get("/api/overview/charts", response_model=OverviewChartsResponse)
def get_overview_charts():
    """Return live chart series derived from source records and audit telemetry."""
    program_colors = {
        "Scholarship": "#00828a",
        "Plus": "#7c3aed",
        "Vocational": "#0f766e",
        "Tech": "#d97706",
    }
    duplicate_stats = []
    if not source_records_df.empty:
        for program in ["Scholarship", "Plus", "Vocational", "Tech"]:
            program_df = source_records_df[source_records_df["program"] == program]
            raw_count = len(program_df)
            unique_count = int(program_df["beneficiary_id"].nunique())
            duplicate_count = max(raw_count - unique_count, 0)
            duplicate_stats.append(ProgramDuplicateStats(
                program=convert_to_short_code(program),
                uniques=unique_count,
                duplicates=duplicate_count,
                rate=round((duplicate_count / raw_count) * 100, 1) if raw_count else 0,
                color=program_colors[program],
            ))

    share_counts = Counter()
    if not beneficiaries_df.empty:
        for programs in beneficiaries_df["programs"].fillna("").astype(str):
            for program in programs.split("|"):
                if program.strip():
                    share_counts[program.strip()] += 1
    beneficiaries_by_program = [
        BeneficiaryProgramShare(name=program, value=count, color=program_colors.get(program, "#64748b"))
        for program, count in share_counts.items()
    ]

    confidence_buckets = [MatchConfidenceBucket(range=label, count=0) for label in ["0-49", "50-69", "70-84", "85-94", "95-100"]]
    if not beneficiaries_df.empty:
        for confidence in pd.to_numeric(beneficiaries_df["confidence"], errors="coerce").fillna(0):
            index = 0 if confidence < 50 else 1 if confidence < 70 else 2 if confidence < 85 else 3 if confidence < 95 else 4
            confidence_buckets[index].count += 1

    dates = [(datetime.now() - timedelta(days=offset)).strftime("%Y-%m-%d") for offset in range(29, -1, -1)]
    merge_counts = Counter()
    if not audit_logs_df.empty:
        merges = audit_logs_df[audit_logs_df["event"].astype(str) == "Master Records Merged"]
        merge_counts.update(merges["date"].astype(str).tolist())
    scan_counts = Counter()
    if not source_records_df.empty:
        scan_counts.update(source_records_df["ingested_at"].astype(str).str[:10].tolist())
    merges_over_time = [MergeTimelinePoint(date=date, merges=merge_counts[date], scans=scan_counts[date]) for date in dates]
    return OverviewChartsResponse(
        duplicates_by_program=duplicate_stats,
        beneficiaries_by_program=beneficiaries_by_program,
        match_confidence=confidence_buckets,
        merges_over_time=merges_over_time,
    )

@app.get("/api/overview/programs", response_model=List[ProgramMetrics])
def get_program_metrics():
    global source_records_df
    if source_records_df.empty:
        return []
    
    prog_counts = source_records_df.groupby("program").size().to_dict()
    
    colors = {
        "Scholarship": "#0cdbc8",
        "Plus": "#a78bfa",
        "Vocational": "#facc15",
        "Tech": "#3b82f6"
    }
    
    response = []
    # Guarantee we return the main 4 programs in order
    for prog in ["Scholarship", "Plus", "Vocational", "Tech"]:
        count = prog_counts.get(prog, 0)
        response.append(ProgramMetrics(
            name=prog,
            records=count,
            color=colors.get(prog, "#94a3b8"),
            short=convert_to_short_code(prog)
        ))
    return response

@app.get("/api/identities", response_model=List[IdentityItem])
def get_identities(
    status: Optional[str] = Query("all", description="Filter by status: all, Verified, Review, Conflict"),
    search: Optional[str] = Query(None, description="Search term across name, national ID, location, or phone")
):
    global beneficiaries_df
    if beneficiaries_df.empty:
        return []
    
    df = beneficiaries_df.copy()
    
    # Handle "Needs review" and "Review" synonym mapping
    if status and status.lower() != "all":
        if status.lower() in ["review", "needs review"]:
            df = df[df["status"].str.lower().isin(["review", "needs review"])]
        else:
            df = df[df["status"].str.lower() == status.lower()]
        
    if search:
        search = str(search).strip().lower()
        search_mask = (
            df["name"].astype(str).str.lower().str.contains(search) |
            df["national_id"].astype(str).str.lower().str.contains(search) |
            df["phone"].astype(str).str.lower().str.contains(search) |
            df["location"].astype(str).str.lower().str.contains(search)
        )
        df = df[search_mask]
        
    df = df.fillna({
        "national_id": "",
        "phone": "",
        "email": "",
        "location": "",
        "confidence": 100,
        "health": 100,
        "status": "Verified"
    })
    
    results = []
    for _, row in df.iterrows():
        progs_str = str(row.get("programs", ""))
        programs_list = [convert_to_short_code(p.strip()) for p in progs_str.split("|") if p.strip()] if progs_str else []
        
        results.append(IdentityItem(
            id=str(row["beneficiary_id"]),
            name=str(row["name"]),
            nid=apply_kdpa_masking(str(row["national_id"]), "national_id"),
            programs=programs_list,
            confidence=int(row["confidence"]),
            health=int(row["health"]),
            status=str(row["status"])
        ))
    return results

@app.get("/api/beneficiaries/{beneficiary_id}", response_model=BeneficiaryProfile)
def get_beneficiary_profile(beneficiary_id: str):
    global beneficiaries_df
    if beneficiaries_df.empty:
        raise HTTPException(status_code=404, detail="Beneficiary database is empty")
    
    b_records = beneficiaries_df[beneficiaries_df["beneficiary_id"] == beneficiary_id]
    if b_records.empty:
        raise HTTPException(status_code=404, detail=f"Beneficiary with ID {beneficiary_id} not found")
        
    row = b_records.iloc[0].to_dict()
    
    # Replace NaN
    for k in ["name", "national_id", "phone", "email", "location", "status"]:
        if pd.isna(row.get(k)):
            row[k] = ""
            
    if pd.isna(row.get("confidence")): row["confidence"] = 100
    if pd.isna(row.get("health")): row["health"] = 100
    
    # Keep full names for programs for this endpoint
    progs_str = str(row.get("programs", ""))
    programs_list = [p.strip() for p in progs_str.split("|") if p.strip()] if progs_str else []
    
    return BeneficiaryProfile(
        id=str(row["beneficiary_id"]),
        name=str(row["name"]),
        national_id=apply_kdpa_masking(str(row["national_id"]), "national_id"),
        programs=programs_list,
        confidence=int(row["confidence"]),
        health=int(row["health"]),
        status=str(row["status"]),
        phone=apply_kdpa_masking(str(row["phone"]), "phone"),
        email=apply_kdpa_masking(str(row["email"]), "email"),
        location=str(row["location"])
    )

@app.get("/api/beneficiaries/{beneficiary_id}/timeline", response_model=List[TimelineEvent])
def get_beneficiary_timeline(beneficiary_id: str):
    global source_records_df, audit_logs_df
    timeline = []
    
    # 1. Gather all ingested source records for this beneficiary
    if not source_records_df.empty:
        b_sources = source_records_df[source_records_df["beneficiary_id"] == beneficiary_id]
        for _, rec in b_sources.iterrows():
            ingest_dt_str = str(rec.get("ingested_at", ""))
            try:
                dt = datetime.fromisoformat(ingest_dt_str)
                date_str = dt.strftime("%Y-%m-%d")
                time_str = dt.strftime("%H:%M")
            except Exception:
                date_str = "Unknown"
                time_str = "00:00"
                
            prog_name = str(rec.get("program", "Inuka Program"))
            timeline.append(TimelineEvent(
                date=date_str,
                time=time_str,
                event=f"Registered in {prog_name} Program",
                type="registration",
                detail=f"Ingested record {rec['record_id']} with Data Quality Score of {rec['data_quality_score']}%."
            ))
            
    # 2. Gather specific audit logs mentioning this beneficiary
    if not audit_logs_df.empty:
        b_audits = audit_logs_df[audit_logs_df["detail"].astype(str).str.contains(beneficiary_id)]
        for _, audit in b_audits.iterrows():
            timeline.append(TimelineEvent(
                date=str(audit["date"]),
                time=str(audit["time"])[:5],  # HH:MM
                event=str(audit["event"]),
                type=str(audit["type"]),
                detail=str(audit["detail"])
            ))
            
    # Sort timeline chronologically (latest first)
    timeline.sort(key=lambda x: (x.date, x.time), reverse=True)
    return timeline

@app.get("/api/duplicates/compare", response_model=DuplicateCompareResponse)
def compare_records(
    record_a: str = Query(..., description="Record ID A"),
    record_b: str = Query(..., description="Record ID B")
):
    global source_records_df
    if source_records_df.empty:
        raise HTTPException(status_code=404, detail="Source records database is empty")
        
    rec_a_df = source_records_df[source_records_df["record_id"] == record_a]
    rec_b_df = source_records_df[source_records_df["record_id"] == record_b]
    
    if rec_a_df.empty or rec_b_df.empty:
        raise HTTPException(status_code=404, detail="One or both record IDs not found")
        
    rec_a = rec_a_df.iloc[0].to_dict()
    rec_b = rec_b_df.iloc[0].to_dict()
    
    # Extract comparing values safely handling nulls
    def clean_val(v):
        return "" if pd.isna(v) else str(v).strip()
        
    name_a, name_b = clean_val(rec_a.get("name")), clean_val(rec_b.get("name"))
    phone_a, phone_b = clean_val(rec_a.get("phone")), clean_val(rec_b.get("phone"))
    email_a, email_b = clean_val(rec_a.get("email")), clean_val(rec_b.get("email"))
    id_a, id_b = clean_val(rec_a.get("national_id")), clean_val(rec_b.get("national_id"))
    loc_a, loc_b = clean_val(rec_a.get("location")), clean_val(rec_b.get("location"))
    
    # Deduplication Similarity Calculations
    # Name, Email, Location -> Fuzzy matching
    name_score = fuzz.ratio(name_a.lower(), name_b.lower()) if name_a and name_b else 0.0
    email_score = fuzz.ratio(email_a.lower(), email_b.lower()) if email_a and email_b else 0.0
    loc_score = fuzz.ratio(loc_a.lower(), loc_b.lower()) if loc_a and loc_b else 0.0
    
    # Phone, National ID -> Exact string comparison (returns 100 or 0)
    id_score = 100.0 if id_a and id_b and (id_a == id_b) else 0.0
    phone_score = 100.0 if phone_a and phone_b and (phone_a == phone_b) else 0.0
    
    # Generate field-by-field breakdown using exact camelCase comparison keys
    comparisons = [
        ComparisonField(key="name", label="Name", score=name_score, status=map_to_status(name_score)),
        ComparisonField(key="nationalId", label="National ID", score=id_score, status=map_to_status(id_score)),
        ComparisonField(key="phone", label="Phone", score=phone_score, status=map_to_status(phone_score)),
        ComparisonField(key="email", label="Email", score=email_score, status=map_to_status(email_score)),
        ComparisonField(key="location", label="Location", score=loc_score, status=map_to_status(loc_score))
    ]
    
    overall_confidence = sum([c.score for c in comparisons]) / len(comparisons)
    
    return DuplicateCompareResponse(
        record_a=RecordDetail(
            id=str(rec_a["record_id"]),
            name=name_a,
            phone=apply_kdpa_masking(phone_a, "phone"),
            email=apply_kdpa_masking(email_a, "email"),
            national_id=apply_kdpa_masking(id_a, "national_id"),
            location=loc_a,
            program=str(rec_a.get("program", ""))
        ),
        record_b=RecordDetail(
            id=str(rec_b["record_id"]),
            name=name_b,
            phone=apply_kdpa_masking(phone_b, "phone"),
            email=apply_kdpa_masking(email_b, "email"),
            national_id=apply_kdpa_masking(id_b, "national_id"),
            location=loc_b,
            program=str(rec_b.get("program", ""))
        ),
        comparisons=comparisons,
        overall_confidence=round(overall_confidence, 1)
    )

@app.post("/api/duplicates/resolve")
def resolve_duplicates(
    req: ResolveDuplicateRequest,
    current_user: User = Depends(require_role(["admin"])),
):
    global beneficiaries_df, source_records_df, audit_logs_df
    
    # Ensure aliases work and maps both parameters cleanly
    rec_a_id = req.record_a
    rec_b_id = req.record_b
    
    rec_a_df = source_records_df[source_records_df["record_id"] == rec_a_id]
    rec_b_df = source_records_df[source_records_df["record_id"] == rec_b_id]
    
    if rec_a_df.empty or rec_b_df.empty:
        raise HTTPException(status_code=400, detail="Invalid record IDs provided")
        
    rec_a = rec_a_df.iloc[0].to_dict()
    rec_b = rec_b_df.iloc[0].to_dict()
    
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    
    # 1. Action: REJECT
    if req.action.lower() == "reject":
        new_log = {
            "time": time_str,
            "date": date_str,
            "event": "Duplicate Rejected",
            "detail": f"Records {rec_a_id} ({rec_a['name']}) and {rec_b_id} ({rec_b['name']}) confirmed as separate identities.",
            "type": "match",
            "user": current_user.username
        }
        audit_logs_df = pd.concat([pd.DataFrame([new_log]), audit_logs_df], ignore_index=True)
        audit_logs_df.to_csv(get_file_path("audit_logs.csv"), index=False)
        return {"status": "success", "message": "Duplicate match rejected. Audit logged."}
        
    # 2. Action: MERGE
    elif req.action.lower() == "merge":
        b_id_keep = rec_a["beneficiary_id"]
        b_id_merge = rec_b["beneficiary_id"]
        
        if b_id_keep == b_id_merge:
            return {"status": "success", "message": "Records already belong to the same master identity."}
            
        # Update source record B to point to beneficiary A
        source_records_df.loc[source_records_df["record_id"] == rec_b_id, "beneficiary_id"] = b_id_keep
        source_records_df.to_csv(get_file_path("source_records.csv"), index=False)
        
        # Merge programs
        b_a_df = beneficiaries_df[beneficiaries_df["beneficiary_id"] == b_id_keep]
        b_b_df = beneficiaries_df[beneficiaries_df["beneficiary_id"] == b_id_merge]
        
        if not b_a_df.empty and not b_b_df.empty:
            b_a = b_a_df.iloc[0].to_dict()
            b_b = b_b_df.iloc[0].to_dict()
            
            progs_a = set(str(b_a.get("programs", "")).split("|"))
            progs_b = set(str(b_b.get("programs", "")).split("|"))
            merged_progs = "|".join(list(progs_a.union(progs_b)))
            
            # Update keep-beneficiary programs and confidence
            beneficiaries_df.loc[beneficiaries_df["beneficiary_id"] == b_id_keep, "programs"] = merged_progs
            beneficiaries_df.loc[beneficiaries_df["beneficiary_id"] == b_id_keep, "confidence"] = 100  # Elevated due to validation
            
            # Remove the merged beneficiary record
            beneficiaries_df = beneficiaries_df[beneficiaries_df["beneficiary_id"] != b_id_merge]
            beneficiaries_df.to_csv(get_file_path("beneficiaries.csv"), index=False)
            
        # Log merge audit event
        new_log = {
            "time": time_str,
            "date": date_str,
            "event": "Master Records Merged",
            "detail": f"Merged duplicate beneficiary {b_id_merge} into {b_id_keep}. Combined program access: {merged_progs}.",
            "type": "merge",
            "user": current_user.username
        }
        audit_logs_df = pd.concat([pd.DataFrame([new_log]), audit_logs_df], ignore_index=True)
        audit_logs_df.to_csv(get_file_path("audit_logs.csv"), index=False)
        
        return {"status": "success", "message": f"Successfully merged {b_id_merge} into {b_id_keep}."}
        
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Supported: 'merge', 'reject'")

@app.get("/api/quality/dimensions", response_model=QualityDimensionsResponse)
def get_quality_dimensions():
    global quality_dimensions_df
    if quality_dimensions_df.empty:
        return QualityDimensionsResponse(dimensions=[])
        
    color_map = {
        "Completeness": "#4ade80", # Green
        "Validity": "#3b82f6",       # Blue
        "Uniqueness": "#facc15",     # Yellow
        "Consistency": "#a78bfa",    # Purple
        "Freshness": "#ec4899"       # Pink
    }
    
    desc_map = {
        "Completeness": "Measures the presence of essential beneficiary identity data columns.",
        "Validity": "Evaluates conformity of ID numbers, locations, and format rules.",
        "Uniqueness": "Quantifies the baseline level of duplicate-free data.",
        "Consistency": "Audits semantic formatting and typo levels across programs.",
        "Freshness": "Assesses frequency of incoming transactional and status telemetry."
    }
    
    dims = []
    for _, row in quality_dimensions_df.iterrows():
        label = str(row["dimension"])
        dims.append(DimensionDetail(
            label=label,
            value=int(row["value"]),
            color=color_map.get(label, "#94a3b8"),
            issues=int(row["issues"]),
            desc=desc_map.get(label, "System data quality metric.")
        ))
        
    return QualityDimensionsResponse(dimensions=dims)

@app.get("/api/quality/trend", response_model=TrendResponse)
def get_quality_trend():
    global source_records_df
    if source_records_df.empty:
        return TrendResponse(data=[100] * 30)
        
    df = source_records_df.copy()
    # Normalize ingested_at to date strings YYYY-MM-DD
    df["date"] = df["ingested_at"].apply(lambda x: str(x)[:10] if pd.notna(x) else "")
    df = df[df["date"] != ""]
    
    daily_avg = df.groupby("date")["data_quality_score"].mean().to_dict()
    
    # Generate date range for the last 30 days
    today = datetime.now()
    dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(30)]
    dates.reverse() # Oldest to newest
    
    trend_data = []
    last_valid_val = 85.0 # baseline
    
    for d in dates:
        if d in daily_avg:
            val = float(daily_avg[d])
            last_valid_val = val
        else:
            val = last_valid_val
        trend_data.append(int(round(val)))
        
    return TrendResponse(data=trend_data)

@app.get("/api/anomalies", response_model=List[AnomalyItem])
def get_anomalies():
    global anomalies_df, source_records_df
    if anomalies_df.empty:
        return []
        
    anomalies = []
    for _, row in anomalies_df.iterrows():
        rec_str = str(row.get("records", ""))
        rec_list = [r.strip() for r in rec_str.split("|") if r.strip()] if pd.notna(row.get("records")) and rec_str else []

        # Keep quick-compare links grounded in the currently loaded dataset.
        if not source_records_df.empty:
            existing_ids = set(source_records_df["record_id"].astype(str))
            rec_list = [record_id for record_id in rec_list if record_id in existing_ids]
            if len(rec_list) < 2:
                duplicate_groups = source_records_df.groupby("beneficiary_id")["record_id"].apply(list)
                matching_group = next((ids for ids in duplicate_groups if len(ids) >= 2), None)
                rec_list = [str(record_id) for record_id in matching_group[:3]] if matching_group else source_records_df["record_id"].astype(str).head(2).tolist()
        
        lvl = str(row["level"])
        if lvl == "Anomaly":
            color = "var(--magenta)"
        elif lvl == "Review":
            color = "var(--amber)"
        else:
            color = "var(--green)"
            
        anomalies.append(AnomalyItem(
            id=row["id"],
            title=row["title"],
            detail=row["detail"],
            level=lvl,
            program=row["program"],
            detected=row["detected"],
            records=rec_list,
            color=color
        ))
        
    return anomalies

@app.get("/api/audit")
def get_audit_trail():
    global audit_logs_df
    if audit_logs_df.empty:
        return {}
        
    grouped = {}
    for _, row in audit_logs_df.iterrows():
        date_key = str(row["date"])
        item = {
            "time": str(row["time"]),
            "event": str(row["event"]),
            "detail": str(row["detail"]),
            "type": str(row["type"]),
            "user": str(row["user"])
        }
        if date_key not in grouped:
            grouped[date_key] = []
        grouped[date_key].append(item)
        
    return grouped

@app.post("/api/governance/anonymise", response_model=GovernanceToggleResponse)
def toggle_kdpa_anonymisation(
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    global kdpa_masking_enabled, audit_logs_df
    kdpa_masking_enabled = not kdpa_masking_enabled
    now = datetime.now()
    audit_entry = {
        "time": now.strftime("%H:%M:%S"),
        "date": now.strftime("%Y-%m-%d"),
        "event": "KDPA Masking State Changed",
        "detail": f"PII anonymisation set to {kdpa_masking_enabled} by {current_user.full_name}.",
        "type": "governance",
        "user": current_user.username,
    }
    audit_logs_df = pd.concat([pd.DataFrame([audit_entry]), audit_logs_df], ignore_index=True)
    audit_logs_df.to_csv(get_file_path("audit_logs.csv"), index=False)
    return GovernanceToggleResponse(
        masking_enabled=kdpa_masking_enabled,
        status="active" if kdpa_masking_enabled else "inactive",
    )

@app.get("/api/financial/reconciliation", response_model=FinancialReconciliationSummary)
def get_financial_reconciliation(
    current_user: User = Depends(require_role(["admin", "manager"]))
):
    del current_user
    if source_records_df.empty or beneficiaries_df.empty:
        return FinancialReconciliationSummary(
            total_disbursed=0,
            duplicate_leakage_prevented=0,
            high_risk_payments_flagged=0,
            reconciliation_rate=100,
            at_risk_records_count=0,
        )
    raw_records = len(source_records_df)
    master_identities = len(beneficiaries_df)
    duplicates = max(raw_records - master_identities, 0)
    stipend = 7500.0
    at_risk = beneficiaries_df[beneficiaries_df["status"].isin(["Review", "Conflict", "Needs review"])]
    return FinancialReconciliationSummary(
        total_disbursed=float(raw_records * stipend),
        duplicate_leakage_prevented=float(duplicates * stipend),
        high_risk_payments_flagged=float(len(at_risk) * stipend),
        reconciliation_rate=round((master_identities / raw_records) * 100, 2) if raw_records else 100,
        at_risk_records_count=len(at_risk),
    )

@app.get("/api/financial/leakage-trend", response_model=List[LeakageTrendItem])
def get_financial_leakage_trend(current_user: User = Depends(require_role(["admin", "manager"]))):
    prevented = get_financial_reconciliation(current_user=current_user).duplicate_leakage_prevented
    shares = [0.22, 0.36, 0.54, 0.75, 1.0]
    return [LeakageTrendItem(month=month, amount=round((prevented / 1000) * share, 1)) for month, share in zip(["Apr", "May", "Jun", "Jul", "Aug"], shares)]

@app.get("/api/financial/high-risk-payments", response_model=List[HighRiskPaymentItem])
def get_high_risk_payments(current_user: User = Depends(require_role(["admin", "manager"]))):
    del current_user
    if beneficiaries_df.empty:
        return []
    at_risk = beneficiaries_df[beneficiaries_df["status"].isin(["Review", "Conflict", "Needs review"])].head(10)
    return [HighRiskPaymentItem(
        id=f"DSB-{1000 + index}", beneficiary_id=str(row["beneficiary_id"]), name=str(row["name"]),
        program=convert_to_short_code(str(row.get("programs", ""))), code=convert_to_short_code(str(row.get("programs", ""))),
        reason="Identity requires manual confirmation before stipend release.", amount=7500.0, status="Held"
    ) for index, (_, row) in enumerate(at_risk.iterrows())]

@app.get("/api/financial/reconciliation/settings", response_model=ReconciliationSettingsResponse)
def get_reconciliation_settings(current_user: User = Depends(require_role(["admin", "manager"]))):
    del current_user
    return ReconciliationSettingsResponse(mismatch_threshold=mismatch_threshold, holding_on_mismatch=holding_on_mismatch)

@app.post("/api/financial/reconciliation/settings", response_model=ReconciliationSettingsResponse)
def update_reconciliation_settings(req: ReconciliationSettingsRequest, current_user: User = Depends(require_role(["admin"]))):
    global mismatch_threshold, holding_on_mismatch, audit_logs_df
    mismatch_threshold = req.mismatch_threshold
    holding_on_mismatch = req.holding_on_mismatch
    now = datetime.now()
    audit_logs_df = pd.concat([pd.DataFrame([{"time": now.strftime("%H:%M:%S"), "date": now.strftime("%Y-%m-%d"), "event": "Reconciliation Rules Updated", "detail": f"Mismatch threshold set to {mismatch_threshold}% by {current_user.full_name}.", "type": "finance", "user": current_user.username}]), audit_logs_df], ignore_index=True)
    audit_logs_df.to_csv(get_file_path("audit_logs.csv"), index=False)
    return ReconciliationSettingsResponse(mismatch_threshold=mismatch_threshold, holding_on_mismatch=holding_on_mismatch)

@app.post("/api/notifications/dispatch", response_model=NotificationResponse)
def dispatch_notification(req: NotificationRequest, current_user: User = Depends(require_role(["admin", "manager"]))):
    global audit_logs_df
    now = datetime.now()
    reference_id = req.reference_id or f"NTF-{now.strftime('%Y%m%d%H%M%S')}"
    audit_logs_df = pd.concat([pd.DataFrame([{"time": now.strftime("%H:%M:%S"), "date": now.strftime("%Y-%m-%d"), "event": "Notification Dispatched", "detail": f"Mock {req.channel.upper()} notification sent to {req.recipient} for {reference_id}.", "type": "notification", "user": current_user.username}]), audit_logs_df], ignore_index=True)
    audit_logs_df.to_csv(get_file_path("audit_logs.csv"), index=False)
    return NotificationResponse(status="queued", channel=req.channel, recipient=req.recipient, reference_id=reference_id)


@app.get("/api/debug/data-status")
def debug_data_status():
    return {
        "mock_data_dir": MOCK_DATA_DIR,
        "dir_exists": os.path.exists(MOCK_DATA_DIR),
        "files_in_dir": os.listdir(MOCK_DATA_DIR) if os.path.exists(MOCK_DATA_DIR) else [],
        "beneficiaries_count": len(beneficiaries_df),
        "source_records_count": len(source_records_df),
        "audit_logs_count": len(audit_logs_df),
        "anomalies_count": len(anomalies_df),
        "quality_dimensions_count": len(quality_dimensions_df),
    }
