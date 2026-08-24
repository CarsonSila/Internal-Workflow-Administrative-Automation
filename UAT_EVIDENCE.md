# Inuka Unified Platform UAT Evidence

Date: 2026-08-21
Environment: Local FastAPI + Vite, generated mock data

| ID | Acceptance scenario | Expected result | Evidence |
|---|---|---|---|
| UAT-01 | Admin logs in | Dashboard opens with admin clearance | `/api/auth/login` returns 200 |
| UAT-02 | Manager attempts protected resolution | Request is rejected | Resolver returns 403 |
| UAT-03 | Identity search and status filter | Matching records are returned | `/api/identities` returns 200 |
| UAT-04 | KDPA masking toggle | National IDs and phones are masked | `/api/governance/anonymise` plus identity response |
| UAT-05 | Financial reconciliation | Leakage and at-risk metrics load | `/api/financial/reconciliation` returns 200 |
| UAT-06 | Reconciliation rules | Admin can update threshold and hold state | Settings POST returns 200 |
| UAT-07 | Notification dispatch | SMS/WhatsApp request is queued and audit logged | `/api/notifications/dispatch` returns `queued` |
| UAT-08 | Incoming CSV watcher | File is scored, audited, and archived | `python file_watcher.py --once --dry-run` |
| UAT-09 | Frontend production build | Vite build completes | `npm run build` |
| UAT-10 | Container startup | Backend and frontend expose ports 8000 and 5173 | `docker compose up --build` |

## Known limitation
Notification delivery is mock queued mode. Configure a provider adapter and secrets before sending real SMS or WhatsApp messages.
