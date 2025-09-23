import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  BrowserRouter,
} from "react-router-dom";
import "./styles/animations.css";
import { Toaster } from "react-hot-toast";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import { useAuth } from "./context/AuthContext";
import MutualFundsPage from "./pages/MutualFundsPage";
import AddTransaction from "./components/dashboard/AddStockModal";
import { AnimationProvider } from "./context/AnimationContext";
import Signup from "./pages/Signup";


const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AnimationProvider>
        <div className="App min-h-screen bg-gray-100">
          <Routes>
            <Route path="/login" element={<Login />} />
             <Route path="/signup" element={<Signup/>} />
            <Route path="/" element={<Dashboard />} />

            <Route path="/stocks" element={<Dashboard />} />
            <Route path="/mutual-funds" element={<MutualFundsPage />} />
            <Route path="/addstocks" element={<AddTransaction />} />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </AnimationProvider>
    </BrowserRouter>
  );
}

export default App;
