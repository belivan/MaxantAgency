# Docker Deployment Guide

This guide covers local Docker setup for MaxantAgency's microservices architecture.

## Prerequisites

- **Docker Desktop** (includes Docker Compose v2)
  - macOS: `brew install --cask docker`
  - Windows: Download from [docker.com](https://www.docker.com/products/docker-desktop)
- **8GB+ RAM** recommended (Playwright services are memory-intensive)
- **20GB+ disk space** for Docker images

## Quick Start

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Edit .env with your actual API keys
# Required: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY

# 3. Run the test script
./docker-test.sh

# Or manually:
docker compose up -d
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Network (maksant-network)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Prospecting │    │   Analysis   │    │    Report    │       │
│  │   Engine     │    │    Engine    │    │    Engine    │       │
│  │   :3010      │    │    :3001     │    │    :3003     │       │
│  │  (Playwright)│    │  (Playwright)│    │  (Playwright)│       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Outreach   │    │   Pipeline   │    │    Redis     │       │
│  │   Engine     │    │ Orchestrator │    │  (Queue)     │       │
│  │   :3002      │    │    :3020     │    │   :6379      │       │
│  │ (Lightweight)│    │ (Lightweight)│    │              │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              Command Center UI (:3000)                │       │
│  │                    (Next.js)                          │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │     Supabase     │
                    │   (Cloud DB)     │
                    │  (Not in Docker) │
                    └──────────────────┘
```

## Services & Ports

| Service | Port | Dockerfile | Memory | Description |
|---------|------|------------|--------|-------------|
| Prospecting Engine | 3010 | Dockerfile.node | ~500MB | Lead discovery with Playwright scraping |
| Analysis Engine | 3001 | Dockerfile.playwright | ~500MB | Website analysis with screenshots |
| Report Engine | 3003 | Dockerfile.playwright | ~500MB | PDF generation with Playwright |
| Outreach Engine | 3002 | Dockerfile.node | ~150MB | Email/social message composition |
| Pipeline Orchestrator | 3020 | Dockerfile.node | ~100MB | Workflow coordination |
| Command Center UI | 3000 | Dockerfile.nextjs | ~150MB | Next.js dashboard |
| Redis | 6379 | redis:7-alpine | ~50MB | Work queue coordination |

**Note:** Playwright services require `shm_size: '2gb'` for Chromium stability.

## Commands

### Basic Operations

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f                    # All services
docker compose logs -f analysis-engine    # Specific service

# Rebuild after code changes
docker compose build analysis-engine
docker compose up -d analysis-engine

# Full rebuild (no cache)
docker compose build --no-cache
```

### Testing

```bash
# Run full test suite
./docker-test.sh

# Quick health check (skip build)
./docker-test.sh --quick

# Clean up everything
./docker-test.sh --clean

# Check resource usage
docker stats
```

### Debugging

```bash
# Shell into a container
docker compose exec analysis-engine sh

# Check container logs
docker compose logs analysis-engine --tail=100

# Inspect container
docker inspect maksant-analysis

# View network
docker network inspect maksant-network
```

## Environment Configuration

### Required Variables

```env
# Database (Supabase - external)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# AI Providers (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
XAI_API_KEY=xai-...
```

### Docker-Specific Variables

```env
# Redis (auto-configured in docker-compose.yml)
REDIS_URL=redis://redis:6379
USE_WORK_QUEUE=true

# Concurrency limits
MAX_CONCURRENT_ANALYSES=2
MAX_CONCURRENT_PROSPECTING=1
MAX_CONCURRENT_REPORTS=1
MAX_CONCURRENT_OUTREACH=2
```

## Health Checks

All services expose `/health` endpoints:

```bash
curl http://localhost:3010/health  # Prospecting
curl http://localhost:3001/health  # Analysis
curl http://localhost:3003/health  # Report
curl http://localhost:3002/health  # Outreach
curl http://localhost:3020/health  # Pipeline
curl http://localhost:3000         # UI
```

## Troubleshooting

### Common Issues

**1. Services fail to start**
```bash
# Check logs for errors
docker compose logs analysis-engine

# Common causes:
# - Missing .env file
# - Invalid API keys
# - Port already in use
```

**2. Out of memory**
```bash
# Playwright services need more RAM
# Increase Docker Desktop memory to 8GB+

# Or run fewer Playwright services at once
docker compose up -d analysis-engine  # Start one at a time
```

**3. Health checks failing**
```bash
# Services may need more startup time
# Wait 60 seconds after docker compose up

# Check if service is actually running
docker compose ps
```

**4. Inter-service communication failed**
```bash
# Verify network exists
docker network ls | grep maksant

# Check service discovery
docker compose exec command-center-ui ping analysis-engine
```

**5. Playwright/Chromium issues**
```bash
# Ensure shm_size is set in docker-compose.yml
# Check with:
docker inspect maksant-analysis | grep ShmSize
# Should show: 2147483648 (2GB)
```

### Reset Everything

```bash
# Nuclear option - removes containers, images, volumes
docker compose down -v --rmi all
docker system prune -af

# Then rebuild
docker compose build --no-cache
docker compose up -d
```

## Resource Optimization

### Development Mode
When developing, run only the services you need:

```bash
# Just UI + Analysis
docker compose up -d analysis-engine command-center-ui redis

# Just Prospecting
docker compose up -d prospecting-engine redis
```

### Memory Limits
Add memory limits if needed:

```yaml
# In docker-compose.yml
services:
  analysis-engine:
    deploy:
      resources:
        limits:
          memory: 512M
```

## Next Steps: Cloud Deployment

After local testing, deploy to Fly.io:

1. **Measure resource usage** - Run `docker stats` during typical operations
2. **Create Fly.io account** - Free tier: 3 VMs × 256MB
3. **Deploy services** - See `FLY-DEPLOYMENT-GUIDE.md` (coming soon)

### Recommended VM Allocation (Fly.io Free Tier)

| VM | Services | RAM |
|----|----------|-----|
| VM1 | Analysis Engine | 256MB |
| VM2 | Report Engine | 256MB |
| VM3 | Prospecting + Outreach + Pipeline + UI | 256MB |

**Note:** 256MB may be tight for Playwright. Consider $5/month for 512MB VMs.
