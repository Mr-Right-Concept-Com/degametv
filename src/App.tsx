import { lazy, Suspense } from "react";
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
const Index = lazy(() => import("./pages/Index"));
const Cinema = lazy(() => import("./pages/Cinema"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MovieLanding = lazy(() => import("./pages/MovieLanding"));
const ContentLanding = lazy(() => import("./pages/ContentLanding"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Producers = lazy(() => import("./pages/Producers"));
const ApplyFilmmaker = lazy(() => import("./pages/ApplyFilmmaker"));

// Admin pages
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Users = lazy(() => import("./pages/admin/Users"));
const Screenings = lazy(() => import("./pages/admin/Screenings"));
const PromoCodes = lazy(() => import("./pages/admin/PromoCodes"));
const PaymentGatewaySettings = lazy(() => import("./pages/admin/PaymentGatewaySettings"));
const ProducerDashboard = lazy(() => import("./pages/admin/ProducerDashboard"));
const FilmmakerPortal = lazy(() => import("./pages/admin/filmmaker/FilmmakerPortal"));
const FilmmakerApplications = lazy(() => import("./pages/admin/FilmmakerApplications"));
const StudioApplications = lazy(() => import("./pages/admin/StudioApplications"));
const EmailSettings = lazy(() => import("./pages/admin/settings/EmailSettings"));
const WhiteLabel = lazy(() => import("./pages/admin/settings/WhiteLabel"));
const TicketManagement = lazy(() => import("./pages/admin/ticketing/TicketManagement"));
const Payouts = lazy(() => import("./pages/admin/Payouts"));
const Godmode = lazy(() => import("./pages/admin/Godmode"));

// Virtual Cinema Funnel
const BuyTicket = lazy(() => import("./pages/BuyTicket"));
const WatchMovie = lazy(() => import("./pages/WatchMovie"));
const LiveWatch = lazy(() => import("./pages/LiveWatch"));
const LiveGuestClaim = lazy(() => import("./pages/LiveGuestClaim"));
const PaymentReturn = lazy(() => import("./pages/PaymentReturn"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));

// Studio pages
const StudioDashboard = lazy(() => import("./pages/studio/StudioDashboard"));
const StudioCreate = lazy(() => import("./pages/studio/StudioCreate"));
const StudioMovies = lazy(() => import("./pages/studio/StudioMovies"));
const StudioScreenings = lazy(() => import("./pages/studio/StudioScreenings"));
const StudioEarnings = lazy(() => import("./pages/studio/StudioEarnings"));
const StudioAnalytics = lazy(() => import("./pages/studio/StudioAnalytics"));
const StudioLive = lazy(() => import("./pages/studio/StudioLive"));
const StudioFanBlast = lazy(() => import("./pages/studio/StudioFanBlast"));
const StudioTeam = lazy(() => import("./pages/studio/StudioTeam"));
const StudioProfile = lazy(() => import("./pages/studio/StudioProfile"));

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
            <Suspense fallback={<div className="min-h-screen bg-background text-foreground grid place-items-center"><span className="text-sm text-muted-foreground">Loading DeGameTV…</span></div>}>
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
              <Route path="/studio/profile" element={<ProtectedCreatorRoute><StudioProfile /></ProtectedCreatorRoute>} />
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
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </TenantProvider>
      </BrandingProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
