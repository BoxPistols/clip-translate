import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import { debugTauriState } from "./lib/tauri";

// Debug: log Tauri availability on startup
debugTauriState();
// Also check after a delay (Tauri may inject after page load)
setTimeout(() => {
  console.log("[ClipTranslate] Delayed check:");
  debugTauriState();
}, 1000);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
