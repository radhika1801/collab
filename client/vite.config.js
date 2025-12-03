import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/collaborative-drawing-react/", 
  // ^ replace with your repo name!
});

