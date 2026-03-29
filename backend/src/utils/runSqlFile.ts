import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { pool } from "../config/db";

const run = async (): Promise<void> => {
  const relativePath = process.argv[2] ?? "db/init.sql";
  const projectRoot = path.resolve(__dirname, "../../");
  const sqlPath = path.resolve(projectRoot, relativePath);

  if (!fs.existsSync(sqlPath)) {
    throw new Error(`SQL file not found: ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, "utf8");
  if (!sql.trim()) {
    throw new Error(`SQL file is empty: ${sqlPath}`);
  }

  await pool.query(sql);
  console.log(`Executed SQL file successfully: ${relativePath}`);
};

run()
  .catch((error) => {
    console.error("Failed to execute SQL file:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
