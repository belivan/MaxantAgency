# Shared Utilities

Centralized utilities used across all Maksant services.

## Logger

Structured logging system with timestamps, log levels, and file output.

### Features

- **Multiple log levels**: `debug`, `info`, `warn`, `error`
- **Colored console output**: Easy visual parsing
- **JSON log files**: Saved to `logs/` directory with daily rotation
- **HTTP request logging**: Automatic middleware for Express
- **Cost tracking**: Special methods for tracking AI/API costs

### Usage

```javascript
import { createLogger } from '../shared/logger.js';

const logger = createLogger('my-service', {
  level: 'info',      // Minimum log level (debug|info|warn|error)
  console: true,      // Enable console output
  file: true          // Enable file output
});

// Basic logging
logger.debug('Detailed debug information', { userId: 123 });
logger.info('User logged in', { email: 'user@example.com' });
logger.warn('Rate limit approaching', { remaining: 10 });
logger.error('Database connection failed', { error: err.message });

// HTTP request logging
logger.http('POST', '/api/users', 201, 145); // method, path, status, duration(ms)

// Cost tracking
logger.cost('grok-api-call', 0.0234, { model: 'grok-4-fast', tokens: 1000 });
```

### Express Middleware

```javascript
import express from 'express';
import { createLogger, requestLogger } from '../shared/logger.js';

const app = express();
const logger = createLogger('api-server');

// Automatic HTTP request logging
app.use(requestLogger(logger));
```

### Log Files

Logs are saved to `logs/` directory:
- **Format**: `{serviceName}-{YYYY-MM-DD}.log`
- **Example**: `orchestrator-2025-01-15.log`
- **Structure**: One JSON object per line

Example log entry:
```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "service": "orchestrator",
  "level": "INFO",
  "message": "Prospect generation completed",
  "data": {
    "companiesFound": 5,
    "urlsVerified": 3,
    "runId": "abc123",
    "duration": "2345ms"
  }
}
```

### Log Levels

Set via environment variable or constructor:

```bash
# In .env
LOG_LEVEL=debug

# Or in code
const logger = createLogger('my-service', { level: 'debug' });
```

| Level | When to use |
|-------|-------------|
| `debug` | Detailed diagnostic information (URLs, payloads, step-by-step execution) |
| `info` | General informational messages (requests completed, operations succeeded) |
| `warn` | Warning messages (rate limits, retries, deprecated features) |
| `error` | Error messages (failures, exceptions, critical issues) |

### Console Output Examples

```
[2025-01-15T10:30:45.123Z] [orchestrator] [INFO] Prospect generation started
{
  "count": 20,
  "city": "springfield, va",
  "model": "grok-4-fast",
  "verify": true
}

[2025-01-15T10:30:48.456Z] [orchestrator] [INFO] URL verification completed
{
  "total": 5,
  "verified": 3,
  "failed": 2,
  "failedUrls": [
    "https://example1.com",
    "https://example2.com"
  ]
}
```

### Log Rotation

Logs automatically rotate daily. Old logs are kept indefinitely - you can manually delete them or set up a cleanup script.

To clean up logs older than 30 days:
```bash
# Linux/Mac
find logs/ -name "*.log" -mtime +30 -delete

# Windows PowerShell
Get-ChildItem logs/ -Filter *.log | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | Remove-Item
```

## Environment Variables

```bash
# Logging
LOG_LEVEL=info          # debug|info|warn|error (default: info)

# Ports (for reference)
ORCHESTRATOR_PORT=3010  # Client Orchestrator API
EMAIL_COMPOSER_PORT=3001 # Email Composer API
NEXT_PUBLIC_PORT=3000   # Command Center UI
```
