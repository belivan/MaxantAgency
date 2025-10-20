/**
 * Table generator
 * Converts JSON schema definitions to CREATE TABLE SQL statements
 */

/**
 * Generate CREATE TABLE statement from schema
 * @param {object} schema - Table schema
 * @returns {string} SQL CREATE TABLE statement
 */
export function generateCreateTable(schema) {
  const columns = schema.columns.map(col => generateColumnDefinition(col));

  const sql = `CREATE TABLE IF NOT EXISTS ${schema.table} (
${columns.join(',\n')}
);`;

  return sql;
}

/**
 * Generate a single column definition
 * @param {object} col - Column schema
 * @returns {string} Column definition SQL
 */
function generateColumnDefinition(col) {
  let sql = `  ${col.name} ${getColumnType(col)}`;

  // Primary key
  if (col.primaryKey) {
    sql += ' PRIMARY KEY';
  }

  // NOT NULL constraint
  if (col.required && !col.primaryKey) {
    sql += ' NOT NULL';
  }

  // UNIQUE constraint
  if (col.unique && !col.primaryKey) {
    sql += ' UNIQUE';
  }

  // DEFAULT value
  if (col.default !== undefined) {
    sql += ` DEFAULT ${formatDefaultValue(col.default, col.type)}`;
  }

  // CHECK constraint for enum
  if (col.enum && Array.isArray(col.enum)) {
    const enumValues = col.enum.map(v => `'${v}'`).join(', ');
    sql += ` CHECK (${col.name} IN (${enumValues}))`;
  }

  return sql;
}

/**
 * Get the column type (with precision/scale if applicable)
 * @param {object} col - Column schema
 * @returns {string} SQL type
 */
function getColumnType(col) {
  // If type already includes parameters (e.g., "varchar(255)"), use as-is
  if (col.type.includes('(')) {
    return col.type;
  }

  // Handle decimal/numeric with precision and scale
  if ((col.type === 'decimal' || col.type === 'numeric') && col.precision) {
    if (col.scale !== undefined) {
      return `${col.type}(${col.precision},${col.scale})`;
    }
    return `${col.type}(${col.precision})`;
  }

  // Default: return type as-is
  return col.type;
}

/**
 * Format a default value for SQL
 * @param {any} value - Default value
 * @param {string} type - Column type
 * @returns {string} Formatted default value
 */
function formatDefaultValue(value, type) {
  // Functions like now(), gen_random_uuid() - use as-is
  if (typeof value === 'string' && value.includes('()')) {
    return value;
  }

  // Booleans
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  // Numbers
  if (typeof value === 'number') {
    return value.toString();
  }

  // NULL
  if (value === null) {
    return 'NULL';
  }

  // Strings - quote them
  return `'${value}'`;
}

/**
 * Generate DROP TABLE statement
 * @param {string} tableName - Name of table to drop
 * @param {boolean} cascade - Whether to use CASCADE
 * @returns {string} SQL DROP TABLE statement
 */
export function generateDropTable(tableName, cascade = false) {
  const cascadeClause = cascade ? ' CASCADE' : '';
  return `DROP TABLE IF EXISTS ${tableName}${cascadeClause};`;
}
