import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "../utils/axiosConfig";
import { supabase } from "../lib/supabaseClient";

const AppContext = createContext(null);
const LS_TOKEN_KEY = "somani_finance_token";
const LS_USER_KEY = "sf_user";
const LS_PORTFOLIO_CACHE = "sf_portfolio_cache";
const LS_TRANSACTIONS_CACHE = "sf_transactions_cache";
const PORTFOLIO_CACHE_TTL = 5 * 60 * 1000; // 5 min
const TRANSACTION_CACHE_TTL = 5 * 60 * 1000; // 5 min

const PORTFOLIO_FETCH_COOLDOWN = 30 * 1000; // 30s
const TRANSACTION_FETCH_COOLDOWN = 20 * 1000; // 20s

export const AppProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState("stocks");
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [summary, setSummary] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [mutualFunds, setMutualFunds] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ------------- Real‑time snapshot (can be fed by polling/ws later) -------------
  const [realTimeData, setRealTimeData] = useState({
    lastUpdated: null,
    stockPrices: {},
    mutualFundNav: {},
    portfolioMetrics: {
      totalInvestment: 0,
      currentValue: 0,
      totalGainLoss: 0,
      gainLossPercent: 0,
      stocksValue: 0,
      mutualFundsValue: 0,
    },
  });

  const lastPortfolioFetchRef = useRef(0);
  const fetchPortfolioInFlightRef = useRef(null);

  const lastTxnFetchRef = useRef(0);
  const fetchTxnsInFlightRef = useRef(null);

  const signup = async (userData) => {
    setAuthLoading(true);
    setError(null);
    try {
      // Use Supabase signup
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            username: userData.username,
            name: userData.name,
          },
        },
      });

      if (error) throw error;

      if (data?.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem(LS_USER_KEY, JSON.stringify(data.user));
        return { success: true, user: data.user };
      }

      throw new Error("Signup failed");
    } catch (err) {
      const msg = err.message || "Signup failed";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setAuthLoading(false);
    }
  };

  const login = async (credentials) => {
    console.log("Starting login process...");
    setAuthLoading(true);
    setError(null);

    try {
      if (!credentials.email) {
        console.error("No email provided");
        throw new Error("Email is required");
      }

      if (!credentials.password) {
        console.error("No password provided");
        throw new Error("Password is required");
      }

      console.log("Attempting Supabase login...");
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        console.error("Supabase auth error:", error);
        throw error;
      }

      if (!data?.user || !data?.session) {
        console.error("No user or session data received");
        throw new Error("Login failed - No user data received");
      }

      console.log("Login successful, setting up session...");
      setUser(data.user);
      setIsAuthenticated(true);
      localStorage.setItem(LS_USER_KEY, JSON.stringify(data.user));

      // Set axios default authorization header
      const token = data.session.access_token;
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      console.log("Fetching initial data...");
      try {
        await Promise.all([
          fetchPortfolioData(true),
          fetchTransactions(true),
        ]).catch((err) => {
          console.error("Initial data fetch error:", err);
          // Don't fail the login if data fetch fails
        });
      } catch (fetchError) {
        console.error("Error fetching initial data:", fetchError);
        // Continue even if data fetch fails
      }

      console.log("Login process complete");
      return { success: true, user: data.user };
    } catch (err) {
      console.error("Login process error:", err);
      const msg = err.message || "Login failed";
      setError(msg);
      setAuthLoading(false);
      setUser(null);
      setIsAuthenticated(false);
      return { success: false, error: msg };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem(LS_USER_KEY);
      localStorage.removeItem(LS_PORTFOLIO_CACHE);
      localStorage.removeItem(LS_TRANSACTIONS_CACHE);
      setUser(null);
      setIsAuthenticated(false);
      setSummary(null);
      setStocks([]);
      setMutualFunds([]);
      setTransactions([]);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  //HELPERS
  const safeNum = (v, d = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };

  const calculateTotalStocksValue = (stockHoldings) => {
    return (stockHoldings || []).reduce((acc, s) => {
      const qty = safeNum(s.total_quantity ?? s.quantity);
      const live = safeNum(s.current_price ?? s.last_price ?? s.avg_price);
      const value = qty * live;
      console.log(
        `Stock: ${s.symbol}, Qty: ${qty}, Price: ${live}, Value: ${value}`
      );
      return acc + value;
    }, 0);
  };

  const calculateTotalMFValue = (mfHoldings) => {
    return (mfHoldings || []).reduce((acc, f) => {
      // accept both raw and normalized shapes
      const qty = safeNum(f.quantity ?? f.units);
      const price = safeNum(
        f.current_price ??
          f.last_price ??
          f.average_price ??
          f.currentNav ??
          f.currentNAV
      );
      const value = safeNum(f.current_value ?? f.currentValue ?? qty * price);
      console.log(`MF: ${f.symbol}, Value: ${value}`);
      return acc + value;
    }, 0);
  };

  //  PORTFOLIO
  const fetchPortfolioData = useCallback(async (force = false) => {
    try {
      // Check current session
      setLoginInProgress(true);
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        console.error("No active session found:", sessionError);
        setIsAuthenticated(false);
        setLoginInProgress(false);
        return;
      }

      if (!isAuthenticated) {
        setIsAuthenticated(true);
        setUser(session.user);
      }
    } catch (err) {
      console.error("Session check failed:", err);
      setIsAuthenticated(false);
      return;
    }

    const now = Date.now();
    if (
      !force &&
      now - lastPortfolioFetchRef.current < PORTFOLIO_FETCH_COOLDOWN
    ) {
      // serve cache if present and fresh
      const cachedRaw = localStorage.getItem(LS_PORTFOLIO_CACHE);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw);
          if (now - (cached.timestamp || 0) < PORTFOLIO_CACHE_TTL) {
            // hydrate state (no setLoading jitter)
            setStocks(cached.stocks || []);
            setMutualFunds(cached.mutualFunds || []);
            setSummary(cached.summary || null);
            setRealTimeData(cached.realTimeData || realTimeData);
            return cached;
          }
        } catch {}
      }
    }

    if (fetchPortfolioInFlightRef.current)
      return fetchPortfolioInFlightRef.current;

    setLoading(true);
    setError(null);

    const p = (async () => {
      try {
        const [stocksRes, mfRes, summaryRes] = await Promise.all([
          axios.get("/api/portfolio/stocks"),
          axios.get("/api/portfolio/mutual-funds"),
          axios.get("/api/portfolio/summary"),
        ]);

        const stockHoldings = stocksRes?.data?.stockHoldings || [];
        // Accept multiple possible response shapes for mutual funds
        const mfData = mfRes?.data;
        let mfHoldings = [];
        if (Array.isArray(mfData)) mfHoldings = mfData;
        else
          mfHoldings =
            mfData?.mutualFundHoldings ||
            mfData?.mutualFunds ||
            mfData?.data ||
            [];
        console.log(`Fetched mutual funds: ${mfHoldings.length}`);
        const summaryData = summaryRes?.data?.summary || null;
        // Normalize mutual funds so UI gets consistent fields
        const enrichedMFs = (mfHoldings || []).map((mf) =>
          calculateMutualFundMetrics(mf, realTimeData?.mutualFundNav)
        );

        // Calculate total values using normalized holdings
        const stocksValue = calculateTotalStocksValue(stockHoldings);
        const mutualFundsValue = calculateTotalMFValue(enrichedMFs);

        const totalInvestment =
          safeNum(summaryData?.total_investment) ||
          stockHoldings.reduce(
            (acc, s) => acc + safeNum(s.quantity) * safeNum(s.average_price),
            0
          ) +
            mfHoldings.reduce((acc, f) => acc + safeNum(f.total_investment), 0);

        const currentValue = stocksValue + mutualFundsValue;
        const totalGainLoss = currentValue - totalInvestment;
        const gainLossPercent =
          totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;

        console.log("Portfolio Metrics:", {
          totalInvestment,
          currentValue,
          totalGainLoss,
          gainLossPercent,
          stocksValue,
          mutualFundsValue,
        });

        const snapshot = {
          lastUpdated: new Date().toISOString(),
          stockPrices: {},
          mutualFundNav: {},
          portfolioMetrics: {
            totalInvestment,
            currentValue,
            totalGainLoss,
            gainLossPercent,
            stocksValue,
            mutualFundsValue,
          },
        };
        setStocks(stockHoldings);
        setMutualFunds(enrichedMFs);
        setSummary(summaryData);
        setRealTimeData(snapshot);

        const cache = {
          timestamp: now,
          stocks: stockHoldings,
          mutualFunds: enrichedMFs,
          summary: summaryData,
          realTimeData: snapshot,
        };
        localStorage.setItem(LS_PORTFOLIO_CACHE, JSON.stringify(cache));
        lastPortfolioFetchRef.current = now;
        return cache;
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err.message ||
          "Failed to fetch portfolio";
        setError(msg);
        if (err?.response?.status === 401) logout();
        throw err;
      } finally {
        fetchPortfolioInFlightRef.current = null;
        setLoading(false);
      }
    })();

    fetchPortfolioInFlightRef.current = p;
    return p;
  });
  // const fetchPortfolioData = useCallback(async (force = false) => {
  //   if (!isAuthenticated) return;

  //   const now = Date.now();
  //   if (
  //     !force &&
  //     now - lastPortfolioFetchRef.current < PORTFOLIO_FETCH_COOLDOWN
  //   ) {
  //     // serve cache if present and fresh
  //     const cachedRaw = localStorage.getItem(LS_PORTFOLIO_CACHE);
  //     if (cachedRaw) {
  //       try {
  //         const cached = JSON.parse(cachedRaw);
  //         if (now - (cached.timestamp || 0) < PORTFOLIO_CACHE_TTL) {
  //           // hydrate state (no setLoading jitter)
  //           setStocks(cached.stocks || []);
  //           setMutualFunds(cached.mutualFunds || []);
  //           setSummary(cached.summary || null);
  //           setRealTimeData(cached.realTimeData || realTimeData);
  //           return cached;
  //         }
  //       } catch {}
  //     }
  //   }

  //   if (fetchPortfolioInFlightRef.current)
  //     return fetchPortfolioInFlightRef.current;

  //   setLoading(true);
  //   setError(null);

  //   const p = (async () => {
  //     try {
  //       const [stocksRes, mfRes, summaryRes] = await Promise.all([
  //         axios.get("/api/portfolio/stocks"),
  //         axios.get("/api/portfolio/mutual-funds"),
  //         axios.get("/api/portfolio/summary"),
  //       ]);

  //       const stockHoldings = stocksRes?.data?.stockHoldings || [];
  //       const mfHoldings = mfRes?.data?.mutualFundHoldings || [];
  //       const summaryData = summaryRes?.data?.summary || null;

  //       // ✅ Normalize both
  //       const enrichedStocks = stockHoldings.map(calculateStockMetrics);
  //       const enrichedMFs = mfHoldings.map(calculateMutualFundMetrics);

  //       // ✅ Portfolio totals
  //       const stocksValue = calculateTotalStocksValue(enrichedStocks);
  //       const mutualFundsValue = calculateTotalMFValue(enrichedMFs);

  //       const totalInvestment =
  //         safeNum(summaryData?.total_investment) ||
  //         enrichedStocks.reduce(
  //           (acc, s) => acc + safeNum(s.quantity) * safeNum(s.average_price),
  //           0
  //         ) +
  //           enrichedMFs.reduce(
  //             (acc, f) => acc + safeNum(f.total_investment),
  //             0
  //           );

  //       const currentValue = stocksValue + mutualFundsValue;
  //       const totalGainLoss = currentValue - totalInvestment;
  //       const gainLossPercent =
  //         totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;

  //       console.log("Portfolio Metrics:", {
  //         totalInvestment,
  //         currentValue,
  //         totalGainLoss,
  //         gainLossPercent,
  //         stocksValue,
  //         mutualFundsValue,
  //       });

  //       const snapshot = {
  //         lastUpdated: new Date().toISOString(),
  //         stockPrices: {},
  //         mutualFundNav: {},
  //         portfolioMetrics: {
  //           totalInvestment,
  //           currentValue,
  //           totalGainLoss,
  //           gainLossPercent,
  //           stocksValue,
  //           mutualFundsValue,
  //         },
  //         mfSummary: {
  //           invested: enrichedMFs.reduce(
  //             (a, f) => a + safeNum(f.total_investment),
  //             0
  //           ),
  //           current: mutualFundsValue,
  //           gainLoss:
  //             mutualFundsValue -
  //             enrichedMFs.reduce((a, f) => a + safeNum(f.total_investment), 0),
  //         },
  //       };

  //       // ✅ Save normalized holdings into state
  //       setStocks(enrichedStocks);
  //       setMutualFunds(enrichedMFs);
  //       setSummary(summaryData);
  //       setRealTimeData(snapshot);

  //       // ✅ Cache normalized data
  //       const cache = {
  //         timestamp: now,
  //         stocks: enrichedStocks,
  //         mutualFunds: enrichedMFs,
  //         summary: summaryData,
  //         realTimeData: snapshot,
  //       };
  //       localStorage.setItem(LS_PORTFOLIO_CACHE, JSON.stringify(cache));
  //       lastPortfolioFetchRef.current = now;
  //       return cache;
  //     } catch (err) {
  //       const msg =
  //         err?.response?.data?.message ||
  //         err.message ||
  //         "Failed to fetch portfolio";
  //       setError(msg);
  //       if (err?.response?.status === 401) logout();
  //       throw err;
  //     } finally {
  //       fetchPortfolioInFlightRef.current = null;
  //       setLoading(false);
  //     }
  //   })();

  //   fetchPortfolioInFlightRef.current = p;
  //   return p;
  // }, [isAuthenticated, logout, realTimeData]);

  //TRANSACTIONS

  const fetchTransactions = async (force = false) => {
    if (!isAuthenticated) return [];

    const now = Date.now();
    if (!force && now - lastTxnFetchRef.current < TRANSACTION_FETCH_COOLDOWN) {
      const cachedRaw = localStorage.getItem(LS_TRANSACTIONS_CACHE);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw);
          if (now - (cached.timestamp || 0) < TRANSACTION_CACHE_TTL) {
            setTransactions(cached.data || []);
            return cached.data || [];
          }
        } catch {}
      }
    }

    if (fetchTxnsInFlightRef.current) return fetchTxnsInFlightRef.current;

    setLoading(true);
    setError(null);

    const p = (async () => {
      try {
        const res = await axios.get("/api/transactions/user");
        const list = Array.isArray(res.data)
          ? res.data
          : res.data?.transactions || res.data?.data || [];

        const normalized = (list || []).map(normalizeTransactionRecord);

        setTransactions(normalized);
        localStorage.setItem(
          LS_TRANSACTIONS_CACHE,
          JSON.stringify({ timestamp: now, data: normalized })
        );
        lastTxnFetchRef.current = now;
        return normalized;
      } catch (err) {
        const cachedRaw = localStorage.getItem(LS_TRANSACTIONS_CACHE);
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw);
            setTransactions(cached.data || []);
            setError("Using cached transactions (latest refresh failed)");
            return cached.data || [];
          } catch {}
        }
        const msg =
          err?.response?.data?.message ||
          err.message ||
          "Failed to fetch transactions";
        setError(msg);
        if (err?.response?.status === 401) logout();
        throw err;
      } finally {
        fetchTxnsInFlightRef.current = null;
        setLoading(false);
      }
    })();

    fetchTxnsInFlightRef.current = p;
    return p;
  };

  const normalizeTransactionRecord = (txn) => {
    const sec = txn?.SecurityMaster || txn?.security || {};
    return {
      id: txn.id ?? txn.transaction_id,
      user_id: txn.user_id,
      security_id: txn.security_id ?? sec.id,
      symbol: (txn.symbol || sec.symbol || "").toUpperCase(),
      name: txn.name || sec.name || "",
      security_type: txn.security_type || sec.security_type || txn.type || "",
      transaction_type: txn.transaction_type || txn.side || "BUY",
      transaction_date: txn.transaction_date || txn.date || null,
      quantity: safeNum(txn.quantity),
      price_per_unit: safeNum(txn.price_per_unit ?? txn.price),
      total_amount: safeNum(
        txn.total_amount ??
          safeNum(txn.quantity) * safeNum(txn.price_per_unit ?? txn.price)
      ),
      source: txn.source || "MANUAL",
      created_at: txn.created_at || null,
      updated_at: txn.updated_at || null,
    };
  };

  // CREATE / IMPORT
  const createTransaction = async (txnData) => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error("User not authenticated");

      // Ensure the data format matches what Supabase expects
      const payload = {
        user_id: session.user.id,
        symbol: txnData.symbol?.trim().toUpperCase(),
        name: txnData.name?.trim(),
        security_type:
          txnData.security_type === "MUTUAL_FUND" ? "MUTUAL_FUND" : "STOCK",
        transaction_type: txnData.transaction_type || "BUY",
        transaction_date:
          txnData.transaction_date || new Date().toISOString().split("T")[0],
        quantity: Number(txnData.quantity),
        price_per_unit: Number(txnData.price || txnData.price_per_unit),
        source: txnData.source || "MANUAL",
      };

      const res = await axios.post("/api/transactions", payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });

      if (res.status === 201 || res.data?.status === "ok") {
        await Promise.all([fetchTransactions(true), fetchPortfolioData(true)]);
        return { success: true, data: res.data };
      }
      const msg = res.data?.message || "Failed to create transaction";
      setError(msg);
      return { success: false, error: msg };
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err.message ||
        "Failed to create transaction";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const syncMotilalOswal = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post("/api/transactions/motilal-oswal");
      if (res.data?.status === "ok") {
        await Promise.all([fetchTransactions(true), fetchPortfolioData(true)]);
        return { success: true, data: res.data?.data };
      }
      throw new Error(res.data?.message || "Sync failed");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err.message ||
        "Failed to sync Motilal Oswal portfolio";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const uploadPortfolioCSV = async (file) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem(LS_TOKEN_KEY);
      if (!token) throw new Error("No authentication token found");

      const res = await axios.post("/api/transactions/upload-csv", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data?.status === "ok") {
        await Promise.all([fetchTransactions(true), fetchPortfolioData(true)]);
        return { success: true, data: res.data?.data };
      }
      throw new Error(res.data?.message || "Upload failed");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err.message ||
        "Failed to upload CSV file";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  // SELECTORS
  const stockTransactions = useMemo(
    () =>
      transactions.filter(
        (t) => (t.security_type || "").toUpperCase() === "STOCK"
      ),
    [transactions]
  );

  const mutualFundTransactions = useMemo(
    () =>
      transactions.filter(
        (t) => (t.security_type || "").toUpperCase() === "MUTUAL_FUND"
      ),
    [transactions]
  );

  const transactionsBySymbol = useMemo(() => {
    const map = {};
    for (const t of transactions) {
      const sym = (t.symbol || "").toUpperCase();
      if (!map[sym]) map[sym] = [];
      map[sym].push(t);
    }
    // sort each by date
    for (const sym of Object.keys(map)) {
      map[sym].sort(
        (a, b) => new Date(a.transaction_date) - new Date(b.transaction_date)
      );
    }
    return map;
  }, [transactions]);

  // const calculateStockMetrics = (stock) => {
  //   if (!stock) return null;

  //   const rt = realTimeData?.stockPrices?.[stock.symbol];
  //   const qty = safeNum(stock.quantity ?? stock.total_quantity);
  //   const avgPrice = safeNum(stock.average_price ?? stock.avg_price);

  //   const currentPrice = safeNum(
  //     rt?.price ??
  //       stock.current_price ??
  //       stock.last_price ??
  //       stock.average_price
  //   );

  //   const totalInvestment = safeNum(stock.total_investment) || qty * avgPrice;
  //   const currentValue = qty * currentPrice;
  //   const gainLoss = currentValue - totalInvestment;
  //   const gainLossPercent =
  //     totalInvestment > 0 ? (gainLoss / totalInvestment) * 100 : 0;

  //   const lastDate = stock.last_transaction_date
  //     ? new Date(stock.last_transaction_date)
  //     : new Date();
  //   const agingDays = Math.ceil((Date.now() - lastDate.getTime()) / 86400000);

  //   return {
  //     ...stock,
  //     quantity: qty,
  //     average_price: avgPrice,
  //     currentPrice,
  //     currentValue,
  //     totalInvestment,
  //     gainLoss,
  //     gainLossPercent,
  //     agingDays,
  //     ...(rt && {
  //       change: rt.change,
  //       changePercent: rt.changePercent,
  //       high: rt.high,
  //       low: rt.low,
  //       open: rt.open,
  //       volume: rt.volume,
  //       previousClose: rt.previousClose,
  //       lastUpdated: rt.lastUpdated,
  //     }),
  //   };
  // };

  // inside AppProvider

  const calculateStockMetrics = useCallback(
    (stock) => {
      if (!stock) return null;

      const rt = realTimeData?.stockPrices?.[stock.symbol];
      const qty = safeNum(stock.quantity ?? stock.total_quantity);
      const avgPrice = safeNum(stock.average_price ?? stock.avg_price);

      const currentPrice = safeNum(
        rt?.price ??
          stock.current_price ??
          stock.last_price ??
          stock.average_price
      );

      const totalInvestment = safeNum(stock.total_investment) || qty * avgPrice;
      const currentValue = qty * currentPrice;
      const gainLoss = currentValue - totalInvestment;
      const gainLossPercent =
        totalInvestment > 0 ? (gainLoss / totalInvestment) * 100 : 0;

      const lastDate = stock.last_transaction_date
        ? new Date(stock.last_transaction_date)
        : new Date();
      const agingDays = Math.ceil((Date.now() - lastDate.getTime()) / 86400000);

      return {
        ...stock,
        quantity: qty,
        average_price: avgPrice,
        currentPrice,
        currentValue,
        totalInvestment,
        gainLoss,
        gainLossPercent,
        agingDays,
        ...(rt && {
          change: rt.change,
          changePercent: rt.changePercent,
          high: rt.high,
          low: rt.low,
          open: rt.open,
          volume: rt.volume,
          previousClose: rt.previousClose,
          lastUpdated: rt.lastUpdated,
        }),
      };
    },
    [realTimeData]
  );

  const calculateMutualFundMetrics = useCallback((fund) => {
    if (!fund) return null;

    const nav = safeNum(
      fund.current_price ?? fund.last_price ?? fund.average_price
    );
    const qty = safeNum(fund.quantity);
    const currentValue = safeNum(fund.current_value, qty * nav);
    const totalInvestment = safeNum(
      fund.total_investment,
      qty * safeNum(fund.average_price)
    );

    const gainLoss = currentValue - totalInvestment;
    const gainLossPercent =
      totalInvestment > 0 ? (gainLoss / totalInvestment) * 100 : 0;

    const lastDate = fund.last_transaction_date
      ? new Date(fund.last_transaction_date)
      : new Date();
    const agingDays = Math.ceil((Date.now() - lastDate.getTime()) / 86400000);

    return {
      ...fund,
      currentNAV: nav,
      currentValue,
      totalInvestment,
      gainLoss,
      gainLossPercent,
      agingDays,
    };
  }, []);

  // BOOTSTRAP
  useEffect(() => {
    // Setup Supabase auth listeners
    const setupAuth = async () => {
      try {
        setAuthLoading(true);

        // Get initial session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session retrieval error:", sessionError);
          return;
        }

        if (session) {
          setUser(session.user);
          setIsAuthenticated(true);
          localStorage.setItem(LS_USER_KEY, JSON.stringify(session.user));
        }

        // Listen for auth changes
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session) {
            setUser(session.user);
            setIsAuthenticated(true);
            localStorage.setItem(LS_USER_KEY, JSON.stringify(session.user));

            // Refresh data when session is restored
            await Promise.all([
              fetchPortfolioData(true),
              fetchTransactions(true),
            ]);
          } else {
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem(LS_USER_KEY);
            localStorage.removeItem(LS_PORTFOLIO_CACHE);
            localStorage.removeItem(LS_TRANSACTIONS_CACHE);
          }
        });

        // Clean up subscription on unmount
        return () => {
          subscription?.unsubscribe();
        };
      } catch (err) {
        console.error("Auth setup error:", err);
        setError("Authentication setup failed");
      } finally {
        setAuthLoading(false);
      }
    };

    // Initialize auth
    setupAuth();

    // Initialize cache
    const now = Date.now();
    try {
      const pRaw = localStorage.getItem(LS_PORTFOLIO_CACHE);
      if (pRaw) {
        const p = JSON.parse(pRaw);
        if (now - (p.timestamp || 0) < PORTFOLIO_CACHE_TTL) {
          setStocks(p.stocks || []);
          setMutualFunds(p.mutualFunds || []);
          setSummary(p.summary || null);
          setRealTimeData(p.realTimeData || realTimeData);
        }
      }
    } catch {}

    try {
      const tRaw = localStorage.getItem(LS_TRANSACTIONS_CACHE);
      if (tRaw) {
        const t = JSON.parse(tRaw);
        if (now - (t.timestamp || 0) < TRANSACTION_CACHE_TTL) {
          setTransactions(t.data || []);
        }
      }
    } catch {}

    // Fetch fresh data if user is authenticated
    const initializeData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await Promise.all([fetchPortfolioData(true), fetchTransactions(true)]);
      }
    };

    initializeData();
  }, []);

  // CONTEXT VALUE
  const value = {
    // UI
    activeTab,
    setActiveTab,

    // Auth
    user,
    isAuthenticated,
    authLoading,
    signup,
    login,
    logout,

    // Data
    summary,
    stocks,
    mutualFunds,
    transactions,

    // Loading/Error
    loading,
    error,

    // API
    fetchPortfolioData,
    fetchTransactions,
    createTransaction,
    syncMotilalOswal,
    uploadPortfolioCSV,

    // Selectors
    stockTransactions,
    mutualFundTransactions,
    transactionsBySymbol,

    // Helpers
    calculateStockMetrics,
    calculateMutualFundMetrics,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
};

export const GlobalContextProvider = AppProvider;
export default AppContext;
