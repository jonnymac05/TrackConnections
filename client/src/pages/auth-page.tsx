import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();

  // Check if there's a mode parameter in the URL or hash and redirect accordingly
  useEffect(() => {
    // Check for URL parameter
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    
    // Check for URL hash
    const hash = window.location.hash.substring(1);
    
    if (mode === 'register' || hash === 'register') {
      navigate("/register");
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // Redirect to home if already logged in
  useEffect(() => {
    if (user) {
      navigate("/home");
    }
  }, [user, navigate]);
  
  return (
    <>
      <Helmet>
        <title>Redirecting | Track Connections</title>
      </Helmet>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    </>
  );
}