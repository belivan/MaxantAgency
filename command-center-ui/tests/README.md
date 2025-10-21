# Command Center UI Tests

Test suites for the Command Center UI organized by test type.

## Directory Structure

```
tests/
├── unit/          # Unit tests for individual functions/components
├── integration/   # Integration tests for feature workflows
├── e2e/          # End-to-end tests for complete user journeys
├── database/     # Database connection and query tests
└── manual/       # Manual testing checklists
```

---

## Running Tests

### All Tests
```bash
npm run test:all
```

### Specific Test Suites

**Integration Tests**:
```bash
npm run test
# or
node tests/integration/test-activity-feed.js
```

**Database Tests**:
```bash
npm run test:db
# or
node tests/database/test-db.js
```

**End-to-End Tests**:
```bash
npm run test:e2e
# or
node tests/e2e/test-ui-comprehensive.js
```

**Individual Tests**:
```bash
node tests/integration/test-project-prospects.js
node tests/integration/test-prospecting-project.js
```

---

## Test Types

### Unit Tests (`unit/`)
Tests for individual functions, utilities, and isolated components.

**Purpose**: Verify individual units of code work correctly
**Scope**: Single function/component
**Speed**: Very fast (< 1s per test)

### Integration Tests (`integration/`)
Tests for feature workflows that combine multiple components.

**Current Tests**:
- `test-activity-feed.js` - Activity feed component integration
- `test-project-prospects.js` - Project-prospect relationship
- `test-prospecting-project.js` - Prospecting workflow

**Purpose**: Verify features work together correctly
**Scope**: Multiple components/services
**Speed**: Fast (1-5s per test)

### End-to-End Tests (`e2e/`)
Tests for complete user journeys through the application.

**Current Tests**:
- `test-ui-comprehensive.js` - Complete UI workflow test

**Purpose**: Verify entire user flows work correctly
**Scope**: Full application stack
**Speed**: Slower (5-30s per test)

### Database Tests (`database/`)
Tests for database connections, queries, and schema validation.

**Current Tests**:
- `test-db.js` - Database connectivity and basic operations

**Purpose**: Verify database operations work correctly
**Scope**: Supabase client, queries, migrations
**Speed**: Medium (2-10s per test)

### Manual Tests (`manual/`)
Checklists and guides for manual testing scenarios.

**Current Tests**:
- `test-ui-manual.js` - Manual UI testing checklist

**Purpose**: Guide manual testing of complex scenarios
**Scope**: Full application
**Speed**: Manual (5-30min)

---

## Writing New Tests

### Naming Convention
- **Files**: `test-{feature-name}.js`
- **Functions**: `test{FeatureName}()`
- **Example**: `test-lead-scoring.js` → `testLeadScoring()`

### Test Structure
```javascript
/**
 * Test: Feature Name
 * Tests specific aspect of the feature
 */
async function testFeatureName() {
  console.log('Testing feature name...');

  try {
    // Arrange
    const testData = { /* ... */ };

    // Act
    const result = await someFunction(testData);

    // Assert
    if (!result.success) {
      throw new Error('Test failed: expected success');
    }

    console.log('✅ Test passed: Feature name works correctly');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}
```

### Best Practices

1. **One test file per feature**: Keep related tests together
2. **Clear test names**: Name should describe what's being tested
3. **Arrange-Act-Assert**: Follow the AAA pattern
4. **Test isolation**: Tests should not depend on each other
5. **Cleanup**: Always clean up test data
6. **Error messages**: Make failures easy to debug

---

## Test Data

### Using Real Database
Some tests connect to the real Supabase database using environment variables from `.env.local`.

**Required Environment Variables**:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### Test Data Cleanup
Always clean up test data after running tests:
```javascript
// Example cleanup
async function cleanup() {
  await supabase
    .from('test_table')
    .delete()
    .eq('test_id', testId);
}
```

---

## Continuous Integration

When setting up CI/CD:

1. **Environment**: Ensure test environment has required variables
2. **Database**: Use separate test database or cleanup after tests
3. **Parallel execution**: Run test suites in parallel when possible
4. **Failure reporting**: Log full error details for debugging

---

## Troubleshooting

### Tests fail with "Connection refused"
- Check that required services are running (Next.js dev server, engines)
- Verify environment variables are set correctly

### Database tests fail
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env.local`
- Verify database tables exist
- Check network connectivity to Supabase

### Import errors
- Run `npm install` to ensure all dependencies are installed
- Check that paths are correct (ES modules vs CommonJS)

---

**Last Updated**: 2025-10-21
