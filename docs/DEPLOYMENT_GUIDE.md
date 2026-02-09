## DeepStack Production Deployment Guide

Complete guide for deploying DeepStack Trading System to production.

---

## Table of Contents

1. [Pre-Deployment](#pre-deployment)
2. [Environment Setup](#environment-setup)
3. [Configuration](#configuration)
4. [Security](#security)
5. [Deployment Steps](#deployment-steps)
6. [Monitoring](#monitoring)
7. [Rollback Procedures](#rollback-procedures)
8. [Maintenance](#maintenance)
9. [DeepSignals Module Deployment](#deepsignals-module-deployment)

---

## Pre-Deployment

### System Requirements

**Hardware**:
- CPU: 4+ cores
- RAM: 8GB+ recommended
- Disk: 50GB+ SSD
- Network: Stable, low-latency connection

**Software**:
- Python 3.9+
- PostgreSQL 13+ (optional for production data)
- Redis 6+ (optional for caching)
- Docker 20+ (optional for containerization)

### Pre-Deployment Checklist

```markdown
- [ ] All tests passing (pytest with 80%+ coverage)
- [ ] Paper trading validation complete
- [ ] Broker accounts configured and tested
- [ ] API keys secured in environment/secrets manager
- [ ] Monitoring and alerting configured
- [ ] Backup and disaster recovery tested
- [ ] Documentation reviewed and updated
- [ ] Operations team trained
- [ ] Runbook prepared
- [ ] Emergency contacts documented
```

---

## Environment Setup

### Production Server Setup

#### 1. Create Production User

```bash
# Create dedicated user
sudo useradd -m -s /bin/bash deepstack
sudo usermod -aG sudo deepstack

# Switch to deepstack user
sudo su - deepstack
```

#### 2. Install System Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and dependencies
sudo apt install -y python3.9 python3.9-venv python3.9-dev
sudo apt install -y build-essential libpq-dev redis-server

# Install optional: PostgreSQL
sudo apt install -y postgresql postgresql-contrib
```

#### 3. Clone Repository

```bash
cd /opt
sudo mkdir deepstack
sudo chown deepstack:deepstack deepstack
cd deepstack

# Clone from private repository
git clone https://github.com/your-org/deepstack.git .
git checkout main
```

#### 4. Create Virtual Environment

```bash
python3.9 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

## Configuration

### 1. Environment Variables

Create production `.env` file:

```bash
# Copy example
cp env.example .env.production

# Edit with production values
nano .env.production
```

**Production `.env` template**:

```bash
# ===== DEPLOYMENT =====
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# ===== TRADING MODE =====
TRADING_MODE=live  # 'paper' or 'live'

# ===== IBKR CONFIGURATION =====
IBKR_HOST=127.0.0.1
IBKR_PORT=7496  # Live trading port (7497 for paper)
IBKR_CLIENT_ID=1

# ===== ALPACA API (Market Data) =====
ALPACA_API_KEY=your_production_key
ALPACA_SECRET_KEY=your_production_secret
ALPACA_BASE_URL=https://api.alpaca.markets  # Live trading

# ===== ALPHA VANTAGE (Optional) =====
ALPHA_VANTAGE_API_KEY=your_api_key

# ===== ANTHROPIC API =====
ANTHROPIC_API_KEY=your_api_key

# ===== DATABASE (Optional) =====
DB_HOST=localhost
DB_PORT=5432
DB_NAME=deepstack_prod
DB_USER=deepstack
DB_PASSWORD=secure_password

# ===== REDIS (Optional) =====
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secure_password

# ===== MONITORING =====
SENTRY_DSN=your_sentry_dsn
SLACK_WEBHOOK_URL=your_slack_webhook

# ===== RISK LIMITS =====
MAX_POSITION_SIZE=0.05
MAX_PORTFOLIO_HEAT=0.15
DAILY_LOSS_LIMIT=0.02
MAX_DRAWDOWN=0.15

# ===== EXECUTION =====
SLIPPAGE_THRESHOLD_BPS=20.0
VWAP_DEVIATION_THRESHOLD=0.01
```

### 2. Configuration Files

**config/production.yaml**:

```yaml
trading:
  mode: live
  max_position_size: 0.05
  max_portfolio_heat: 0.15
  daily_loss_limit: 0.02

risk_limits:
  max_position_pct: 0.05
  max_concentration: 0.25
  daily_stop: 0.02
  max_drawdown: 0.15

execution:
  twap:
    default_time_window: 60
    default_num_slices: 10
  vwap:
    deviation_threshold: 0.01
  routing:
    small_order_threshold: 10000
    large_order_threshold: 100000

monitoring:
  slippage_alert_threshold: 20.0
  failed_order_threshold: 3
  enable_slack_alerts: true
  enable_email_alerts: true

logging:
  level: INFO
  format: json
  file: /var/log/deepstack/production.log
```

---

## Security

### 1. API Key Management

**Use environment variables or secrets manager** (never commit keys):

```bash
# Using AWS Secrets Manager
aws secretsmanager get-secret-value \
    --secret-id deepstack/production/api-keys \
    --query SecretString \
    --output text > /opt/deepstack/.env.production
```

### 2. File Permissions

```bash
# Secure configuration files
chmod 600 /opt/deepstack/.env.production
chmod 600 /opt/deepstack/config/production.yaml

# Secure directories
chmod 755 /opt/deepstack
chmod 700 /opt/deepstack/data
chmod 700 /opt/deepstack/logs
```

### 3. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 8000/tcp  # API (if needed)
sudo ufw enable
```

### 4. SSL/TLS

For API server:

```bash
# Install certbot
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d api.yourdomain.com
```

---

## Deployment Steps

### Step 1: Pre-Deployment Validation

```bash
# Activate virtual environment
source /opt/deepstack/venv/bin/activate

# Run tests
pytest tests/ -v --cov=core --cov-report=term-missing

# Validate configuration
python -c "from core.config import Config; config = Config.from_yaml('config/production.yaml'); print('Config valid!')"
```

### Step 2: Database Migration (if using PostgreSQL)

```bash
# Create database
sudo -u postgres psql
CREATE DATABASE deepstack_prod;
CREATE USER deepstack WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE deepstack_prod TO deepstack;

# Run migrations (if applicable)
python scripts/migrate_db.py --env production
```

### Step 3: Start Services

#### Option A: Systemd Service (Recommended)

Create `/etc/systemd/system/deepstack.service`:

```ini
[Unit]
Description=DeepStack Trading System
After=network.target

[Service]
Type=simple
User=deepstack
Group=deepstack
WorkingDirectory=/opt/deepstack
Environment="PATH=/opt/deepstack/venv/bin"
EnvironmentFile=/opt/deepstack/.env.production
ExecStart=/opt/deepstack/venv/bin/python /opt/deepstack/main.py
Restart=on-failure
RestartSec=10
StandardOutput=append:/var/log/deepstack/stdout.log
StandardError=append:/var/log/deepstack/stderr.log

[Install]
WantedBy=multi-user.target
```

Start service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable deepstack

# Start service
sudo systemctl start deepstack

# Check status
sudo systemctl status deepstack
```

#### Option B: Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "main.py"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  deepstack:
    build: .
    env_file: .env.production
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - deepstack-net

  redis:
    image: redis:6-alpine
    restart: unless-stopped
    networks:
      - deepstack-net

networks:
  deepstack-net:
    driver: bridge
```

Deploy:

```bash
docker-compose up -d
docker-compose logs -f
```

### Step 4: Verify Deployment

```bash
# Check logs
tail -f /var/log/deepstack/production.log

# Test API endpoints (if applicable)
curl http://localhost:8000/health

# Verify broker connection
python scripts/test_broker_connection.py

# Run smoke tests
pytest tests/smoke/ -v
```

---

## Monitoring

### 1. Application Logging

**Log configuration** (`config/logging.yaml`):

```yaml
version: 1
disable_existing_loggers: false

formatters:
  json:
    format: '{"time": "%(asctime)s", "level": "%(levelname)s", "module": "%(module)s", "message": "%(message)s"}'

handlers:
  file:
    class: logging.handlers.RotatingFileHandler
    filename: /var/log/deepstack/production.log
    maxBytes: 10485760  # 10MB
    backupCount: 10
    formatter: json

  console:
    class: logging.StreamHandler
    formatter: json

loggers:
  root:
    level: INFO
    handlers: [file, console]
```

### 2. Monitoring Dashboards

**Prometheus metrics** (optional):

```python
from prometheus_client import Counter, Histogram, Gauge

# Execution metrics
executions_total = Counter('executions_total', 'Total executions')
execution_duration = Histogram('execution_duration_seconds', 'Execution duration')
slippage_bps = Gauge('slippage_bps', 'Slippage in basis points')
```

### 3. Alerting

**Slack alerts**:

```python
import requests

def send_slack_alert(message, severity="WARNING"):
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")

    payload = {
        "text": f"[{severity}] DeepStack Alert",
        "attachments": [{
            "text": message,
            "color": "warning" if severity == "WARNING" else "danger"
        }]
    }

    requests.post(webhook_url, json=payload)
```

### 4. Health Checks

```bash
# Create health check script
cat > /opt/deepstack/scripts/health_check.sh << 'EOF'
#!/bin/bash

# Check if service is running
if ! systemctl is-active --quiet deepstack; then
    echo "ERROR: DeepStack service is not running"
    exit 1
fi

# Check logs for errors
if grep -q "ERROR" /var/log/deepstack/production.log; then
    echo "WARNING: Errors found in logs"
    exit 2
fi

echo "OK: DeepStack is healthy"
exit 0
EOF

chmod +x /opt/deepstack/scripts/health_check.sh

# Add to crontab (check every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/deepstack/scripts/health_check.sh") | crontab -
```

---

## Rollback Procedures

### Emergency Rollback

```bash
# 1. Stop current version
sudo systemctl stop deepstack

# 2. Restore previous version
cd /opt/deepstack
git fetch origin
git checkout previous-stable-tag

# 3. Restore configuration (if needed)
cp /opt/deepstack/backups/config.yaml.backup config/production.yaml

# 4. Restart service
sudo systemctl start deepstack

# 5. Verify
sudo systemctl status deepstack
tail -f /var/log/deepstack/production.log
```

### Database Rollback

```bash
# Restore from backup
pg_restore -U deepstack -d deepstack_prod /backups/deepstack_prod_backup.sql
```

### Graceful Rollback

```bash
# 1. Cancel all open orders
python scripts/cancel_all_orders.py

# 2. Close all positions (optional)
python scripts/close_all_positions.py

# 3. Stop service
sudo systemctl stop deepstack

# 4. Rollback code
git checkout previous-stable-tag

# 5. Restart
sudo systemctl start deepstack
```

---

## Maintenance

### Daily Tasks

```bash
# Check system health
/opt/deepstack/scripts/health_check.sh

# Review execution summary
python scripts/daily_summary.py --date today

# Check alerts
python scripts/check_alerts.py
```

### Weekly Tasks

```bash
# Backup database
pg_dump -U deepstack deepstack_prod > /backups/deepstack_$(date +%Y%m%d).sql

# Rotate logs
find /var/log/deepstack -name "*.log" -mtime +30 -delete

# Review performance metrics
python scripts/weekly_report.py
```

### Monthly Tasks

```bash
# Update dependencies (in staging first!)
pip install --upgrade -r requirements.txt

# Review and update risk limits
python scripts/review_risk_limits.py

# Audit API keys and rotate if needed
python scripts/audit_security.py
```

---

## Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check logs
sudo journalctl -u deepstack -n 50 --no-pager

# Check configuration
python -c "from core.config import Config; Config.from_yaml('config/production.yaml')"

# Check permissions
ls -la /opt/deepstack/.env.production
```

#### Broker Connection Failed

```bash
# Test broker connectivity
python scripts/test_broker_connection.py

# Check IBKR TWS/Gateway is running
# Check firewall rules
# Verify API keys
```

#### High Slippage

```bash
# Review execution settings
# Increase time window for TWAP/VWAP
# Switch to VWAP for large orders
# Check market liquidity
```

---

## Disaster Recovery

### Backup Strategy

1. **Configuration**: Daily backup to S3/cloud storage
2. **Database**: Hourly snapshots, daily full backups
3. **Logs**: Archived to cloud storage (retention: 90 days)
4. **Code**: Tagged releases in Git

### Recovery Steps

```bash
# 1. Restore code
git clone https://github.com/your-org/deepstack.git
git checkout stable-tag

# 2. Restore configuration
aws s3 cp s3://deepstack-backups/config/ /opt/deepstack/config/ --recursive

# 3. Restore database
pg_restore -U deepstack -d deepstack_prod /backups/latest.sql

# 4. Start services
sudo systemctl start deepstack
```

---

## Support Contacts

**Emergency Escalation**:
1. Trading Operations Team: trading-ops@company.com
2. DevOps Team: devops@company.com
3. Risk Management: risk@company.com

**On-Call Schedule**: See PagerDuty

---

## Deployment Checklist

Final checklist before going live:

```markdown
- [ ] All tests passing in staging
- [ ] Configuration validated
- [ ] API keys secured
- [ ] Broker connection tested
- [ ] Risk limits configured
- [ ] Monitoring enabled
- [ ] Alerts configured
- [ ] Backups tested
- [ ] Rollback procedure tested
- [ ] Operations team notified
- [ ] Trading team approval
- [ ] Risk team approval
- [ ] Emergency contacts updated
- [ ] Runbook reviewed
- [ ] Post-deployment monitoring plan
```

---

## DeepSignals Module Deployment

DeepSignals is the market intelligence layer that provides options flow alerts, GEX levels,
dark pool data, insider trading, congressional trading, IV tracking, and sentiment aggregation.

### Architecture

```
Frontend (Next.js / Vercel)
  -> /api/signals/[...path] catch-all proxy route
  -> Python backend (FastAPI / Railway)
     -> core/api/deepsignals_router.py (REST endpoints)
        -> core/signals/ (GEX, flow, IV, sentiment engines)
        -> core/data/ (SEC EDGAR, FINRA, CBOE, Quiver clients)
        -> Supabase (historical IV, flow alerts, dark pool, insider/congress trades)
```

### Required Environment Variables

Add these to your Railway/server environment in addition to the base DeepStack vars:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL (already used by auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for DeepSignals table writes (RLS) |
| `QUIVER_API_KEY` | No | Quiver Quantitative API key for congressional trades. Gracefully degrades if missing. |
| `ALPACA_API_KEY` | Yes | Already configured. Used for options chain data (flow, GEX). |
| `ALPACA_SECRET_KEY` | Yes | Already configured. |
| `ALPACA_OPTIONS_FEED` | No | `indicative` (free, default) or `opra` (paid, real-time) |

### Supabase Setup

Run the migration to create DeepSignals tables:

```bash
# Apply via Supabase CLI
supabase db push

# Or manually apply:
# supabase/migrations/017_deepsignals_tables.sql
```

Tables created:
- `deepsignals_historical_iv` - IV percentile tracking
- `deepsignals_flow_alerts` - Options flow alerts
- `deepsignals_dark_pool` - FINRA short volume data
- `deepsignals_insider_trades` - SEC Form 4 filings
- `deepsignals_congress_trades` - Congressional disclosures

All tables have RLS enabled with `service_role` write access and `authenticated` read access.

### Vercel (Frontend)

No additional Vercel configuration needed. The `/api/signals/[...path]` catch-all route
proxies to the Python backend using `NEXT_PUBLIC_API_URL`.

Ensure this env var is set in Vercel:

```
NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app
```

### Railway (Backend)

The FastAPI server at `core/api_server.py` automatically registers the DeepSignals router.
No additional Railway configuration is needed beyond setting the env vars listed above.

Verify after deployment:

```bash
# Health check
curl https://your-backend/api/signals/congress?limit=1

# Should return JSON with trades array (or empty array if no Quiver key)
```

### Data Sources (No API Keys Required)

These clients scrape/query free public APIs and need no credentials:
- **SEC EDGAR** (`sec_edgar_client.py`) - Insider trading Form 4 filings
- **FINRA** (`finra_client.py`) - Short volume / dark pool data
- **CBOE** (`cboe_client.py`) - Options volume and VIX data

### Rate Limits

| Source | Limit | Notes |
|--------|-------|-------|
| Quiver Quantitative | 100 req/day (free tier) | Client enforces daily counter |
| SEC EDGAR | 10 req/sec | Fair use policy, User-Agent required |
| FINRA | None documented | Be respectful |
| CBOE | None documented | Be respectful |
| Alpaca Options | 200 req/min | Existing Alpaca rate limits |

---

**Last Updated**: February 2026
**Version**: 2.0.0
**Maintainer**: DeepStack Engineering Team
