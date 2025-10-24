/**
 * SQL Query Builder Utilities
 *
 * This file provides simple utilities to build SQL queries programmatically.
 * It's designed to be beginner-friendly and help prevent SQL injection attacks.
 *
 * For beginners:
 * - SQL injection happens when user input is directly inserted into queries
 * - We prevent this by using parameterized queries with placeholders (?)
 * - These utilities help build safe queries without writing raw SQL strings
 */

/**
 * Build a SELECT query with various options
 *
 * @param {Object} options - Query options
 * @param {string} options.table - Table name
 * @param {Array|string} options.select - Columns to select (default: ['*'])
 * @param {Object} options.where - WHERE conditions
 * @param {Array} options.join - JOIN clauses
 * @param {string} options.orderBy - ORDER BY clause
 * @param {number} options.limit - LIMIT clause
 * @param {number} options.offset - OFFSET clause
 * @param {string} options.groupBy - GROUP BY clause
 * @param {Object} options.having - HAVING conditions
 * @returns {Object} Query string and parameters
 */
function buildSelectQuery(options) {
  const {
    table,
    select = ['*'],
    where = {},
    join = [],
    orderBy = '',
    limit = null,
    offset = null,
    groupBy = '',
    having = {}
  } = options;

  // Build SELECT clause
  const selectClause = Array.isArray(select)
    ? select.join(', ')
    : select;

  // Start building query
  let query = `SELECT ${selectClause} FROM ${table}`;
  const params = [];

  // Add JOIN clauses
  if (join.length > 0) {
    query += ' ' + join.join(' ');
  }

  // Add WHERE clause
  const whereResult = buildWhereClause(where);
  if (whereResult.clause) {
    query += ' ' + whereResult.clause;
    params.push(...whereResult.params);
  }

  // Add GROUP BY clause
  if (groupBy) {
    query += ` GROUP BY ${groupBy}`;
  }

  // Add HAVING clause
  if (Object.keys(having).length > 0) {
    const havingResult = buildWhereClause(having, 'HAVING');
    if (havingResult.clause) {
      query += ' ' + havingResult.clause;
      params.push(...havingResult.params);
    }
  }

  // Add ORDER BY clause
  if (orderBy) {
    query += ` ORDER BY ${orderBy}`;
  }

  // Add LIMIT clause
  if (limit) {
    query += ` LIMIT ${limit}`;
  }

  // Add OFFSET clause
  if (offset) {
    query += ` OFFSET ${offset}`;
  }

  return { query, params };
}

/**
 * Build an INSERT query
 *
 * @param {string} table - Table name
 * @param {Object|Array} data - Data to insert
 * @param {Object} options - Insert options
 * @param {boolean} options.ignore - Use INSERT IGNORE
 * @param {boolean} options.replace - Use REPLACE INTO
 * @param {string} options.onDuplicate - ON DUPLICATE KEY UPDATE clause
 * @returns {Object} Query string and parameters
 */
function buildInsertQuery(table, data, options = {}) {
  const { ignore = false, replace = false, onDuplicate = '' } = options;

  // Determine INSERT type
  let insertType = 'INSERT';
  if (replace) {
    insertType = 'REPLACE';
  } else if (ignore) {
    insertType = 'INSERT IGNORE';
  }

  // Handle single record or multiple records
  if (!Array.isArray(data)) {
    data = [data];
  }

  // Get all columns from first record
  const columns = Object.keys(data[0]);
  const columnsList = columns.join(', ');

  // Build VALUES clause
  const valuesList = [];
  const params = [];

  data.forEach(record => {
    const recordValues = [];
    columns.forEach(column => {
      recordValues.push('?');
      params.push(record[column] !== undefined ? record[column] : null);
    });
    valuesList.push(`(${recordValues.join(', ')})`);
  });

  // Build query
  let query = `${insertType} INTO ${table} (${columnsList}) VALUES ${valuesList.join(', ')}`;

  // Add ON DUPLICATE KEY UPDATE if specified
  if (onDuplicate) {
    query += ` ON DUPLICATE KEY UPDATE ${onDuplicate}`;
  }

  return { query, params };
}

/**
 * Build an UPDATE query
 *
 * @param {string} table - Table name
 * @param {Object} data - Data to update
 * @param {Object} where - WHERE conditions
 * @param {Object} options - Update options
 * @returns {Object} Query string and parameters
 */
function buildUpdateQuery(table, data, where = {}, options = {}) {
  // Build SET clause
  const setClause = Object.keys(data)
    .map(column => `${column} = ?`)
    .join(', ');

  const setParams = Object.values(data);

  // Build WHERE clause
  const whereResult = buildWhereClause(where);

  // Ensure WHERE clause exists for safety
  if (!whereResult.clause) {
    throw new Error('UPDATE query requires WHERE conditions for safety');
  }

  // Build query
  const query = `UPDATE ${table} SET ${setClause} ${whereResult.clause}`;
  const params = [...setParams, ...whereResult.params];

  return { query, params };
}

/**
 * Build a DELETE query
 *
 * @param {string} table - Table name
 * @param {Object} where - WHERE conditions
 * @returns {Object} Query string and parameters
 */
function buildDeleteQuery(table, where = {}) {
  // Build WHERE clause
  const whereResult = buildWhereClause(where);

  // Ensure WHERE clause exists for safety
  if (!whereResult.clause) {
    throw new Error('DELETE query requires WHERE conditions for safety');
  }

  // Build query
  const query = `DELETE FROM ${table} ${whereResult.clause}`;

  return { query, params: whereResult.params };
}

/**
 * Build WHERE clause from conditions object
 *
 * @param {Object} conditions - Conditions object
 * @param {string} keyword - SQL keyword (WHERE or HAVING)
 * @returns {Object} WHERE clause and parameters
 */
function buildWhereClause(conditions, keyword = 'WHERE') {
  const keys = Object.keys(conditions);

  if (keys.length === 0) {
    return { clause: '', params: [] };
  }

  const whereParts = [];
  const params = [];

  keys.forEach(key => {
    const value = conditions[key];

    if (value === null) {
      // Handle NULL values
      whereParts.push(`${key} IS NULL`);
    } else if (value === undefined) {
      // Skip undefined values

    } else if (Array.isArray(value)) {
      // Handle IN clause
      if (value.length === 0) {
        whereParts.push('1=0'); // Always false for empty arrays
      } else {
        const placeholders = value.map(() => '?').join(', ');
        whereParts.push(`${key} IN (${placeholders})`);
        params.push(...value);
      }
    } else if (typeof value === 'object' && value.operator) {
      // Handle custom operators
      const { operator, value: operatorValue } = value;
      whereParts.push(`${key} ${operator} ?`);
      params.push(operatorValue);
    } else {
      // Handle regular equality
      whereParts.push(`${key} = ?`);
      params.push(value);
    }
  });

  const clause = whereParts.length > 0
    ? `${keyword} ${whereParts.join(' AND ')}`
    : '';

  return { clause, params };
}

/**
 * Build JOIN clause
 *
 * @param {string} type - JOIN type (INNER, LEFT, RIGHT, FULL)
 * @param {string} table - Table to join
 * @param {string} condition - JOIN condition
 * @returns {string} JOIN clause
 */
function buildJoinClause(type, table, condition) {
  return `${type} JOIN ${table} ON ${condition}`;
}

/**
 * Escape table and column names to prevent SQL injection
 *
 * @param {string} identifier - Table or column name
 * @returns {string} Escaped identifier
 */
function escapeIdentifier(identifier) {
  // Remove any existing backticks and add new ones
  return `\`${identifier.replace(/`/g, '')}\``;
}

/**
 * Build pagination clause
 *
 * @param {number} page - Page number (1-based)
 * @param {number} pageSize - Number of records per page
 * @returns {Object} LIMIT and OFFSET values
 */
function buildPaginationClause(page, pageSize) {
  const limit = parseInt(pageSize);
  const offset = (parseInt(page) - 1) * limit;

  return { limit, offset };
}

/**
 * Build search clause for text search across multiple columns
 *
 * @param {Array} columns - Columns to search in
 * @param {string} searchTerm - Search term
 * @returns {Object} WHERE clause and parameters for search
 */
function buildSearchClause(columns, searchTerm) {
  if (!searchTerm || !columns || columns.length === 0) {
    return { clause: '', params: [] };
  }

  const searchPattern = `%${searchTerm}%`;
  const searchParts = columns.map(column => `${column} LIKE ?`);
  const params = columns.map(() => searchPattern);

  return {
    clause: `WHERE (${searchParts.join(' OR ')})`,
    params
  };
}

/**
 * Build date range clause
 *
 * @param {string} column - Date column name
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Object} WHERE clause and parameters for date range
 */
function buildDateRangeClause(column, startDate, endDate) {
  const conditions = {};

  if (startDate) {
    conditions[`${column}_start`] = { operator: '>=', value: startDate };
  }

  if (endDate) {
    conditions[`${column}_end`] = { operator: '<=', value: endDate };
  }

  // Replace the generated keys with the actual column name
  const result = buildWhereClause(conditions);
  if (result.clause) {
    result.clause = result.clause
      .replace(`${column}_start`, column)
      .replace(`${column}_end`, column);
  }

  return result;
}

/**
 * Build ORDER BY clause with multiple columns
 *
 * @param {Array|Object} orderBy - Order by specification
 * @returns {string} ORDER BY clause
 */
function buildOrderByClause(orderBy) {
  if (!orderBy) {
    return '';
  }

  if (typeof orderBy === 'string') {
    return `ORDER BY ${orderBy}`;
  }

  if (Array.isArray(orderBy)) {
    return `ORDER BY ${orderBy.join(', ')}`;
  }

  if (typeof orderBy === 'object') {
    const orderParts = Object.entries(orderBy)
      .map(([column, direction]) => `${column} ${direction.toUpperCase()}`);
    return `ORDER BY ${orderParts.join(', ')}`;
  }

  return '';
}

/**
 * Validate and sanitize SQL identifiers
 *
 * @param {string} identifier - Table or column name
 * @returns {boolean} True if valid, false otherwise
 */
function isValidIdentifier(identifier) {
  // Check for valid SQL identifier (letters, numbers, underscores)
  const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return identifierRegex.test(identifier);
}

/**
 * Build a COUNT query
 *
 * @param {Object} options - Query options
 * @param {string} options.table - Table name
 * @param {Object} options.where - WHERE conditions
 * @param {string} options.column - Column to count (default: *)
 * @param {boolean} options.distinct - Use COUNT DISTINCT
 * @returns {Object} Query string and parameters
 */
function buildCountQuery(options) {
  const {
    table,
    where = {},
    column = '*',
    distinct = false
  } = options;

  // Build COUNT clause
  const countClause = distinct
    ? `COUNT(DISTINCT ${column})`
    : `COUNT(${column})`;

  // Build WHERE clause
  const whereResult = buildWhereClause(where);

  // Build query
  let query = `SELECT ${countClause} as count FROM ${table}`;
  if (whereResult.clause) {
    query += ' ' + whereResult.clause;
  }

  return { query, params: whereResult.params };
}

/**
 * Build an EXISTS subquery
 *
 * @param {Object} options - Subquery options
 * @param {string} options.table - Table name
 * @param {Object} options.where - WHERE conditions
 * @param {string} options.correlationColumn - Column for correlation
 * @param {string} options.parentColumn - Parent table column
 * @returns {string} EXISTS subquery
 */
function buildExistsSubquery(options) {
  const {
    table,
    where = {},
    correlationColumn,
    parentColumn
  } = options;

  // Add correlation condition
  const correlationConditions = { ...where };
  if (correlationColumn && parentColumn) {
    correlationConditions[correlationColumn] = { operator: '=', value: parentColumn };
  }

  // Build subquery
  const whereResult = buildWhereClause(correlationConditions);
  let subquery = `EXISTS (SELECT 1 FROM ${table}`;

  if (whereResult.clause) {
    subquery += ' ' + whereResult.clause;
  }

  subquery += ')';

  return subquery;
}

/**
 * Build a UNION query
 *
 * @param {Array} queries - Array of query objects
 * @param {boolean} unionAll - Use UNION ALL instead of UNION
 * @returns {Object} Combined query and parameters
 */
function buildUnionQuery(queries, unionAll = false) {
  if (!queries || queries.length === 0) {
    throw new Error('UNION query requires at least one query');
  }

  const unionType = unionAll ? 'UNION ALL' : 'UNION';
  const queryParts = [];
  const allParams = [];

  queries.forEach(queryObj => {
    queryParts.push(`(${queryObj.query})`);
    allParams.push(...queryObj.params);
  });

  const query = queryParts.join(` ${unionType} `);

  return { query, params: allParams };
}

/**
 * Build a batch insert query for multiple records
 *
 * @param {string} table - Table name
 * @param {Array} records - Array of record objects
 * @param {number} batchSize - Number of records per batch
 * @returns {Array} Array of query objects for each batch
 */
function buildBatchInsertQueries(table, records, batchSize = 1000) {
  if (!records || records.length === 0) {
    return [];
  }

  const batches = [];

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const queryObj = buildInsertQuery(table, batch);
    batches.push(queryObj);
  }

  return batches;
}

/**
 * Utility functions for common query patterns
 */
const QueryPatterns = {
  /**
     * Find records with pagination
     */
  paginate: (table, conditions, page, pageSize, orderBy = 'id ASC') => {
    const { limit, offset } = buildPaginationClause(page, pageSize);
    return buildSelectQuery({
      table,
      where: conditions,
      orderBy,
      limit,
      offset
    });
  },

  /**
     * Search records with text matching
     */
  search: (table, searchColumns, searchTerm, additionalWhere = {}) => {
    const searchResult = buildSearchClause(searchColumns, searchTerm);
    const whereResult = buildWhereClause(additionalWhere);

    let combinedClause = '';
    let combinedParams = [];

    if (searchResult.clause && whereResult.clause) {
      combinedClause = `${searchResult.clause} AND (${whereResult.clause.replace('WHERE ', '')})`;
      combinedParams = [...searchResult.params, ...whereResult.params];
    } else if (searchResult.clause) {
      combinedClause = searchResult.clause;
      combinedParams = searchResult.params;
    } else if (whereResult.clause) {
      combinedClause = whereResult.clause;
      combinedParams = whereResult.params;
    }

    return {
      query: `SELECT * FROM ${table} ${combinedClause}`,
      params: combinedParams
    };
  },

  /**
     * Soft delete (update deleted_at instead of actual deletion)
     */
  softDelete: (table, id, deletedAt = new Date()) => {
    return buildUpdateQuery(table, { deleted_at: deletedAt }, { id });
  },

  /**
     * Find active records (where deleted_at is null)
     */
  findActive: (table, conditions = {}) => {
    const activeConditions = { ...conditions, deleted_at: null };
    return buildSelectQuery({ table, where: activeConditions });
  }
};

module.exports = {
  // Main query builders
  buildSelectQuery,
  buildInsertQuery,
  buildUpdateQuery,
  buildDeleteQuery,
  buildCountQuery,

  // Clause builders
  buildWhereClause,
  buildJoinClause,
  buildOrderByClause,
  buildPaginationClause,
  buildSearchClause,
  buildDateRangeClause,
  buildExistsSubquery,

  // Advanced builders
  buildUnionQuery,
  buildBatchInsertQueries,

  // Utilities
  escapeIdentifier,
  isValidIdentifier,

  // Common patterns
  QueryPatterns
};
