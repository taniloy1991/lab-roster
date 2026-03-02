import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { PrintLayout } from "@/components/print/PrintLayout";
import { InstitutionPdfHeader } from "@/components/print/InstitutionPdfHeader";
import { BirdemMicrobiologySignatures } from "@/components/print/BirdemMicrobiologySignatures";
import { Button } from "@/components/ui/button";

type ClTxRow = { start_date: string; end_date: string; total_days: number };
type OffEarnRow = { start_date: string; end_date: string; days_earned: number };
type OffUseRow = { start_date: string; end_date: string; days_deducted: number };

export default function PrintStaffYearDetails() {
  const { activeInstitutionId } = useAuth();
  const [params] = useSearchParams();

  const staffId = params.get("staffId") ?? "";
  const year = Number(params.get("year") ?? new Date().getFullYear());

  const [staffName, setStaffName] = useState<string>("—");
  const [clRemaining, setClRemaining] = useState<number>(0);
  const [clRows, setClRows] = useState<ClTxRow[]>([]);
  const [offEarnRows, setOffEarnRows] = useState<OffEarnRow[]>([]);
  const [offUseRows, setOffUseRows] = useState<OffUseRow[]>([]);
  const [offTotals, setOffTotals] = useState({ earned: 0, used: 0, balance: 0 });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const isValid = Boolean(staffId) && Number.isFinite(year) && year > 1900;
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const title = useMemo(() => `Staff Leave Details (${year})`, [year]);

  useEffect(() => {
    const run = async () => {
      if (!isValid) {
        setError("Missing or invalid staff/year in URL.");
        return;
      }
      if (!activeInstitutionId) {
        setError("No active institution found.");
        return;
      }

      setLoading(true);
      setError("");

      const [staffRes, clBalRes, clTxRes, offBalRes, offEarnRes, offUseRes] = await Promise.all([
        supabase
          .from("staff")
          .select("name")
          .eq("id", staffId)
          .eq("institution_id", activeInstitutionId)
          .maybeSingle(),
        supabase
          .from("cl_balance_dynamic" as any)
          .select("remaining_days")
          .eq("institution_id", activeInstitutionId)
          .eq("staff_id", staffId)
          .eq("year", year)
          .maybeSingle(),
        supabase
          .from("cl_transactions" as any)
          .select("start_date,end_date,total_days")
          .eq("institution_id", activeInstitutionId)
          .eq("staff_id", staffId)
          .eq("year", year)
          .order("start_date", { ascending: true }),
        supabase
          .from("general_off_balance_dynamic" as any)
          .select("total_earned,total_used,remaining_balance")
          .eq("institution_id", activeInstitutionId)
          .eq("staff_id", staffId)
          .maybeSingle(),
        supabase
          .from("general_off_earn" as any)
          .select("start_date,end_date,days_earned")
          .eq("institution_id", activeInstitutionId)
          .eq("staff_id", staffId)
          .lte("start_date", endDate)
          .gte("end_date", startDate)
          .order("start_date", { ascending: true }),
        supabase
          .from("general_off_deduct" as any)
          .select("start_date,end_date,days_deducted")
          .eq("institution_id", activeInstitutionId)
          .eq("staff_id", staffId)
          .lte("start_date", endDate)
          .gte("end_date", startDate)
          .order("start_date", { ascending: true }),
      ]);

      const anyError =
        staffRes.error || clBalRes.error || clTxRes.error || offBalRes.error || offEarnRes.error || offUseRes.error;

      if (anyError) {
        setError(anyError.message ?? "Failed to load print data.");
        setStaffName("—");
        setClRemaining(0);
        setClRows([]);
        setOffEarnRows([]);
        setOffUseRows([]);
        setOffTotals({ earned: 0, used: 0, balance: 0 });
        setLoading(false);
        return;
      }

      setStaffName((staffRes.data as any)?.name ?? "—");
      setClRemaining(Number((clBalRes.data as any)?.remaining_days ?? 0));
      setClRows((clTxRes.data ?? []) as unknown as ClTxRow[]);
      setOffEarnRows((offEarnRes.data ?? []) as unknown as OffEarnRow[]);
      setOffUseRows((offUseRes.data ?? []) as unknown as OffUseRow[]);
      setOffTotals({
        earned: Number((offBalRes.data as any)?.total_earned ?? 0),
        used: Number((offBalRes.data as any)?.total_used ?? 0),
        balance: Number((offBalRes.data as any)?.remaining_balance ?? 0),
      });
      setLoading(false);
    };

    void run();
  }, [activeInstitutionId, endDate, isValid, staffId, startDate, year]);

  return (
    <PrintLayout className="print:pt-6" footer={<BirdemMicrobiologySignatures />} footerClassName="print:break-inside-avoid">
      <header className="text-center">
        <InstitutionPdfHeader />
        <div className="pt-6 text-xl font-semibold">{title}</div>
      </header>

      <section className="mt-6 print:hidden">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            Print / Save as PDF
          </Button>
        </div>
      </section>

      {!isValid ? (
        <section className="mt-8 text-sm text-destructive">Missing required query params: staffId and year.</section>
      ) : null}

      {error ? <section className="mt-8 text-sm text-destructive">{error}</section> : null}

      {!error && isValid ? (
        <>
          <section className="mt-8 space-y-2 text-sm">
            <div>
              <span className="font-semibold">Staff Name:</span> {staffName}
            </div>
            <div>
              <span className="font-semibold">Year:</span> {year}
            </div>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold">Casual Leave (CL)</h2>
            <div className="text-sm text-muted-foreground">
              Remaining (year): <span className="text-foreground tabular-nums">{clRemaining}</span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4">From Date</th>
                  <th className="py-2 pr-4">To Date</th>
                  <th className="py-2 pr-4 text-right">Days Deducted</th>
                </tr>
              </thead>
              <tbody>
                {!loading && clRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-muted-foreground">
                      No CL deductions.
                    </td>
                  </tr>
                ) : null}
                {clRows.map((r, idx) => (
                  <tr key={idx} className="border-b last:border-b-0">
                    <td className="py-2 pr-4 tabular-nums">{r.start_date}</td>
                    <td className="py-2 pr-4 tabular-nums">{r.end_date}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{r.total_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-base font-semibold">General OFF</h2>
            <div className="grid gap-2 text-sm md:grid-cols-3">
              <div className="text-muted-foreground">
                Earned: <span className="text-foreground tabular-nums">{offTotals.earned}</span>
              </div>
              <div className="text-muted-foreground">
                Used: <span className="text-foreground tabular-nums">{offTotals.used}</span>
              </div>
              <div className="text-muted-foreground">
                Balance: <span className="text-foreground tabular-nums">{offTotals.balance}</span>
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold">Earned</div>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-4">From</th>
                    <th className="py-2 pr-4">To</th>
                    <th className="py-2 pr-4 text-right">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && offEarnRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-muted-foreground">
                        No earned OFF.
                      </td>
                    </tr>
                  ) : null}
                  {offEarnRows.map((r, idx) => (
                    <tr key={idx} className="border-b last:border-b-0">
                      <td className="py-2 pr-4 tabular-nums">{r.start_date}</td>
                      <td className="py-2 pr-4 tabular-nums">{r.end_date}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.days_earned}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold">Used</div>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-4">From</th>
                    <th className="py-2 pr-4">To</th>
                    <th className="py-2 pr-4 text-right">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && offUseRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-muted-foreground">
                        No used OFF.
                      </td>
                    </tr>
                  ) : null}
                  {offUseRows.map((r, idx) => (
                    <tr key={idx} className="border-b last:border-b-0">
                      <td className="py-2 pr-4 tabular-nums">{r.start_date}</td>
                      <td className="py-2 pr-4 tabular-nums">{r.end_date}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.days_deducted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </PrintLayout>
  );
}
