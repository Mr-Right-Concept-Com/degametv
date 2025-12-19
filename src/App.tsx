import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { TenantProvider } from "@/hooks/useTenant";

// Public Pages
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// End-User Pages (Module-Specific)
import Movies from "./pages/Movies";
import Series from "./pages/Series";
import ContentDetail from "./pages/ContentDetail";
import Live from "./pages/Live";
import LiveStream from "./pages/LiveStream";
import Cinema from "./pages/Cinema";
import CinemaEvent from "./pages/CinemaEvent";

// Platform Admin Pages (Super Admin)
import Dashboard from "./pages/admin/Dashboard";
import Tenants from "./pages/admin/Tenants";
import Users from "./pages/admin/Users";
import Modules from "./pages/admin/Modules";

// Module Admin Pages (12 Modules)
import ContentManagement from "./pages/admin/ott/ContentManagement";
import OTTAnalytics from "./pages/admin/ott/OTTAnalytics";
import StreamManagement from "./pages/admin/live/StreamManagement";
import ScreeningManagement from "./pages/admin/cinema/ScreeningManagement";
import TicketManagement from "./pages/admin/ticketing/TicketManagement";
import BillingManagement from "./pages/admin/monetization/BillingManagement";
import MarketplaceManagement from "./pages/admin/marketplace/MarketplaceManagement";
import AnalyticsDashboard from "./pages/admin/analytics/AnalyticsDashboard";
import DeveloperPlatform from "./pages/admin/developer/DeveloperPlatform";
import XRManagement from "./pages/admin/xr/XRManagement";
import WhiteLabel from "./pages/admin/settings/WhiteLabel";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TenantProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* ============ PUBLIC ENTRY PAGES ============ */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* ============ END-USER EXPERIENCE (White-Label Frontend) ============ */}
              {/* Module 1: OTT/VOD - Browse, Watch, Subscriptions */}
              <Route path="/movies" element={<Movies />} />
              <Route path="/series" element={<Series />} />
              <Route path="/content/:id" element={<ContentDetail />} />
              
              {/* Module 2: Live Streaming - Event pages, Ticket purchase, Live player */}
              <Route path="/live" element={<Live />} />
              <Route path="/live/:id" element={<LiveStream />} />
              
              {/* Module 3: Virtual Cinema - Premiere events, Replay access */}
              <Route path="/cinema" element={<Cinema />} />
              <Route path="/cinema/:id" element={<CinemaEvent />} />
              
              {/* ============ PLATFORM ADMIN (Tenant Dashboard) ============ */}
              {/* Super Admin / Platform Management */}
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/tenants" element={<Tenants />} />
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/modules" element={<Modules />} />
              
              {/* Module 1: OTT/VOD Admin */}
              <Route path="/admin/modules/ott-vod" element={<ContentManagement />} />
              <Route path="/admin/modules/ott-vod/analytics" element={<OTTAnalytics />} />
              
              {/* Module 2: Live Streaming Admin */}
              <Route path="/admin/modules/live-streaming" element={<StreamManagement />} />
              
              {/* Module 3: Virtual Cinema Admin */}
              <Route path="/admin/modules/virtual-cinema" element={<ScreeningManagement />} />
              
              {/* Module 4: Linear TV / FAST Admin */}
              <Route path="/admin/modules/linear-tv" element={<ContentManagement />} />
              
              {/* Module 5: Short-Form Video Admin */}
              <Route path="/admin/modules/short-form" element={<ContentManagement />} />
              
              {/* Module 6: Ticketing & Access Admin */}
              <Route path="/admin/modules/ticketing" element={<TicketManagement />} />
              
              {/* Module 7: Monetization & Billing Admin */}
              <Route path="/admin/modules/monetization" element={<BillingManagement />} />
              
              {/* Module 8: Marketplace & Licensing Admin */}
              <Route path="/admin/modules/marketplace" element={<MarketplaceManagement />} />
              
              {/* Module 9: White-Label & Enterprise Admin */}
              <Route path="/admin/modules/white-label" element={<WhiteLabel />} />
              
              {/* Module 10: AI & Analytics Admin */}
              <Route path="/admin/modules/analytics" element={<AnalyticsDashboard />} />
              
              {/* Module 11: XR / Immersive Admin */}
              <Route path="/admin/modules/xr-immersive" element={<XRManagement />} />
              
              {/* Module 12: Developer Platform Admin */}
              <Route path="/admin/modules/developer-api" element={<DeveloperPlatform />} />
              
              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TenantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
