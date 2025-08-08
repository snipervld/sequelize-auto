import { mssqlOptions } from "./mssql";
import { mysqlOptions } from "./mysql";
import { postgresOptions } from "./postgres";
import { sqliteOptions } from "./sqlite";
import { DialectOptions } from "./dialect-options";
import { Dialect } from "sequelize";

export const dialects: { [name in Dialect]: DialectOptions | null } = {
  db2: null,
  oracle: null,
  snowflake: null,
  mssql: mssqlOptions,
  mysql: mysqlOptions,
  mariadb: mysqlOptions,
  postgres: postgresOptions,
  sqlite: sqliteOptions
};
