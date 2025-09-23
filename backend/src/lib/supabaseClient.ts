import { createClient } from "@supabase/supabase-js";
import { Config } from "../config";

if (!Config.SUPABASE_URL || !Config.SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase credentials");
}

export const supabase = createClient(
  Config.SUPABASE_URL,
  Config.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
