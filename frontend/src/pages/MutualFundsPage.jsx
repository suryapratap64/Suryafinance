import React, { useState, useContext, useEffect } from "react";
import Layout from "../components/layout/Layout";
import MutualFundTable from "../components/dashboard/MutualFundTable";
import SummaryCards from "../components/dashboard/SummaryCards";
import { Download, Plus, PieChart } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimationContext } from "../context/AnimationContext";
import { useApp } from "../context/AppContext";

const MutualFundsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { animateAll, triggerAnimation } = useContext(AnimationContext);
  const { mutualFunds, loading, error, fetchMutualFunds } = useApp(); //
  const handleRefresh = async () => {
    animateAll();
  };

  const { fetchPortfolioData, isAuthenticated } = useApp();
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="max-w-7xl mx-auto space-y-8 p-6">
          {/* Header Section */}
          <div
            className={`flex items-center justify-between header-section ${
              triggerAnimation ? "animate" : ""
            }`}
          >
            <div className="transform transition-all duration-500 ease-out hover:scale-102">
              <h1 className="text-3xl font-bold text-white mb-2 ">
                Mutual Funds Portfolio
              </h1>
              <p className="text-slate-400 animate-slide-up">
                Track your mutual fund investments
              </p>
            </div>
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
              <button className="inline-flex items-center px-6 py-3 rounded-xl text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 focus:outline-none transition-all duration-200 text-base font-medium shadow-lg hover:shadow-purple-500/25">
                <Plus className="h-5 w-5 mr-2" />
                Add Fund
              </button>
            </Link>

            <div className="flex items-center space-x-3">
              <button className="btn inline-flex items-center px-6 py-3 border border-slate-700 rounded-xl text-slate-300 bg-slate-800/50 hover:bg-slate-700 hover:text-white focus:outline-none transition-all duration-200 backdrop-blur-sm">
                <PieChart className="h-5 w-5 mr-2" />
                Analytics
              </button>

              <button
                onClick={handleRefresh}
                className="btn inline-flex items-center px-6 py-3 border border-slate-700 rounded-xl text-slate-300 bg-slate-800/50 hover:bg-slate-700 hover:text-white focus:outline-none transition-all duration-200 backdrop-blur-sm"
              >
                <Download className="h-5 w-5 mr-2" />
                Export Data
              </button>
            </div>
          </div>

          {/* Mutual Fund Table */}
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                Loading mutual funds...
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-400">{error}</div>
            ) : !mutualFunds || mutualFunds.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p>No mutual funds found. Add some funds to get started.</p>
                <button
                  onClick={handleRefresh}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Refresh Data
                </button>
              </div>
            ) : (
              <MutualFundTable
                mutualFunds={mutualFunds.filter(
                  (fund) =>
                    fund.name
                      ?.toLowerCase()
                      .includes(searchTerm.toLowerCase()) ||
                    fund.symbol
                      ?.toLowerCase()
                      .includes(searchTerm.toLowerCase())
                )}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MutualFundsPage;
