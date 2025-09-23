import { Service } from "typedi";
import { supabase } from "../lib/supabase";
import axios from "axios";

interface StockHolding {
  symbol: string;
  name: string;
  current_price: number;
  total_quantity: number;
  avg_price: number;
  total_investment: number;
  holding_days: number;
  current_value: number;
  gain_loss: number;
  gain_loss_percent: string;
}

@Service({ id: "portfolio.service" })
export class PortfolioService {
  // ----------------- STOCK HOLDINGS -----------------
  async getStockHoldings(userId: string): Promise<[boolean, StockHolding[]]> {
    try {
      const { data: holdings, error } = await supabase
        .rpc("get_stock_holdings", { p_user_id: userId });

      if (error) throw error;

      const enrichedHoldings = (holdings || []).map((holding: any) => ({
        ...holding,
        gain_loss: holding.current_value - holding.total_investment,
        gain_loss_percent: (
          ((holding.current_value - holding.total_investment) /
            holding.total_investment) *
          100
        ).toFixed(2),
      }));

      return [
        true,
        enrichedHoldings.sort(
          (a: StockHolding, b: StockHolding) => b.current_value - a.current_value
        ),
      ];
    } catch (err: any) {
      console.error("[getStockHoldings] error", err);
      return [false, []];
    }
  }

  // ----------------- MUTUAL FUND HOLDINGS -----------------
  async getMutualFundHoldings(userId: string): Promise<[boolean, any]> {
    try {
      // Assuming you have an RPC to get MF holdings like get_mutual_fund_holdings
      const { data: mfHoldings, error } = await supabase
        .rpc("get_mutual_fund_holdings", { p_user_id: userId });

      if (error) throw error;

      const enrichedHoldings = (mfHoldings || []).map((holding: any) => ({
        ...holding,
        gain_loss: holding.current_value - holding.total_investment,
        gain_loss_percent: (
          ((holding.current_value - holding.total_investment) /
            holding.total_investment) *
          100
        ).toFixed(2),
      }));

      return [true, enrichedHoldings];
    } catch (err: any) {
      console.error("[getMutualFundHoldings] error", err);
      return [false, []];
    }
  }

  // ----------------- PORTFOLIO SUMMARY -----------------
  async getSummary(userId: string): Promise<[boolean, any]> {
    try {
      // Assuming an RPC get_portfolio_summary
      const { data: summaryData, error } = await supabase
        .rpc("get_portfolio_summary", { p_user_id: userId });

      if (error) throw error;

      const result = summaryData?.[0] || {
        total_investment: 0,
        current_value: 0,
      };
      const totalGainLoss = result.current_value - result.total_investment;
      const gainLossPercent = (
        (totalGainLoss / (result.total_investment || 1)) *
        100
      ).toFixed(2);

      return [
        true,
        {
          total_investment: result.total_investment,
          current_value: result.current_value,
          total_gain_loss: totalGainLoss,
          gain_loss_percent: gainLossPercent,
        },
      ];
    } catch (err: any) {
      console.error("[getSummary] error", err);
      return [false, {}];
    }
  }

  // ----------------- FETCH & UPDATE PRICE -----------------
  async fetchAndUpdatePriceFromAlphaVantage(
    symbol: string
  ): Promise<[boolean, any]> {
    try {
      const key = process.env.ALPHA_VANTAGE_API_KEY;
      if (!key) return [false, { message: "Missing ALPHA_VANTAGE_API_KEY" }];

      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
        symbol
      )}&apikey=${key}`;

      const resp = await axios.get(url, { timeout: 10000 });
      const quote = resp.data?.["Global Quote"];
      const priceStr = quote?.["05. price"];
      const price = priceStr ? Number(priceStr) : null;

      if (!price || Number.isNaN(price)) {
        return [false, { message: "Price not found", raw: resp.data }];
      }

      // Update Supabase table (assuming table is 'securities_master')
      const { error } = await supabase
        .from("securities_master")
        .update({ last_price: price, last_updated: new Date().toISOString() })
        .eq("symbol", symbol);

      if (error) throw error;

      return [true, { symbol, price }];
    } catch (err: any) {
      console.error("[fetchAndUpdatePriceFromAlphaVantage] error", err);
      return [false, { message: err?.message || String(err) }];
    }
  }
}
