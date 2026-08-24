# Inuka Unified Beneficiary Intelligence Platform

Intelligent deduplication & identity resolution API for KPC Inuka Fellowship Hackathon Stage 2.

## 🏗️ Architecture

- **Backend**: FastAPI (Python) - RESTful API for beneficiary data management, deduplication, and identity resolution
- **Frontend**: React + Vite + TypeScript + Tailwind CSS - Interactive dashboard for data visualization and management

## 📁 Project Structure

```
Internal-Workflow-Administrative-Automation/
├── main.py                 # FastAPI application entry point
├── auth.py                 # Authentication & authorization
├── database.py             # Database models & connections
├── etl_pipeline.py         # ETL pipeline for data processing
├── file_watcher.py         # File system watcher for auto-ingestion
├── generate_mock_data.py   # Mock data generation
├── generate_datasets.py    # Dataset generation utilities
├── test_api.py             # API tests
├── requirements.txt        # Python dependencies
├── Dockerfile              # Backend Docker configuration
├── docker-compose.yml      # Multi-container orchestration
├── frontend/               # React frontend application
│   ├── src/                # React source code
│   ├── package.json        # Frontend dependencies
│   ├── vite.config.ts      # Vite configuration
│   ├── tailwind.config.js  # Tailwind CSS configuration
│   └── Dockerfile          # Frontend Docker configuration
├── data/                   # Data storage
└── UAT_EVIDENCE.md         # User Acceptance Testing evidence
```

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Docker (optional)

### Backend Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run the FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at `http://localhost:8000`
API Documentation at `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

### Docker Deployment

```bash
# Build and run all services
docker-compose up --build
```

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
MOCK_DATA_DIR=./mock_data
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## 📚 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Beneficiaries
- `GET /beneficiaries` - List all beneficiaries
- `GET /beneficiaries/{id}` - Get beneficiary by ID
- `POST /beneficiaries` - Create new beneficiary
- `PUT /beneficiaries/{id}` - Update beneficiary
- `DELETE /beneficiaries/{id}` - Delete beneficiary

### Deduplication
- `POST /deduplicate` - Run deduplication algorithm
- `GET /duplicates` - Get potential duplicates

### Analytics
- `GET /analytics/summary` - Get analytics summary
- `GET /analytics/quality` - Get data quality metrics

## 🧪 Testing

```bash
# Run backend tests
python test_api.py

# Run frontend linting
cd frontend && npm run lint
```

## 📦 Deployment

### Frontend (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Deploy

### Backend (Railway/Render/Fly.io)

1. Create new service
2. Connect GitHub repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables
6. Deploy

# Inuka SmartMatch Integration Guide

## Overview

This service enables seamless integration of the **Inuka SmartMatch** feature into your frontend and backend systems. Developed for the KPC Inuka Fellowship Hackathon, SmartMatch consists of two parallel-developed components designed to work together:

### Components
- **SmartMatch Console** (Frontend): React/TypeScript dashboard featuring Overview, Identity Explorer, Duplicate Resolution, Data Quality, Beneficiary 360, Anomalies, Audit Trail, Data Sources, and Settings.
- **Inuka Unified Beneficiary Intelligence API** (Backend): FastAPI service (`main.py`) providing identity matching, deduplication, data quality scoring, anomaly detection, audit logging, financial reconciliation, and KDPA-compliant PII masking.

---

## Architecture & Integration

### Shared Data Models
The API returns Pydantic models that map one-to-one with the frontend's TypeScript models. This common structure ensures minimal migration effort and straightforward integration.

### Authentication
- **Endpoint:** `POST /api/auth/login`
- **Method:** Issues a bearer JWT
- **Authorization:** Role-gated endpoints (admin, manager) validate permissions using `require_role`

---

## API Endpoints & Features

| Domain | Endpoints | Functionality |
|--------|-----------|---------------|
| **Overview** | `GET /api/overview/metrics`<br>`GET /api/overview/charts`<br>`GET /api/overview/programs` | Live counts, chart series (duplicated by program, confidence buckets, 30-day timeline), per-program record counts |
| **Identity Explorer** | `GET /api/identities` | Searchable, status-filterable beneficiary list with confidence, health, program membership, and KDPA masking |
| **Beneficiary 360** | `GET /api/beneficiaries/{id}`<br>`GET /api/beneficiaries/{id}/timeline` | Full profile + merged chronological timeline of ingestion and audit events |
| **Duplicate Resolution** | `POST /api/duplicates/compare`<br>`POST /api/duplicates/resolve` | Field-by-field fuzzy match scoring (`rapidfuzz`) with merge/reject actions updating CSVs and logging results |
| **Data Quality** | `GET /api/quality/dimensions`<br>`GET /api/quality/trend` | Five quality dimensions with live values and 30-day trend data |
| **Anomalies** | `GET /api/anomalies` | Detected clusters grounded to real, loaded record IDs |
| **Audit Trail** | `GET /api/audit` | Full event log, pre-grouped by date |
| **Governance** | `POST /api/governance/anonymise` | Anonymize KDPA endpoints for PII masking (admin/manager only) |
| **Financial Reconciliation** | `POST /api/financial/reconciliation/settings` | Tie duplicate detection to stipend disbursement — prevent leakage, hold payments, adjust mismatch tolerance |
| **Notifications** | `POST /api/notifications/dispatch` | Mock SMS/WhatsApp dispatch, logged to audit trail |

---

## Console-to-API Mapping

| Console Component | Currently Uses | Maps To |
|-------------------|----------------|---------|
| **Overview** | `METRICS`, `PROGRAMS` placeholders | `/overview/metrics`, `/overview/programs`, `/overview/charts` |
| **Identity Explorer** | `RECORDS`, client-side filter | `/identities?status=&search=` (server-side filtering) |
| **Duplicate Resolution** | Static `FIELDS` scores | `/duplicates/compare` and `/duplicates/resolve` |
| **Data Quality** | `DIMS`, `TREND_30D` | `/quality/dimensions`, `/quality/trend` |
| **Beneficiary 360** | Static profile, `TIMELINE` | `/beneficiaries/{id}`, `/beneficiaries/{id}/timeline` |
| **Anomalies** | Array of anomalies | `/anomalies` |
| **Audit Trail** | `EVENTS` array | `/audit` (CSV export remains client-side) |

> **Note:** Settings thresholds (`autoMergeAbove`, `reviewAbove`, `separateBelow`) are local-only console settings. The API's `mismatch_threshold` under `/financial/reconciliation/settings` serves a similar but distinct purpose.

---

## Integration Strategy

### 1. Read-Only Endpoints (Phase 1)
- Make `fetch` calls to read-only endpoints first (Overview, Identity Explorer, Data Quality, Anomalies, Audit Trail)
- Base URL from `VITE_API_BASE_URL`
- Store placeholder arrays as fallbacks when API is unavailable

### 2. Duplicate Resolution (Phase 2)
- Implement `merge` and `reject` actions for duplicate resolution
- Use actual API responses instead of timer-based animations
- Maintain existing merge animation and outcome card UX

### 3. Authentication (Phase 3)
- Replace static "Admin" header avatar with real login authentication
- Store bearer token for role-gated calls (`/duplicates/resolve`, `/governance/anonymise`, `/financial/*`)
- Display `current_user.full_name` in header

### 4. New Views & Features
- **Financial Reconciliation:** Add view to existing Settings page
- **Governance (KDPA Masking):** Add toggle to Settings page
- **Data Sources:** Connect "Configure Source" modal to upload endpoint (future joint feature)

---

## Key Decisions & Considerations

### Threshold Scope
- **Console thresholds:** Three merge thresholds control duplicate resolution
- **API `mismatch_threshold`:** Controls payment holding based on financial risk tolerance
- **Decision:** Keep as distinct models since matching confidence and financial risk tolerance serve different purposes

### Status Mapping
- API emits `overall_confidence` (0–100) matching console expectations
- No need to recompute; console should read directly from `/duplicates/compare`

### Future Enhancements
- **Data Sources Upload:** No ingestion endpoint currently exists; this will be added as a joint feature to Data Sources' upload UI

### Program Short Codes
Both systems use consistent short codes:
- `SCH` (Program #2)
- `PLU` (Program #3)  
- `VOC` (Program #4)
- `TEC` (Program #5)
- *Update `convert_to_short_code` when adding new programs*

---

## Why This Integration Works

The system was designed with the frontend explicitly in mind:
- **Matching Schemas:** Schema names and status words (Verified/Review/Conflict) match console displays
- **Consistent Masking:** KDPA masking format identical to console implementation
- **Replaceable Placeholders:** Console built with replaceable placeholders to accommodate a real backend without component reorganization
- **Common Language:** Both sides share data models and business logic understanding

The console and API are already on common ground—this document serves as the intentional plan to bring them together seamlessly.

---

## Getting Started

### Prerequisites
- Node.js (for frontend console)
- Python 3.8+ (for backend API)
- Environment variables configured

### Environment Variables
```env
VITE_API_BASE_URL=http://localhost:8000
```

## 🔐 Authentication

The API uses JWT-based authentication with role-based access control:
- **Admin**: Full access to all endpoints
- **Analyst**: Read access to beneficiaries and analytics
- **Viewer**: Read-only access to dashboard

## 📊 Features

- **Intelligent Deduplication**: Fuzzy matching with RapidFuzz for identity resolution
- **Real-time Dashboard**: Interactive charts with Recharts
- **File Watcher**: Automatic data ingestion from CSV drops
- **Audit Logging**: Complete audit trail for compliance
- **Data Quality Metrics**: Multi-dimensional quality scoring
- **Role-based Access Control**: Secure multi-user environment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- KPC Inuka Fellowship Hackathon
- FastAPI & React communities
- RapidFuzz for fuzzy matching
#   f o r c e   r e d e p l o y  
 