import { Pool } from "pg";
import { Config } from "../config";

const getPgConfig = () => {
  const url = new URL(Config.SUPABASE_URL);
  return {
    host: url.hostname,
    port: 5432,
    database: url.pathname.slice(1),
    user: "postgres",
    password: Config.SUPABASE_SERVICE_KEY,
    ssl: { rejectUnauthorized: false },
  };
};

export const initMigrations = async () => {
  const pool = new Pool(getPgConfig());

  try {
    // Create migrations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create exec_sql function
    await pool.query(`
      CREATE OR REPLACE FUNCTION exec_sql(query text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        EXECUTE query;
      END;
      $$;
    `);

    // Grant execute to service_role only
    await pool.query(`
      GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
    `);

    console.log("Migration system initialized successfully");
  } catch (error) {
    console.error("Failed to initialize migration system:", error);
    throw error;
  } finally {
    await pool.end();
  }
};
