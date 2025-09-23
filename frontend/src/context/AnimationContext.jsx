import React, { createContext, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export const AnimationContext = createContext();

export const AnimationProvider = ({ children }) => {
  const [triggerAnimation, setTriggerAnimation] = useState(false);
  const location = useLocation();

  useEffect(() => {
 
    animateAll();
  }, [location.pathname]);

  // Handle page refresh
  useEffect(() => {
    const handlePageLoad = () => animateAll();
    window.addEventListener("load", handlePageLoad);
    return () => window.removeEventListener("load", handlePageLoad);
  }, []);

  const animateAll = () => {
    setTriggerAnimation(true);
    setTimeout(() => setTriggerAnimation(false), 1000);
  };

  return (
    <AnimationContext.Provider value={{ triggerAnimation, animateAll }}>
      {children}
    </AnimationContext.Provider>
  );
};
