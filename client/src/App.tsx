import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import LandingPage from "@/pages/landing-page";
import ContactListPage from "@/pages/contact-list-page";
import ContactDetailPage from "@/pages/contact-detail-page";
import SettingsPage from "@/pages/settings-page";
import { Helmet } from "react-helmet";
import { AuthProvider } from "./hooks/use-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <ProtectedRoute path="/home" component={HomePage} />
      <ProtectedRoute path="/contacts" component={ContactListPage} />
      <ProtectedRoute path="/contacts/:id" component={ContactDetailPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Helmet>
            <title>Track Connections</title>
            <meta name="description" content="Log and organize interactions with people you meet at conferences" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
            <meta name="theme-color" content="#3B82F6" />
            <meta property="og:title" content="Track Connections" />
            <meta property="og:description" content="Log and organize interactions with people you meet at conferences" />
            <meta property="og:type" content="website" />
          </Helmet>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
