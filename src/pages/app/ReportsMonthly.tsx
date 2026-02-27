import React, { useEffect, useMemo, useState } from "react";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { AppPrintHeader } from "@/components/print/AppPrintHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ClBalanceRow = { staff_id: string | null; name: string | null; remaining_days: number | null };
type OffBalanceRow = { staff_id: string | null; name: string | null; off_balance: number | null };

type Row = { staffId: string; name: string; clRemaining: number; offBalance: number };

export default function ReportsMonthly() {
  const { activeInstitutionId } = useAuth();
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [institutionName, setInstitutionName] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => {
    const start = startOfMonth(parseISO(`${month}-01`));
    const end = endOfMonth(start);
    return { start, end };
  }, [month]);

  const load = async () => {
    if (!activeInstitutionId) return;
    setLoading(true);

    const inst = await supabase.from("institutions").select("name").eq("id", activeInstitutionId).maybeSingle();
    setInstitutionName(inst.data?.name ?? "");

    // Use existing views only (requested): cl_balance_view + off_balance_view
    const [clRes, offRes] = await Promise.all([
      supabase.from("cl_balance_view").select("staff_id,name,remaining_days"),
      supabase.from("off_balance_view").select("staff_id,name,off_balance"),
    ]);

    const cl = (clRes.data ?? []) as ClBalanceRow[];
    const off = (offRes.data ?? []) as OffBalanceRow[];

    const map = new Map<string, Row>();

    for (const r of cl) {
      if (!r.staff_id) continue;
      map.set(r.staff_id, {
        staffId: r.staff_id,
        name: r.name ?? "—",
        clRemaining: Number(r.remaining_days ?? 0),
        offBalance: 0,
      });
    }

    for (const r of off) {
      if (!r.staff_id) continue;
      const cur = map.get(r.staff_id) ?? {
        staffId: r.staff_id,
        name: r.name ?? "—",
        clRemaining: 0,
        offBalance: 0,
      };
      cur.offBalance = Number(r.off_balance ?? 0);
      if (r.name && cur.name === "—") cur.name = r.name;
      map.set(r.staff_id, cur);
    }

    // Sort by name for readability.
    setRows(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInstitutionId, month]);

  return (
    <>
      <div className="pdf-header hidden print:block mb-6">
        <AppPrintHeader />
      </div>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between print:hidden">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Monthly Leave & OFF Balance Overview</h2>
            <p className="text-sm text-muted-foreground">Print-optimized. Save as PDF from the print dialog.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[190px]" />
            <Button onClick={() => window.print()} variant="outline">
              Print / PDF
            </Button>
            <Button onClick={load} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </Button>
          </div>
        </header>

        <Card className="print:shadow-none">
          <CardHeader className="print:pb-2">
            <CardTitle className="text-lg">
              <span className="print:hidden">{institutionName || "Institution"} — </span>
              {format(parseISO(`${month}-01`), "MMMM yyyy")}
            </CardTitle>
            <p className="text-xs text-muted-foreground print:hidden">
              Source: cl_balance_view + off_balance_view
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-3 pr-4">Staff</th>
                  <th className="py-3 pr-4">CL Remaining</th>
                  <th className="py-3 pr-4">OFF Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-10 text-center text-muted-foreground">
                      No data.
                    </td>
                  </tr>
                ) : null}
                {rows.map((r) => (
                  <tr key={r.staffId} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 font-medium">{r.name}</td>
                    <td className="py-3 pr-4 tabular-nums">{r.clRemaining}</td>
                    <td className="py-3 pr-4 tabular-nums">{r.offBalance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
