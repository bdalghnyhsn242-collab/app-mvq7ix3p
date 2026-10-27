import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  define: {
    // Cloudflare Pages / GitHub Actions inject the built commit so the UI
    // can prove which commit a deployment is actually serving.
    __BUILD_COMMIT__: JSON.stringify(
      process.env.CF_PAGES_COMMIT_SHA ||
        process.env.COMMIT_REF ||
        process.env.GITHUB_SHA ||
        "dev",
    ),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
