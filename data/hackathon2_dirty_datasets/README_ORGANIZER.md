# Hackathon 2 — Organiser README (Ground Truth)

This folder contains **organiser-only** ground-truth files. Do **not** distribute them to participants.

## Ground-Truth Files

| File | Description |
|---|---|
| `canonical_master_people.csv` | Clean canonical identity for every synthetic person |
| `ground_truth_record_mapping.csv` | Maps every public record to its canonical person |
| `cross_programme_entity_truth.csv` | Which canonical people appear in multiple programmes |
| `duplicate_truth.csv` | Duplicate / near-duplicate relationships |

## Design Summary

- **Canonical population:** ~3,000 synthetic people created first; every public record derives from exactly one canonical person.
- **National ID is the authoritative identity key.** It is stable for each canonical person. The public datasets apply deliberate *formatting* variations (spaces, dashes, leading/trailing spaces) and only a small, controlled number of genuine transcription errors (~2%). Other attributes (name, phone, email, address) are intentionally allowed to drift between programmes and across duplicate registrations.
- **Cross-programme overlap** is controlled via the assignment step: people appear in 1–4 programmes. `cross_programme_entity_truth.csv` records the membership sets.
- **Duplicates** target 15–25% of rows per programme, as a mix of exact, formatting, near and updated-record duplicates.
- **False matches** (~5% of rows) are genuinely different people crafted to share a name, phone digits or email username with an existing beneficiary — they must NOT be merged. Their canonical IDs differ.
- **Dirty categories** target 15–25% per programme and intentionally overlap (a single record can have multiple issues). Geography issues are split ~10–11% formatting and ~5% genuine wrong-combination errors.

## Validation Methodology

The generator performs automated validation on every run:

- Row count == 1,500 per programme (hard requirement)
- Required columns present
- Duplicate % within [15%, 25%]
- Each dirty category within the configured range
- Geography % within its range
- No ground-truth columns (e.g. `canonical_person_id`) leaked into public CSVs
- Record-list length consistent with the exported DataFrames

If any check fails the generator regenerates (up to `max_generation_attempts`). Only fully-validated datasets are written to disk.

## Reproducibility

`python generate_datasets.py --seed 42` always reproduces the exact same datasets. Change `--seed` to produce reproducible variants. All randomness is seeded at the start of the run.

## Ground-Truth Schemas

### canonical_master_people.csv
`canonical_person_id, canonical_full_name, canonical_national_id, canonical_phone, canonical_email, canonical_dob, canonical_gender, canonical_county, canonical_sub_county, canonical_ward, canonical_address`

### ground_truth_record_mapping.csv
`programme, beneficiary_id, canonical_person_id, canonical_national_id`

### cross_programme_entity_truth.csv
`canonical_person_id, canonical_national_id, programme_count, programmes`

### duplicate_truth.csv
`programme, record_id_1, record_id_2, canonical_person_id, canonical_national_id, duplicate_type`
