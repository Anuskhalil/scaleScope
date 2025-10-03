import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],

  server: {
    host: "0.0.0.0", // Listen on all interfaces
    port: 5174, // Optional: You can change this if needed
  },
});
