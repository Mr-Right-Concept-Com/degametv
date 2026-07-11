import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { usePageTitle } from '@/hooks/usePageTitle';

const NotFound = () => {
  const location = useLocation();
  usePageTitle('Page Not Found');

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-foreground/80">Oops! Page not found</p>
        <a href="/" className="text-primary underline underline-offset-2 hover:no-underline">
          Return to Home
        </a>
      </div>
    </main>
  );
};

export default NotFound;
