import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET?.trim() || "http://localhost:8888";

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }

            if (
              id.includes("react-big-calendar")
            ) {
              return "vendor-calendar";
            }

            if (id.includes("date-fns")) {
              return "vendor-date";
            }

            if (
              id.includes("react-bootstrap") ||
              id.includes("bootstrap") ||
              id.includes("react-bootstrap-icons")
            ) {
              return "vendor-ui";
            }

            return undefined;
          },
        },
      },
    },
    server: {
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        "/.netlify/functions/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
