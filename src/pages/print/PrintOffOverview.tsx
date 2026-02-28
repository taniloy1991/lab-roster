import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { PrintLayout } from "@/components/print/PrintLayout";
import { cn } from "@/lib/utils";

type EarnRow = { start_date: string; end_date: string; days_earned: number };
type UseRow = { start_date: string; end_date: string; days_deducted: number };

export default function PrintOffOverview() {
  const [params] = useSearchParams();
  const staffId = params.get("staffId") ?? "";

  const [staffName, setStaffName] = useState<string>("—");
  const [earned, setEarned] = useState<number>(0);
  const [used, setUsed] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [earnRows, setEarnRows] = useState<EarnRow[]>([]);
  const [useRows, setUseRows] = useState<UseRow[]>([]);

  const title = useMemo(() => `General OFF Overview`, []);

  useEffect(() => {
    const run = async () => {
      if (!staffId) return;

      const [staffRes, balRes, earnRes, useRes] = await Promise.all([
        supabase.from("staff").select("name").eq("id", staffId).maybeSingle(),
        supabase
          .from("general_off_balance_dynamic" as any)
          .select("total_earned,total_used,remaining_balance")
          .eq("staff_id", staffId)
          .maybeSingle(),
        supabase
          .from("general_off_earn" as any)
          .select("start_date,end_date,days_earned")
          .eq("staff_id", staffId)
          .order("start_date", { ascending: true }),
        supabase
          .from("general_off_deduct" as any)
          .select("start_date,end_date,days_deducted")
          .eq("staff_id", staffId)
          .order("start_date", { ascending: true }),
      ]);

      setStaffName((staffRes.data as any)?.name ?? "—");
      setEarned(Number((balRes.data as any)?.total_earned ?? 0));
      setUsed(Number((balRes.data as any)?.total_used ?? 0));
      setBalance(Number((balRes.data as any)?.remaining_balance ?? 0));
      setEarnRows(((earnRes.data ?? []) as unknown) as EarnRow[]);
      setUseRows(((useRes.data ?? []) as unknown) as UseRow[]);
    };

    void run();
  }, [staffId]);

  return (
    <PrintLayout className="print:pt-6">
      <header className="space-y-2 text-center">
        <div className="text-lg font-semibold">Department of Microbiology</div>
        <div className="text-base font-semibold">BIRDEM GENERAL HOSPITAL</div>
        <div className="pt-4 text-xl font-semibold">{title}</div>
      </header>

      <section className="mt-8 space-y-2 text-sm">
        <div>
          <span className="font-semibold">Staff Name:</span> {staffName}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="font-semibold">Total OFF Earned:</span> {earned}
          </div>
          <div>
            <span className="font-semibold">Total OFF Used:</span> {used}
          </div>
          <div>
            <span className="font-semibold">Remaining OFF Balance:</span> {balance}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-8 md:grid-cols-2">
        <div>
          <div className="mb-2 text-sm font-semibold">Earned</div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-4">Earned From</th>
                <th className="py-2 pr-4">Earned To</th>
                <th className="py-2 pr-4 text-right">Days</th>
              </tr>
            </thead>
            <tbody>
              {earnRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-muted-foreground">
                    No earned OFF.
                  </td>
                </tr>
              ) : (
                earnRows.map((r, idx) => (
                  <tr key={idx} className={cn("border-b last:border-b-0")}>
                    <td className="py-2 pr-4 tabular-nums">{r.start_date}</td>
                    <td className="py-2 pr-4 tabular-nums">{r.end_date}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{r.days_earned}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold">Used</div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-4">Used From</th>
                <th className="py-2 pr-4">Used To</th>
                <th className="py-2 pr-4 text-right">Days</th>
              </tr>
            </thead>
            <tbody>
              {useRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-muted-foreground">
                    No used OFF.
                  </td>
                </tr>
              ) : (
                useRows.map((r, idx) => (
                  <tr key={idx} className={cn("border-b last:border-b-0")}>
                    <td className="py-2 pr-4 tabular-nums">{r.start_date}</td>
                    <td className="py-2 pr-4 tabular-nums">{r.end_date}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{r.days_deducted}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mt-12 flex items-center justify-between">
        <div className="text-sm">Prepared By: ______________________</div>
      </footer>
    </PrintLayout>
  );
}
