import _ from "lodash";
import { addTicks, DialectOptions, FKRow, StringBounds } from "./dialect-options";

export const sqliteOptions: DialectOptions = {
  name: 'sqlite',
  hasSchema: false,
  /**
   * Generates an SQL query that returns all foreign keys of a table.
   *
   * @param  {String} tableName  The name of the table.
   * @return {String}            The generated sql query.
   */
  getForeignKeysQuery: (tableName: string, schemaName: string) => {
    return `PRAGMA foreign_key_list(\`${tableName}\`);`;
  },

  /**
   * In SQLITE, PRAGMAs are isolated statement that cannot be run as subqueries.
   * In SQLite 3.16.0 there are PRAGMA functions which can be used in a subquery,
   * but sequelize-auto for now aims to support as many versions as possible,
   * so it does not rely on that feature. As such getForeignKeysQuery() can
   * only contain a PRAGMA statement and the result set needs to be reformatted
   * elsewhere, by this function.
   * @param  {String} tableName  The name of the table.
   * @param  {Object} row  One of the rows of the result set from getForeignKeysQuery().
   */
  remapForeignKeysRow: (tableName: string, row: FKRow) => {
    return {
      constraint_name: `${tableName}_${row.id}`,
      source_schema: undefined,
      source_table: tableName,
      source_column: row.from,
      target_schema: undefined,
      target_table: row.table,
      target_column: row.to
    };
  },

  /**
   * Generates an SQL query that tells if this table has triggers or not. The
   * result set returns the total number of triggers for that table. If 0, the
   * table has no triggers.
   *
   * @param  {String} tableName  The name of the table.
   * @param  {String} schemaName The name of the schema.
   * @return {String}            The generated sql query.
   */
  countTriggerQuery: (tableName: string, schemaName: string) => {
    return `SELECT COUNT(0) AS trigger_count
              FROM sqlite_master
             WHERE type = 'trigger'
               AND tbl_name = ${addTicks(tableName)}`;
  },
  /**
   * Determines if record entry from the getForeignKeysQuery
   * results is an actual primary key
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isPrimaryKey: (record: FKRow) => {
    return _.isObject(record) && _.has(record, 'primaryKey') && record.primaryKey === true;
  },

  /**
   * Determines if record entry is an actual serial/auto increment key
   * For sqlite, a row is automatically AUTOINCREMENT if it is INTEGER PRIMARY KEY
   *
   * @param {Object} record The row entry from getForeignKeysQuery
   * @return {Bool}
   */
  isSerialKey: (record: FKRow) => {
    return (
      _.isObject(record) && sqliteOptions.isPrimaryKey(record) && (!!record.type && record.type.toUpperCase() === 'INTEGER')
    );
  },

  showViewsQuery: () => {
    return `SELECT name FROM "sqlite_master" WHERE type='view'`;
  },

  /**
   * Returns string length bounds for SQLite.
   * SQLite limits:
   * - All string types (VARCHAR, TEXT, CHAR) are stored as TEXT
   * - Maximum length is SQLITE_MAX_LENGTH (default 1,000,000,000 bytes)
   * - SQLite doesn't enforce VARCHAR(n) or CHAR(n) limits
   * 
   * Note: SQLite is dynamically typed and stores all text as TEXT.
   * The size in VARCHAR(n) is not enforced by SQLite itself.
   * 
   * @param sqType Sequelize DataType string
   * @returns StringBounds or null if not a string type
   */
  getStringBounds: (sqType: string): StringBounds | null => {
    if (!sqType) return null;
    
    // Extract size from type like 100 DataTypes.STRING(100)
    // SQLite doesn't enforce these limits, but we return them for application-level validation
    const sizeMatch = sqType.match(/\((\d+)\)/);
    const size = sizeMatch ? parseInt(sizeMatch[1], 10) : null;
    
    if (sqType.startsWith('DataTypes.STRING')) {
      // SQLite doesn't enforce limits, but we use the specified size for validation
      // If no size specified, SQLite has no limit (effectively unbounded)
      return { min: 0, max: size ?? null };
    }
    
    if (sqType.startsWith('DataTypes.CHAR')) {
      return { min: 0, max: size ?? null };
    }
    
    if (sqType.startsWith('DataTypes.TEXT')) {
      return { min: 0, max: null };
    }
    
    return null;
  }

};
