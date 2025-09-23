import { createClient } from "@supabase/supabase-js";
import { Config } from "../config";

// Initialize Supabase client
const supabaseUrl = Config.SUPABASE_URL;
const supabaseKey = Config.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase URL or Anon Key");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Type definitions for your tables
export type User = {
  id: string;
  username: string;
  created_at: string;
};

export type SecurityMaster = {
  id: number;
  symbol: string;
  name: string;
  security_type: "STOCK" | "MUTUAL_FUND";
  isin: string | null;
  exchange: string | null;
  last_price: number | null;
  last_updated: string | null;
};

export type Transaction = {
  id: number;
  user_id: string;
  security_id: number;
  transaction_type: "BUY" | "SELL";
  transaction_date: string;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  source: string;
  created_at: string;
};
