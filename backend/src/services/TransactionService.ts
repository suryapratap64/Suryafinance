import { Service } from "typedi";
import xlsx from "xlsx";
import csv from "csv-parser";
import { Readable } from "stream";
import { supabase } from "../lib/supabase";

@Service({ id: "transaction.service" })
export class TransactionService {
  // ----------------- CREATE TRANSACTION -----------------
  async createTransaction(data: {
    user_id: number;
    symbol: string;
    name: string;
    security_type: "STOCK" | "MUTUAL_FUND";
    transaction_type: "BUY" | "SELL";
    transaction_date: string | Date;
    quantity: number;
    price_per_unit: number;
    source?: string;
  }) {
    try {
      console.log("Creating transaction with data:", data);

      if (
        !data.user_id ||
        !data.symbol ||
        !data.quantity ||
        !data.price_per_unit
      ) {
        throw new Error("Missing required fields");
      }

      const symbolUpper = data.symbol.toUpperCase();

      // Check if security exists
      let { data: existingSecurity, error: fetchError } = await supabase
        .from("securities_master")
        .select("*")
        .eq("symbol", symbolUpper)
        .eq("security_type", data.security_type)
        .single();

      console.log("Search result:", { existingSecurity, fetchError });

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      // If not exists, insert new
      if (!existingSecurity) {
        const { data: newSecurity, error: insertError } = await supabase
          .from("securities_master")
          .insert({
            symbol: symbolUpper,
            name: data.name,
            security_type: data.security_type,
            last_price: data.price_per_unit,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        existingSecurity = newSecurity;
      }

      const transaction_date =
        typeof data.transaction_date === "string"
          ? new Date(data.transaction_date)
          : data.transaction_date;

      const total_amount = Number(data.quantity) * Number(data.price_per_unit);

      // Insert transaction
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: data.user_id,
          security_id: existingSecurity.id,
          transaction_type: data.transaction_type,
          transaction_date,
          quantity: Number(data.quantity),
          price_per_unit: Number(data.price_per_unit),
          total_amount,
          source: data.source || "MANUAL",
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      return { status: "success", data: transaction };
    } catch (error: any) {
      console.error("Transaction creation error:", error);
      throw new Error(
        `Error creating transaction: ${error.message || "Unknown error"}`
      );
    }
  }

  // ----------------- UPLOAD PORTFOLIO CSV/EXCEL -----------------
  async uploadPortfolioCSV(
    userId: string,
    file_buffer: any,
    type: ".xlsx" | ".xls" | ".csv"
  ) {
    const data: any[] = [];

    // Excel files
    if (type === ".xlsx" || type === ".xls") {
      const workbook = xlsx.read(file_buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const excelData = xlsx.utils.sheet_to_json(worksheet);
      data.push(...excelData);
    }

    // CSV files
    if (type === ".csv") {
      await new Promise<void>((resolve, reject) => {
        const stream = Readable.from(file_buffer);
        stream
          .pipe(csv())
          .on("data", (row: any) => data.push(row))
          .on("end", resolve)
          .on("error", reject);
      });
    }

    if (data.length === 0) {
      return [false, "File is empty"];
    }

    const uploadResults: { processed: number; success: number; errors: any[] } =
      {
        processed: 0,
        success: 0,
        errors: [],
      };

    for (const row of data) {
      try {
        uploadResults.processed++;

        if (!row.symbol || !row.quantity || !row.price || !row.date) {
          uploadResults.errors.push(
            `Row ${uploadResults.processed}: Missing required fields`
          );
          continue;
        }

        const security_type = row.type === "MF" ? "MUTUAL_FUND" : "STOCK";
        const symbolUpper = row.symbol.toUpperCase();

        // Find or create security
        let { data: security } = await supabase
          .from("securities_master")
          .select("*")
          .eq("symbol", symbolUpper)
          .eq("security_type", security_type)
          .single();

        if (!security) {
          const { data: newSecurity } = await supabase
            .from("securities_master")
            .insert({
              symbol: symbolUpper,
              name: row.name || symbolUpper,
              security_type,
            })
            .select()
            .single();
          security = newSecurity;
        }

        await supabase.from("transactions").insert({
          user_id: Number(userId),
          security_id: security.id,
          transaction_type: (row.transaction_type as "BUY" | "SELL") || "BUY",
          transaction_date: new Date(row.date),
          quantity: parseFloat(row.quantity),
          price_per_unit: parseFloat(row.price),
          total_amount: parseFloat(row.quantity) * parseFloat(row.price),
          source: "CSV_UPLOAD",
        });

        uploadResults.success++;
      } catch (error: any) {
        uploadResults.errors.push(
          `Row ${uploadResults.processed}: ${error.message || "Unknown error"}`
        );
      }
    }

    return [true, uploadResults];
  }

  // ----------------- MOTILAL OSWAL SYNC -----------------
  async motilalOswalSync(userId: string) {
    const motilalData = await fetchMotilalOswalData(userId);

    const syncResults: {
      processed: number;
      added: number;
      errors: string[];
    } = { processed: 0, added: 0, errors: [] };

    for (const holding of motilalData.holdings) {
      try {
        syncResults.processed++;
        const symbolUpper = holding.symbol.toUpperCase();

        let { data: security } = await supabase
          .from("securities_master")
          .select("*")
          .eq("symbol", symbolUpper)
          .eq("security_type", "STOCK")
          .single();

        if (!security) {
          const { data: newSecurity } = await supabase
            .from("securities_master")
            .insert({
              symbol: symbolUpper,
              name: holding.name,
              security_type: "STOCK",
              exchange: holding.exchange || "NSE",
            })
            .select()
            .single();
          security = newSecurity;
        }

        await supabase.from("transactions").insert({
          user_id: Number(userId),
          security_id: security.id,
          transaction_type: "BUY",
          transaction_date: holding.purchase_date,
          quantity: holding.quantity,
          price_per_unit: holding.avg_price,
          total_amount: holding.quantity * holding.avg_price,
          source: "MOTILAL_API",
        });

        syncResults.added++;
      } catch (error: any) {
        syncResults.errors.push(
          `Error processing ${holding.symbol}: ${
            error.message || "Unknown error"
          }`
        );
      }
    }

    return [true, syncResults];
  }

  // ----------------- GET TRANSACTIONS BY USER -----------------
  async getTransactionsByUserId(userId: number) {
    try {
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
          securities_master:security_id(symbol, name, security_type)
        `
        )
        .eq("user_id", userId)
        .order("transaction_date", { ascending: false });

      if (error) throw error;

      return { status: "success", data: transactions };
    } catch (error: any) {
      throw new Error(
        `Error fetching user transactions: ${error.message || "Unknown error"}`
      );
    }
  }

  // ----------------- GET TRANSACTIONS BY SECURITY -----------------
  async getTransactionsBySecurityId(securityId: number) {
    try {
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
          securities_master:security_id(symbol, name, security_type)
        `
        )
        .eq("security_id", securityId)
        .order("transaction_date", { ascending: false });

      if (error) throw error;

      return { status: "success", data: transactions };
    } catch (error: any) {
      throw new Error(
        `Error fetching security transactions: ${
          error.message || "Unknown error"
        }`
      );
    }
  }
}

// Placeholder API integration for Motilal Oswal
async function fetchMotilalOswalData(userId: string): Promise<any> {
  return {
    holdings: [
      {
        symbol: "RELIANCE",
        name: "Reliance Industries Ltd",
        quantity: 100,
        avg_price: 2500.5,
        purchase_date: "2024-01-15",
        exchange: "NSE",
      },
    ],
  };
}
