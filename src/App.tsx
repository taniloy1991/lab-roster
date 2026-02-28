import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "@/providers/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RoleGate } from "@/components/auth/RoleGate";
import { RequireNoInstitutionMembership } from "@/components/auth/RequireNoInstitutionMembership";
import { AppShell } from "@/components/layout/AppShell";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

import AppHome from "./pages/app/AppHome";
import DashboardLanding from "./pages/app/DashboardLanding";
import SetupSuperAdmin from "./pages/app/SetupSuperAdmin";
import InstitutionDashboard from "./pages/app/InstitutionDashboard";
import LabDashboard from "./pages/app/LabDashboard";
import StaffDashboard from "./pages/app/StaffDashboard";
import StaffManagement from "./pages/app/StaffManagement";
import StaffLeaveStatementPrint from "./pages/app/StaffLeaveStatementPrint";
import HolidaysCalendar from "./pages/app/HolidaysCalendar";
import RosterCalendar from "./pages/app/RosterCalendar";
import RosterPrint from "./pages/app/RosterPrint";
import LeaveManagement from "./pages/app/LeaveManagement";
import ReportsMonthly from "./pages/app/ReportsMonthly";
import PrintMonthlyReport from "./pages/print/PrintMonthlyReport";
import PrintClOverview from "./pages/print/PrintClOverview";
import PrintOffOverview from "./pages/print/PrintOffOverview";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
            <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* Standalone print routes (NO AppShell) */}
                <Route
                  path="/print/monthly/:month"
                  element={
                    <RequireAuth>
                      <PrintMonthlyReport />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/print/roster"
                  element={
                    <RequireAuth>
                      <RosterPrint />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/print/cl-overview"
                  element={
                    <RequireAuth>
                      <PrintClOverview />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/print/off-overview"
                  element={
                    <RequireAuth>
                      <PrintOffOverview />
                    </RequireAuth>
                  }
                />

                <Route
                  path="/app"
                  element={
                    <RequireAuth>
                      <AppShell />
                    </RequireAuth>
                  }
                >
                  <Route index element={<AppHome />} />
                  <Route path="dashboard" element={<DashboardLanding />} />
                  <Route
                    path="setup"
                    element={
                      <RequireNoInstitutionMembership>
                        <SetupSuperAdmin />
                      </RequireNoInstitutionMembership>
                    }
                  />
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
                    path="staff/statement/print"
                    element={
                      <RoleGate requireAnyInstitutionRole={["lab_incharge"]}>
                        <StaffLeaveStatementPrint />
                      </RoleGate>
                    }
                  />
                  <Route path="holidays" element={<HolidaysCalendar />} />
                  <Route
                    path="leaves"
                    element={
                      <RoleGate requireAnyInstitutionRole={["lab_incharge"]}>
                        <LeaveManagement />
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
            </div>

            {/* Screen footer (every page) */}
            <footer className="app-screen-footer px-4 py-4 text-center text-xs text-muted-foreground">
              Designed and Developed by Tanvir Ahmed Niloy
            </footer>

            {/* Print/PDF footer (fixed to page bottom) */}
            <div className="app-print-footer text-center text-xs text-muted-foreground">
              Designed and Developed by Tanvir Ahmed Niloy
            </div>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
