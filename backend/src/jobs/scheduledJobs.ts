import cron from "node-cron";
import axios from "axios";
import { supabase } from "../lib/supabase";
import { Config } from "../config";

// ----------------- START ALL JOBS -----------------
export function startScheduledJobs() {
  // Update stock prices every 5 mins 9AM–4PM IST
  cron.schedule("*/5 9-16 * * 1-5", async () => {
    console.log("[Stock Job] Running...");
    await updateStockPrices();
  });

  // Update MF NAV daily at 11 PM IST (dev: every 5 mins)
  cron.schedule(
    Config.NODE_ENV === "development" ? "*/5 * * * *" : "0 23 * * *",
    async () => {
      console.log("[MF Job] Running...");
      await updateMutualFundNAVs();
    },
    { timezone: "Asia/Kolkata" }
  );
}

// ----------------- UPDATE STOCK PRICES -----------------
async function updateStockPrices() {
  try {
    const { data: stocks, error } = await supabase
      .from("securities_master")
      .select("*")
      .eq("security_type", "STOCK");

    if (error) throw error;
    if (!stocks?.length) return;

    for (const stock of stocks) {
      try {
        const resp = await axios.get("https://www.alphavantage.co/query", {
          params: { function: "GLOBAL_QUOTE", symbol: stock.symbol, apikey: Config.ALPHA_VANTAGE_API_KEY },
        });

        const price = Number(resp.data?.["Global Quote"]?.["05. price"]);
        if (!isNaN(price)) {
          const { error: updateError } = await supabase
            .from("securities_master")
            .update({ last_price: price, last_updated: new Date().toISOString() })
            .eq("id", stock.id);

          if (updateError) throw updateError;
          console.log(`[Stock Job] Updated ${stock.symbol} → ${price}`);
        }
      } catch (err) {
        console.error(`[Stock Job] Error ${stock.symbol}:`, (err as Error).message);
      }
    }
  } catch (err) {
    console.error("[Stock Job] Failed:", (err as Error).message);
  }
}

// ----------------- UPDATE MUTUAL FUND NAVs -----------------
async function updateMutualFundNAVs() {
  try {
    const { data: mfs, error } = await supabase
      .from("securities_master")
      .select("*")
      .in("security_type", ["MF", "MUTUAL_FUND"]);

    if (error) throw error;
    if (!mfs?.length) return;

    if (!Config.INDIAN_API_KEY) {
      console.warn("[MF Job] Missing INDIAN_API_KEY, skipping");
      return;
    }

    let updatedCount = 0;
    for (const mf of mfs) {
      const cleanName = (mf.name || "")
        .replace(/\.(BSE|NSE)$/i, "")
        .replace(/^MF\d+/i, "")
        .replace(/-\s*(Direct|Regular|Growth|IDCW).*$/i, "")
        .replace(/\(.*\)/g, "")
        .trim();

      try {
        // Search fund
        const searchResp = await axios.get("https://stock.indianapi.in/mutual_funds", {
          params: { search: cleanName },
          headers: { "X-Api-Key": Config.INDIAN_API_KEY },
          timeout: 30_000,
        });

        const match = (searchResp.data || [])[0];
        if (!match) continue;

        // Fetch NAV
        const navResp = await axios.get("https://stock.indianapi.in/mutual_funds/nav", {
          params: { scheme_code: match.scheme_code },
          headers: { "X-Api-Key": Config.INDIAN_API_KEY },
          timeout: 30_000,
        });

        const nav = Number(navResp.data?.nav);
        if (!isNaN(nav) && nav > 0) {
          const { error: updateError } = await supabase
            .from("securities_master")
            .update({ last_price: nav, last_updated: new Date().toISOString() })
            .eq("id", mf.id);

          if (updateError) throw updateError;
          updatedCount++;
          console.log(`[MF Job] Updated ${mf.name} → ${nav}`);
        }
      } catch (err) {
        console.error(`[MF Job] Error ${mf.name}:`, (err as Error).message);
      }
    }

    console.log(`[MF Job] Updated ${updatedCount}/${mfs.length} funds`);
  } catch (err) {
    console.error("[MF Job] Failed:", (err as Error).message);
  }
}
