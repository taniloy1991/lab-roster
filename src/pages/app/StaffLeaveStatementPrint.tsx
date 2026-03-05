import React, { useEffect, useMemo, useState } from "react";
import { addYears, differenceInCalendarDays, format, intervalToDuration, isValid, parse } from "date-fns";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { PrintLayout } from "@/components/print/PrintLayout";
import { InstitutionPdfHeader } from "@/components/print/InstitutionPdfHeader";
import { BirdemMicrobiologySignatures } from "@/components/print/BirdemMicrobiologySignatures";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StaffRow = { name: string | null; dob: string | null; joining_date: string | null };

function parseIsoDate(isoDate: string | null) {
  if (!isoDate) return undefined;
  const parsed = parse(isoDate, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : undefined;
}

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

  const serviceInfo = useMemo(() => {
    const joining = parseIsoDate(staff?.joining_date ?? null);
    const now = new Date();
    if (!joining || joining > now) return null;

    const totalDays = differenceInCalendarDays(now, joining) + 1;
    const duration = intervalToDuration({ start: joining, end: now });

    return {
      totalDays,
      years: duration.years ?? 0,
      months: duration.months ?? 0,
      days: duration.days ?? 0,
      fullYears: duration.years ?? 0,
    };
  }, [staff?.joining_date]);

  const prlDate = useMemo(() => {
    const dob = parseIsoDate(staff?.dob ?? null);
    return dob ? addYears(dob, 59) : null;
  }, [staff?.dob]);

  const elBalance = useMemo(() => {
    const fullYears = serviceInfo?.fullYears ?? 0;
    const earned = fullYears * 33;
    const recreationDeduction = Math.floor(fullYears / 3) * 15;
    return Math.max(0, earned - recreationDeduction);
  }, [serviceInfo]);

  if (authLoading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!canView) return <Navigate to="/app" replace />;
  if (!staffId) return <Navigate to="/app/staff" replace />;

  return (
    <PrintLayout
      pageClassName="staff-statement-page"
      className="bg-card"
      footer={<BirdemMicrobiologySignatures />}
      footerClassName="print:break-inside-avoid"
    >
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
            <CardTitle className="text-lg">{staff?.name ?? "—"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-3">
              <div className="rounded-md border border-input bg-background p-3">
                <div className="text-xs text-muted-foreground">Total service</div>
                <div className="text-xl font-semibold tabular-nums">
                  {serviceInfo ? `${serviceInfo.totalDays} days (${serviceInfo.years}y ${serviceInfo.months}m ${serviceInfo.days}d)` : "—"}
                </div>
              </div>
              <div className="rounded-md border border-input bg-background p-3">
                <div className="text-xs text-muted-foreground">PRL Date</div>
                <div className="text-xl font-semibold tabular-nums">{prlDate ? format(prlDate, "dd/MM/yyyy") : "—"}</div>
              </div>
              <div className="rounded-md border border-input bg-background p-3">
                <div className="text-xs text-muted-foreground">Total EL balance</div>
                <div className="text-xl font-semibold tabular-nums">{elBalance}</div>
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
