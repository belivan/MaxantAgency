# MaxantAgency Deployment Guide

Deploy your lead generation system to production.

## System Requirements

- **VPS**: 4GB RAM minimum (8GB recommended for Playwright)
- **OS**: Ubuntu 22.04 LTS or Debian 11+
- **Node.js**: v18.0.0 or higher
- **Ports**: 3000-3002, 3010, 3020
- **Domain** (optional): For HTTPS and custom domain

## Recommended Hosting Providers

- **DigitalOcean**: $24/month (4GB droplet) - Easiest
- **Railway**: $20-30/month - Automatic deploys
- **Render**: Similar pricing - Good free tier for testing
- **AWS Lightsail**: $20/month - More scalable
- **Hetzner**: $10-15/month - Best price/performance

---

## Deployment Steps

### 1. Provision VPS

Sign up for a hosting provider and create an Ubuntu 22.04 droplet/instance.

SSH into your server:
```bash
ssh root@your_server_ip
```

### 2. Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs git nginx certbot python3-certbot-nginx

# Install PM2 (process manager)
npm install -g pm2

# Install Playwright dependencies (for Analysis Engine screenshots)
npx playwright install --with-deps chromium
```

### 3. Deploy Application

```bash
# Clone repository
cd /var/www
git clone <your-git-repo-url> maksant-agency
cd maksant-agency

# Install all dependencies
npm install
cd prospecting-engine && npm install && cd ..
cd analysis-engine && npm install && cd ..
cd outreach-engine && npm install && cd ..
cd pipeline-orchestrator && npm install && cd ..
cd command-center-ui && npm install && cd ..
```

### 4. Configure Environment Variables

```bash
# Copy example env file
cp .env.production.example .env

# Edit with your actual credentials
nano .env
```

Fill in:
- `SUPABASE_URL` and `SUPABASE_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_MAPS_API_KEY`
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
- Any other API keys

### 5. Build Next.js UI

```bash
cd command-center-ui
npm run build
cd ..
```

### 6. Start with PM2

```bash
# Create logs directory
mkdir -p logs

# Start all services
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs

# Save PM2 configuration
pm2 save

# Auto-restart on server reboot
pm2 startup
# Copy and run the command it outputs
```

### 7. Configure Nginx (Reverse Proxy)

Create Nginx configuration:

```bash
nano /etc/nginx/sites-available/maksant-agency
```

Paste this configuration (replace `your-domain.com` with your domain or server IP):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Command Center UI
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Prospecting Engine API
    location /api/prospecting/ {
        proxy_pass http://localhost:3010/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Analysis Engine API
    location /api/analysis/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Outreach Engine API
    location /api/outreach/ {
        proxy_pass http://localhost:3002/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Pipeline Orchestrator API
    location /api/pipeline/ {
        proxy_pass http://localhost:3020/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Increase timeouts for long-running operations
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
}
```

Enable the site:

```bash
# Enable site
ln -s /etc/nginx/sites-available/maksant-agency /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### 8. Set Up HTTPS (SSL Certificate)

```bash
# Get free SSL certificate from Let's Encrypt
certbot --nginx -d your-domain.com

# Auto-renew (certbot sets this up automatically)
```

### 9. Configure Firewall

```bash
# Allow HTTP, HTTPS, and SSH
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## Post-Deployment

### Health Checks

Test each service:

```bash
curl http://localhost:3010/health  # Prospecting Engine
curl http://localhost:3001/health  # Analysis Engine
curl http://localhost:3002/health  # Outreach Engine
curl http://localhost:3020/health  # Pipeline Orchestrator
curl http://localhost:3000          # Command Center UI
```

Visit your domain: `https://your-domain.com`

### PM2 Commands

```bash
pm2 status              # View all services
pm2 logs                # View all logs
pm2 logs prospecting    # View specific service logs
pm2 restart all         # Restart all services
pm2 restart prospecting # Restart specific service
pm2 stop all            # Stop all services
pm2 delete all          # Remove all services
pm2 monit               # Monitor CPU/Memory usage
```

### Database Setup

Run the prospecting engine database setup:

```bash
cd prospecting-engine
npm run db:setup
cd ..
```

---

## Maintenance

### Updating the Application

```bash
cd /var/www/maksant-agency
git pull origin main
npm install
cd command-center-ui && npm run build && cd ..
pm2 restart all
```

### Monitoring Logs

```bash
# Real-time logs for all services
pm2 logs

# Or check specific log files
tail -f logs/prospecting-error.log
tail -f logs/analysis-out.log
```

### Backup Database

Your data is in Supabase (cloud PostgreSQL), which handles backups automatically. But you can export:

```bash
# Export from Supabase dashboard or use pg_dump if self-hosted
```

---

## Security Checklist

- [ ] All API keys in `.env` file (never in code)
- [ ] `.env` file has proper permissions: `chmod 600 .env`
- [ ] Firewall enabled (ufw)
- [ ] HTTPS enabled (SSL certificate)
- [ ] Supabase Row Level Security (RLS) enabled
- [ ] Strong SMTP password (app-specific password for Gmail)
- [ ] Regular system updates: `apt update && apt upgrade`
- [ ] PM2 logs rotated (PM2 does this automatically)

---

## Cost Estimate

**Monthly Costs:**
- **VPS Hosting**: $20-40 (4-8GB RAM)
- **Supabase**: Free tier (up to 500MB database)
- **OpenAI API**: ~$10-50 (depends on usage)
- **Google Maps API**: ~$5-20 (depends on searches)
- **Domain**: ~$12/year

**Total**: ~$35-110/month

---

## Troubleshooting

### Service won't start

```bash
pm2 logs <service-name>
# Check for missing environment variables or port conflicts
```

### Playwright fails to take screenshots

```bash
# Reinstall Playwright with dependencies
cd analysis-engine
npx playwright install --with-deps chromium
pm2 restart analysis-engine
```

### Out of memory

```bash
# Check memory usage
pm2 monit

# Upgrade VPS to 8GB RAM if Analysis Engine crashes
```

### CORS errors in browser

Check that your Next.js environment variables point to the correct API URLs. Edit `command-center-ui/.env.production`:

```env
NEXT_PUBLIC_PROSPECTING_API=http://localhost:3010
NEXT_PUBLIC_ANALYSIS_API=http://localhost:3001
NEXT_PUBLIC_OUTREACH_API=http://localhost:3002
NEXT_PUBLIC_PIPELINE_API=http://localhost:3020
```

---

## Alternative: Docker Deployment

If you prefer Docker, I can help you create a `docker-compose.yml` file that bundles all services. Let me know!

---

## Need Help?

If you encounter issues during deployment, check:
1. PM2 logs: `pm2 logs`
2. Nginx logs: `tail -f /var/log/nginx/error.log`
3. Service health endpoints: `curl http://localhost:PORT/health`
