import { Pool } from "pg";
import { env } from "./env";

export const pool = env.databaseUrl
  ? new Pool({
      connectionString: env.databaseUrl,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: env.dbHost,
      port: env.dbPort,
      database: env.dbName,
      user: env.dbUser,
      password: env.dbPassword,
      ssl: env.dbSsl ? { rejectUnauthorized: false } : false,
    });

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export const testDbConnection = async (): Promise<void> => {
  const result = await pool.query("SELECT 1 AS ok");
  if (result.rows[0]?.ok !== 1) {
    throw new Error("Database test query failed");
  }
};
