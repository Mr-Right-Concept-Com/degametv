import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Subdomain routing: keleke.degametv.net → /buy/keleke
(function handleSubdomain() {
  const hostname = window.location.hostname;
  // Match any subdomain that isn't www, app, admin, or localhost
  const reserved = ['www', 'app', 'admin', 'localhost', 'degametv', 'lovable'];
  const parts = hostname.split('.');
  // Must have at least sub.domain.tld (3 parts) and not already on a path
  if (parts.length >= 3) {
    const sub = parts[0].toLowerCase();
    const isReserved = reserved.some(r => sub === r || sub.startsWith(r));
    if (!isReserved && window.location.pathname === '/') {
      // Redirect to the buy page for this movie slug
      window.location.replace(`/movie/${sub}`);
    }
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
