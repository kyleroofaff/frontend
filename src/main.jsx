import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

if (typeof window !== "undefined") {
  const recoveryKey = "tlm-runtime-recovery-v1";
  const hasRecovered = window.sessionStorage.getItem(recoveryKey) === "1";
  if (!hasRecovered) {
    window.sessionStorage.setItem(recoveryKey, "1");
    Promise.resolve()
      .then(async () => {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister().catch(() => {})));
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key).catch(() => {})));
        }
      })
      .finally(() => {
        window.location.reload();
      });
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
