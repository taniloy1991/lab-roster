import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "@/providers/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RoleGate } from "@/components/auth/RoleGate";
import { AppShell } from "@/components/layout/AppShell";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

import AppHome from "./pages/app/AppHome";
import SetupSuperAdmin from "./pages/app/SetupSuperAdmin";
import InstitutionDashboard from "./pages/app/InstitutionDashboard";
import LabDashboard from "./pages/app/LabDashboard";
import StaffDashboard from "./pages/app/StaffDashboard";
import StaffManagement from "./pages/app/StaffManagement";
import HolidaysCalendar from "./pages/app/HolidaysCalendar";
import RosterCalendar from "./pages/app/RosterCalendar";
import ReportsMonthly from "./pages/app/ReportsMonthly";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route
              path="/app"
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<AppHome />} />
              <Route path="setup" element={<SetupSuperAdmin />} />
              <Route
                path="institution"
                element={
                  <RoleGate requireGlobalRole="super_admin">
                    <InstitutionDashboard />
                  </RoleGate>
                }
              />

              <Route
                path="lab"
                element={
                  <RoleGate requireAnyInstitutionRole={["lab_incharge"]}>
                    <LabDashboard />
                  </RoleGate>
                }
              />
              <Route
                path="me"
                element={
                  <RoleGate requireAnyInstitutionRole={["staff"]}>
                    <StaffDashboard />
                  </RoleGate>
                }
              />

              <Route
                path="staff"
                element={
                  <RoleGate requireAnyInstitutionRole={["lab_incharge"]}>
                    <StaffManagement />
                  </RoleGate>
                }
              />
              <Route
                path="holidays"
                element={
                  <RoleGate requireAnyInstitutionRole={["lab_incharge"]}>
                    <HolidaysCalendar />
                  </RoleGate>
                }
              />
              <Route
                path="roster"
                element={
                  <RoleGate requireAnyInstitutionRole={["lab_incharge", "staff"]}>
                    <RosterCalendar />
                  </RoleGate>
                }
              />
              <Route
                path="reports/monthly"
                element={
                  <RoleGate requireAnyInstitutionRole={["lab_incharge"]}>
                    <ReportsMonthly />
                  </RoleGate>
                }
              />

              <Route path="*" element={<Navigate to="/app" replace />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
