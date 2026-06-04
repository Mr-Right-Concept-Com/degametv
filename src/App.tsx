import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { TenantProvider } from "@/hooks/useTenant";
import { ProtectedAdminRoute } from "@/components/auth/ProtectedAdminRoute";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

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
import Producers from "./pages/Producers";

// Admin pages
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Screenings from "./pages/admin/Screenings";
import PromoCodes from "./pages/admin/PromoCodes";
import PaymentGatewaySettings from "./pages/admin/PaymentGatewaySettings";
import ProducerDashboard from "./pages/admin/ProducerDashboard";
import FilmmakerPortal from "./pages/admin/filmmaker/FilmmakerPortal";
import EmailSettings from "./pages/admin/settings/EmailSettings";
import WhiteLabel from "./pages/admin/settings/WhiteLabel";

// Virtual Cinema Funnel
import BuyTicket from "./pages/BuyTicket";
import WatchMovie from "./pages/WatchMovie";
import MyTickets from "./pages/MyTickets";
import UserDashboard from "./pages/UserDashboard";
import FilmmakerSubmit from "./pages/FilmmakerSubmit";

// Studio pages
import StudioDashboard from "./pages/studio/StudioDashboard";
import StudioMovies from "./pages/studio/StudioMovies";
import StudioSubmit from "./pages/studio/StudioSubmit";
import StudioScreenings from "./pages/studio/StudioScreenings";
import StudioEarnings from "./pages/studio/StudioEarnings";
import StudioAnalytics from "./pages/studio/StudioAnalytics";

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
              <Route path="/producers" element={<Producers />} />
              
              
              {/* ============ VIRTUAL CINEMA TICKET FUNNEL ============ */}
              <Route path="/buy/:slug" element={<BuyTicket />} />
              <Route path="/watch/:watchCode" element={<WatchMovie />} />
              <Route path="/tickets" element={<ProtectedRoute><MyTickets /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
              <Route path="/filmmaker" element={<FilmmakerSubmit />} />
              
              {/* ============ STUDIO (Protected - Filmmakers) ============ */}
              <Route path="/studio" element={<ProtectedRoute><StudioDashboard /></ProtectedRoute>} />
              <Route path="/studio/movies" element={<ProtectedRoute><StudioMovies /></ProtectedRoute>} />
              <Route path="/studio/submit" element={<ProtectedRoute><StudioSubmit /></ProtectedRoute>} />
              <Route path="/studio/screenings" element={<ProtectedRoute><StudioScreenings /></ProtectedRoute>} />
              <Route path="/studio/earnings" element={<ProtectedRoute><StudioEarnings /></ProtectedRoute>} />
              <Route path="/studio/analytics" element={<ProtectedRoute><StudioScreenings /></ProtectedRoute>} />
              <Route path="/studio/analytics/:screeningId" element={<ProtectedRoute><StudioAnalytics /></ProtectedRoute>} />
              
              {/* ============ ADMIN (Protected) ============ */}
              <Route path="/admin" element={<ProtectedAdminRoute><Dashboard /></ProtectedAdminRoute>} />
              <Route path="/admin/users" element={<ProtectedAdminRoute><Users /></ProtectedAdminRoute>} />
              <Route path="/admin/screenings" element={<ProtectedAdminRoute><Screenings /></ProtectedAdminRoute>} />
              <Route path="/admin/promo-codes" element={<ProtectedAdminRoute><PromoCodes /></ProtectedAdminRoute>} />
              <Route path="/admin/sales" element={<ProtectedAdminRoute><ProducerDashboard /></ProtectedAdminRoute>} />
              <Route path="/admin/filmmaker" element={<ProtectedAdminRoute><FilmmakerPortal /></ProtectedAdminRoute>} />
              <Route path="/admin/settings/payment-gateways" element={<ProtectedAdminRoute><PaymentGatewaySettings /></ProtectedAdminRoute>} />
              <Route path="/admin/settings/email" element={<ProtectedAdminRoute><EmailSettings /></ProtectedAdminRoute>} />
              <Route path="/admin/settings/branding" element={<ProtectedAdminRoute><WhiteLabel /></ProtectedAdminRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TenantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
