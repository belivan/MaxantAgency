# Docker Deployment Guide

Deploy MaxantAgency using Docker containers - the easiest way!

## Prerequisites

- Docker and Docker Compose installed
- 8GB RAM minimum (for Playwright in Analysis Engine)
- `.env` file with all your API keys

## Quick Start

### 1. Set up environment variables

```bash
# Copy example env file
cp .env.production.example .env

# Edit with your credentials
nano .env
```

### 2. Build and start all services

```bash
# Build all containers
docker-compose build

# Start all services in background
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Check service health

```bash
# Check running containers
docker-compose ps

# Test each service
curl http://localhost:3010/health  # Prospecting
curl http://localhost:3001/health  # Analysis
curl http://localhost:3002/health  # Outreach
curl http://localhost:3020/health  # Pipeline
curl http://localhost:3000         # UI
```

### 4. Access the application

Open your browser and go to:
```
http://localhost:3000
```

Or if deployed to server:
```
http://your-server-ip:3000
```

## Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart analysis-engine

# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f prospecting-engine

# Rebuild after code changes
docker-compose build
docker-compose up -d

# Remove all containers and volumes
docker-compose down -v
```

## Production Deployment with Docker

### Option 1: Deploy to Railway

1. Install Railway CLI:
```bash
npm i -g @railway/cli
```

2. Login and deploy:
```bash
railway login
railway init
railway up
```

### Option 2: Deploy to DigitalOcean App Platform

1. Push code to GitHub
2. Go to DigitalOcean App Platform
3. Connect your repo
4. Select "Docker Compose" as deployment method
5. Add environment variables in the web UI
6. Deploy!

### Option 3: Deploy to any VPS with Docker

```bash
# On your VPS
apt update && apt upgrade -y
apt install docker.io docker-compose -y

# Clone repo
git clone <your-repo> maksant-agency
cd maksant-agency

# Set up .env file
nano .env

# Start services
docker-compose up -d

# Set up Nginx (optional, for domain and HTTPS)
# Follow the Nginx setup in DEPLOYMENT.md
```

## Advantages of Docker Deployment

- **Consistency**: Same environment everywhere (dev, staging, production)
- **Isolation**: Each service in its own container
- **Easy rollback**: Just redeploy previous image
- **No dependency hell**: All dependencies bundled in containers
- **Simpler setup**: No need to install Node.js, Playwright, etc. manually

## Troubleshooting

### Container keeps restarting

```bash
# Check logs
docker-compose logs <service-name>

# Common issues:
# - Missing .env file or API keys
# - Port already in use (change ports in docker-compose.yml)
# - Out of memory (upgrade server RAM)
```

### Analysis Engine fails (Playwright)

```bash
# Make sure you have enough RAM (8GB+)
# Check shared memory size in docker-compose.yml (shm_size: '2gb')

# Rebuild the container
docker-compose build analysis-engine
docker-compose up -d analysis-engine
```

### Can't connect to services from UI

```bash
# Make sure all services are on the same network
docker network ls
docker network inspect maksant-agency_maksant-network

# Check service names match in docker-compose.yml
```

## Cost Comparison

**VPS with Docker** (DigitalOcean, Linode, etc.):
- 8GB RAM droplet: ~$48/month
- Full control, easy deployment

**Platform-as-a-Service** (Railway, Render):
- ~$30-50/month
- Automatic deploys, no server management
- May have limits on free tier

## Next Steps

After deploying with Docker:
1. Set up a domain name (optional)
2. Add Nginx reverse proxy for HTTPS
3. Set up automatic backups
4. Monitor with Docker stats: `docker stats`
