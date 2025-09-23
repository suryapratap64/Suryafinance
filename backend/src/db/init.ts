import { supabaseAdmin } from "../lib/supabaseAdmin";
import { createTables, setupRLS, seedData } from "./schema";

export const initializeDatabase = async () => {
  try {
    console.log("Starting database initialization...");

    // Create tables
    await createTables(supabaseAdmin);

    // Setup Row Level Security policies
    await setupRLS(supabaseAdmin);

    // Seed initial data if needed
    await seedData(supabaseAdmin);

    console.log("Database initialization completed successfully");
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
};

// Function to check if tables exist
export const checkDatabaseSetup = async () => {
  try {
    const { data: tables, error } = await supabaseAdmin
      .from("securities_master")
      .select("id")
      .limit(1);

    if (error) {
      // If there's an error, tables might not exist
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};
