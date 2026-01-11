import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import DashboardLayout from "@/pages/DashboardLayout";
import { CitizenDashboard } from "@/components/CitizenDashboard";
import { AuthorityDashboard } from "@/components/AuthorityDashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      
      <Route path="/citizen">
        <DashboardLayout role="citizen">
          <CitizenDashboard />
        </DashboardLayout>
      </Route>

      <Route path="/authority">
        <DashboardLayout role="authority">
          <AuthorityDashboard />
        </DashboardLayout>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
