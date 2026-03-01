import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { PrintLayout } from "@/components/print/PrintLayout";
import { cn } from "@/lib/utils";

type TxRow = {
  start_date: string;
  end_date: string;
  total_days: number;
  created_at: string;
};

export default function PrintClOverview() {
  const [params] = useSearchParams();
  const staffId = params.get("staffId") ?? "";
  const year = Number(params.get("year") ?? new Date().getFullYear());

  const [staffName, setStaffName] = useState<string>("—");
  const [remaining, setRemaining] = useState<number>(20);
  const [rows, setRows] = useState<TxRow[]>([]);

  const title = useMemo(() => `CL Overview (${year})`, [year]);

  useEffect(() => {
    const run = async () => {
      if (!staffId) return;

      const [staffRes, balRes, txRes] = await Promise.all([
        supabase.from("staff").select("name").eq("id", staffId).maybeSingle(),
        supabase
          .from("cl_balance_dynamic" as any)
          .select("remaining_days")
          .eq("staff_id", staffId)
          .eq("year", year)
          .maybeSingle(),
        supabase
          .from("cl_transactions" as any)
          .select("start_date,end_date,total_days,created_at")
          .eq("staff_id", staffId)
          .eq("year", year)
          .order("start_date", { ascending: true }),
      ]);

      setStaffName((staffRes.data as any)?.name ?? "—");
      setRemaining(Number((balRes.data as any)?.remaining_days ?? 20));
      setRows(((txRes.data ?? []) as unknown) as TxRow[]);
    };

    void run();
  }, [staffId, year]);

  return (
    <PrintLayout className="print:pt-6">
      <header className="space-y-2 text-center">
        <div className="text-lg font-semibold">Department of Microbiology</div>
        <div className="text-base font-semibold">BIRDEM GENERAL HOSPITAL</div>
        <div className="pt-4 text-xl font-semibold">{title}</div>
      </header>

      <section className="mt-8 space-y-2">
        <div className="text-sm">
          <span className="font-semibold">Staff Name:</span> {staffName}
        </div>
        <div className="text-sm">
          <span className="font-semibold">Total CL Balance Remaining:</span> {remaining} / 20
        </div>
      </section>

      <section className="mt-6">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4">From Date</th>
              <th className="py-2 pr-4">To Date</th>
              <th className="py-2 pr-4 text-right">Days Deducted</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-muted-foreground">
                  No CL deductions.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={idx} className={cn("border-b last:border-b-0")}
                >
                  <td className="py-2 pr-4 tabular-nums">{r.start_date}</td>
                  <td className="py-2 pr-4 tabular-nums">{r.end_date}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{r.total_days}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <footer className="mt-12 flex items-center justify-between">
        <div className="text-sm">Prepared By: Asif Hossain</div>
      </footer>
    </PrintLayout>
  );
}
