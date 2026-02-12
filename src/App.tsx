import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { TenantProvider } from "@/hooks/useTenant";

// End-user pages - Virtual Cinema focused
import Index from "./pages/Index";
import Cinema from "./pages/Cinema";
import CinemaEvent from "./pages/CinemaEvent";
import ContentDetail from "./pages/ContentDetail";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Admin pages
import Dashboard from "./pages/admin/Dashboard";
import Tenants from "./pages/admin/Tenants";
import Users from "./pages/admin/Users";
import Modules from "./pages/admin/Modules";
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
import PaymentGatewaySettings from "./pages/admin/PaymentGatewaySettings";
import ProducerDashboard from "./pages/admin/ProducerDashboard";

// Virtual Cinema Funnel
import BuyTicket from "./pages/BuyTicket";
import WatchMovie from "./pages/WatchMovie";
import MyTickets from "./pages/MyTickets";

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
              {/* ============ END-USER EXPERIENCE - Virtual Cinema ============ */}
              <Route path="/" element={<Index />} />
              <Route path="/cinema" element={<Cinema />} />
              <Route path="/cinema/:id" element={<CinemaEvent />} />
              <Route path="/content/:id" element={<ContentDetail />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* ============ VIRTUAL CINEMA TICKET FUNNEL ============ */}
              <Route path="/buy/:slug" element={<BuyTicket />} />
              <Route path="/watch/:watchCode" element={<WatchMovie />} />
              <Route path="/tickets" element={<MyTickets />} />
              
              {/* ============ PLATFORM ADMIN ============ */}
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/tenants" element={<Tenants />} />
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/modules" element={<Modules />} />
              <Route path="/admin/settings/payment-gateways" element={<PaymentGatewaySettings />} />
              <Route path="/admin/sales" element={<ProducerDashboard />} />
              
              {/* Module Admin Pages */}
              <Route path="/admin/modules/ott-vod" element={<ContentManagement />} />
              <Route path="/admin/modules/ott-vod/analytics" element={<OTTAnalytics />} />
              <Route path="/admin/modules/live-streaming" element={<StreamManagement />} />
              <Route path="/admin/modules/virtual-cinema" element={<ScreeningManagement />} />
              <Route path="/admin/modules/ticketing" element={<TicketManagement />} />
              <Route path="/admin/modules/monetization" element={<BillingManagement />} />
              <Route path="/admin/modules/marketplace" element={<MarketplaceManagement />} />
              <Route path="/admin/modules/analytics" element={<AnalyticsDashboard />} />
              <Route path="/admin/modules/xr-immersive" element={<XRManagement />} />
              <Route path="/admin/modules/developer-api" element={<DeveloperPlatform />} />
              <Route path="/admin/modules/white-label" element={<WhiteLabel />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TenantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
