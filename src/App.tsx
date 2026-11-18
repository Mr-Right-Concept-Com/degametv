import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { BrandingProvider } from "@/components/branding/BrandingProvider";
import { ReleaseDomainRouter } from "@/components/domains/ReleaseDomainRouter";
import { TenantProvider } from "@/hooks/useTenant";
import { ProtectedAdminRoute } from "@/components/auth/ProtectedAdminRoute";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ProtectedCreatorRoute } from "@/components/auth/ProtectedCreatorRoute";

// End-user pages
import Index from "./pages/Index";
import Cinema from "./pages/Cinema";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import MovieLanding from "./pages/MovieLanding";
import ContentLanding from "./pages/ContentLanding";
import RefundPolicy from "./pages/RefundPolicy";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import ResetPassword from "./pages/ResetPassword";
import Producers from "./pages/Producers";
import ApplyFilmmaker from "./pages/ApplyFilmmaker";

// Admin pages
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Screenings from "./pages/admin/Screenings";
import PromoCodes from "./pages/admin/PromoCodes";
import PaymentGatewaySettings from "./pages/admin/PaymentGatewaySettings";
import ProducerDashboard from "./pages/admin/ProducerDashboard";
import FilmmakerPortal from "./pages/admin/filmmaker/FilmmakerPortal";
import FilmmakerApplications from "./pages/admin/FilmmakerApplications";
import StudioApplications from "./pages/admin/StudioApplications";
import EmailSettings from "./pages/admin/settings/EmailSettings";
import WhiteLabel from "./pages/admin/settings/WhiteLabel";
import TicketManagement from "./pages/admin/ticketing/TicketManagement";
import Payouts from "./pages/admin/Payouts";
import Godmode from "./pages/admin/Godmode";

// Virtual Cinema Funnel
import BuyTicket from "./pages/BuyTicket";
import WatchMovie from "./pages/WatchMovie";
import LiveWatch from "./pages/LiveWatch";
import LiveGuestClaim from "./pages/LiveGuestClaim";
import PaymentReturn from "./pages/PaymentReturn";
import UserDashboard from "./pages/UserDashboard";

// Studio pages
import StudioDashboard from "./pages/studio/StudioDashboard";
import StudioCreate from "./pages/studio/StudioCreate";
import StudioMovies from "./pages/studio/StudioMovies";
import StudioScreenings from "./pages/studio/StudioScreenings";
import StudioEarnings from "./pages/studio/StudioEarnings";
import StudioAnalytics from "./pages/studio/StudioAnalytics";
import StudioLive from "./pages/studio/StudioLive";
import StudioFanBlast from "./pages/studio/StudioFanBlast";
import StudioTeam from "./pages/studio/StudioTeam";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrandingProvider>
      <TenantProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ReleaseDomainRouter />
            <Routes>
              {/* ============ END-USER EXPERIENCE ============ */}
              <Route path="/" element={<Index />} />
              <Route path="/cinema" element={<Cinema />} />
              <Route path="/cinema/:id" element={<Navigate to="/cinema" replace />} />
              <Route path="/movie/:slug" element={<MovieLanding />} />
              <Route path="/content/:id" element={<ContentLanding />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Static Pages */}
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/producers" element={<Producers />} />
              <Route path="/apply-filmmaker" element={<ApplyFilmmaker />} />
              
              
              {/* ============ VIRTUAL CINEMA TICKET FUNNEL ============ */}
              <Route path="/buy/:slug" element={<BuyTicket />} />
              <Route path="/watch/:watchCode" element={<WatchMovie />} />
              <Route path="/live/watch/:streamId" element={<LiveWatch />} />
              <Route path="/live/claim" element={<LiveGuestClaim />} />
              <Route path="/payment/return" element={<PaymentReturn />} />
              <Route path="/tickets" element={<ProtectedRoute><Navigate to="/dashboard?tab=tickets" replace /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
              <Route path="/filmmaker" element={<Navigate to="/apply-filmmaker" replace />} />
              
              {/* ============ STUDIO (Protected - Approved Filmmakers Only) ============ */}
              <Route path="/studio" element={<ProtectedCreatorRoute><StudioDashboard /></ProtectedCreatorRoute>} />
              <Route path="/studio/create" element={<ProtectedCreatorRoute><StudioCreate /></ProtectedCreatorRoute>} />
              <Route path="/studio/movies" element={<ProtectedCreatorRoute><StudioMovies /></ProtectedCreatorRoute>} />
              <Route path="/studio/submit" element={<ProtectedCreatorRoute><Navigate to="/studio/create" replace /></ProtectedCreatorRoute>} />
              <Route path="/studio/screenings" element={<ProtectedCreatorRoute><StudioScreenings /></ProtectedCreatorRoute>} />
              <Route path="/studio/earnings" element={<ProtectedCreatorRoute><StudioEarnings /></ProtectedCreatorRoute>} />
              <Route path="/studio/analytics" element={<ProtectedCreatorRoute><StudioAnalytics /></ProtectedCreatorRoute>} />
              <Route path="/studio/analytics/:screeningId" element={<ProtectedCreatorRoute><StudioAnalytics /></ProtectedCreatorRoute>} />
              
              <Route path="/studio/live" element={<ProtectedCreatorRoute><Navigate to="/studio/create?flow=live&type=live" replace /></ProtectedCreatorRoute>} />
              <Route path="/studio/live/manage" element={<ProtectedCreatorRoute><StudioLive /></ProtectedCreatorRoute>} />
              <Route path="/studio/team" element={<ProtectedCreatorRoute><StudioTeam /></ProtectedCreatorRoute>} />
              <Route path="/studio/fan-blast" element={<ProtectedCreatorRoute><StudioFanBlast /></ProtectedCreatorRoute>} />
              {/* ============ ADMIN (Protected) ============ */}
              <Route path="/admin" element={<ProtectedAdminRoute><Dashboard /></ProtectedAdminRoute>} />
              <Route path="/admin/users" element={<ProtectedAdminRoute><Users /></ProtectedAdminRoute>} />
              <Route path="/admin/screenings" element={<ProtectedAdminRoute><Screenings /></ProtectedAdminRoute>} />
              <Route path="/admin/tickets" element={<ProtectedAdminRoute><TicketManagement /></ProtectedAdminRoute>} />
              <Route path="/admin/promo-codes" element={<ProtectedAdminRoute><PromoCodes /></ProtectedAdminRoute>} />
              <Route path="/admin/sales" element={<ProtectedAdminRoute><ProducerDashboard /></ProtectedAdminRoute>} />
              <Route path="/admin/payouts" element={<ProtectedAdminRoute><Payouts /></ProtectedAdminRoute>} />
              <Route path="/admin/godmode" element={<ProtectedAdminRoute><Godmode /></ProtectedAdminRoute>} />
              <Route path="/admin/filmmaker" element={<ProtectedAdminRoute><FilmmakerPortal /></ProtectedAdminRoute>} />
              <Route path="/admin/filmmaker-applications" element={<ProtectedAdminRoute><FilmmakerApplications /></ProtectedAdminRoute>} />
              <Route path="/admin/studio-applications" element={<ProtectedAdminRoute><StudioApplications /></ProtectedAdminRoute>} />
              <Route path="/admin/settings/payment-gateways" element={<ProtectedAdminRoute><PaymentGatewaySettings /></ProtectedAdminRoute>} />
              <Route path="/admin/settings/email" element={<ProtectedAdminRoute><EmailSettings /></ProtectedAdminRoute>} />
              <Route path="/admin/settings/branding" element={<ProtectedAdminRoute><WhiteLabel /></ProtectedAdminRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TenantProvider>
      </BrandingProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
