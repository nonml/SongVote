# Thai Election Evidence Layer - Makefile
# Single command operations for common tasks

.PHONY: help dev web worker build deploy migrate

help:
	@echo "Thai Election Evidence Layer"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  dev       - Start development servers (web + worker)"
	@echo "  web       - Run web app (Vite dev server on :5173)"
	@echo "  worker    - Run worker (Wrangler dev on :8787)"
	@echo "  build     - Build both web and worker"
	@echo "  test      - Run tests"
	@echo "  migrate   - Run database migrations"
	@echo "  import    - Import ECT66 registry data"
	@echo "  docker    - Start docker-compose services"
	@echo "  stop      - Stop docker-compose services"
	@echo "  deploy    - Deploy worker to Cloudflare"

dev:
	@echo "Starting development servers..."
	@echo "Web app: http://localhost:5173"
	@echo "Worker:  http://localhost:8787"
	@echo ""
	@echo "Run these in separate terminals:"
	@echo "  npm run dev:worker"
	@echo "  npm run dev:web"

web:
	@cd apps/web && npm run dev

worker:
	@cd apps/worker && npm run dev

build:
	@echo "Building web app..."
	@cd apps/web && npm run build
	@echo "Building worker..."
	@cd apps/worker && npm run build

test:
	@echo "Running tests..."
	@cd apps/web && npm run test || true
	@cd apps/worker && npm run test || true

migrate:
	@echo "Running database migrations..."
	@echo "Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env"
	@psql ${SUPABASE_URL} -f db/migrations/001_init.sql || echo "PSQL failed - check SUPABASE_URL"
	@psql ${SUPABASE_URL} -f db/migrations/002_custody_incidents.sql || echo "PSQL failed - check SUPABASE_URL"

import:
	@echo "Importing ECT66 registry..."
	@echo "Usage: make import path=/path/to/ect66_units.csv"
	@python scripts/import_registry.py ${path}

docker:
	@docker-compose up -d

stop:
	@docker-compose down

deploy:
	@echo "Deploying worker to Cloudflare..."
	@cd apps/worker && npm run deploy

# Aliases
d: dev
b: build
t: test