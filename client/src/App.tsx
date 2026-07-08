import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import AuthPage from "@/pages/auth-page";
import DashboardLayout from "@/pages/DashboardLayout";
import { CitizenDashboard } from "@/components/CitizenDashboard";
import { AuthorityDashboard } from "@/components/AuthorityDashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      
      <Route path="/citizen" component={() => (
        <DashboardLayout role="citizen">
          <CitizenDashboard />
        </DashboardLayout>
      )} />

      <ProtectedRoute path="/authority" component={() => (
        <DashboardLayout role="authority">
          <AuthorityDashboard />
        </DashboardLayout>
      )} requiredRole="authority" />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
