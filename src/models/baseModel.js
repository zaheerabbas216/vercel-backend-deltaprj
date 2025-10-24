/**
 * Base Model Class
 *
 * This file provides common database operations that all models can use.
 * Think of it as a toolkit with ready-made functions for basic database tasks.
 *
 * For beginners:
 * - CRUD stands for Create, Read, Update, Delete - the basic database operations
 * - This base class provides these operations so you don't have to write them repeatedly
 * - Each specific model (User, Role, etc.) will extend this base class
 * - SQL queries use ? placeholders to prevent SQL injection attacks
 */

const { executeQuery, executeTransaction, findById } = require('./database');

class BaseModel {
  /**
     * Constructor sets up the model with table information
     * @param {string} tableName - Name of the database table
     * @param {string} primaryKey - Name of the primary key column (default: 'id')
     */
  constructor(tableName, primaryKey = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  /**
     * CREATE: Insert a new record into the database
     *
     * @param {Object} data - Data to insert
     * @returns {Promise<Object>} The created record with its ID
     */
  async create(data) {
    try {
      // Remove any undefined values and prepare data
      const cleanData = this._cleanData(data);

      // Get column names and values
      const columns = Object.keys(cleanData);
      const values = Object.values(cleanData);

      // Create placeholders for values (?, ?, ?)
      const placeholders = columns.map(() => '?').join(', ');

      // Build INSERT query
      const query = `
        INSERT INTO ${this.tableName} (${columns.join(', ')}) 
        VALUES (${placeholders})
      `;

      // Execute query
      const result = await executeQuery(query, values);

      // Get the newly created record
      const newRecord = await this.findById(result.insertId);

      console.log(`✅ Created new record in ${this.tableName} with ID: ${result.insertId}`);
      return newRecord;

    } catch (error) {
      console.error(`❌ Failed to create record in ${this.tableName}:`, error);
      throw new Error(`Failed to create ${this.tableName}: ${error.message}`);
    }
  }

  /**
     * READ: Find a single record by ID
     *
     * @param {number|string} id - Record ID
     * @returns {Promise<Object|null>} Record or null if not found
     */
  async findById(id) {
    try {
      const record = await findById(this.tableName, id, this.primaryKey);

      if (record) {
        console.log(`✅ Found record in ${this.tableName} with ID: ${id}`);
      } else {
        console.log(`ℹ️ No record found in ${this.tableName} with ID: ${id}`);
      }

      return record;
    } catch (error) {
      console.error(`❌ Failed to find record in ${this.tableName}:`, error);
      throw new Error(`Failed to find ${this.tableName}: ${error.message}`);
    }
  }

  /**
     * READ: Find records by specific conditions
     *
     * @param {Object} conditions - WHERE conditions
     * @param {Object} options - Query options (limit, offset, orderBy)
     * @returns {Promise<Array>} Array of matching records
     */
  async findBy(conditions = {}, options = {}) {
    try {
      // Build WHERE clause
      const { whereClause, values } = this._buildWhereClause(conditions);

      // Build ORDER BY clause
      const orderByClause = options.orderBy
        ? `ORDER BY ${options.orderBy}`
        : '';

      // Build LIMIT clause
      const limitClause = options.limit
        ? `LIMIT ${options.limit}`
        : '';

      // Build OFFSET clause
      const offsetClause = options.offset
        ? `OFFSET ${options.offset}`
        : '';

      // Build complete query
      const query = `
        SELECT * FROM ${this.tableName} 
        ${whereClause} 
        ${orderByClause} 
        ${limitClause} 
        ${offsetClause}
      `.trim();

      const records = await executeQuery(query, values);

      console.log(`✅ Found ${records.length} records in ${this.tableName}`);
      return records;

    } catch (error) {
      console.error(`❌ Failed to find records in ${this.tableName}:`, error);
      throw new Error(`Failed to find ${this.tableName}: ${error.message}`);
    }
  }

  /**
     * READ: Find one record by conditions
     *
     * @param {Object} conditions - WHERE conditions
     * @returns {Promise<Object|null>} First matching record or null
     */
  async findOne(conditions = {}) {
    try {
      const records = await this.findBy(conditions, { limit: 1 });
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      console.error(`❌ Failed to find one record in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
     * READ: Get all records from the table
     *
     * @param {Object} options - Query options (limit, offset, orderBy)
     * @returns {Promise<Array>} Array of all records
     */
  async findAll(options = {}) {
    try {
      return await this.findBy({}, options);
    } catch (error) {
      console.error(`❌ Failed to find all records in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
     * UPDATE: Update a record by ID
     *
     * @param {number|string} id - Record ID
     * @param {Object} data - Data to update
     * @returns {Promise<Object|null>} Updated record or null if not found
     */
  async updateById(id, data) {
    try {
      // Remove undefined values and prepare data
      const cleanData = this._cleanData(data);

      // Remove primary key from update data
      delete cleanData[this.primaryKey];

      // Check if there's data to update
      if (Object.keys(cleanData).length === 0) {
        throw new Error('No data provided for update');
      }

      // Build SET clause
      const setClause = Object.keys(cleanData)
        .map(column => `${column} = ?`)
        .join(', ');

      const values = [...Object.values(cleanData), id];

      // Build UPDATE query
      const query = `
        UPDATE ${this.tableName} 
        SET ${setClause} 
        WHERE ${this.primaryKey} = ?
      `;

      // Execute update
      const result = await executeQuery(query, values);

      if (result.affectedRows === 0) {
        console.log(`ℹ️ No record found to update in ${this.tableName} with ID: ${id}`);
        return null;
      }

      // Get updated record
      const updatedRecord = await this.findById(id);

      console.log(`✅ Updated record in ${this.tableName} with ID: ${id}`);
      return updatedRecord;

    } catch (error) {
      console.error(`❌ Failed to update record in ${this.tableName}:`, error);
      throw new Error(`Failed to update ${this.tableName}: ${error.message}`);
    }
  }

  /**
     * DELETE: Delete a record by ID
     *
     * @param {number|string} id - Record ID
     * @returns {Promise<boolean>} True if deleted, false if not found
     */
  async deleteById(id) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
      const result = await executeQuery(query, [id]);

      if (result.affectedRows === 0) {
        console.log(`ℹ️ No record found to delete in ${this.tableName} with ID: ${id}`);
        return false;
      }

      console.log(`✅ Deleted record from ${this.tableName} with ID: ${id}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to delete record from ${this.tableName}:`, error);
      throw new Error(`Failed to delete ${this.tableName}: ${error.message}`);
    }
  }

  /**
     * DELETE: Delete records by conditions
     *
     * @param {Object} conditions - WHERE conditions
     * @returns {Promise<number>} Number of deleted records
     */
  async deleteBy(conditions) {
    try {
      const { whereClause, values } = this._buildWhereClause(conditions);

      if (!whereClause || whereClause === 'WHERE 1=1') {
        throw new Error('Delete conditions are required to prevent accidental data loss');
      }

      const query = `DELETE FROM ${this.tableName} ${whereClause}`;
      const result = await executeQuery(query, values);

      console.log(`✅ Deleted ${result.affectedRows} records from ${this.tableName}`);
      return result.affectedRows;

    } catch (error) {
      console.error(`❌ Failed to delete records from ${this.tableName}:`, error);
      throw new Error(`Failed to delete ${this.tableName}: ${error.message}`);
    }
  }

  /**
     * Count records matching conditions
     *
     * @param {Object} conditions - WHERE conditions
     * @returns {Promise<number>} Number of matching records
     */
  async count(conditions = {}) {
    try {
      const { whereClause, values } = this._buildWhereClause(conditions);

      const query = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`;
      const result = await executeQuery(query, values);

      return parseInt(result[0].count);
    } catch (error) {
      console.error(`❌ Failed to count records in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
     * Check if a record exists
     *
     * @param {Object} conditions - WHERE conditions
     * @returns {Promise<boolean>} True if exists, false otherwise
     */
  async exists(conditions) {
    try {
      const count = await this.count(conditions);
      return count > 0;
    } catch (error) {
      console.error(`❌ Failed to check existence in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
     * Helper method to clean data (remove undefined values)
     * @private
     */
  _cleanData(data) {
    const cleaned = {};

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  /**
     * Helper method to build WHERE clause from conditions
     * @private
     */
  _buildWhereClause(conditions) {
    const keys = Object.keys(conditions);

    if (keys.length === 0) {
      return { whereClause: '', values: [] };
    }

    const whereParts = keys.map(key => {
      // Handle different condition types
      if (conditions[key] === null) {
        return `${key} IS NULL`;
      } else if (Array.isArray(conditions[key])) {
        return `${key} IN (${conditions[key].map(() => '?').join(', ')})`;
      } else {
        return `${key} = ?`;
      }
    });

    const values = keys.reduce((acc, key) => {
      if (conditions[key] !== null) {
        if (Array.isArray(conditions[key])) {
          acc.push(...conditions[key]);
        } else {
          acc.push(conditions[key]);
        }
      }
      return acc;
    }, []);

    return {
      whereClause: `WHERE ${whereParts.join(' AND ')}`,
      values
    };
  }
}

module.exports = BaseModel;
