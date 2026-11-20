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
import { RuntimeConfigProvider } from "@/contexts/RuntimeConfigContext";
import { FeatureGate } from "@/components/auth/FeatureGate";
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
const GiftCatalog = lazy(() => import("./pages/admin/GiftCatalog"));

// Virtual Cinema Funnel
const BuyTicket = lazy(() => import("./pages/BuyTicket"));
const WatchMovie = lazy(() => import("./pages/WatchMovie"));
const LiveWatch = lazy(() => import("./pages/LiveWatch"));
const LiveGuestClaim = lazy(() => import("./pages/LiveGuestClaim"));
const PaymentReturn = lazy(() => import("./pages/PaymentReturn"));
const EventInviteAccept = lazy(() => import("./pages/EventInviteAccept"));
const InvitedEvent = lazy(() => import("./pages/InvitedEvent"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const SupportCenter = lazy(() => import("./pages/SupportCenter"));
const SupportAgentInbox = lazy(() => import("./pages/SupportAgentInbox"));
const SupportKnowledgebase = lazy(() => import("./pages/admin/SupportKnowledgebase"));

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
      <RuntimeConfigProvider>
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
              <Route path="/cinema" element={<FeatureGate featureKey="cinema.catalogue"><Cinema /></FeatureGate>} />
              <Route path="/cinema/:id" element={<FeatureGate featureKey="cinema.catalogue"><Navigate to="/cinema" replace /></FeatureGate>} />
              <Route path="/movie/:slug" element={<FeatureGate featureKey="cinema.catalogue"><MovieLanding /></FeatureGate>} />
              <Route path="/content/:id" element={<FeatureGate featureKey="cinema.catalogue"><ContentLanding /></FeatureGate>} />
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
              <Route path="/buy/:slug" element={<FeatureGate featureKey="cinema.ticketing"><BuyTicket /></FeatureGate>} />
              <Route path="/watch/:watchCode" element={<FeatureGate featureKey="cinema.replay"><WatchMovie /></FeatureGate>} />
              <Route path="/live/watch/:streamId" element={<FeatureGate featureKey="cinema.live_playback"><LiveWatch /></FeatureGate>} />
              <Route path="/live/claim" element={<FeatureGate featureKey="cinema.guest_claim"><LiveGuestClaim /></FeatureGate>} />
              <Route path="/payment/return" element={<PaymentReturn />} />
              <Route path="/event-invite/accept" element={<EventInviteAccept />} />
              <Route path="/invited/:screeningId" element={<ProtectedRoute><InvitedEvent /></ProtectedRoute>} />
              <Route path="/tickets" element={<FeatureGate featureKey="cinema.ticketing"><ProtectedRoute><Navigate to="/dashboard?tab=tickets" replace /></ProtectedRoute></FeatureGate>} />
              <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
              <Route path="/support" element={<ProtectedRoute><SupportCenter /></ProtectedRoute>} />
              <Route path="/support/agent" element={<ProtectedRoute><SupportAgentInbox /></ProtectedRoute>} />
              <Route path="/filmmaker" element={<Navigate to="/apply-filmmaker" replace />} />
              
              {/* ============ STUDIO (Protected - Approved Filmmakers Only) ============ */}
              <Route path="/studio" element={<ProtectedCreatorRoute><FeatureGate featureKey="creator.dashboard"><StudioDashboard /></FeatureGate></ProtectedCreatorRoute>} />
              <Route path="/studio/create" element={<ProtectedCreatorRoute><FeatureGate featureKey="creator.submissions"><StudioCreate /></FeatureGate></ProtectedCreatorRoute>} />
              <Route path="/studio/movies" element={<ProtectedCreatorRoute><FeatureGate featureKey="creator.catalogue"><StudioMovies /></FeatureGate></ProtectedCreatorRoute>} />
              <Route path="/studio/submit" element={<ProtectedCreatorRoute><FeatureGate featureKey="creator.submissions"><Navigate to="/studio/create" replace /></FeatureGate></ProtectedCreatorRoute>} />
              <Route path="/studio/screenings" element={<ProtectedCreatorRoute><FeatureGate featureKey="creator.screenings"><StudioScreenings /></FeatureGate></ProtectedCreatorRoute>} />
              <Route path="/studio/earnings" element={<ProtectedCreatorRoute><FeatureGate featureKey="creator.earnings"><StudioEarnings /></FeatureGate></ProtectedCreatorRoute>} />
              <Route path="/studio/analytics" element={<ProtectedCreatorRoute><FeatureGate featureKey="creator.analytics"><StudioAnalytics /></FeatureGate></ProtectedCreatorRoute>} />
              <Route path="/studio/analytics/:screeningId" element={<ProtectedCreatorRoute><FeatureGate featureKey="creator.analytics"><StudioAnalytics /></FeatureGate></ProtectedCreatorRoute>} />
              
              <Route path="/studio/live" element={<ProtectedCreatorRoute><FeatureGate featureKey="creator.live"><Navigate to="/studio/create?flow=live&type=live" replace /></FeatureGate></ProtectedCreatorRoute>} />
              <Route path="/studio/live/manage" element={<ProtectedCreatorRoute><FeatureGate featureKey="creator.live"><StudioLive /></FeatureGate></ProtectedCreatorRoute>} />
              <Route path="/studio/team" element={<ProtectedCreatorRoute><FeatureGate featureKey="creator.team"><StudioTeam /></FeatureGate></ProtectedCreatorRoute>} />
              <Route path="/studio/profile" element={<ProtectedCreatorRoute><FeatureGate featureKey="creator.profile"><StudioProfile /></FeatureGate></ProtectedCreatorRoute>} />
              <Route path="/studio/fan-blast" element={<ProtectedCreatorRoute><FeatureGate featureKey="creator.fan_blast"><StudioFanBlast /></FeatureGate></ProtectedCreatorRoute>} />
              {/* ============ ADMIN (Protected) ============ */}
              <Route path="/admin" element={<ProtectedAdminRoute><FeatureGate featureKey="admin.dashboard"><Dashboard /></FeatureGate></ProtectedAdminRoute>} />
              <Route path="/admin/users" element={<ProtectedAdminRoute><FeatureGate featureKey="admin.user_management"><Users /></FeatureGate></ProtectedAdminRoute>} />
              <Route path="/admin/screenings" element={<ProtectedAdminRoute><FeatureGate featureKey="admin.content_management"><Screenings /></FeatureGate></ProtectedAdminRoute>} />
              <Route path="/admin/tickets" element={<ProtectedAdminRoute><FeatureGate featureKey="admin.content_management"><TicketManagement /></FeatureGate></ProtectedAdminRoute>} />
              <Route path="/admin/promo-codes" element={<ProtectedAdminRoute><FeatureGate featureKey="admin.marketing"><PromoCodes /></FeatureGate></ProtectedAdminRoute>} />
              <Route path="/admin/sales" element={<ProtectedAdminRoute><FeatureGate featureKey="admin.finance"><ProducerDashboard /></FeatureGate></ProtectedAdminRoute>} />
              <Route path="/admin/payouts" element={<ProtectedAdminRoute><FeatureGate featureKey="admin.finance"><Payouts /></FeatureGate></ProtectedAdminRoute>} />
              <Route path="/admin/gifts" element={<ProtectedAdminRoute><FeatureGate featureKey="admin.finance"><GiftCatalog /></FeatureGate></ProtectedAdminRoute>} />
              <Route path="/admin/support/knowledgebase" element={<ProtectedAdminRoute><SupportKnowledgebase /></ProtectedAdminRoute>} />
              <Route path="/admin/godmode" element={<ProtectedAdminRoute><Godmode /></ProtectedAdminRoute>} />
              <Route path="/admin/filmmaker" element={<ProtectedAdminRoute><FeatureGate featureKey="admin.verification"><FilmmakerPortal /></FeatureGate></ProtectedAdminRoute>} />
              <Route path="/admin/filmmaker-applications" element={<ProtectedAdminRoute><FeatureGate featureKey="admin.verification"><FilmmakerApplications /></FeatureGate></ProtectedAdminRoute>} />
              <Route path="/admin/studio-applications" element={<ProtectedAdminRoute><FeatureGate featureKey="admin.verification"><StudioApplications /></FeatureGate></ProtectedAdminRoute>} />
              <Route path="/admin/settings/payment-gateways" element={<ProtectedAdminRoute><FeatureGate featureKey="admin.providers"><PaymentGatewaySettings /></FeatureGate></ProtectedAdminRoute>} />
              <Route path="/admin/settings/email" element={<ProtectedAdminRoute><FeatureGate featureKey="admin.providers"><EmailSettings /></FeatureGate></ProtectedAdminRoute>} />
              <Route path="/admin/settings/branding" element={<ProtectedAdminRoute><FeatureGate featureKey="admin.branding"><WhiteLabel /></FeatureGate></ProtectedAdminRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </TenantProvider>
      </BrandingProvider>
      </RuntimeConfigProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
