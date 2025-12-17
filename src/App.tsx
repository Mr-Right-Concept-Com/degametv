import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { TenantProvider } from "@/hooks/useTenant";

// Pages
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import Movies from "./pages/Movies";
import Series from "./pages/Series";
import ContentDetail from "./pages/ContentDetail";
import Live from "./pages/Live";
import LiveStream from "./pages/LiveStream";
import Cinema from "./pages/Cinema";
import CinemaEvent from "./pages/CinemaEvent";
import NotFound from "./pages/NotFound";

// Admin Pages
import Dashboard from "./pages/admin/Dashboard";
import Tenants from "./pages/admin/Tenants";
import Users from "./pages/admin/Users";
import Modules from "./pages/admin/Modules";
import ContentManagement from "./pages/admin/ott/ContentManagement";
import OTTAnalytics from "./pages/admin/ott/OTTAnalytics";
import StreamManagement from "./pages/admin/live/StreamManagement";
import ScreeningManagement from "./pages/admin/cinema/ScreeningManagement";
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
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/movies" element={<Movies />} />
              <Route path="/series" element={<Series />} />
              <Route path="/content/:id" element={<ContentDetail />} />
              <Route path="/live" element={<Live />} />
              <Route path="/live/:id" element={<LiveStream />} />
              <Route path="/cinema" element={<Cinema />} />
              <Route path="/cinema/:id" element={<CinemaEvent />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/tenants" element={<Tenants />} />
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/modules" element={<Modules />} />
              <Route path="/admin/content" element={<ContentManagement />} />
              <Route path="/admin/analytics" element={<OTTAnalytics />} />
              <Route path="/admin/streams" element={<StreamManagement />} />
              <Route path="/admin/screenings" element={<ScreeningManagement />} />
              <Route path="/admin/white-label" element={<WhiteLabel />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TenantProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
