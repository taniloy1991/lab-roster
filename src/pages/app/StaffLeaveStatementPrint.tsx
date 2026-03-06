import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { PrintLayout } from "@/components/print/PrintLayout";
import { InstitutionPdfHeader } from "@/components/print/InstitutionPdfHeader";
import { BirdemMicrobiologySignatures } from "@/components/print/BirdemMicrobiologySignatures";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateStaffStatementMetrics } from "@/pages/app/staffStatementMetrics";

type StaffRow = { name: string | null; dob: string | null; joining_date: string | null };

export default function StaffLeaveStatementPrint() {
  const { loading: authLoading, session, institutionRoles, globalRoles } = useAuth();
  const canView = globalRoles.includes("super_admin") || institutionRoles.includes("lab_incharge");

  const nav = useNavigate();
  const [params] = useSearchParams();
  const staffId = (params.get("staffId") ?? "").trim();

  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<StaffRow | null>(null);

  const load = async () => {
    if (!staffId) return;
    setLoading(true);

    const staffRes = await supabase.from("staff").select("name,dob,joining_date").eq("id", staffId).maybeSingle();
    setStaff((staffRes.data as StaffRow | null) ?? null);

    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  const title = useMemo(() => "BIRDEM Microbiology Laboratory", []);

  const statementMetrics = useMemo(
    () =>
      calculateStaffStatementMetrics({
        dob: staff?.dob ?? null,
        joiningDate: staff?.joining_date ?? null,
      }),
    [staff?.dob, staff?.joining_date],
  );

  if (authLoading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!canView) return <Navigate to="/app" replace />;
  if (!staffId) return <Navigate to="/app/staff" replace />;

  return (
    <PrintLayout
      pageClassName="staff-statement-page"
      className="bg-card print:py-6"
      footer={<BirdemMicrobiologySignatures />}
      footerClassName="print:break-inside-avoid"
      compact
    >
      <div className="pdf-header hidden print:block mb-6">
        <InstitutionPdfHeader />
        <div className="mx-auto max-w-5xl px-4 mt-2 text-center">
          <div className="text-sm font-semibold text-foreground">{title}</div>
        </div>
      </div>

      <div className="space-y-5">
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
            <CardTitle className="text-lg">{staff?.name ?? "—"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-md border border-input bg-background p-3">
                <div className="text-xs text-muted-foreground">Total service</div>
                <div className="text-xl font-semibold tabular-nums">
                  {statementMetrics.serviceInfo
                    ? `${statementMetrics.serviceInfo.totalDays} days (${statementMetrics.serviceInfo.years}y ${statementMetrics.serviceInfo.months}m ${statementMetrics.serviceInfo.days}d)`
                    : "—"}
                </div>
              </div>
              <div className="rounded-md border border-input bg-background p-3">
                <div className="text-xs text-muted-foreground">PRL Date</div>
                <div className="text-xl font-semibold tabular-nums">{statementMetrics.prlDate ? format(statementMetrics.prlDate, "dd/MM/yyyy") : "—"}</div>
              </div>
              <div className="rounded-md border border-input bg-background p-3">
                <div className="text-xs text-muted-foreground">Total EL balance</div>
                <div className="text-xl font-semibold tabular-nums">{statementMetrics.elBalance}</div>
              </div>
              <div className="rounded-md border border-input bg-background p-3">
                <div className="text-xs text-muted-foreground">Remaining service</div>
                <div className="text-xl font-semibold tabular-nums">
                  {statementMetrics.remainingService
                    ? statementMetrics.remainingService.isRetired
                      ? "PRL completed"
                      : `${statementMetrics.remainingService.totalDays} days (${statementMetrics.remainingService.years}y ${statementMetrics.remainingService.months}m ${statementMetrics.remainingService.days}d)`
                    : "—"}
                </div>
              </div>
              <div className="rounded-md border border-input bg-background p-3 sm:col-span-2 lg:col-span-2">
                <div className="text-xs text-muted-foreground">Recreation leave received</div>
                <div className="text-xl font-semibold tabular-nums">
                  {statementMetrics.recreationLeaveCycles} times ({statementMetrics.recreationLeaveDays} days)
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              EL formula: (full service years × 33) − (every completed 3 years × 15).
            </p>
          </CardContent>
        </Card>
      </div>
    </PrintLayout>
  );
}
