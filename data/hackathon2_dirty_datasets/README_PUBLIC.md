# Hackathon 2 — Dirty Multi-Programme Datasets

## Challenge Overview

Four beneficiary datasets from **four independently maintained programme registration systems** are provided. The programmes are:

| Programme | File | Rows |
|---|---|---|
| Inuka Scholarship Program | `inuka_scholarship_program.csv` | 1,500 |
| Inuka Vocational Youth Empowerment Programme | `inuka_vocational_youth_empowerment_programme.csv` | 1,500 |
| Inuka Plus | `inuka_plus.csv` | 1,500 |
| Inuka Tech Fellowship | `inuka_tech_fellowship.csv` | 1,500 |

**Total: 6,000 public records.**

## Goal

Because these systems were operated independently, the same beneficiary may appear in more than one programme, and the information recorded about them may differ between systems. Your task is to:

1. Profile and assess the quality of each dataset.
2. Clean, standardise and normalise the data.
3. Identify duplicate registrations **within** each programme.
4. Identify the **same beneficiary across programmes** (entity resolution).
5. Build an integrated, de-duplicated view of the beneficiary population.

## Common Fields

Each dataset contains a beneficiary identification structure:

- `beneficiary_id` — record identifier *within* that programme
- `full_name` (or equivalent)
- national ID number (column name varies by programme)
- phone / mobile / telephone
- email
- date of birth
- gender
- county, sub-county, ward
- address
- registration / enrollment date
- status

**Note:** column names differ slightly between programmes because each system was built separately.

## Programme-Specific Fields

| Programme | Extra fields |
|---|---|
| Scholarship | school_name, education_level, course, scholarship_amount, academic_year |
| Vocational | training_center, training_area, skill_category, training_status, completion_status |
| Inuka Plus | household_size, employment_status, monthly_income, support_type, beneficiary_category |
| Tech Fellowship | tech_track, cohort, mentor, project_area, completion_status |

## Data Quality Expectations

Real registration data is messy. Expect:

- Missing or null values (represented in several ways)
- Inconsistent formatting (names, dates, phone numbers, IDs, addresses)
- Typos and transcription mistakes
- Duplicate / near-duplicate registrations
- Different values for the same person across programmes
- Occasionally conflicting location information

Attributes differ in reliability. When identifying and consolidating the same beneficiary across programmes, **investigate which attributes provide the strongest, most stable linkage** — some attributes are more trustworthy than others.

## Notes

- The four files use CSV format and can be loaded directly with `pandas.read_csv`.
- Rows are in arbitrary order.
- This challenge mirrors a real-world data-integration problem: no single dataset is "the master" — you must reconcile them.

Good luck!
