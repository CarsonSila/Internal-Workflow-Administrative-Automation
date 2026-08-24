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