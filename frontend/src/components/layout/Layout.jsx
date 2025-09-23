import React, { useState, useContext } from "react";
import {
  TrendingUp,
  LogOut,
  Menu,
  X,
  RefreshCw,
  User,
  Bell,
  Upload,
  Settings,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AnimationContext } from "../../context/AnimationContext";
import "../../styles/animations.css";

const Layout = ({ children }) => {
  const { logout } = useAuth();
  const { user } = useAuth();
  const { uploadPortfolioCSV, fetchPortfolioData } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const handleUpload = () => {
    // programmatically click hidden file input
    document.getElementById("fileInput").click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const fileExt = file.name.split(".").pop().toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(fileExt)) {
      alert("Please upload a CSV or Excel file");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadPortfolioCSV(file);
      if (result.success) {
        alert("Portfolio data uploaded successfully!");
        // Trigger a refresh of the data
        handleRefresh();
      } else {
        alert(result.error || "Failed to upload file");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file: " + (error.message || "Unknown error"));
    } finally {
      setIsUploading(false);
      // Reset the file input
      event.target.value = "";
    }
  };

  const { animateAll, triggerAnimation } = useContext(AnimationContext);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    animateAll();
    try {
      await fetchPortfolioData(); // This function comes from useApp
    } catch (error) {
      console.error("Refresh error:", error);
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const activeTab = location.pathname.startsWith("/mutual-funds")
    ? "mutual"
    : "stocks";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col">
      {/* Modern Navbar */}
      <header
        className={`bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50  sticky top-0 z-50 navbar ${
          triggerAnimation ? "animate" : ""
        }`}
      >
        <div className="w-full px-6">
          <div className="flex items-center justify-between py-2">
            {/* Brand Section */}
            <div className="flex items-center space-x-8">
              <Link
                to="/"
                onClick={handleRefresh}
                className="flex items-center space-x-3"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    Somani Finance
                  </h2>
                  <p className="text-xs text-slate-400">Investment Platform</p>
                </div>
              </Link>

              {/* Navigation Pills */}
              <div className="hidden lg:flex items-center space-x-2 bg-slate-800/50 p-1 rounded-xl backdrop-blur-sm">
                <button
                  onClick={() => navigate("/stocks")}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === "stocks"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Stocks</span>
                </button>

                <button
                  onClick={() => navigate("/mutual-funds")}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium transition-all duration-200 ${
                    activeTab === "mutual"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Mutual Funds</span>
                </button>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              {/* Action Buttons */}
              <div className="hidden md:flex items-center space-x-2">
                <button
                  onClick={handleUpload}
                  className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-200"
                  title="Upload Portfolio CSV"
                  disabled={isUploading}
                >
                  <input
                    type="file"
                    id="fileInput"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".csv,.xlsx,.xls"
                  />
                  <Upload
                    className={`h-5 w-5 ${isUploading ? "animate-pulse" : ""}`}
                  />
                </button>
                <button
                  onClick={handleRefresh}
                  className={`p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-200 ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                  title="Refresh Data"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-200"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center space-x-3 p-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="hidden md:block font-medium">
                    {user?.username
                      ? user.username.length > 15
                        ? `${user.username.substring(0, 12)}...`
                        : user.username
                      : "User"}
                  </span>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-800/90 backdrop-blur-xl rounded-xl shadow-xl border border-slate-700/50 py-2">
                    <div className="px-4 py-3 border-b border-slate-700/50">
                      <p className="text-sm font-medium text-white">
                        {user?.username || "User"}
                      </p>
                      <p className="text-xs text-slate-400">
                        Member since{" "}
                        {user?.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-800/50 backdrop-blur-xl border-t border-slate-700/50 px-6 py-4">
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => navigate("/stocks")}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                  activeTab === "stocks"
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                <TrendingUp className="h-5 w-5" />
                <span className="font-medium">Stocks</span>
              </button>
              <button
                onClick={() => navigate("/mutual-funds")}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                  activeTab === "mutual"
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                <TrendingUp className="h-5 w-5" />
                <span className="font-medium">Mutual Funds</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="flex-1">{children}</main>

      {/* Footer Section */}
      <footer
        className={`bg-gradient-to-br from-gray-900 via-black to-gray-900 backdrop-blur-xl border-t border-slate-700/50 py-8 ${
          triggerAnimation ? "animate" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    Somani Finance
                  </h2>
                  <p className="text-sm text-slate-400">Investment Platform</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm">
                Your trusted partner for stock and mutual fund portfolio
                management.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/stocks"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Stocks Portfolio
                  </Link>
                </li>
                <li>
                  <Link
                    to="/mutual-funds"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Mutual Funds
                  </Link>
                </li>
                <li>
                  <Link
                    to="/addstocks"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Add Investment
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Section */}
            <div>
              <h3 className="text-white font-semibold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li className="text-slate-400">
                  <span className="text-blue-500">Email:</span>{" "}
                  support@somanifinance.com
                </li>
                <li className="text-slate-400">
                  <span className="text-blue-500">Phone:</span> +91 XXX XXX XXXX
                </li>
                <li className="text-slate-400">
                  <span className="text-blue-500">Location:</span> Mumbai, India
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-8 border-t border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-slate-400 text-sm">
                © {new Date().getFullYear()} Somani Finance. All rights
                reserved.
              </p>
              <div className="flex items-center space-x-4 mt-4 md:mt-0">
                <a
                  href="#"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Privacy Policy
                </a>
                <a
                  href="#"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
