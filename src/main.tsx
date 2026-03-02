import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Subdomain routing: keleke.degametv.net → /movie/keleke
(function handleSubdomain() {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  // Only trigger on production domains (e.g., sub.degametv.net)
  const productionTLDs = ['degametv.net', 'degametv.com'];
  const isProductionDomain = productionTLDs.some(tld => hostname.endsWith(tld));
  if (!isProductionDomain) return; // Skip on preview/staging/localhost

  const reserved = ['www', 'app', 'admin', 'api', 'mail', 'smtp'];
  if (parts.length >= 3) {
    const sub = parts[0].toLowerCase();
    // Skip reserved subdomains and UUIDs
    const isUUID = /^[0-9a-f]{8}-/.test(sub);
    const isReserved = reserved.includes(sub);
    if (!isReserved && !isUUID && window.location.pathname === '/') {
      window.location.replace(`/movie/${sub}`);
    }
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
