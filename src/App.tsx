import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Movies from "./pages/Movies";
import Series from "./pages/Series";
import ContentDetail from "./pages/ContentDetail";
import Live from "./pages/Live";
import LiveStream from "./pages/LiveStream";
import Cinema from "./pages/Cinema";
import CinemaEvent from "./pages/CinemaEvent";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/series" element={<Series />} />
            <Route path="/content/:id" element={<ContentDetail />} />
            <Route path="/live" element={<Live />} />
            <Route path="/live/:id" element={<LiveStream />} />
            <Route path="/cinema" element={<Cinema />} />
            <Route path="/cinema/:id" element={<CinemaEvent />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
