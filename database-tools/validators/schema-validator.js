/**
 * Schema validator
 * Validates JSON schema definitions for errors and warnings
 */

/**
 * Validate a single schema
 * @param {object} schema - Schema to validate
 * @param {object[]} allSchemas - All schemas (for cross-reference validation)
 * @returns {object} Validation result with errors and warnings
 */
export function validateSchema(schema, allSchemas = []) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!schema.table) {
    errors.push('Missing required field: table');
  }

  if (!schema.columns || !Array.isArray(schema.columns) || schema.columns.length === 0) {
    errors.push('Table must have at least one column');
  }

  // Validate table name format
  if (schema.table && !/^[a-z_][a-z0-9_]*$/.test(schema.table)) {
    errors.push('Table name must be lowercase with underscores only');
  }

  // Primary key check
  if (schema.columns) {
    const hasPrimaryKey = schema.columns.some(c => c.primaryKey);
    if (!hasPrimaryKey) {
      warnings.push('No primary key defined');
    }

    // Validate each column
    for (const col of schema.columns) {
      validateColumn(col, errors, warnings);
    }
  }

  // Validate foreign keys
  if (schema.foreignKeys && Array.isArray(schema.foreignKeys)) {
    for (const fk of schema.foreignKeys) {
      validateForeignKey(fk, schema, allSchemas, errors, warnings);
    }
  }

  // Validate indexes
  if (schema.indexes && Array.isArray(schema.indexes)) {
    for (const idx of schema.indexes) {
      validateIndex(idx, schema, errors, warnings);
    }
  }

  // Check for foreign key columns without indexes
  if (schema.columns) {
    for (const col of schema.columns) {
      if (col.foreignKey && !col.index) {
        warnings.push(`Column "${col.name}" is a foreign key but has no index`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a column definition
 * @param {object} col - Column definition
 * @param {string[]} errors - Array to push errors to
 * @param {string[]} warnings - Array to push warnings to
 */
function validateColumn(col, errors, warnings) {
  if (!col.name) {
    errors.push('Column missing name');
    return;
  }

  if (!col.type) {
    errors.push(`Column "${col.name}" missing type`);
  }

  // Validate column name format
  if (!/^[a-z_][a-z0-9_]*$/.test(col.name)) {
    errors.push(`Column "${col.name}" must be lowercase with underscores only`);
  }

  // Validate type
  const validTypes = [
    'text', 'varchar', 'integer', 'bigint', 'decimal', 'numeric',
    'uuid', 'boolean', 'json', 'jsonb',
    'timestamp', 'timestamptz', 'date', 'time'
  ];

  // Check if type is valid (including parameterized types like varchar(255))
  const baseType = col.type.split('(')[0];
  if (!validTypes.includes(baseType)) {
    warnings.push(`Column "${col.name}" has unknown type "${col.type}"`);
  }

  // Validate enum values
  if (col.enum && (!Array.isArray(col.enum) || col.enum.length === 0)) {
    errors.push(`Column "${col.name}" has invalid enum definition`);
  }

  // Check for default values on required columns
  if (col.required && !col.default && !col.primaryKey) {
    warnings.push(`Column "${col.name}" is required but has no default value`);
  }
}

/**
 * Validate a foreign key definition
 * @param {object} fk - Foreign key definition
 * @param {object} schema - Parent schema
 * @param {object[]} allSchemas - All schemas
 * @param {string[]} errors - Array to push errors to
 * @param {string[]} warnings - Array to push warnings to
 */
function validateForeignKey(fk, schema, allSchemas, errors, warnings) {
  if (!fk.column) {
    errors.push('Foreign key missing column');
    return;
  }

  if (!fk.references) {
    errors.push(`Foreign key on "${fk.column}" missing references`);
    return;
  }

  // Parse reference (format: "table.column")
  const parts = fk.references.split('.');
  if (parts.length !== 2) {
    errors.push(`Invalid foreign key reference format: "${fk.references}" (expected "table.column")`);
    return;
  }

  const [refTable, refColumn] = parts;

  // Check if column exists in current schema
  if (schema.columns && Array.isArray(schema.columns)) {
    const columnExists = schema.columns.some(c => c.name === fk.column);
    if (!columnExists) {
      errors.push(`Foreign key references non-existent column: "${fk.column}"`);
    }
  }

  // Check if referenced table exists (if we have all schemas)
  if (allSchemas.length > 0) {
    const referencedSchema = allSchemas.find(s => s.table === refTable);
    if (!referencedSchema) {
      errors.push(`Foreign key references non-existent table: "${refTable}"`);
    } else if (referencedSchema.columns && Array.isArray(referencedSchema.columns)) {
      // Check if referenced column exists
      const refColExists = referencedSchema.columns.some(c => c.name === refColumn);
      if (!refColExists) {
        errors.push(`Foreign key references non-existent column: "${refTable}.${refColumn}"`);
      }
    }
  }

  // Validate onDelete and onUpdate actions
  const validActions = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION', 'SET DEFAULT'];

  if (fk.onDelete && !validActions.includes(fk.onDelete)) {
    errors.push(`Invalid onDelete action: "${fk.onDelete}"`);
  }

  if (fk.onUpdate && !validActions.includes(fk.onUpdate)) {
    errors.push(`Invalid onUpdate action: "${fk.onUpdate}"`);
  }
}

/**
 * Validate an index definition
 * @param {object} idx - Index definition
 * @param {object} schema - Parent schema
 * @param {string[]} errors - Array to push errors to
 * @param {string[]} warnings - Array to push warnings to
 */
function validateIndex(idx, schema, errors, warnings) {
  if (!idx.columns || !Array.isArray(idx.columns) || idx.columns.length === 0) {
    errors.push('Index missing columns array');
    return;
  }

  // Check if all indexed columns exist
  if (schema.columns && Array.isArray(schema.columns)) {
    for (const colName of idx.columns) {
      const colExists = schema.columns.some(c => c.name === colName);
      if (!colExists) {
        errors.push(`Index references non-existent column: "${colName}"`);
      }
    }
  }

  // Validate index name if provided
  if (idx.name && !/^[a-z_][a-z0-9_]*$/.test(idx.name)) {
    errors.push(`Index name "${idx.name}" must be lowercase with underscores only`);
  }
}

/**
 * Validate all schemas together (for cross-references)
 * @param {object[]} schemas - All schemas to validate
 * @returns {object} Validation results by table name
 */
export function validateAllSchemas(schemas) {
  const results = {};

  // Check for duplicate table names
  const tableNames = new Set();
  for (const schema of schemas) {
    if (tableNames.has(schema.table)) {
      if (!results[schema.table]) {
        results[schema.table] = { valid: false, errors: [], warnings: [] };
      }
      results[schema.table].errors.push('Duplicate table name');
    }
    tableNames.add(schema.table);
  }

  // Validate each schema
  for (const schema of schemas) {
    const result = validateSchema(schema, schemas);
    results[schema.table] = result;
  }

  return results;
}
