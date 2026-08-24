"""Poll an incoming CSV directory and update the local identity fabric.

Usage:
    python file_watcher.py --once --dry-run
    python file_watcher.py

The watcher is deliberately standalone: it does not import FastAPI or mutate
application globals. Writes are atomic and every decision is audit logged.
"""
import argparse
import os
import shutil
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from rapidfuzz import fuzz

REQUIRED_COLUMNS = {"name", "phone", "email", "location", "program"}
NAMESPACE = uuid.UUID("2d5f5df1-1665-4c6e-8d16-3c8c0c5b5a77")


def paths() -> tuple[Path, Path, Path]:
    root = Path(os.environ.get("INUKA_DATA_DIR", "mock_data"))
    incoming = Path(os.environ.get("INUKA_INCOMING_DIR", "incoming_registrations"))
    processed = Path(os.environ.get("INUKA_PROCESSED_DIR", "processed_registrations"))
    return root, incoming, processed


def clean_phone(value: object) -> str:
    digits = "".join(character for character in str(value) if character.isdigit())
    if digits.startswith("254"):
        return f"+{digits}"
    if digits.startswith("0") and len(digits) >= 10:
        return f"+254{digits[1:]}"
    if len(digits) == 9 and digits.startswith(("7", "1")):
        return f"+254{digits}"
    return f"+{digits}" if digits else ""


def clean_frame(frame: pd.DataFrame) -> pd.DataFrame:
    missing = REQUIRED_COLUMNS - set(frame.columns)
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")
    frame = frame.copy()
    frame["name"] = frame["name"].fillna("").astype(str).str.strip().str.title()
    frame["phone"] = frame["phone"].fillna("").map(clean_phone)
    frame["email"] = frame["email"].fillna("").astype(str).str.strip().str.lower()
    frame["location"] = frame["location"].fillna("").astype(str).str.strip().str.title()
    frame["program"] = frame["program"].fillna("Unknown").astype(str).str.strip()
    frame["national_id"] = frame.get("national_id", "").fillna("").astype(str).str.strip() if hasattr(frame.get("national_id", ""), "fillna") else ""
    return frame


def atomic_csv(frame: pd.DataFrame, destination: Path) -> None:
    temporary = destination.with_suffix(destination.suffix + ".tmp")
    frame.to_csv(temporary, index=False)
    temporary.replace(destination)


def stable_id(prefix: str, source: str, index: int) -> str:
    return f"{prefix}-{uuid.uuid5(NAMESPACE, f'{source}:{index}').hex[:12].upper()}"


def process_file(file_path: Path, dry_run: bool = False) -> bool:
    data_dir, _, processed_dir = paths()
    try:
        incoming = clean_frame(pd.read_csv(file_path))
        beneficiaries_path = data_dir / "beneficiaries.csv"
        source_path = data_dir / "source_records.csv"
        audit_path = data_dir / "audit_logs.csv"
        anomaly_path = data_dir / "anomalies.csv"
        beneficiaries = pd.read_csv(beneficiaries_path)
        source_records = pd.read_csv(source_path)
        audits = pd.read_csv(audit_path)
        anomalies = pd.read_csv(anomaly_path)
        now = datetime.now(timezone.utc)
        source_name = file_path.name
        decisions = {"auto_merge": 0, "review": 0, "new_identity": 0}

        for index, row in incoming.iterrows():
            best_id, best_score = None, 0.0
            for _, master in beneficiaries.iterrows():
                name_score = fuzz.ratio(row["name"].lower(), str(master["name"]).lower())
                phone_score = 100.0 if row["phone"] and row["phone"] == str(master.get("phone", "")) else 0.0
                location_score = fuzz.ratio(row["location"].lower(), str(master.get("location", "")).lower())
                score = (name_score * 0.55) + (phone_score * 0.35) + (location_score * 0.10)
                if score > best_score:
                    best_id, best_score = str(master["beneficiary_id"]), score
            record_id = stable_id("REC-ING", source_name, index)
            beneficiary_id = best_id if best_score >= 95 else stable_id("BEN", source_name, index)
            status = "Verified" if best_score < 50 or best_score >= 95 else "Review"
            if best_score >= 95:
                decisions["auto_merge"] += 1
            elif best_score >= 50:
                decisions["review"] += 1
            else:
                decisions["new_identity"] += 1
            source_records = pd.concat([source_records, pd.DataFrame([{
                "record_id": record_id, "beneficiary_id": beneficiary_id, "name": row["name"],
                "national_id": row["national_id"], "phone": row["phone"], "email": row["email"],
                "location": row["location"], "program": row["program"], "ingested_at": now.isoformat(),
                "data_quality_score": round(best_score if best_score >= 50 else 100),
            }])], ignore_index=True)
            if status == "Review":
                beneficiaries = pd.concat([beneficiaries, pd.DataFrame([{
                    "beneficiary_id": beneficiary_id, "name": row["name"], "national_id": row["national_id"],
                    "programs": row["program"], "confidence": round(best_score), "health": 75,
                    "status": "Review", "phone": row["phone"], "email": row["email"], "location": row["location"],
                }])], ignore_index=True)
                anomalies = pd.concat([anomalies, pd.DataFrame([{
                    "id": stable_id("ANO", source_name, index), "title": f"Potential duplicate: {row['name']}",
                    "detail": f"Incoming record scored {best_score:.1f}% against {best_id}.", "level": "Review",
                    "program": row["program"], "detected": now.isoformat(), "records": f"{record_id}|{best_id or ''}",
                }])], ignore_index=True)

        audit_entry = {"time": now.strftime("%H:%M:%S"), "date": now.strftime("%Y-%m-%d"), "event": "Watched File Ingested", "detail": f"{source_name}: {decisions}", "type": "ingest", "user": "file_watcher"}
        audits = pd.concat([pd.DataFrame([audit_entry]), audits], ignore_index=True)
        if not dry_run:
            for destination, frame in [(beneficiaries_path, beneficiaries), (source_path, source_records), (audit_path, audits), (anomaly_path, anomalies)]:
                atomic_csv(frame, destination)
            processed_dir.mkdir(parents=True, exist_ok=True)
            shutil.move(str(file_path), str(processed_dir / file_path.name))
        print(f"Processed {source_name}: {decisions}{' (dry-run)' if dry_run else ''}")
        return True
    except Exception as error:
        print(f"Rejected {file_path.name}: {error}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Inuka near-real-time CSV ingestion watcher")
    parser.add_argument("--once", action="store_true", help="process current files once and exit")
    parser.add_argument("--dry-run", action="store_true", help="validate and score without writing or moving files")
    parser.add_argument("--interval", type=float, default=2.0, help="poll interval in seconds")
    args = parser.parse_args()
    data_dir, incoming_dir, _ = paths()
    data_dir.mkdir(parents=True, exist_ok=True); incoming_dir.mkdir(parents=True, exist_ok=True)
    print(f"Watching {incoming_dir} using data store {data_dir}")
    while True:
        for file_path in sorted(incoming_dir.glob("*.csv")):
            process_file(file_path, args.dry_run)
        if args.once:
            return
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
