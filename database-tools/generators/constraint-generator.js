/**
 * Constraint generator
 * Generates foreign key constraints and other constraints
 */

/**
 * Generate all foreign key constraints for a schema
 * Supports both foreignKeys array (preferred) and inline foreignKey (legacy)
 * @param {object} schema - Table schema
 * @returns {string[]} Array of ALTER TABLE statements
 */
export function generateForeignKeys(schema) {
  const constraints = [];

  // Support foreignKeys array (preferred format)
  if (schema.foreignKeys && Array.isArray(schema.foreignKeys)) {
    for (const fk of schema.foreignKeys) {
      constraints.push(generateForeignKey(schema.table, fk));
    }
  }

  // Support inline foreignKey format (legacy - for backward compatibility)
  if (schema.columns && Array.isArray(schema.columns)) {
    for (const col of schema.columns) {
      if (col.foreignKey) {
        // Convert inline format to standard format
        let fk;
        if (typeof col.foreignKey === 'string') {
          // Format: "table.column"
          fk = {
            column: col.name,
            references: col.foreignKey
          };
        } else if (typeof col.foreignKey === 'object') {
          // Format: { table: "...", column: "...", onDelete: "..." }
          fk = {
            column: col.name,
            references: `${col.foreignKey.table}.${col.foreignKey.column}`,
            onDelete: col.foreignKey.onDelete,
            onUpdate: col.foreignKey.onUpdate
          };
        }

        if (fk) {
          constraints.push(generateForeignKey(schema.table, fk));
        }
      }
    }
  }

  return constraints;
}

/**
 * Generate a single foreign key constraint
 * @param {string} tableName - Table name
 * @param {object} fk - Foreign key definition
 * @returns {string} ALTER TABLE statement
 */
function generateForeignKey(tableName, fk) {
  // Constraint name
  const constraintName = fk.name || `fk_${tableName}_${fk.column}`;

  // ON DELETE and ON UPDATE actions
  const onDelete = fk.onDelete ? ` ON DELETE ${fk.onDelete}` : '';
  const onUpdate = fk.onUpdate ? ` ON UPDATE ${fk.onUpdate}` : '';

  // Parse references: "table.column" -> "table(column)"
  const [refTable, refColumn] = fk.references.split('.');
  const referencesSQL = `${refTable}(${refColumn})`;

  return `ALTER TABLE ${tableName}
  ADD CONSTRAINT ${constraintName}
  FOREIGN KEY (${fk.column})
  REFERENCES ${referencesSQL}${onDelete}${onUpdate};`;
}

/**
 * Drop a foreign key constraint
 * @param {string} tableName - Table name
 * @param {string} constraintName - Constraint name
 * @returns {string} ALTER TABLE statement
 */
export function dropForeignKey(tableName, constraintName) {
  return `ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${constraintName};`;
}

/**
 * Generate all CHECK constraints for a schema
 * @param {object} schema - Table schema
 * @returns {string[]} Array of ALTER TABLE statements
 */
export function generateCheckConstraints(schema) {
  const constraints = [];

  if (!schema.constraints || !Array.isArray(schema.constraints)) {
    return constraints;
  }

  for (const constraint of schema.constraints) {
    if (constraint.type === 'check') {
      constraints.push(generateCheckConstraint(schema.table, constraint));
    }
  }

  return constraints;
}

/**
 * Generate a single CHECK constraint
 * @param {string} tableName - Table name
 * @param {object} constraint - Constraint definition
 * @returns {string} ALTER TABLE statement
 */
export function generateCheckConstraint(tableName, constraint) {
  const constraintName = constraint.name || `chk_${tableName}_${constraint.column}`;

  return `ALTER TABLE ${tableName}
  ADD CONSTRAINT ${constraintName}
  CHECK (${constraint.expression});`;
}

/**
 * Generate all UNIQUE constraints for a schema
 * @param {object} schema - Table schema
 * @returns {string[]} Array of ALTER TABLE statements
 */
export function generateUniqueConstraints(schema) {
  const constraints = [];

  if (!schema.constraints || !Array.isArray(schema.constraints)) {
    return constraints;
  }

  for (const constraint of schema.constraints) {
    if (constraint.type === 'unique') {
      constraints.push(generateUniqueConstraint(schema.table, constraint));
    }
  }

  return constraints;
}

/**
 * Generate a single UNIQUE constraint (for multi-column unique constraints)
 * @param {string} tableName - Table name
 * @param {object} constraint - Constraint definition
 * @returns {string} ALTER TABLE statement
 */
export function generateUniqueConstraint(tableName, constraint) {
  const constraintName = constraint.name || `unq_${tableName}_${constraint.columns.join('_')}`;
  const columns = constraint.columns.join(', ');

  return `ALTER TABLE ${tableName}
  ADD CONSTRAINT ${constraintName}
  UNIQUE (${columns});`;
}
