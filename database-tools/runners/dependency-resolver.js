/**
 * Dependency resolver
 * Orders tables by foreign key dependencies using topological sort
 */

/**
 * Resolve dependencies and order schemas
 * @param {object[]} schemas - Array of schemas
 * @returns {object[]} Ordered schemas (dependencies first)
 */
export function resolveDependencies(schemas) {
  // Build dependency graph
  const graph = buildDependencyGraph(schemas);

  // Perform topological sort
  const ordered = topologicalSort(graph, schemas);

  return ordered;
}

/**
 * Build a dependency graph from schemas
 * @param {object[]} schemas - Array of schemas
 * @returns {object} Graph mapping table -> dependencies
 */
function buildDependencyGraph(schemas) {
  const graph = {};

  // Initialize graph with all tables
  for (const schema of schemas) {
    graph[schema.table] = [];
  }

  // Add dependencies from foreign keys
  for (const schema of schemas) {
    if (schema.foreignKeys && Array.isArray(schema.foreignKeys)) {
      for (const fk of schema.foreignKeys) {
        // Parse reference (format: "table.column")
        const referencedTable = fk.references.split('.')[0];

        // Add dependency (this table depends on referencedTable)
        if (graph[schema.table] && referencedTable !== schema.table) {
          graph[schema.table].push(referencedTable);
        }
      }
    }
  }

  return graph;
}

/**
 * Perform topological sort on dependency graph
 * @param {object} graph - Dependency graph
 * @param {object[]} schemas - Original schemas array
 * @returns {object[]} Sorted schemas
 */
function topologicalSort(graph, schemas) {
  const visited = new Set();
  const temp = new Set(); // For cycle detection
  const result = [];

  /**
   * DFS visit function
   * @param {string} table - Table name to visit
   */
  function visit(table) {
    // Cycle detection
    if (temp.has(table)) {
      throw new Error(`Circular dependency detected involving table: ${table}`);
    }

    if (visited.has(table)) {
      return;
    }

    temp.add(table);

    // Visit all dependencies first
    const dependencies = graph[table] || [];
    for (const dep of dependencies) {
      if (graph[dep] !== undefined) {
        visit(dep);
      }
    }

    temp.delete(table);
    visited.add(table);

    // Add to result (dependencies added first, then this table)
    const schema = schemas.find(s => s.table === table);
    if (schema) {
      result.push(schema);
    }
  }

  // Visit all tables
  for (const table of Object.keys(graph)) {
    if (!visited.has(table)) {
      visit(table);
    }
  }

  return result;
}

/**
 * Get dependency information for a table
 * @param {string} tableName - Table to check
 * @param {object[]} schemas - All schemas
 * @returns {object} Dependency info
 */
export function getDependencyInfo(tableName, schemas) {
  const graph = buildDependencyGraph(schemas);
  const dependencies = graph[tableName] || [];

  // Find tables that depend on this table
  const dependents = [];
  for (const [table, deps] of Object.entries(graph)) {
    if (deps.includes(tableName)) {
      dependents.push(table);
    }
  }

  return {
    table: tableName,
    dependencies,
    dependents,
    hasDependencies: dependencies.length > 0,
    isDependedOn: dependents.length > 0
  };
}

/**
 * Check for circular dependencies
 * @param {object[]} schemas - Array of schemas
 * @returns {object} Result with any cycles found
 */
export function checkCircularDependencies(schemas) {
  const graph = buildDependencyGraph(schemas);

  try {
    topologicalSort(graph, schemas);
    return { hasCircular: false, cycles: [] };
  } catch (error) {
    return {
      hasCircular: true,
      cycles: [error.message]
    };
  }
}
