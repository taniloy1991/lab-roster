import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { useParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { PrintLayout } from "@/components/print/PrintLayout";
import { InstitutionPdfHeader } from "@/components/print/InstitutionPdfHeader";

type ClBalanceRow = { staff_id: string | null; name: string | null; remaining_days: number | null };
type OffBalanceRow = { staff_id: string | null; name: string | null; off_balance: number | null };

type Row = { staffId: string; name: string; clRemaining: number; offBalance: number };

export default function PrintMonthlyReport() {
  const { activeInstitutionId, session } = useAuth();

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
      if (!session || !activeInstitutionId) {
        setError("Not authorized.");
        setRows([]);
        return;
      }

      setLoading(true);
      setError(null);

      // Institution-scoped: start from staff list, then pull balances from views by staff_id.
      const staffRes = await supabase
        .from("staff")
        .select("id,name")
        .eq("institution_id", activeInstitutionId)
        .eq("is_active", true)
        .order("name");

      const staffIds = (staffRes.data ?? []).map((s: any) => String(s.id));

      const [clRes, offRes] = await Promise.all([
        staffIds.length
          ? supabase.from("cl_balance_view").select("staff_id,name,remaining_days").in("staff_id", staffIds)
          : Promise.resolve({ data: [], error: null } as any),
        staffIds.length
          ? supabase.from("off_balance_view").select("staff_id,name,off_balance").in("staff_id", staffIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (!alive) return;

      if (staffRes.error || clRes.error || offRes.error) {
        setError(staffRes.error?.message ?? clRes.error?.message ?? offRes.error?.message ?? "Failed to load");
        setRows([]);
        setLoading(false);
        return;
      }

      const cl = (clRes.data ?? []) as ClBalanceRow[];
      const off = (offRes.data ?? []) as OffBalanceRow[];

      const map = new Map<string, Row>();

      for (const s of staffRes.data ?? []) {
        map.set(String((s as any).id), {
          staffId: String((s as any).id),
          name: (s as any).name ?? "—",
          clRemaining: 0,
          offBalance: 0,
        });
      }

      for (const r of cl) {
        if (!r.staff_id) continue;
        const cur = map.get(r.staff_id);
        if (!cur) continue;
        cur.clRemaining = Number(r.remaining_days ?? 0);
      }

      for (const r of off) {
        if (!r.staff_id) continue;
        const cur = map.get(r.staff_id);
        if (!cur) continue;
        cur.offBalance = Number(r.off_balance ?? 0);
      }

      setRows(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    };

    void load();
    return () => {
      alive = false;
    };
  }, [activeInstitutionId, session]);

  return (
    <PrintLayout pageClassName="monthly-print-page" className="bg-card">
      <header className="text-center">
        <InstitutionPdfHeader />

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
    </PrintLayout>
  );
}
