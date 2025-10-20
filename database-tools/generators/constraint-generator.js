/**
 * Constraint generator
 * Generates foreign key constraints and other constraints
 */

/**
 * Generate all foreign key constraints for a schema
 * @param {object} schema - Table schema
 * @returns {string[]} Array of ALTER TABLE statements
 */
export function generateForeignKeys(schema) {
  const constraints = [];

  if (!schema.foreignKeys || !Array.isArray(schema.foreignKeys)) {
    return constraints;
  }

  for (const fk of schema.foreignKeys) {
    constraints.push(generateForeignKey(schema.table, fk));
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

  return `ALTER TABLE ${tableName}
  ADD CONSTRAINT ${constraintName}
  FOREIGN KEY (${fk.column})
  REFERENCES ${fk.references}${onDelete}${onUpdate};`;
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
 * Generate CHECK constraints
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
 * Generate UNIQUE constraints (for multi-column unique constraints)
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
