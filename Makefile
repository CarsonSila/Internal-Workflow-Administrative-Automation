.PHONY: help dev backend frontend test lint seed migrate install clean

help:
	@echo "Available commands:"
	@echo "  make install    - Install all dependencies (backend + frontend)"
	@echo "  make dev        - Run backend and frontend in dev mode"
	@echo "  make backend    - Run only backend (uvicorn with reload)"
	@echo "  make frontend   - Run only frontend (vite dev server)"
	@echo "  make test       - Run backend tests"
	@echo "  make lint       - Run linters (ruff, mypy, eslint)"
	@echo "  make seed       - Generate fresh mock data"
	@echo "  make migrate    - Run database migrations (when using DB)"
	@echo "  make clean      - Clean build artifacts"

install:
	pip install -r requirements.txt
	cd frontend && npm install

dev:
	@echo "Starting backend and frontend..."
	@make -j2 backend frontend

backend:
	uvicorn main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm run dev

test:
	pytest -v --tb=short

lint:
	ruff check .
	mypy .
	cd frontend && npm run lint

seed:
	python -m app.scripts.seed

migrate:
	alembic upgrade head

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf .pytest_cache .mypy_cache .ruff_cache 2>/dev/null || true
	cd frontend && rm -rf node_modules dist .eslintcache 2>/dev/null || true

generate-api:
	cd frontend && npm run generate:api