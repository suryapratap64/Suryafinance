import React, { useContext, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Edit,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Eye,
  Plus,
  Calendar,
} from "lucide-react";
import { AnimationContext } from "../../context/AnimationContext";
import { useApp } from "../../context/AppContext";

const MutualFundTable = () => {
  const { triggerAnimation } = useContext(AnimationContext);
  const {
    mutualFunds,
    calculateMutualFundMetrics,
    realTimeData,
    fetchPortfolioData,
    isAuthenticated,
  } = useApp();
  const { mutualFundNav } = realTimeData || {};

  // Auto-refresh
  useEffect(() => {
    if (isAuthenticated) {
      fetchPortfolioData();
    }
  }, [isAuthenticated]);



  const getGainLossColor = (value) =>
    value > 0 ? "text-emerald-400" : value < 0 ? "text-red-400" : "text-slate-400";

  const getGainLossBg = (value) =>
    value > 0
      ? "bg-emerald-500/10 border border-emerald-500/20"
      : value < 0
      ? "bg-red-500/10 border border-red-500/20"
      : "bg-slate-500/10 border border-slate-500/20";

  const getAgingColor = (days) => {
    if (days > 365) return "bg-red-500/20 text-red-400 border-red-500/30";
    if (days > 180) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  };

  // Totals
  const totals = mutualFunds.reduce(
    (acc, fund) => {
      const metrics = calculateMutualFundMetrics(fund, mutualFundNav);
      if (metrics) {
        acc.totalInvestment += metrics.totalInvestment ?? 0;
        acc.currentValue += metrics.currentValue ?? 0;
        acc.gainLoss += metrics.gainLoss ?? 0;
        acc.profitable += (metrics.gainLoss ?? 0) > 0 ? 1 : 0;
        acc.lossMaking += (metrics.gainLoss ?? 0) < 0 ? 1 : 0;
      }
      return acc;
    },
    { totalInvestment: 0, currentValue: 0, gainLoss: 0, profitable: 0, lossMaking: 0 }
  );

  return (
    <div className="overflow-hidden rounded-xl">
      <div className={`mutual-fund-table ${triggerAnimation ? "animate" : ""}`}>
        <div className="overflow-x-auto relative max-h-[calc(100vh-15rem)] scrollbar-hide">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-700/50 shadow-lg">
                {[
                  "Sr.No",
                  "Purchase Date",
                  "Symbol",
                  "Fund Name",
                  "Units",
                  "Avg NAV",
                  "Total Investment",
                  "Current NAV",
                  "Current Value",
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
              {[...mutualFunds]
                .sort(
                  (a, b) =>
                    new Date(b.last_transaction_date) -
                    new Date(a.last_transaction_date)
                )
                .map((fund, index) => {
                  const calculatedFund = calculateMutualFundMetrics(fund, mutualFundNav);
                  if (!calculatedFund) return null;

                  return (
                    <tr
                      key={`${calculatedFund.symbol}_${index}`}
                      className="group hover:bg-slate-700/20 transition-all duration-200 backdrop-blur-sm"
                    >
                      {/* Sr No */}
                      <td className="p-4 text-sm font-medium text-slate-300">
                        {index + 1}
                      </td>

                      {/* Purchase Date */}
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-400">
                            {calculatedFund.last_transaction_date
                              ? new Date(
                                  calculatedFund.last_transaction_date
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
                      <td className="p-4 text-sm font-semibold text-white">
                        {calculatedFund.symbol}
                      </td>

                      {/* Fund Name */}
                      <td className="p-4 text-sm text-slate-300">
                        {calculatedFund.name}
                      </td>

                      {/* Units */}
                      <td className="p-4 text-sm text-slate-300">
                        {calculatedFund.units}
                      </td>

                      {/* Avg NAV */}
                      <td className="p-4 text-sm text-slate-300">
                        ₹ {(calculatedFund.avgNav ?? 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Total Investment */}
                      <td className="p-4 text-sm font-medium text-slate-200">
                        ₹ {(calculatedFund.totalInvestment ?? 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Current NAV */}
                      <td className="p-4 text-sm font-medium text-white">
                        ₹ {(calculatedFund.currentNav ?? 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Current Value */}
                      <td className="p-4 text-sm font-medium text-slate-200">
                        ₹ {(calculatedFund.currentValue ?? 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Aging */}
                      <td className="p-4">
                        <span
                          className={`text-xs whitespace-nowrap px-3 py-1 rounded-full border ${getAgingColor(
                            calculatedFund.agingDays ?? 0
                          )}`}
                        >
                          {calculatedFund.agingDays ?? 0}d
                        </span>
                      </td>

                      {/* Gain or Loss */}
                      <td className="p-4">
                        <div
                          className={`inline-flex items-center px-3 py-1 rounded-lg ${getGainLossBg(
                            calculatedFund.gainLoss ?? 0
                          )}`}
                        >
                          <span
                            className={`text-sm font-medium ${getGainLossColor(
                              calculatedFund.gainLoss ?? 0
                            )}`}
                          >
                            {(calculatedFund.gainLoss ?? 0) > 0 ? "+" : ""}₹
                            {Math.abs(
                              calculatedFund.gainLoss ?? 0
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
      </div>

      {/* Footer Summary */}
      <div className="bg-slate-800/40 backdrop-blur-sm border-t border-slate-700/50 px-6 py-4 rounded-b-xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Left - Counts */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-slate-400">Total Funds:</span>
              <span className="text-white font-semibold">{mutualFunds.length}</span>
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

export default MutualFundTable;
