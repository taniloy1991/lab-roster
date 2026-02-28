import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

type ClBalanceRow = { staff_id: string | null; name: string | null; remaining_days: number | null };
type OffBalanceRow = { staff_id: string | null; name: string | null; off_balance: number | null };

type Row = { staffId: string; name: string; clRemaining: number; offBalance: number };

export default function PrintMonthlyReport() {
  const params = useParams();
  const month = (params.month ?? "").trim();

  const monthTitle = useMemo(() => {
    try {
      // expected: yyyy-MM
      return format(parseISO(`${month}-01`), "MMMM yyyy");
    } catch {
      return "Monthly Report";
    }
  }, [month]);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const [clRes, offRes] = await Promise.all([
        supabase.from("cl_balance_view").select("staff_id,name,remaining_days"),
        supabase.from("off_balance_view").select("staff_id,name,off_balance"),
      ]);

      if (!alive) return;

      if (clRes.error || offRes.error) {
        setError(clRes.error?.message ?? offRes.error?.message ?? "Failed to load");
        setRows([]);
        setLoading(false);
        return;
      }

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

      setRows(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    };

    void load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="monthly-print-page min-h-screen bg-background text-foreground">
      <main className="mx-auto min-h-screen max-w-[210mm] bg-card px-8 py-10 text-card-foreground">
        <header className="text-center">
          <div className="text-base font-semibold leading-tight">Department of Microbiology</div>
          <div className="text-base font-semibold leading-tight">BIRDEM General Hospital</div>

          <h1 className="mt-6 text-xl font-semibold tracking-tight">{monthTitle}</h1>
        </header>

        <section className="mt-8">
          {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-3 pr-4">Staff Name</th>
                  <th className="py-3 pr-4">CL Remaining</th>
                  <th className="py-3 pr-4">OFF Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading ? (
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
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-8 text-sm sm:grid-cols-2">
          <div>
            <div className="text-muted-foreground">Prepared By:</div>
            <div className="mt-3 border-b border-border" />
          </div>
          <div>
            <div className="text-muted-foreground">Approved By:</div>
            <div className="mt-3 border-b border-border" />
          </div>
        </section>
      </main>
    </div>
  );
}
