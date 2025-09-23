import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../layout/Layout";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Calendar,
  DollarSign,
  Hash,
  TrendingUp,
  Save,
  RotateCcw,
} from "lucide-react";
import { useApp } from "../../context/AppContext";

export default function AddTransaction() {
  const navigate = useNavigate();
  const { createTransaction, fetchTransactions } = useApp();

  const [transactions, setTransactions] = useState([
    {
      stockName: "",
      stockSymbol: "",
      date: "",
      quantity: "",
      price: "",
      amount: "",
      asset_type: "STOCK", // Using STOCK as default
    },
  ]);
  const [symbolSuggestions, setSymbolSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const API_TOKEN = "d1qupe9r01qo4qd9jf70d1qupe9r01qo4qd9jf7g";
  const API_URL = "https://finnhub.io/api/v1/search";
  const INDIANAPI_URL = "https://stock.indianapi.in/mutual_fund_search";
  const INDIANAPI_KEY = "sk-live-BT5w8Qvl7TdzqS0Ac6KGwdgaFpewtgrqSmDirupE";
  const searchTimeout = useRef(null);

  // Debounced input handler
  const onNameInput = (value, index) => {
    const newTxns = [...transactions];
    newTxns[index].stockName = value;
    setTransactions(newTxns);
    setActiveSuggestionIndex(index);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.length >= 2) {
      searchTimeout.current = setTimeout(() => {
        searchSymbols(value);
      }, 300);
    } else {
      clearSuggestions();
    }
  };

  const searchSymbols = async (query) => {
    setLoading(true);
    try {
      // Stocks (Finnhub)
      const res = await axios.get(
        `${API_URL}?q=${encodeURIComponent(query)}&token=${API_TOKEN}`
      );

      // Mutual Funds (IndianAPI)
      const mfRes = await axios.get(
        `${INDIANAPI_URL}?query=${encodeURIComponent(query)}`,
        { headers: { "X-Api-Key": INDIANAPI_KEY } }
      );

      let suggestions = [];

      // Map Stocks
      if (res.data?.result?.length > 0) {
        suggestions.push(
          ...res.data.result.map((match) => {
            let cleanSymbol = (match.displaySymbol || match.symbol).split(
              "."
            )[0];
            cleanSymbol = `${cleanSymbol}.BSE`;
            return {
              stockSymbol: cleanSymbol,
              description: match.description,
              type: "STOCK",
            };
          })
        );
      }

      // Map Mutual Funds
      if (Array.isArray(mfRes.data) && mfRes.data.length > 0) {
        suggestions.push(
          ...mfRes.data.map((mf) => ({
            stockSymbol: mf.id, // correct scheme identifier
            description: mf.schemeName, // fixed key
            type: "MUTUAL_FUND",
            isin: mf.isin || "",
          }))
        );
      }

      setSymbolSuggestions(suggestions);
    } catch (err) {
      console.error("Error fetching symbols", err);
    }
    setLoading(false);
  };

  const selectSuggestion = (suggestion, index) => {
    const newTxns = [...transactions];
    newTxns[index].stockName = suggestion.description;

    let symbol = suggestion.stockSymbol;

    if (suggestion.type === "STOCK") {
      if (!symbol.endsWith(".BSE")) {
        symbol = `${symbol.split(".")[0]}.BSE`;
      }
      newTxns[index].asset_type = "STOCK";
    } else if (suggestion.type === "MUTUAL_FUND") {
      newTxns[index].asset_type = "MUTUAL_FUND";
    }

    newTxns[index].stockSymbol = symbol;
    setTransactions(newTxns);
    clearSuggestions();
  };

  const clearSuggestions = () => {
    setSymbolSuggestions([]);
    setActiveSuggestionIndex(-1);
  };

  const calculateAmount = (txn, index) => {
    const newTxns = [...transactions];
    if (txn.quantity && txn.price) {
      newTxns[index].amount = (
        parseFloat(txn.quantity) * parseFloat(txn.price)
      ).toFixed(2);
    }
    setTransactions(newTxns);
  };

  const addTransaction = () => {
    // Use the same asset type as the last transaction
    const lastTransaction = transactions[transactions.length - 1];
    setTransactions([
      ...transactions,
      {
        stockName: "",
        stockSymbol: "",
        date: "",
        quantity: "",
        price: "",
        amount: "",
        asset_type: lastTransaction?.asset_type || "STOCK",
      },
    ]);
  };

  const removeTransaction = (index) => {
    const newTxns = [...transactions];
    newTxns.splice(index, 1);
    setTransactions(newTxns);
    clearSuggestions();
  };

  const resetTransactions = () => {
    const currentType = transactions[0]?.asset_type || "STOCK";
    setTransactions([
      {
        stockName: "",
        stockSymbol: "",
        date: "",
        quantity: "",
        price: "",
        amount: "",
        asset_type: currentType, // Preserve the current asset type
      },
    ]);
    clearSuggestions();
  };

  const validTxn = (t) =>
    t.stockName && t.quantity > 0 && t.price > 0 && t.stockSymbol;
  const submitTransactions = async () => {
    for (const txn of transactions) {
      // Validate required fields first
      if (
        !txn.stockName ||
        !txn.stockSymbol ||
        !txn.quantity ||
        !txn.price ||
        !txn.asset_type
      ) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Validate asset type
      if (txn.asset_type !== "STOCK" && txn.asset_type !== "MUTUAL_FUND") {
        toast.error("Invalid asset type selected");
        return;
      }

      console.log("Transaction Form Data:", txn);
      // Ensure symbol has .BSE suffix only for stocks; keep original for mutual funds
      let symbol = txn.stockSymbol.trim();
      if (txn.asset_type === "STOCK") {
        if (!symbol.toUpperCase().endsWith(".BSE")) {
          symbol = `${symbol.split(".")[0]}.BSE`;
        }
      } else {
        // For mutual funds, keep original identifier (often an id or ISIN)
        symbol = symbol;
      }

      const payload = {
        security_type: txn.asset_type, // Already "STOCK" or "MUTUAL_FUND" from the select
        name: txn.stockName.trim(),
        symbol: symbol,
        quantity: Number(txn.quantity),
        price_per_unit: Number(txn.price),
        transaction_type: "BUY",
        transaction_date: txn.date || new Date().toISOString().split("T")[0],
        source: "MANUAL",
      };

      const result = await createTransaction(payload);
      if (!result.success) {
        toast.error(`❌ Failed to save: ${result.error}`);
        return;
      }
    }

    toast.success("✅ Transactions saved");
    await fetchTransactions();
    navigate("/stocks");
  };

  const totalAmount = transactions
    .filter((t) => t.amount)
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/stocks")}
                className="p-3 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-all duration-200 backdrop-blur-sm"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Add Transactions
                </h1>
                <p className="text-slate-400 mt-1">
                  Add multiple stock transactions to your portfolio
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={resetTransactions}
                className="inline-flex items-center px-4 py-2 border border-slate-700 rounded-xl text-slate-300 bg-slate-800/50 hover:bg-slate-700 hover:text-white transition-all duration-200 backdrop-blur-sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Transaction Forms */}
            <div className="lg:col-span-3 space-y-6">
              {transactions.map((txn, index) => (
                <div
                  key={index}
                  className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-blue-400" />
                      <span>Transaction {index + 1}</span>
                    </h3>
                    {transactions.length > 1 && (
                      <button
                        onClick={() => removeTransaction(index)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {/* Asset Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Asset Type
                    </label>
                    <select
                      value={txn.asset_type}
                      onChange={(e) => {
                        const newTxns = [...transactions];
                        newTxns[index].asset_type = e.target.value;
                        console.log("Asset Type Changed:", e.target.value);
                        setTransactions(newTxns);
                        console.log("Updated Transaction:", newTxns[index]);
                      }}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-200"
                    >
                      <option value="STOCK">Stock</option>
                      <option value="MUTUAL_FUND">Mutual Fund</option>
                    </select>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Stock Name with Suggestions */}
                    <div className="md:col-span-2 relative">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Stock Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="text"
                          value={txn.stockName}
                          onChange={(e) => onNameInput(e.target.value, index)}
                          placeholder="Type stock name to search..."
                          className="w-full pl-10 pr-12 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-200"
                        />
                        {loading && activeSuggestionIndex === index && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 animate-spin">
                            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full"></div>
                          </div>
                        )}
                      </div>

                      {/* Suggestions Dropdown */}
                      {activeSuggestionIndex === index &&
                        symbolSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 mt-1 bg-slate-800/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto">
                            {symbolSuggestions.map((suggestion, idx) => (
                              <div
                                key={idx}
                                className="px-4 py-3 hover:bg-slate-700/50 cursor-pointer transition-colors border-b border-slate-700/30 last:border-b-0"
                                onClick={() =>
                                  selectSuggestion(suggestion, index)
                                }
                              >
                                <div className="font-medium text-white">
                                  {suggestion.stockSymbol}
                                </div>
                                <div className="text-slate-400 text-sm">
                                  {suggestion.description}
                                </div>
                                <div className="text-slate-500 text-xs">
                                  {suggestion.type === "MUTUAL_FUND"
                                    ? "Mutual Fund"
                                    : "Stock"}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>

                    {/* Symbol */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Symbol
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Hash className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="text"
                          value={txn.stockSymbol}
                          readOnly
                          placeholder="Auto-filled"
                          className="w-full pl-10 pr-4 py-3 bg-slate-800/30 border border-slate-700 rounded-xl text-slate-400 backdrop-blur-sm"
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Transaction Date
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="date"
                          value={txn.date}
                          onChange={(e) => {
                            const newTxns = [...transactions];
                            newTxns[index].date = e.target.value;
                            setTransactions(newTxns);
                          }}
                          className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-200"
                        />
                      </div>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Quantity
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Hash className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="number"
                          value={txn.quantity}
                          onChange={(e) => {
                            const newTxns = [...transactions];
                            newTxns[index].quantity = e.target.value;
                            setTransactions(newTxns);
                            calculateAmount(newTxns[index], index);
                          }}
                          placeholder="Number of shares"
                          className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-200"
                          min="0"
                        />
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Price per Share (₹)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="number"
                          value={txn.price}
                          onChange={(e) => {
                            const newTxns = [...transactions];
                            newTxns[index].price = e.target.value;
                            setTransactions(newTxns);
                            calculateAmount(newTxns[index], index);
                          }}
                          placeholder="Price per share"
                          className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-200"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    {/* Total Amount */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Total Amount (₹)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="text"
                          value={
                            txn.amount
                              ? `₹${parseFloat(txn.amount).toLocaleString(
                                  "en-IN"
                                )}`
                              : "₹0.00"
                          }
                          readOnly
                          className="w-full pl-10 pr-4 py-3 bg-slate-700/30 border border-slate-600 rounded-xl text-emerald-400 font-semibold backdrop-blur-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add More Button */}
              <button
                onClick={addTransaction}
                className="w-full py-4 border-2 border-dashed border-slate-700 rounded-2xl text-slate-400 hover:text-blue-400 hover:border-blue-500 transition-all duration-200 flex items-center justify-center space-x-2 bg-slate-800/20 hover:bg-blue-500/5"
              >
                <Plus className="h-5 w-5" />
                <span className="font-medium">Add Another Transaction</span>
              </button>
            </div>

            {/* Summary Sidebar */}
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  <span>Transaction Summary</span>
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl">
                    <span className="text-slate-400">Total Transactions</span>
                    <span className="text-white font-semibold">
                      {transactions.length}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl">
                    <span className="text-slate-400">Valid Transactions</span>
                    <span className="text-emerald-400 font-semibold">
                      {transactions.filter((t) => validTxn(t)).length}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl">
                    <span className="text-slate-400">Total Investment</span>
                    <span className="text-blue-400 font-bold">
                      ₹{totalAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={submitTransactions}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
              >
                <div className="flex items-center justify-center space-x-2">
                  <Save className="h-5 w-5" />
                  <span>Submit Transactions</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
