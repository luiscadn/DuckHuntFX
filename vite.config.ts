import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the build works on GitHub Pages, itch.io, Vercel, or a plain folder.
  base: "./",
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ["phaser"] },
      },
    },
  },
  server: { host: true, open: true },
});
