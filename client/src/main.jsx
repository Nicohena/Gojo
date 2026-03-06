import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "leaflet/dist/leaflet.css"; // Import Leaflet CSS
import App from "./App.jsx";
import { applyTheme, getStoredTheme } from "./utils/theme";

// Apply persisted theme before first render.
applyTheme(getStoredTheme());

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
