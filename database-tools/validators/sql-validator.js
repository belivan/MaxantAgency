/**
 * SQL validator
 * Basic validation for generated SQL statements
 */

/**
 * Validate a SQL statement
 * @param {string} sql - SQL statement to validate
 * @returns {object} Validation result
 */
export function validateSQL(sql) {
  const errors = [];
  const warnings = [];

  if (!sql || typeof sql !== 'string') {
    errors.push('SQL must be a non-empty string');
    return { valid: false, errors, warnings };
  }

  const trimmed = sql.trim();

  if (trimmed.length === 0) {
    errors.push('SQL statement is empty');
    return { valid: false, errors, warnings };
  }

  // Check for common SQL keywords
  const upperSQL = trimmed.toUpperCase();
  const validStarts = [
    'CREATE TABLE',
    'CREATE INDEX',
    'CREATE UNIQUE INDEX',
    'ALTER TABLE',
    'DROP TABLE',
    'DROP INDEX',
    'INSERT INTO',
    'UPDATE',
    'DELETE FROM',
    'SELECT'
  ];

  const startsWithValidKeyword = validStarts.some(keyword => upperSQL.startsWith(keyword));

  if (!startsWithValidKeyword) {
    warnings.push('SQL does not start with a recognized keyword');
  }

  // Check for balanced parentheses
  const openParens = (sql.match(/\(/g) || []).length;
  const closeParens = (sql.match(/\)/g) || []).length;

  if (openParens !== closeParens) {
    errors.push(`Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
  }

  // Check for dangerous operations without IF NOT EXISTS/IF EXISTS
  if (upperSQL.startsWith('CREATE TABLE') && !upperSQL.includes('IF NOT EXISTS')) {
    warnings.push('CREATE TABLE without IF NOT EXISTS - may fail if table exists');
  }

  if (upperSQL.startsWith('CREATE INDEX') && !upperSQL.includes('IF NOT EXISTS')) {
    warnings.push('CREATE INDEX without IF NOT EXISTS - may fail if index exists');
  }

  // Check for missing semicolon at end
  if (!trimmed.endsWith(';')) {
    warnings.push('SQL statement does not end with semicolon');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate multiple SQL statements
 * @param {string[]} statements - Array of SQL statements
 * @returns {object[]} Array of validation results
 */
export function validateSQLBatch(statements) {
  return statements.map((sql, index) => ({
    index,
    sql: sql.substring(0, 50) + '...',
    ...validateSQL(sql)
  }));
}
