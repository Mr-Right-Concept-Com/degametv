import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { TenantProvider } from "@/hooks/useTenant";
import { ProtectedAdminRoute } from "@/components/auth/ProtectedAdminRoute";

// End-user pages
import Index from "./pages/Index";
import Cinema from "./pages/Cinema";
import CinemaEvent from "./pages/CinemaEvent";
import ContentDetail from "./pages/ContentDetail";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import MovieLanding from "./pages/MovieLanding";
import RefundPolicy from "./pages/RefundPolicy";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import ResetPassword from "./pages/ResetPassword";

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
import FilmmakerPortal from "./pages/admin/filmmaker/FilmmakerPortal";
import EmailSettings from "./pages/admin/settings/EmailSettings";

// Virtual Cinema Funnel
import BuyTicket from "./pages/BuyTicket";
import WatchMovie from "./pages/WatchMovie";
import MyTickets from "./pages/MyTickets";
import UserDashboard from "./pages/UserDashboard";
import FilmmakerSubmit from "./pages/FilmmakerSubmit";

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
              {/* ============ END-USER EXPERIENCE ============ */}
              <Route path="/" element={<Index />} />
              <Route path="/cinema" element={<Cinema />} />
              <Route path="/cinema/:id" element={<CinemaEvent />} />
              <Route path="/movie/:slug" element={<MovieLanding />} />
              <Route path="/content/:id" element={<ContentDetail />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Static Pages */}
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contact" element={<Contact />} />
              
              {/* ============ VIRTUAL CINEMA TICKET FUNNEL ============ */}
              <Route path="/buy/:slug" element={<BuyTicket />} />
              <Route path="/watch/:watchCode" element={<WatchMovie />} />
              <Route path="/tickets" element={<MyTickets />} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/filmmaker" element={<FilmmakerSubmit />} />
              
              {/* ============ PLATFORM ADMIN (Protected) ============ */}
              <Route path="/admin" element={<ProtectedAdminRoute><Dashboard /></ProtectedAdminRoute>} />
              <Route path="/admin/tenants" element={<ProtectedAdminRoute><Tenants /></ProtectedAdminRoute>} />
              <Route path="/admin/users" element={<ProtectedAdminRoute><Users /></ProtectedAdminRoute>} />
              <Route path="/admin/modules" element={<ProtectedAdminRoute><Modules /></ProtectedAdminRoute>} />
              <Route path="/admin/settings/payment-gateways" element={<ProtectedAdminRoute><PaymentGatewaySettings /></ProtectedAdminRoute>} />
              <Route path="/admin/sales" element={<ProtectedAdminRoute><ProducerDashboard /></ProtectedAdminRoute>} />
              
              {/* Module Admin Pages */}
              <Route path="/admin/modules/ott-vod" element={<ProtectedAdminRoute><ContentManagement /></ProtectedAdminRoute>} />
              <Route path="/admin/modules/ott-vod/analytics" element={<ProtectedAdminRoute><OTTAnalytics /></ProtectedAdminRoute>} />
              <Route path="/admin/modules/live-streaming" element={<ProtectedAdminRoute><StreamManagement /></ProtectedAdminRoute>} />
              <Route path="/admin/modules/virtual-cinema" element={<ProtectedAdminRoute><ScreeningManagement /></ProtectedAdminRoute>} />
              <Route path="/admin/modules/ticketing" element={<ProtectedAdminRoute><TicketManagement /></ProtectedAdminRoute>} />
              <Route path="/admin/modules/monetization" element={<ProtectedAdminRoute><BillingManagement /></ProtectedAdminRoute>} />
              <Route path="/admin/modules/marketplace" element={<ProtectedAdminRoute><MarketplaceManagement /></ProtectedAdminRoute>} />
              <Route path="/admin/modules/analytics" element={<ProtectedAdminRoute><AnalyticsDashboard /></ProtectedAdminRoute>} />
              <Route path="/admin/modules/xr-immersive" element={<ProtectedAdminRoute><XRManagement /></ProtectedAdminRoute>} />
              <Route path="/admin/modules/developer-api" element={<ProtectedAdminRoute><DeveloperPlatform /></ProtectedAdminRoute>} />
              <Route path="/admin/modules/white-label" element={<ProtectedAdminRoute><WhiteLabel /></ProtectedAdminRoute>} />
              <Route path="/admin/filmmaker" element={<ProtectedAdminRoute><FilmmakerPortal /></ProtectedAdminRoute>} />
              <Route path="/admin/settings/email" element={<ProtectedAdminRoute><EmailSettings /></ProtectedAdminRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TenantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
