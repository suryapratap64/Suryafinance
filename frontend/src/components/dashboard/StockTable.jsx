import React, { useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Edit,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Eye,
  Plus,
  Download,
} from "lucide-react";
import { AnimationContext } from "../../context/AnimationContext";
import { useApp } from "../../context/AppContext";
import { Calendar } from "lucide-react";

const StockTable = () => {
  const { triggerAnimation } = useContext(AnimationContext);
  const {
    stocks,
    calculateStockMetrics,
    realTimeData,
    fetchPortfolioData,
    isAuthenticated,
  } = useApp();
  const { stockPrices } = realTimeData || {};

  // Auto-refresh real-time data
  useEffect(() => {
    if (isAuthenticated) {
      fetchPortfolioData();
    }
  }, [isAuthenticated]);

  // Guard clause: no stocks
  if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No stocks in your portfolio</p>
          <Link
            to="/addstocks"
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Stock
          </Link>
        </div>
      </div>
    );
  }

  const getGainLossColor = (value) => {
    if (value > 0) return "text-emerald-400";
    if (value < 0) return "text-red-400";
    return "text-slate-400";
  };

  const getGainLossBg = (value) => {
    if (value > 0) return "bg-emerald-500/10 border border-emerald-500/20";
    if (value < 0) return "bg-red-500/10 border border-red-500/20";
    return "bg-slate-500/10 border border-slate-500/20";
  };

  const getAgingColor = (days) => {
    if (days > 365) return "bg-red-500/20 text-red-400 border-red-500/30";
    if (days > 180)
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  };

  // Totals for footer
  const totals = stocks.reduce(
    (acc, stock) => {
      const metrics = calculateStockMetrics(stock);
      if (metrics) {
        acc.totalInvestment += metrics.totalInvestment ?? 0;
        acc.currentValue += metrics.currentValue ?? 0;
        acc.gainLoss += metrics.gainLoss ?? 0;
        acc.profitable += (metrics.gainLoss ?? 0) > 0 ? 1 : 0;
        acc.lossMaking += (metrics.gainLoss ?? 0) < 0 ? 1 : 0;
      }
      return acc;
    },
    {
      totalInvestment: 0,
      currentValue: 0,
      gainLoss: 0,
      profitable: 0,
      lossMaking: 0,
    }
  );

  // Define styles for hiding scrollbars
  const scrollbarHideStyles = `
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `;

  return (
    <div className="overflow-hidden rounded-xl">
      <style>{scrollbarHideStyles}</style>
      <div className={`stock-table ${triggerAnimation ? "animate" : ""}`}>
        <div className="overflow-x-auto relative max-h-[calc(100vh-15rem)] scrollbar-hide">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-700/50 shadow-lg">
                {[
                  "Sr.No",
                  "Purchase Date",
                  "Symbol",
                  "Stock Name",
                  "Quantity",
                  "Purchased price-(per unit)",
                  "Total Investment",
                  "Current Price",

                  "Aging(Days)",
                  "Gain or Loss",

                  "Actions",
                ].map((header, index) => (
                  <th
                    key={index}
                    className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider p-4 bg-slate-800/90 backdrop-blur-xl first:rounded-tl-xl last:rounded-tr-xl whitespace-nowrap sticky top-0 border-b border-slate-700/50"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {[...stocks]
                .sort((a, b) => {
                  const dateA = new Date(a.last_transaction_date || 0);
                  const dateB = new Date(b.last_transaction_date || 0);
                  return dateB - dateA; // Sort in descending order (newest first)
                })
                .map((stock, index) => {
                  const calculatedStock = calculateStockMetrics(stock);
                  if (!calculatedStock) return null;

                  const isPositiveGain = (calculatedStock.gainLoss ?? 0) > 0;

                  return (
                    <tr
                      key={`${calculatedStock.symbol}_${index}`}
                      className="group hover:bg-slate-700/20 transition-all duration-200 backdrop-blur-sm"
                    >
                      {/* Sr No */}
                      <td className="p-4">
                        <span className="text-sm font-medium text-slate-300">
                          {index + 1}
                        </span>
                      </td>

                      {/* Purchase Date */}
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-400">
                            {calculatedStock.last_transaction_date
                              ? new Date(
                                  calculatedStock.last_transaction_date
                                ).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "--"}
                          </span>
                        </div>
                      </td>

                      {/* Symbol */}
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center border border-slate-600/30">
                            <span className="text-xs font-bold text-blue-400">
                              {calculatedStock.symbol?.charAt(0) ?? "?"}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-white">
                            {calculatedStock.symbol ?? "-"}
                          </span>
                        </div>
                      </td>

                      {/* Name */}
                      <td className="p-4">
                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                          {calculatedStock.name ?? "-"}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="p-4">
                        <span className="text-sm font-medium text-slate-300">
                          {calculatedStock.quantity ?? 0}
                        </span>
                      </td>

                      {/* Avg Buy Price */}
                      <td className="p-4">
                        <span className="text-sm text-slate-300">
                          ₹{" "}
                          {(calculatedStock.average_price ?? 0).toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </span>
                      </td>

                      {/* Total Investment */}
                      <td className="p-4">
                        <span className="text-sm font-medium text-slate-200">
                          ₹{" "}
                          {(
                            calculatedStock.totalInvestment ?? 0
                          ).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* Current Price */}
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-white">
                            ₹{" "}
                            {(
                              stockPrices?.[calculatedStock.symbol]
                                ?.currentPrice ??
                              calculatedStock.currentPrice ??
                              0
                            ).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          {stockPrices?.[calculatedStock.symbol] && (
                            <div className="flex items-center space-x-1">
                              {stockPrices[calculatedStock.symbol].change >=
                              0 ? (
                                <TrendingUp className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-400" />
                              )}
                              <span
                                className={`text-xs ${
                                  stockPrices[calculatedStock.symbol].change >=
                                  0
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                }`}
                              >
                                {stockPrices[calculatedStock.symbol].change >= 0
                                  ? "+"
                                  : ""}
                                {
                                  stockPrices[calculatedStock.symbol]
                                    .changePercent
                                }
                                %
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Days Held */}
                      <td className="p-4">
                        <span
                          className={`text-xs whitespace-nowrap px-3 py-1 rounded-full border ${getAgingColor(
                            calculatedStock.agingDays ?? 0
                          )}`}
                        >
                          {calculatedStock.agingDays ?? 0}d
                        </span>
                      </td>

                      {/* Gain/Loss */}
                      <td className="p-4">
                        <div
                          className={`inline-flex items-center px-3 py-1 rounded-lg ${getGainLossBg(
                            calculatedStock.gainLoss ?? 0
                          )}`}
                        >
                          <span
                            className={`text-sm font-medium ${getGainLossColor(
                              calculatedStock.gainLoss ?? 0
                            )}`}
                          >
                            {(calculatedStock.gainLoss ?? 0) > 0 ? "+" : ""}₹
                            {Math.abs(
                              calculatedStock.gainLoss ?? 0
                            ).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <button className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all duration-200">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all duration-200">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-500/10 rounded-lg transition-all duration-200">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Shadow overlay for scroll indication */}
        <div className="absolute top-[3.5rem] left-0 right-0 h-4 bg-gradient-to-b from-slate-900/50 to-transparent pointer-events-none"></div>
      </div>

{/* Footer */}
<div className="bg-slate-800/40 backdrop-blur-sm border-t border-slate-700/50 px-6 py-4 rounded-b-xl">
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
    
    {/* Left - Counts */}
    <div className="flex items-center space-x-6 text-sm">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span className="text-slate-400">Total Holdings:</span>
        <span className="text-white font-semibold">{stocks.length}</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
        <span className="text-slate-400">Profitable:</span>
        <span className="text-emerald-400 font-semibold">{totals.profitable}</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-slate-400">Loss Making:</span>
        <span className="text-red-400 font-semibold">{totals.lossMaking}</span>
      </div>
    </div>

    {/* Middle - Metrics */}
    <div className="flex items-center justify-center space-x-10">
      <div className="text-center">
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
          Total Investment
        </div>
        <div className="text-lg font-bold text-blue-400">
          ₹ {(totals.totalInvestment ?? 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
      <div className="w-px h-8 bg-slate-600/50"></div>
      <div className="text-center">
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
          Current Value
        </div>
        <div className="text-lg font-bold text-emerald-400">
          ₹ {(totals.currentValue ?? 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
      <div className="w-px h-8 bg-slate-600/50"></div>
      <div className="text-center">
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
          Net P&L
        </div>
        <div
          className={`text-lg font-bold ${
            (totals.gainLoss ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {(totals.gainLoss ?? 0) >= 0 ? "+" : ""}₹
          {Math.abs(totals.gainLoss ?? 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
    </div>

    {/* Right - Status */}
    <div className="flex items-center justify-end space-x-2 text-sm">
      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
      <span className="text-slate-400">Last updated:</span>
      <span className="text-white font-medium">
        {realTimeData?.lastUpdated
          ? new Date(realTimeData.lastUpdated).toLocaleTimeString("en-IN")
          : "Just now"}
      </span>
    </div>
  </div>
</div>

    </div>
  );
};

export default StockTable;
