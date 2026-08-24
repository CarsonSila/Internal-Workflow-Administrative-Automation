import os
import random
import uuid
import pandas as pd
from datetime import datetime, timedelta

def generate_data():
    os.makedirs("/workspace/scratch/mock_data", exist_ok=True)
    
    first_names = ["John", "Mary", "Joseph", "Grace", "David", "Esther", "James", "Ruth", "Samuel", "Mercy", 
                   "Peter", "Faith", "Paul", "Alice", "Francis", "Sarah", "Daniel", "Beatrice", "Charles", "Florence"]
    last_names = ["Kamau", "Mwangi", "Njoroge", "Odhiambo", "Otieno", "Ochieng", "Wanjiku", "Maina", "Kimani", "Nyambura",
                  "Kiprop", "Cheruiyot", "Koech", "Wafula", "Simiyu", "Nekesa", "Juma", "Onyango", "Awuor", "Musa"]
    locations = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi", "Kitale", "Garissa", "Nyeri"]
    programs = ["Scholarship", "Plus", "Vocational", "Tech"]
    statuses = ["Verified", "Review", "Conflict"]
    
    random.seed(42)
    
    # 1. Beneficiaries
    num_beneficiaries = 100
    beneficiaries = []
    
    for i in range(num_beneficiaries):
        b_id = f"BEN-{10000 + i}"
        first = random.choice(first_names)
        last = random.choice(last_names)
        name = f"{first} {last}"
        national_id = str(random.randint(10000000, 99999999))
        
        # 1-3 programs
        num_progs = random.choice([1, 1, 2, 3])
        chosen_progs = random.sample(programs, num_progs)
        programs_str = "|".join(chosen_progs)
        
        confidence = random.randint(70, 100)
        health = random.randint(65, 100)
        status = random.choice(statuses)
        
        phone = f"+2547{random.randint(10000000, 99999999)}"
        email = f"{first.lower()}.{last.lower()}@example.com"
        location = random.choice(locations)
        
        beneficiaries.append({
            "beneficiary_id": b_id,
            "name": name,
            "national_id": national_id,
            "programs": programs_str,
            "confidence": confidence,
            "health": health,
            "status": status,
            "phone": phone,
            "email": email,
            "location": location
        })
        
    df_beneficiaries = pd.DataFrame(beneficiaries)
    df_beneficiaries.to_csv("/workspace/scratch/mock_data/beneficiaries.csv", index=False)
    print("Generated beneficiaries.csv")
    
    # 2. Source Records
    records = []
    record_counter = 1
    
    for _, row in df_beneficiaries.iterrows():
        b_id = row["beneficiary_id"]
        progs = row["programs"].split("|")
        
        # Generate 1 to 3 source records per beneficiary to simulate duplicates/source matches
        for p in progs:
            # Maybe 1 or 2 records for this program (duplicates!)
            num_recs = random.choice([1, 1, 2])
            for _ in range(num_recs):
                rec_id = f"REC-{p[:3].upper()}-{10000 + record_counter}"
                record_counter += 1
                
                # Introduce slight name variations or typos in source records sometimes
                rec_name = row["name"]
                if random.random() < 0.15:
                    rec_name = rec_name.replace("a", "o").replace("e", "i") # Simulate typo
                
                rec_phone = row["phone"]
                if random.random() < 0.1:
                    rec_phone = rec_phone.replace("+254", "0") # Standardize variations
                
                rec_national_id = row["national_id"]
                if random.random() < 0.05:
                    rec_national_id = "" # Null/missing value
                    
                rec_location = row["location"]
                if random.random() < 0.1:
                    rec_location = rec_location.lower() # Formatting issue
                
                days_ago = random.randint(1, 45)
                ingested_at = (datetime.now() - timedelta(days=days_ago)).isoformat()
                
                data_quality_score = random.randint(50, 100)
                
                records.append({
                    "record_id": rec_id,
                    "beneficiary_id": b_id,
                    "name": rec_name,
                    "national_id": rec_national_id,
                    "phone": rec_phone,
                    "email": row["email"],
                    "location": rec_location,
                    "program": p,
                    "ingested_at": ingested_at,
                    "data_quality_score": data_quality_score
                })
                
    df_source_records = pd.DataFrame(records)
    df_source_records.to_csv("/workspace/scratch/mock_data/source_records.csv", index=False)
    print("Generated source_records.csv")
    
    # 3. Audit Logs
    audit_events = []
    event_types = ["ingest", "ai", "match", "merge", "update", "quality", "anomaly"]
    event_descriptions = {
        "ingest": "Source record ingested",
        "ai": "ML deduplication algorithm triggered",
        "match": "High-confidence duplicate record found",
        "merge": "Records merged into master identity",
        "update": "Master beneficiary profile updated",
        "quality": "Data quality analysis completed",
        "anomaly": "Anomalous record flagged for review"
    }
    
    users = ["system", "admin_kamau", "director_grace", "eval_user"]
    
    for i in range(120):
        days_ago = random.randint(0, 30)
        dt = datetime.now() - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
        date_str = dt.strftime("%Y-%m-%d")
        time_str = dt.strftime("%H:%M:%S")
        
        ev_type = random.choice(event_types)
        event = event_descriptions[ev_type]
        user = "system" if ev_type in ["ingest", "ai", "quality"] else random.choice(users)
        
        b_ref = random.choice(beneficiaries)["beneficiary_id"]
        detail = f"Processed operations for identity {b_ref}."
        
        audit_events.append({
            "time": time_str,
            "date": date_str,
            "event": event,
            "detail": detail,
            "type": ev_type,
            "user": user
        })
        
    df_audit = pd.DataFrame(audit_events)
    # Sort chronologically
    df_audit = df_audit.sort_values(by=["date", "time"], ascending=[False, False])
    df_audit.to_csv("/workspace/scratch/mock_data/audit_logs.csv", index=False)
    print("Generated audit_logs.csv")
    
    # 4. Anomalies
    # Use exact values matching the requirements
    anomalies = [
        {
            "id": "ANO-001",
            "title": "7 beneficiaries share the same phone number",
            "detail": "+254 700 123 456 appears across 7 distinct records in 3 different programs. Potential guardian shared or data entry error.",
            "level": "Anomaly",
            "program": "Cross-program",
            "detected": datetime.now().isoformat(),
            "records": "REC-SCH-00140|REC-TEC-00082|REC-VOC-00311"
        },
        {
            "id": "ANO-002",
            "title": "Unusual duplicate cluster detected",
            "detail": "A cluster of 14 records in Vocational shows unusually high mutual similarity scores (>85%). Potential bulk import issue.",
            "level": "Anomaly",
            "program": "Vocational",
            "detected": (datetime.now() - timedelta(hours=10)).isoformat(),
            "records": "REC-VOC-00201|REC-VOC-00202|REC-VOC-00203"
        },
        {
            "id": "ANO-003",
            "title": "Potential identity conflict: 3 records",
            "detail": "Three records have identical National IDs but different names and dates of birth. Needs human verification of documents.",
            "level": "Review",
            "program": "Scholarship",
            "detected": (datetime.now() - timedelta(hours=6)).isoformat(),
            "records": "REC-SCH-00731|REC-SCH-00732|REC-SCH-00733"
        },
        {
            "id": "ANO-004",
            "title": "Spike in new registrations from one location",
            "detail": "108 new registrations from 'Mombasa, Port Area' ingested in a 2-hour window. 3.4x above normal rate.",
            "level": "Review",
            "program": "Plus",
            "detected": (datetime.now() - timedelta(hours=20)).isoformat(),
            "records": ""
        },
        {
            "id": "ANO-005",
            "title": "Name normalization resolved 412 variants",
            "detail": "AI engine normalized 412 name variations causing false-negative duplicate detection (e.g. Wanjiru/Wanjiku, hyphenated surnames).",
            "level": "Normal",
            "program": "All programs",
            "detected": (datetime.now() - timedelta(hours=3)).isoformat(),
            "records": ""
        }
    ]
    df_anomalies = pd.DataFrame(anomalies)
    df_anomalies.to_csv("/workspace/scratch/mock_data/anomalies.csv", index=False)
    print("Generated anomalies.csv")
    
    # 5. Quality Dimensions
    dimensions = [
        {"dimension": "Completeness", "value": 94, "issues": 128},
        {"dimension": "Validity", "value": 89, "issues": 215},
        {"dimension": "Uniqueness", "value": 92, "issues": 164},
        {"dimension": "Consistency", "value": 91, "issues": 110},
        {"dimension": "Freshness", "value": 98, "issues": 32}
    ]
    df_dims = pd.DataFrame(dimensions)
    df_dims.to_csv("/workspace/scratch/mock_data/quality_dimensions.csv", index=False)
    print("Generated quality_dimensions.csv")
    
    print("Mock datasets successfully built under /workspace/scratch/mock_data!")

if __name__ == "__main__":
    generate_data()
