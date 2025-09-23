import React, { useState, useContext } from "react";
import { useApp } from "../context/AppContext";
import { Download, Plus, Search, Filter } from "lucide-react";
import SummaryCards from "../components/dashboard/SummaryCards";
import StockTable from "../components/dashboard/StockTable";
import Layout from "../components/layout/Layout";
import { Link } from "react-router-dom";
import { AnimationContext } from "../context/AnimationContext";

const Dashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { animateAll, triggerAnimation } = useContext(AnimationContext);
  const { summary, stocks, loading, error, fetchPortfolioData ,fetchTransactions} = useApp();

  const handleRefresh = async () => {
    animateAll();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="max-w-7xl mx-auto space-y-8 p-6">
          {/* Header Section */}
          <div    className={`flex items-center justify-between header-section ${
              triggerAnimation ? "animate" : ""
            }`}>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Portfolio Dashboard
              </h1>
              <p className="text-slate-400">
                Manage and track your investments
              </p>
            </div>
            <div className="flex items-center space-x-4"></div>
          </div>

          {/* Summary Cards */}
          <SummaryCards isRefreshing={isRefreshing} />

          {/* Action Buttons */}
          <div
            className={`flex justify-between items-center action-buttons ${
              triggerAnimation ? "animate" : ""
            }`}
          >
            <Link to="/addstocks" className="btn">
              <button className="inline-flex items-center px-6 py-3 rounded-xl text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none transition-all duration-200 text-base font-medium shadow-lg hover:shadow-blue-500/25">
                <Plus className="h-5 w-5 mr-2" />
                Add Stock
              </button>
            </Link>

            <button className="btn inline-flex items-center px-6 py-3 border border-slate-700 rounded-xl text-slate-300 bg-slate-800/50 hover:bg-slate-700 hover:text-white focus:outline-none transition-all duration-200 backdrop-blur-sm">
              <Download className="h-5 w-5 mr-2" />
              Export Data
            </button>
          </div>

          {/* Stock Table */}
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                Loading stocks...
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-400">{error}</div>
            ) : !stocks || !Array.isArray(stocks) || stocks.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p>No stocks found. Add some stocks to get started.</p>
                {!loading && (
                  <button
                    onClick={handleRefresh}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Refresh Data
                  </button>
                )}
              </div>
            ) : (
              <StockTable
                stocks={stocks.filter(
                  (stock) =>
                    stock &&
                    ((stock.name &&
                      stock.name
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())) ||
                      (stock.symbol &&
                        stock.symbol
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())))
                )}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;