#!/usr/bin/env python
"""
Development seed script - generates fresh mock data for local development.
Run with: python -m app.scripts.seed
"""
import os
import sys
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from rapidfuzz import fuzz

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.config import get_settings


def clean_name(name):
    if pd.isna(name):
        return ""
    return str(name).strip().title()


def clean_phone(phone):
    if pd.isna(phone):
        return ""
    phone_str = "".join(c for c in str(phone) if c.isdigit())
    if phone_str.startswith("07") or phone_str.startswith("01"):
        return "+254" + phone_str[1:]
    elif phone_str.startswith("2547") or phone_str.startswith("2541"):
        return "+" + phone_str
    elif len(phone_str) == 9 and (phone_str.startswith("7") or phone_str.startswith("1")):
        return "+254" + phone_str
    elif phone_str.startswith("7") or phone_str.startswith("1"):
        return "+254" + phone_str
    return "+" + phone_str if phone_str else ""


def clean_national_id(nid):
    if pd.isna(nid):
        return ""
    nid_clean = "".join(c for c in str(nid) if c.isdigit())
    return nid_clean if nid_clean else ""


def clean_location(loc):
    if pd.isna(loc):
        return ""
    l = str(loc).strip().lower()
    if "nairobi" in l or "nbi" in l:
        return "Nairobi"
    if "mombasa" in l or "mba" in l:
        return "Mombasa"
    if "kisumu" in l or "ksm" in l:
        return "Kisumu"
    if "nakuru" in l or "nkr" in l:
        return "Nakuru"
    if "eldoret" in l or "eld" in l:
        return "Eldoret"
    return l.title()


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


def run_seed():
    settings = get_settings()
    mock_data_dir = settings.mock_data_path
    os.makedirs(mock_data_dir, exist_ok=True)

    print(f"Seeding mock data to {mock_data_dir}")

    # Sample names for variety
    first_names = [
        "Grace", "Charles", "Beatrice", "Samuel", "Faith", "Ruth", "Florence", "Esther",
        "David", "Mary", "Joseph", "Elizabeth", "James", "Susan", "Peter", "Jane",
        "Robert", "Helen", "Michael", "Patricia", "William", "Linda", "Richard", "Barbara",
        "Thomas", "Margaret", "Christopher", "Dorothy", "Daniel", "Nancy"
    ]
    last_names = [
        "Kamau", "Wafula", "Wanjiku", "Otieno", "Mwangi", "Awuor", "Koech", "Ochieng",
        "Kiprop", "Njeri", "Omondi", "Akinyi", "Kipchoge", "Chepngeno", "Wambui", "Maina",
        "Kariuki", "Mworia", "Ndungu", "Wairimu", "Gichuru", "Mutua", "Kimani", "Ndegwa"
    ]
    locations = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Nyeri", "Garissa", "Meru", "Kitale"]
    programs = ["Scholarship", "Plus", "Vocational", "Tech"]

    # Generate source records
    np.random.seed(42)
    num_records = 200
    source_records = []

    for i in range(num_records):
        program = np.random.choice(programs)
        rec_id = f"REC-{convert_to_short_code(program)}-{10001 + i}"

        # Create some intentional duplicates (about 15% of records)
        if i > 0 and np.random.random() < 0.15:
            # Copy from a previous record with slight variations
            base_idx = np.random.randint(0, i)
            base = source_records[base_idx]
            name = base["name"]
            phone = base["phone"]
            national_id = base["national_id"]
            location = base["location"]
            email = base["email"]
        else:
            name = f"{np.random.choice(first_names)} {np.random.choice(last_names)}"
            phone = clean_phone(f"07{np.random.randint(10000000, 99999999)}")
            national_id = clean_national_id(str(np.random.randint(10000000, 99999999)))
            location = np.random.choice(locations)
            email = f"{name.lower().replace(' ', '.')}@example.com"

        source_records.append({
            "record_id": rec_id,
            "name": name,
            "national_id": national_id,
            "phone": phone,
            "email": email,
            "location": location,
            "program": program,
            "ingested_at": (datetime.now() - timedelta(days=np.random.randint(0, 30))).isoformat(),
            "data_quality_score": np.random.randint(70, 100),
            "beneficiary_id": ""  # Will be filled by dedup
        })

    source_records_df = pd.DataFrame(source_records)

    # Deduplication (simplified version of etl_pipeline logic)
    print("Running deduplication...")
    beneficiaries = []
    beneficiary_counter = 10001
    allocated_records = set()

    for i, rec_a in source_records_df.iterrows():
        if rec_a["record_id"] in allocated_records:
            continue

        b_id = f"BEN-{beneficiary_counter}"
        beneficiary_counter += 1

        master_name = rec_a["name"]
        master_phone = rec_a["phone"]
        master_nid = rec_a["national_id"]
        master_email = rec_a["email"]
        master_location = rec_a["location"]
        programs_accessed = {rec_a["program"]}

        allocated_records.add(rec_a["record_id"])
        source_records_df.at[i, "beneficiary_id"] = b_id

        for j in range(i + 1, len(source_records_df)):
            rec_b = source_records_df.iloc[j]
            if rec_b["record_id"] in allocated_records:
                continue

            name_score = fuzz.ratio(master_name.lower(), rec_b["name"].lower())
            nid_match = (master_nid != "") and (rec_b["national_id"] != "") and (master_nid == rec_b["national_id"])
            phone_match = (master_phone != "") and (rec_b["phone"] != "") and (master_phone == rec_b["phone"])

            is_duplicate = nid_match or phone_match or (name_score >= 88)

            if is_duplicate:
                allocated_records.add(rec_b["record_id"])
                source_records_df.at[j, "beneficiary_id"] = b_id
                programs_accessed.add(rec_b["program"])

                if not master_nid and rec_b["national_id"]:
                    master_nid = rec_b["national_id"]
                if not master_phone and rec_b["phone"]:
                    master_phone = rec_b["phone"]
                if not master_location and rec_b["location"]:
                    master_location = rec_b["location"]

        beneficiaries.append({
            "beneficiary_id": b_id,
            "name": master_name,
            "national_id": master_nid,
            "programs": "|".join(list(programs_accessed)),
            "confidence": 100 if len(programs_accessed) == 1 else 88,
            "health": int(np.random.randint(70, 100)),
            "status": "Verified" if len(programs_accessed) == 1 else "Review",
            "phone": master_phone,
            "email": master_email,
            "location": master_location
        })

    beneficiaries_df = pd.DataFrame(beneficiaries)

    # Save CSVs
    source_records_df.to_csv(os.path.join(mock_data_dir, "source_records.csv"), index=False)
    beneficiaries_df.to_csv(os.path.join(mock_data_dir, "beneficiaries.csv"), index=False)
    print(f"Saved {len(source_records_df)} source records, {len(beneficiaries_df)} unique beneficiaries")

    # Audit logs
    audits = [
        {
            "time": datetime.now().strftime("%H:%M:%S"),
            "date": datetime.now().strftime("%Y-%m-%d"),
            "event": "Pipeline Ingested",
            "detail": f"Operational pipeline loaded raw records. Extracted {len(source_records_df)} items.",
            "type": "ingest",
            "user": "system"
        },
        {
            "time": datetime.now().strftime("%H:%M:%S"),
            "date": datetime.now().strftime("%Y-%m-%d"),
            "event": "ML Dedup Triggered",
            "detail": f"Automatic blocking scanned dataset. Identified {len(source_records_df) - len(beneficiaries_df)} duplicated profiles.",
            "type": "ai",
            "user": "system"
        },
        {
            "time": datetime.now().strftime("%H:%M:%S"),
            "date": datetime.now().strftime("%Y-%m-%d"),
            "event": "Seed Data Generated",
            "detail": f"Development seed script generated fresh mock data with {len(beneficiaries_df)} master identities.",
            "type": "admin",
            "user": "dev_seed"
        }
    ]
    pd.DataFrame(audits).to_csv(os.path.join(mock_data_dir, "audit_logs.csv"), index=False)

    # Quality dimensions
    dims = [
        {"dimension": "Completeness", "value": 94, "issues": 128},
        {"dimension": "Validity", "value": 89, "issues": 215},
        {"dimension": "Uniqueness", "value": int((len(beneficiaries_df) / len(source_records_df)) * 100), "issues": len(source_records_df) - len(beneficiaries_df)},
        {"dimension": "Consistency", "value": 91, "issues": 110},
        {"dimension": "Freshness", "value": 100, "issues": 0}
    ]
    pd.DataFrame(dims).to_csv(os.path.join(mock_data_dir, "quality_dimensions.csv"), index=False)

    # Anomalies
    anomalies = [
        {
            "id": "ANO-001",
            "title": "Unusual duplicate cluster detected",
            "detail": "Cross-program scans detected mutual name similarities across the ingested profiles.",
            "level": "Anomaly",
            "program": "Cross-program",
            "detected": datetime.now().isoformat(),
            "records": "REC-SCH-10001|REC-PLU-10002"
        },
        {
            "id": "ANO-002",
            "title": "Data quality dip in Plus program",
            "detail": "Ingestion quality scores dropped below 80% threshold for 3 consecutive days.",
            "level": "Review",
            "program": "Plus",
            "detected": datetime.now().isoformat(),
            "records": "REC-PLU-10045|REC-PLU-10046"
        },
        {
            "id": "ANO-003",
            "title": "High confidence match requires review",
            "detail": "Two records with 95%+ similarity but different national IDs - possible data entry error.",
            "level": "Review",
            "program": "Scholarship",
            "detected": datetime.now().isoformat(),
            "records": "REC-SCH-10023|REC-SCH-10024"
        }
    ]
    pd.DataFrame(anomalies).to_csv(os.path.join(mock_data_dir, "anomalies.csv"), index=False)

    print("Seed complete!")
    print(f"   Beneficiaries: {len(beneficiaries_df)}")
    print(f"   Source records: {len(source_records_df)}")
    print(f"   Audit logs: {len(audits)}")
    print(f"   Quality dimensions: {len(dims)}")
    print(f"   Anomalies: {len(anomalies)}")


if __name__ == "__main__":
    run_seed()