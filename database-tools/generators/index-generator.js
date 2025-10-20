/**
 * Index generator
 * Generates CREATE INDEX statements from schema definitions
 */

/**
 * Generate all indexes for a schema
 * @param {object} schema - Table schema
 * @returns {string[]} Array of CREATE INDEX statements
 */
export function generateIndexes(schema) {
  const indexes = [];

  // Indexes from column definitions (columns with index: true)
  for (const col of schema.columns) {
    if (col.index && !col.primaryKey) {
      const indexName = `idx_${schema.table}_${col.name}`;
      const unique = col.unique ? 'UNIQUE ' : '';
      indexes.push(
        `CREATE ${unique}INDEX IF NOT EXISTS ${indexName} ON ${schema.table}(${col.name});`
      );
    }
  }

  // Composite indexes from indexes array
  if (schema.indexes && Array.isArray(schema.indexes)) {
    for (const idx of schema.indexes) {
      indexes.push(generateIndex(schema.table, idx));
    }
  }

  return indexes;
}

/**
 * Generate a single index definition
 * @param {string} tableName - Table name
 * @param {object} idx - Index definition
 * @returns {string} CREATE INDEX statement
 */
function generateIndex(tableName, idx) {
  // Use provided name or generate one
  const indexName = idx.name || `idx_${tableName}_${idx.columns.join('_')}`;

  // UNIQUE clause
  const unique = idx.unique ? 'UNIQUE ' : '';

  // Join columns
  const columns = idx.columns.join(', ');

  return `CREATE ${unique}INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columns});`;
}

/**
 * Generate DROP INDEX statement
 * @param {string} indexName - Name of index to drop
 * @returns {string} SQL DROP INDEX statement
 */
export function generateDropIndex(indexName) {
  return `DROP INDEX IF EXISTS ${indexName};`;
}
