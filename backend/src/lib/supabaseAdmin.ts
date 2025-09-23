import { createClient } from "@supabase/supabase-js";
import { Config } from "../config";

if (!Config.SUPABASE_URL || !Config.SUPABASE_SERVICE_KEY) {
  throw new Error("Missing Supabase Admin credentials");
}

export const supabaseAdmin = createClient(
  Config.SUPABASE_URL,
  Config.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
  }
);
