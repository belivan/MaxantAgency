# Backup System - Quick Test Guide

## 🚀 **Quick Start**

Run automated test suite:
```bash
# Run all phases
node run-backup-tests.js

# Quick test (Phase 1 & 2 only)
node run-backup-tests.js --quick

# Run specific phase
node run-backup-tests.js --phase=1

# Skip cleanup
node run-backup-tests.js --skip-cleanup
```

---

## 📋 **Test Phases Overview**

| Phase | Name | Duration | Description |
|-------|------|----------|-------------|
| 1 | Local Backup System | ~5s | Tests backup creation, stats, failed handling |
| 2 | Database Integration | ~10s | Tests DB connection, schema validation |
| 3 | Retry Mechanism | ~5s | Tests retry scripts (dry-run) |
| 4 | Cleanup | ~3s | Tests backup archiving |
| 5 | Cross-Engine Validation | ~5s | Tests centralized validation |

**Total Duration**: ~30 seconds for all phases

---

## ✅ **Success Criteria**

Tests are **passing** when all 8 tests pass (100%)

System is **production-ready** when:
1. All automated tests pass
2. Backup success rate >= 95%
3. Failed uploads can be retried successfully
4. No data loss during simulated failures

See [TESTING-PLAN-BACKUP-SYSTEM.md](TESTING-PLAN-BACKUP-SYSTEM.md) for full details.
