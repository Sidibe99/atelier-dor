import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" => chemins relatifs.
// Le MÊME build marche sur https://ton-pseudo.github.io/atelier-dor/
// ET sur ton domaine perso (ex. https://atelierdor.sn/) une fois branché,
// sans rien changer ici.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
