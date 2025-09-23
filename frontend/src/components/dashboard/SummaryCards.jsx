import React, { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useApp } from "../../context/AppContext";

const SummaryCards = () => {
  const {
    stocks,
    mutualFunds,
    calculateStockMetrics,
    calculateMutualFundMetrics,
    loading,
    isAuthenticated,
  } = useApp();

  const [isAnimating, setIsAnimating] = useState(false);

  // 🔹 Derive portfolio metrics from context stocks + mutual funds
  const { portfolioMetrics, lastUpdated } = useMemo(() => {
    if (!isAuthenticated) {
      return {
        portfolioMetrics: {
          totalInvestment: 0,
          currentValue: 0,
          totalGainLoss: 0,
          gainLossPercent: 0,
          stocksValue: 0,
          mutualFundsValue: 0,
        },
        lastUpdated: null,
      };
    }

    const stockMetrics = stocks.map(calculateStockMetrics).filter(Boolean);
    const mfMetrics = mutualFunds
      .map(calculateMutualFundMetrics)
      .filter(Boolean);

    const stocksValue = stockMetrics.reduce((sum, s) => sum + s.currentValue, 0);
    const mutualFundsValue = mfMetrics.reduce((sum, f) => sum + f.currentValue, 0);
    const totalInvestment =
      stockMetrics.reduce((sum, s) => sum + s.totalInvestment, 0) +
      mfMetrics.reduce((sum, f) => sum + f.totalInvestment, 0);

    const currentValue = stocksValue + mutualFundsValue;
    const totalGainLoss = currentValue - totalInvestment;
    const gainLossPercent =
      totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;

    return {
      portfolioMetrics: {
        totalInvestment,
        currentValue,
        totalGainLoss,
        gainLossPercent,
        stocksValue,
        mutualFundsValue,
      },
      lastUpdated: new Date().toISOString(),
    };
  }, [stocks, mutualFunds, isAuthenticated]);

  // 🔹 Handle shimmer animation
useEffect(() => {
  if (loading) {
    setIsAnimating(true);
  } else {
    // Run a short animation only when loading becomes false
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 800);
    return () => clearTimeout(timer);
  }
}, [loading]);

  // 🔹 Formatters
  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);

  const formatPercentage = (value) =>
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);

  const totalGainLoss = portfolioMetrics.totalGainLoss || 0;
  const gainLossPercent = portfolioMetrics.gainLossPercent || 0;

  const data = [
    {
      title: "Total Investment",
      value: `₹${formatCurrency(portfolioMetrics.totalInvestment)}`,
      subValue: `Stocks: ₹${formatCurrency(portfolioMetrics.stocksValue)}`,
      secondSubValue: `MF: ₹${formatCurrency(
        portfolioMetrics.mutualFundsValue
      )}`,
      icon: DollarSign,
      bgGradient: "from-blue-500/20 to-cyan-500/20",
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-400",
      isPositive: true,
    },
    {
      title: "Current Value",
      value: `₹${formatCurrency(portfolioMetrics.currentValue)}`,
      subValue: `Day's Change: ${
        totalGainLoss >= 0 ? "+" : ""
      }₹${formatCurrency(Math.abs(totalGainLoss))}`,
      secondSubValue: `Updated: ${
        lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "Never"
      }`,
      icon: TrendingUp,
      bgGradient: "from-emerald-500/20 to-green-500/20",
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-400",
      isPositive: totalGainLoss >= 0,
    },
    {
      title: "Overall P&L",
      value: `${gainLossPercent >= 0 ? "+" : ""}${formatPercentage(
        gainLossPercent
      )}%`,
      subValue: `${
        totalGainLoss >= 0 ? "Profit" : "Loss"
      }: ₹${formatCurrency(Math.abs(totalGainLoss))}`,
      secondSubValue: `Today: ${
        gainLossPercent >= 0 ? "+" : ""
      }${formatPercentage(
        (totalGainLoss /
          (portfolioMetrics.currentValue - totalGainLoss || 1)) *
          100
      )}%`,
      icon: PieChart,
      bgGradient:
        gainLossPercent >= 0
          ? "from-emerald-500/20 to-green-500/20"
          : "from-red-500/20 to-pink-500/20",
      iconBg: gainLossPercent >= 0 ? "bg-emerald-500/20" : "bg-red-500/20",
      iconColor: gainLossPercent >= 0 ? "text-emerald-400" : "text-red-400",
      isPositive: gainLossPercent >= 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 summary-cards">
      {data.map((card, index) => {
        const IconComponent = card.icon;
        const TrendIcon = card.isPositive ? ArrowUpRight : ArrowDownRight;

        return (
          <div
            key={index}
            className={`
              group relative bg-gradient-to-br ${card.bgGradient} backdrop-blur-xl 
              border border-slate-700/50 rounded-2xl p-6 
              hover:border-slate-600/50 transition-all duration-300 
              hover:shadow-2xl hover:shadow-slate-900/50
              ${isAnimating ? "animate-pulse" : ""}
            `}
            style={{
              transitionDelay: `${index * 100}ms`,
              transform: isAnimating ? "scale(0.95)" : "scale(1)",
            }}
          >
            {/* Card Content */}
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${card.iconBg} backdrop-blur-sm`}>
                <IconComponent className={`h-6 w-6 ${card.iconColor}`} />
              </div>
              <div
                className={`p-1 rounded-lg ${
                  card.isPositive ? "bg-emerald-500/20" : "bg-red-500/20"
                }`}
              >
                <TrendIcon
                  className={`h-4 w-4 ${
                    card.isPositive ? "text-emerald-400" : "text-red-400"
                  }`}
                />
              </div>
            </div>

            <h3 className="text-slate-400 text-sm font-medium mb-2">
              {card.title}
            </h3>

            <p
              className={`
                text-3xl font-bold text-white mb-2
                transition-all duration-300 transform
                ${isAnimating ? "scale-95 blur-sm" : "scale-100 blur-0"}
                group-hover:scale-105
              `}
            >
              {card.value}
            </p>

            <div className="space-y-1">
              <p
                className={`text-sm font-medium ${
                  card.isPositive ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {card.subValue}
              </p>
              <p className="text-xs text-slate-400">{card.secondSubValue}</p>
            </div>
          </div>
        );
      })}

      {/* Last Updated */}
      <div className="col-span-1 md:col-span-3 text-xs text-slate-500 mt-2">
        Last updated:{" "}
        {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "Never"}
      </div>
    </div>
  );
};

export default SummaryCards;
