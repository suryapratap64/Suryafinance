import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    define: {
      "process.env.REACT_APP_ALPHA_VANTAGE_API_KEY": JSON.stringify(
        env.REACT_APP_ALPHA_VANTAGE_API_KEY
      ),
      "process.env.REACT_APP_WS_URL": JSON.stringify(env.REACT_APP_WS_URL),
      "process.env.REACT_APP_API_URL": JSON.stringify(env.REACT_APP_API_URL),
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
        "/ws": {
          target: "ws://localhost:3001",
          ws: true,
        },
      },
    },
  };
});
