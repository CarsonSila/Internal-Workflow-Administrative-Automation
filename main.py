import os
import math
import pandas as pd
from collections import Counter
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
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
from app.config import get_settings
from app.core.logging import configure_logging, get_logger, RequestIDMiddleware
from app.core.exceptions import register_exception_handlers
from app.api.v1.router import router as api_v1_router
from app.api.deps import get_dataframes


configure_logging()
logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("application_startup", version=settings.APP_VERSION)
    dfs = get_dataframes()
    dfs.load_data()
    logger.info("data_loaded",
                beneficiaries=len(dfs.beneficiaries_df),
                source_records=len(dfs.source_records_df),
                audit_logs=len(dfs.audit_logs_df),
                anomalies=len(dfs.anomalies_df),
                quality_dimensions=len(dfs.quality_dimensions_df))
    yield
    logger.info("application_shutdown")


app = FastAPI(
    title=settings.APP_NAME,
    description="Intelligent deduplication & identity resolution API for KPC Inuka Fellowship Hackathon Stage 2",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(RequestIDMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

if settings.ENABLE_API_V1:
    app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

if settings.ENABLE_LEGACY_API:
    app.include_router(api_v1_router, prefix="/api")


def convert_to_short_code(program_full_name: str) -> str:
    mapping = {
        "Scholarship": "SCH",
        "Plus": "PLU",
        "Vocational": "VOC",
        "Tech": "TEC"
    }
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


kdpa_masking_enabled = False
mismatch_threshold = 15
holding_on_mismatch = True


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
    programs: List[str]
    confidence: int
    health: int
    status: str

class BeneficiaryProfile(BaseModel):
    id: str
    name: str
    national_id: str
    programs: List[str]
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


# Legacy endpoints for backward compatibility
@app.post("/api/auth/login", response_model=TokenResponse, tags=["auth"], deprecated=True)
def login_legacy(req: LoginRequest):
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


@app.get("/health", tags=["health"])
def health_check():
    dfs = get_dataframes()
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "data_freshness": {
            "beneficiaries": len(dfs.beneficiaries_df),
            "source_records": len(dfs.source_records_df),
            "last_loaded": "startup"
        }
    }


@app.get("/api/debug/data-status", tags=["debug"])
def debug_data_status():
    dfs = get_dataframes()
    return {
        "mock_data_dir": settings.mock_data_path,
        "dir_exists": os.path.exists(settings.mock_data_path),
        "files_in_dir": os.listdir(settings.mock_data_path) if os.path.exists(settings.mock_data_path) else [],
        "beneficiaries_count": len(dfs.beneficiaries_df),
        "source_records_count": len(dfs.source_records_df),
        "audit_logs_count": len(dfs.audit_logs_df),
        "anomalies_count": len(dfs.anomalies_df),
        "quality_dimensions_count": len(dfs.quality_dimensions_df),
    }