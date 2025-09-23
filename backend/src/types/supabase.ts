export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SecurityMaster =
  Database["public"]["Tables"]["securities_master"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type User = {
  id: string;
  email: string;
  created_at: string;
  user_metadata: {
    username?: string;
  };
};

export interface Database {
  public: {
    Tables: {
      securities_master: {
        Row: {
          id: number;
          symbol: string;
          name: string;
          security_type: "STOCK" | "MUTUAL_FUND";
          isin: string | null;
          exchange: string | null;
          last_price: number | null;
          last_updated: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          symbol: string;
          name: string;
          security_type: "STOCK" | "MUTUAL_FUND";
          isin?: string | null;
          exchange?: string | null;
          last_price?: number | null;
          last_updated?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          symbol?: string;
          name?: string;
          security_type?: "STOCK" | "MUTUAL_FUND";
          isin?: string | null;
          exchange?: string | null;
          last_price?: number | null;
          last_updated?: string | null;
          created_at?: string;
        };
      };
      transactions: {
        Row: {
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
        Insert: {
          id?: number;
          user_id: string;
          security_id: number;
          transaction_type: "BUY" | "SELL";
          transaction_date: string;
          quantity: number;
          price_per_unit: number;
          total_amount: number;
          source?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          security_id?: number;
          transaction_type?: "BUY" | "SELL";
          transaction_date?: string;
          quantity?: number;
          price_per_unit?: number;
          total_amount?: number;
          source?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
