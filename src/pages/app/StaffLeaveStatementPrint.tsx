import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { InstitutionPdfHeader } from "@/components/print/InstitutionPdfHeader";
import { BirdemMicrobiologySignatures } from "@/components/print/BirdemMicrobiologySignatures";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LeaveHistoryRow = { date: string | null; type: string | null };

type ClBalanceRow = { remaining_days: number | null };

type OffBalanceRow = { off_balance: number | null };

type StaffRow = { name: string | null };

export default function StaffLeaveStatementPrint() {
  const { loading: authLoading, session, institutionRoles, globalRoles } = useAuth();
  const canView = globalRoles.includes("super_admin") || institutionRoles.includes("lab_incharge");

  const nav = useNavigate();
  const [params] = useSearchParams();
  const staffId = (params.get("staffId") ?? "").trim();

  const [loading, setLoading] = useState(false);
  const [staffName, setStaffName] = useState<string>("");
  const [clRemaining, setClRemaining] = useState<number>(0);
  const [offBalance, setOffBalance] = useState<number>(0);
  const [history, setHistory] = useState<LeaveHistoryRow[]>([]);

  const load = async () => {
    if (!staffId) return;
    setLoading(true);

    const [staffRes, clRes, offRes, histRes] = await Promise.all([
      supabase.from("staff").select("name").eq("id", staffId).maybeSingle(),
      supabase.from("cl_balance_view").select("remaining_days").eq("staff_id", staffId).maybeSingle(),
      supabase.from("off_balance_view").select("off_balance").eq("staff_id", staffId).maybeSingle(),
      supabase.from("staff_leave_history").select("date,type").eq("staff_id", staffId).order("date", { ascending: true }),
    ]);

    setStaffName(((staffRes.data as StaffRow | null)?.name ?? "") || "—");
    setClRemaining(Number(((clRes.data as ClBalanceRow | null)?.remaining_days ?? 0) || 0));
    setOffBalance(Number(((offRes.data as OffBalanceRow | null)?.off_balance ?? 0) || 0));
    setHistory((histRes.data ?? []) as LeaveHistoryRow[]);

    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  const title = useMemo(() => "BIRDEM Microbiology Laboratory", []);

  if (authLoading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!canView) return <Navigate to="/app" replace />;
  if (!staffId) return <Navigate to="/app/staff" replace />;

  return (
    <>
      <div className="pdf-header hidden print:block mb-6">
        <InstitutionPdfHeader />
        <div className="mx-auto max-w-5xl px-4 mt-2 text-center">
          <div className="text-sm font-semibold text-foreground">{title}</div>
        </div>
      </div>

      <div className="space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between print:hidden">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Staff Leave Statement</h2>
            <p className="text-sm text-muted-foreground">Print-optimized.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => nav("/app/staff")}>Back</Button>
            <Button variant="outline" onClick={() => window.print()}>Print / Save as PDF</Button>
            <Button onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</Button>
          </div>
        </header>

        <Card className="print:shadow-none">
          <CardHeader className="print:pb-2">
            <CardTitle className="text-lg">{staffName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-md border border-input bg-background p-3">
                <div className="text-xs text-muted-foreground">CL remaining</div>
                <div className="text-xl font-semibold tabular-nums">{clRemaining}</div>
              </div>
              <div className="rounded-md border border-input bg-background p-3">
                <div className="text-xs text-muted-foreground">OFF balance</div>
                <div className="text-xl font-semibold tabular-nums">{offBalance}</div>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Type</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-10 text-center text-muted-foreground">No leave history.</td>
                  </tr>
                ) : null}
                {history.map((r, idx) => (
                  <tr key={`${r.date}-${idx}`} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 tabular-nums">{r.date ?? "—"}</td>
                    <td className="py-3 pr-4">{r.type ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <BirdemMicrobiologySignatures className="mt-10" />
      </div>
    </>
  );
}
