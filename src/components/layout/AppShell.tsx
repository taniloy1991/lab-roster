import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, ClipboardList, Home, LogOut, Printer, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";

type NavItem = { to: string; label: string; icon: React.ReactNode; when?: "lab" | "staff" | "any" };

type InstitutionOption = { id: string; name: string };

export function AppShell() {
  const { signOut, refresh, userId, institutionRoles, globalRoles, activeInstitutionId } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = globalRoles.includes("super_admin");
  const isLab = institutionRoles.includes("lab_incharge");
  const isStaff = institutionRoles.includes("staff");

  const { data: myInstitutions } = useQuery({
    queryKey: ["institutions", isSuperAdmin ? "all" : "assigned", userId],
    enabled: isSuperAdmin,
    queryFn: async () => {
      // super_admin should be able to pick ANY institution (not only ones with explicit membership rows)
      const res = await supabase.from("institutions").select("id,name").order("name");
      return (res.data ?? []) as InstitutionOption[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: institutionName } = useQuery({
    queryKey: ["institutions", "name", activeInstitutionId],
    enabled: !!activeInstitutionId,
    queryFn: async () => {
      if (!activeInstitutionId) return null;
      const res = await supabase.from("institutions").select("name").eq("id", activeInstitutionId).maybeSingle();
      return res.data?.name ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });


  const items: NavItem[] = useMemo(
    () => [
      { to: "/app", label: "Overview", icon: <Home className="h-4 w-4" />, when: "any" },
      { to: "/app/staff", label: "Staff", icon: <Users className="h-4 w-4" />, when: "lab" },
      { to: "/app/holidays", label: "Holidays", icon: <CalendarDays className="h-4 w-4" />, when: "lab" },
      { to: "/app/roster", label: "Roster", icon: <ClipboardList className="h-4 w-4" />, when: "any" },
      { to: "/app/reports/monthly", label: "Monthly Report", icon: <Printer className="h-4 w-4" />, when: "lab" },
    ],
    [],
  );

  const visibleItems = items.filter((it) => {
    // super_admin must always see all features in navigation
    if (isSuperAdmin) return true;

    if (it.when === "any") return true;
    if (it.when === "lab") return isLab;
    if (it.when === "staff") return isStaff;
    return true;
  });

  // Signature moment: subtle spotlight background following pointer
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [spot, setSpot] = useState({ x: 50, y: 20 });

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setSpot({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
    };

    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div
      ref={rootRef}
      className="min-h-screen bg-background"
      style={{
        // Uses semantic tokens via CSS variables
        backgroundImage: `radial-gradient(900px circle at ${spot.x}% ${spot.y}%, hsl(var(--spotlight) / 0.12), transparent 55%), radial-gradient(700px circle at 85% 10%, hsl(var(--accent) / 0.10), transparent 45%)`,
      }}
    >
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-6 p-4 md:grid-cols-[280px_1fr] md:p-6">
        <aside className="md:sticky md:top-6 md:h-[calc(100vh-3rem)]">
          <Card className="h-full overflow-hidden">
            <div className="flex h-full flex-col">
              <div className="border-b p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Laboratory Roster Management</p>
                    {institutionName ? (
                      <p className="mt-1 truncate text-xs font-medium text-foreground/80">{institutionName}</p>
                    ) : null}
                    <h1 className="text-base font-semibold tracking-tight">Dashboard</h1>

                    {isSuperAdmin && (myInstitutions?.length ?? 0) > 0 ? (
                      <div className="mt-3">
                        <p className="mb-1 text-[11px] font-medium text-muted-foreground">Institution</p>
                        <select
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          value={activeInstitutionId ?? ""}
                          onChange={async (e) => {
                            if (!userId) return;
                            const nextId = e.target.value;
                            if (!nextId) return;
                            await supabase
                              .from("profiles")
                              .update({ active_institution_id: nextId })
                              .eq("user_id", userId);
                            await refresh();
                            navigate("/app", { replace: true });
                          }}
                        >
                          <option value="" disabled>
                            Select institution
                          </option>
                          {myInstitutions?.map((inst) => (
                            <option key={inst.id} value={inst.id}>
                              {inst.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                  {isSuperAdmin && (
                    <span className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">Super Admin</span>
                  )}
                </div>
              </div>

              <nav className="flex flex-1 flex-col gap-1 p-3">
                {visibleItems.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground",
                      )
                    }
                    end={it.to === "/app"}
                  >
                    {it.icon}
                    {it.label}
                  </NavLink>
                ))}
              </nav>

              <div className="border-t p-3">
                <div className="mb-2 text-[11px] text-muted-foreground">
                  Designed and Developed By: Tanvir Ahmed Niloy
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={async () => {
                    await signOut();
                    navigate("/login");
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </Card>
        </aside>

        <main className="min-w-0">
          <div className="mb-3 flex items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => navigate("/app")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Overview
            </Button>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

