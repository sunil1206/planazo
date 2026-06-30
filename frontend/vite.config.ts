import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@components": path.resolve(__dirname, "./components"),
      "@lib":        path.resolve(__dirname, "./lib"),
      "@stores":     path.resolve(__dirname, "./stores"),
      "@hooks":      path.resolve(__dirname, "./hooks"),
      // Shims so existing pages that import from next/* work without changes
      "next/link":       path.resolve(__dirname, "./src/shims/next/link.tsx"),
      "next/navigation": path.resolve(__dirname, "./src/shims/next/navigation.ts"),
      "next/image":      path.resolve(__dirname, "./src/shims/next/image.tsx"),
      "next/font/google": path.resolve(__dirname, "./src/shims/next/font.ts"),
      "next-auth":       path.resolve(__dirname, "./src/shims/next-auth.ts"),
    },
  },

  server: {
    port: 3000,
    host: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
