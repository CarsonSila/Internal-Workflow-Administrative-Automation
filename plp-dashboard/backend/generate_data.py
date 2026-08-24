import pandas as pd
import random
import uuid
from datetime import datetime, timedelta
from faker import Faker

# Initialize Faker with Kenyan locale if available, fallback to en_US
try:
    fake = Faker('en_KE')
except Exception:
    fake = Faker('en_US')

# --- Kenyan Realistic Data Sets ---
KENYAN_COUNTIES = [
    "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Machakos", 
    "Meru", "Nyeri", "Kakamega", "Bungoma", "Busia", "Kericho", "Nandi", 
    "Kiambu", "Kajiado", "Garissa", "Kilifi", "Lamu", "Tana River", 
    "Turkana", "West Pokot", "Trans Nzoia", "Uasin Gishu", "Embu", 
    "Isiolo", "Kitui", "Makueni", "Nyandarua", "Laikipia"
]

KENYAN_TOWNS = [
    "Westlands", "Kasarani", "Embakasi", "Lang'ata", "Dagoretti", "Kibra",
    "Nyali", "Changamwe", "Likoni", "Kisumu Central", "Kisumu East",
    "Nakuru Town", "Naivasha", "Gilgil", "Molo", "Kapenguria", "Kitale",
    "Webuye", "Bungoma Town", "Kakamega Town", "Kericho Town", "Sotik",
    "Nyeri Town", "Karatina", "Othaya", "Embu Town", "Chuka", "Runyenjes",
    "Machakos Town", "Athi River", "Kangundo", "Mwingi", "Kitui Town",
    "Garissa Town", "Wajir", "Mandera", "Marsabit", "Lodwar", "Lokichoggio"
]

# Specific apartment/street names (Kenyan style)
KENYAN_STREETS = [
    "Moi Avenue", "Kenyatta Avenue", "Jomo Kenyatta Highway", "Uhuru Highway",
    "Tom Mboya Street", "River Road", "Ngong Road", "Waiyaki Way", "Thika Road",
    "Jogoo Road", "Langata Road", "Mombasa Road", "Kisumu Road", "Oginga Odinga Street",
    "Nyerere Road", "Kenyatta Street", "Koinange Street", "Kimathi Street"
]

# Kenyan Prefixes for phone numbers
PHONE_PREFIXES = ["0700", "0701", "0710", "0711", "0720", "0721", "0722", "0723", "0730", "0733", "0740", "0750", "0760", "0770", "0780", "0790"]

# Constant mapping for program colors
PROGRAMS = ["Scholarship", "Plus", "Vocational", "Tech"]
PROGRAM_CODES = {"Scholarship": "SCH", "Plus": "PLU", "Vocational": "VOC", "Tech": "TEC"}
STATUSES = ["Verified", "Review", "Conflict"]
QUALITY_DIMS = ["Completeness", "Validity", "Uniqueness", "Consistency", "Freshness"]


def random_kenyan_location():
    """Generates a realistic Kenyan 'Location, Town, County' string."""
    town = random.choice(KENYAN_TOWNS)
    county = random.choice(KENYAN_COUNTIES)
    street = random.choice(KENYAN_STREETS)
    # 50% chance to include the street, to add variety
    if random.random() > 0.5:
        return f"{town}, {street}, {county}"
    return f"{town}, {county}"


def random_kenyan_phone():
    """Generates a realistic Kenyan mobile phone number."""
    prefix = random.choice(PHONE_PREFIXES)
    # Generate 7 more digits
    suffix = ''.join([str(random.randint(0, 9)) for _ in range(7)])
    return f"+254 {prefix} {suffix[:3]} {suffix[3:]}"


def random_past_date(years_back=5):
    return fake.date_between(start_date=f'-{years_back}y', end_date='today').isoformat()


def generate_beneficiaries(num_beneficiaries=1500):
    """Generates the master identity table (Beneficiary 360) with Kenyan data."""
    beneficiaries = []
    nids = [fake.unique.random_number(digits=8) for _ in range(num_beneficiaries)]

    for i in range(num_beneficiaries):
        # Mix Kenyan names from Faker
        first_name = fake.first_name()
        last_name = fake.last_name()
        middle_name = fake.first_name() if random.random() > 0.5 else ""
        full_name = f"{first_name} {middle_name} {last_name}".strip()

        enrolled_programs = random.sample(PROGRAMS, k=random.randint(1, 3))

        confidence = random.randint(85, 100)
        health = random.randint(60, 99)
        status = "Verified"
        if health < 70:
            status = "Conflict"
        elif health < 80:
            status = "Review"

        beneficiaries.append({
            "beneficiary_id": f"BEN-{i+1:05d}",
            "name": full_name,
            "national_id": str(nids[i]),
            "dob": fake.date_of_birth(minimum_age=16, maximum_age=45).isoformat(),
            "programs": "|".join(enrolled_programs),
            "confidence": confidence,
            "health": health,
            "status": status,
            # Kenyan Phone
            "phone": random_kenyan_phone(),
            "email": fake.email(),
            # Kenyan Location
            "location": random_kenyan_location()
        })
    return pd.DataFrame(beneficiaries)


def generate_source_records(beneficiaries_df, num_records_per_beneficiary_avg=4):
    """Generates the raw ingested records table (Identity Explorer, Data Quality)"""
    records = []
    ben_dict = beneficiaries_df.set_index('beneficiary_id').to_dict('index')

    for _, row in beneficiaries_df.iterrows():
        num_records = random.randint(2, 8)

        for i in range(num_records):
            program = random.choice(PROGRAMS)
            is_duplicate = random.random() < 0.3

            if is_duplicate and i > 0:
                record_name = row['name']
                record_email = row['email']
                record_location = row['location']
            else:
                name_parts = row['name'].split()
                if len(name_parts) >= 2 and random.random() < 0.2:
                    record_name = f"{name_parts[0]} {name_parts[1][0]}. {' '.join(name_parts[2:])}" if len(name_parts) > 2 else f"{name_parts[0]} {name_parts[1][0]}."
                else:
                    record_name = row['name']

                record_email = fake.email() if random.random() > 0.5 else row['email']
                record_location = random_kenyan_location() if random.random() > 0.3 else row['location']

            records.append({
                "record_id": f"REC-{PROGRAM_CODES[program]}-{len(records)+1:05d}",
                "beneficiary_id": row['beneficiary_id'],
                "name": record_name,
                "national_id": row['national_id'],
                "dob": row['dob'],
                # Kenyan Phone
                "phone": row['phone'],
                "email": record_email,
                "location": record_location,
                "program": program,
                "ingested_at": random_past_date(years_back=3),
                "data_quality_score": random.randint(70, 100)
            })

    return pd.DataFrame(records)


def generate_audit_logs(beneficiaries_df, num_events=500):
    """Generates the Audit Trail events"""
    events = []
    event_types = ["ingest", "ai", "match", "merge", "update", "quality", "anomaly"]
    event_descriptions = [
        "Record received", "Identity matching initiated", "High confidence match found",
        "Merge approved", "Master identity updated", "Data quality scan completed",
        "Daily ingestion started", "Anomaly report generated"
    ]

    start_date = datetime.now() - timedelta(days=30)

    for _ in range(num_events):
        event_time = start_date + timedelta(seconds=random.randint(0, 2592000))
        e_type = random.choice(event_types)
        event = {
            "time": event_time.strftime("%H:%M:%S"),
            "date": event_time.strftime("%Y-%m-%d"),
            "event": random.choice(event_descriptions),
            "detail": f"Processed {random.randint(1, 5000)} records. Confidence: {random.randint(60, 100)}%",
            "type": e_type,
            "user": "system" if random.random() > 0.2 else "PLP AI Engine"
        }

        if e_type == "merge":
            ben = random.choice(beneficiaries_df['beneficiary_id'])
            event['detail'] = f"Auto-merged records into {ben}"
        elif e_type == "quality":
            event['detail'] = f"Overall health: {random.randint(85, 95)}%. {random.randint(1000, 5000)} records scanned."

        events.append(event)

    return pd.DataFrame(events)


def generate_anomalies(records_df):
    """Generates anomaly records, wired to REAL record_ids from records_df."""
    def sample_ids(program_code, n):
        pool = records_df[records_df['record_id'].str.contains(f"-{program_code}-")]['record_id']
        if len(pool) < n:
            pool = records_df['record_id']
        return "|".join(pool.sample(n=min(n, len(pool)), random_state=random.randint(0, 10_000)).tolist())

    anomalies = [
        {
            "id": "ANO-001",
            "title": "7 beneficiaries share the same phone number",
            "detail": "A single phone number appears across 7 distinct records in 3 different programs. Potential guardian-shared contact or a data entry error.",
            "level": "Anomaly",
            "program": "Cross-program",
            "detected": datetime.now().isoformat(),
            "records": sample_ids("SCH", 3) + "|" + sample_ids("TEC", 2) + "|" + sample_ids("VOC", 2),
        },
        {
            "id": "ANO-002",
            "title": "Unusual duplicate cluster detected",
            "detail": "A cluster of records in Vocational shows unusually high mutual similarity scores (>85%). Potential bulk import issue.",
            "level": "Anomaly",
            "program": "Vocational",
            "detected": (datetime.now() - timedelta(hours=10)).isoformat(),
            "records": sample_ids("VOC", 3),
        },
        {
            "id": "ANO-003",
            "title": "Potential identity conflict: 3 records",
            "detail": "Three records have identical National IDs but different names and dates of birth. Needs human verification of documents.",
            "level": "Review",
            "program": "Scholarship",
            "detected": (datetime.now() - timedelta(hours=6)).isoformat(),
            "records": sample_ids("SCH", 3),
        },
        {
            "id": "ANO-004",
            "title": "Spike in new registrations from one location",
            "detail": "A burst of new registrations from one location was ingested in a 2-hour window, 3.4x above the normal rate.",
            "level": "Review",
            "program": "Plus",
            "detected": (datetime.now() - timedelta(hours=20)).isoformat(),
            "records": sample_ids("PLU", 2),
        },
        {
            "id": "ANO-005",
            "title": "Name normalization resolved 412 variants",
            "detail": "AI engine normalized 412 name variations causing false-negative duplicate detection (e.g. Wanjiru/Wanjiku, hyphenated surnames).",
            "level": "Normal",
            "program": "All programs",
            "detected": (datetime.now() - timedelta(hours=3)).isoformat(),
            "records": "",
        }
    ]
    return pd.DataFrame(anomalies)


def main():
    print("Generating Power Learn Project mock data (Kenyan Dataset)...")

    ben_df = generate_beneficiaries(num_beneficiaries=1500)
    records_df = generate_source_records(ben_df, num_records_per_beneficiary_avg=6)
    audit_df = generate_audit_logs(ben_df, num_events=300)
    anomalies_df = generate_anomalies(records_df)

    dims_data = []
    for dim in QUALITY_DIMS:
        dims_data.append({
            "dimension": dim,
            "value": random.randint(85, 98),
            "issues": random.randint(100, 3000)
        })
    quality_df = pd.DataFrame(dims_data)

    import os
    os.makedirs("mock_data", exist_ok=True)

    ben_df.to_csv("mock_data/beneficiaries.csv", index=False)
    records_df.to_csv("mock_data/source_records.csv", index=False)
    audit_df.to_csv("mock_data/audit_logs.csv", index=False)
    anomalies_df.to_csv("mock_data/anomalies.csv", index=False)
    quality_df.to_csv("mock_data/quality_dimensions.csv", index=False)

    print(f"Data generated successfully in 'mock_data' folder!")
    print(f"   - {len(ben_df)} Beneficiaries (All Kenyan Locations & Phones)")
    print(f"   - {len(records_df)} Source Records")
    print(f"   - {len(audit_df)} Audit Logs")
    print(f"   - {len(anomalies_df)} Anomalies")


if __name__ == "__main__":
    main()
