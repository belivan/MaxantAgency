#!/bin/bash
# MaxantAgency Production Deployment Script
# Run this on the Hetzner VPS to deploy/update the backend services

set -e  # Exit on error

DEPLOY_DIR="/opt/maxant"
COMPOSE_FILE="docker-compose.prod.yml"

echo "========================================="
echo "  MaxantAgency Backend Deployment"
echo "========================================="

cd "$DEPLOY_DIR"

# Pull latest code
echo ""
echo "[1/5] Pulling latest code from GitHub..."
git pull origin main

# Verify .env exists
if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found!"
    echo "Copy .env.production to .env and fill in your API keys:"
    echo "  cp .env.production .env"
    echo "  nano .env"
    exit 1
fi

# Build and start containers
echo ""
echo "[2/5] Building Docker images..."
docker compose -f "$COMPOSE_FILE" build

echo ""
echo "[3/5] Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

# Cleanup old images
echo ""
echo "[4/5] Cleaning up old Docker images..."
docker system prune -f --volumes

# Health check
echo ""
echo "[5/5] Checking service health..."
sleep 10  # Wait for services to start

SERVICES=("analysis-engine:3001" "prospecting-engine:3010" "report-engine:3003" "outreach-engine:3002" "pipeline-orchestrator:3020")
ALL_HEALTHY=true

for SERVICE in "${SERVICES[@]}"; do
    NAME=$(echo $SERVICE | cut -d: -f1)
    PORT=$(echo $SERVICE | cut -d: -f2)

    # Check via Caddy
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/health" 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" = "200" ]; then
        echo "  [OK] $NAME"
    else
        echo "  [FAIL] $NAME (HTTP $HTTP_CODE)"
        ALL_HEALTHY=false
    fi
done

echo ""
echo "========================================="
if [ "$ALL_HEALTHY" = true ]; then
    echo "  Deployment successful!"
    echo "  API: https://api.mintydesign.xyz"
else
    echo "  WARNING: Some services may not be healthy"
    echo "  Check logs: docker compose -f $COMPOSE_FILE logs"
fi
echo "========================================="
