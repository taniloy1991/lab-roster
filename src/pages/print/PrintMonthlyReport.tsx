import React, { useEffect, useMemo, useState } from "react";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { useParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { PrintLayout } from "@/components/print/PrintLayout";
import { InstitutionPdfHeader } from "@/components/print/InstitutionPdfHeader";
import { BirdemMicrobiologySignatures } from "@/components/print/BirdemMicrobiologySignatures";

type ClBalanceRow = { staff_id: string | null; name: string | null; remaining_days: number | null };
type OffBalanceRow = { staff_id: string | null; name: string | null; off_balance: number | null };

type ClTx = { staff_id: string; start_date: string; end_date: string; total_days: number };
type OffEarnTx = { staff_id: string; start_date: string; end_date: string; days_earned: number };
type OffUseTx = { staff_id: string; start_date: string; end_date: string; days_deducted: number };

type Row = {
  staffId: string;
  name: string;
  clRemaining: number;
  offBalance: number;
  clTxMonth: ClTx[];
  offEarnMonth: OffEarnTx[];
  offUseMonth: OffUseTx[];
};

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

  const range = useMemo(() => {
    try {
      const start = startOfMonth(parseISO(`${month}-01`));
      const end = endOfMonth(start);
      return { start, end };
    } catch {
      const start = startOfMonth(new Date());
      const end = endOfMonth(start);
      return { start, end };
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

      const startStr = format(range.start, "yyyy-MM-dd");
      const endStr = format(range.end, "yyyy-MM-dd");

      // Institution-scoped: start from staff list, then pull balances/transactions by staff_id.
      const staffRes = await supabase
        .from("staff")
        .select("id,name")
        .eq("institution_id", activeInstitutionId)
        .eq("is_active", true)
        .order("name");

      const staffIds = (staffRes.data ?? []).map((s: any) => String(s.id));

      const [clRes, offRes, clTxRes, offEarnRes, offUseRes] = await Promise.all([
        staffIds.length
          ? supabase.from("cl_balance_view").select("staff_id,name,remaining_days").in("staff_id", staffIds)
          : Promise.resolve({ data: [], error: null } as any),
        staffIds.length
          ? supabase.from("off_balance_view").select("staff_id,name,off_balance").in("staff_id", staffIds)
          : Promise.resolve({ data: [], error: null } as any),
        staffIds.length
          ? supabase
              .from("cl_transactions" as any)
              .select("staff_id,start_date,end_date,total_days")
              .eq("institution_id", activeInstitutionId)
              .in("staff_id", staffIds)
              // overlap filter: start_date <= monthEnd AND end_date >= monthStart
              .lte("start_date", endStr)
              .gte("end_date", startStr)
              .order("start_date", { ascending: true })
          : Promise.resolve({ data: [], error: null } as any),
        staffIds.length
          ? supabase
              .from("general_off_earn" as any)
              .select("staff_id,start_date,end_date,days_earned")
              .eq("institution_id", activeInstitutionId)
              .in("staff_id", staffIds)
              .lte("start_date", endStr)
              .gte("end_date", startStr)
              .order("start_date", { ascending: true })
          : Promise.resolve({ data: [], error: null } as any),
        staffIds.length
          ? supabase
              .from("general_off_deduct" as any)
              .select("staff_id,start_date,end_date,days_deducted")
              .eq("institution_id", activeInstitutionId)
              .in("staff_id", staffIds)
              .lte("start_date", endStr)
              .gte("end_date", startStr)
              .order("start_date", { ascending: true })
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (!alive) return;

      if (staffRes.error || clRes.error || offRes.error || clTxRes.error || offEarnRes.error || offUseRes.error) {
        setError(
          staffRes.error?.message ??
            clRes.error?.message ??
            offRes.error?.message ??
            clTxRes.error?.message ??
            offEarnRes.error?.message ??
            offUseRes.error?.message ??
            "Failed to load",
        );
        setRows([]);
        setLoading(false);
        return;
      }

      const cl = (clRes.data ?? []) as ClBalanceRow[];
      const off = (offRes.data ?? []) as OffBalanceRow[];
      const clTx = (clTxRes.data ?? []) as any[];
      const offEarn = (offEarnRes.data ?? []) as any[];
      const offUse = (offUseRes.data ?? []) as any[];

      const map = new Map<string, Row>();

      for (const s of staffRes.data ?? []) {
        map.set(String((s as any).id), {
          staffId: String((s as any).id),
          name: (s as any).name ?? "—",
          clRemaining: 0,
          offBalance: 0,
          clTxMonth: [],
          offEarnMonth: [],
          offUseMonth: [],
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

      for (const t of clTx) {
        const sid = String(t.staff_id ?? "");
        const cur = map.get(sid);
        if (!cur) continue;
        cur.clTxMonth.push({
          staff_id: sid,
          start_date: String(t.start_date),
          end_date: String(t.end_date),
          total_days: Number(t.total_days ?? 0),
        });
      }

      for (const t of offEarn) {
        const sid = String(t.staff_id ?? "");
        const cur = map.get(sid);
        if (!cur) continue;
        cur.offEarnMonth.push({
          staff_id: sid,
          start_date: String(t.start_date),
          end_date: String(t.end_date),
          days_earned: Number(t.days_earned ?? 0),
        });
      }

      for (const t of offUse) {
        const sid = String(t.staff_id ?? "");
        const cur = map.get(sid);
        if (!cur) continue;
        cur.offUseMonth.push({
          staff_id: sid,
          start_date: String(t.start_date),
          end_date: String(t.end_date),
          days_deducted: Number(t.days_deducted ?? 0),
        });
      }

      setRows(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    };

    void load();
    return () => {
      alive = false;
    };
  }, [activeInstitutionId, session, month, range.start, range.end]);

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

      <section className="mt-10 space-y-8">
        {rows.map((r, idx) => (
          <section
            key={r.staffId}
            className={
              "rounded-md border border-border p-4 " + (idx === 0 ? "" : "print:[break-before:page]")
            }
          >
            <header className="flex items-baseline justify-between gap-3">
              <div className="text-base font-semibold">{r.name}</div>
              <div className="text-xs text-muted-foreground">Month details</div>
            </header>

            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <div className="text-sm font-semibold">CL (this month)</div>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[360px] text-xs">
                    <thead className="text-left text-muted-foreground">
                      <tr className="border-b">
                        <th className="py-2 pr-3">From</th>
                        <th className="py-2 pr-3">To</th>
                        <th className="py-2 pr-3 text-right">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.clTxMonth.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-3 text-muted-foreground">
                            No CL entries.
                          </td>
                        </tr>
                      ) : (
                        r.clTxMonth.map((t, i) => (
                          <tr key={i} className="border-b last:border-b-0">
                            <td className="py-2 pr-3 tabular-nums">{t.start_date}</td>
                            <td className="py-2 pr-3 tabular-nums">{t.end_date}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{t.total_days}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold">General OFF Earned (this month)</div>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[360px] text-xs">
                    <thead className="text-left text-muted-foreground">
                      <tr className="border-b">
                        <th className="py-2 pr-3">From</th>
                        <th className="py-2 pr-3">To</th>
                        <th className="py-2 pr-3 text-right">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.offEarnMonth.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-3 text-muted-foreground">
                            No earned OFF.
                          </td>
                        </tr>
                      ) : (
                        r.offEarnMonth.map((t, i) => (
                          <tr key={i} className="border-b last:border-b-0">
                            <td className="py-2 pr-3 tabular-nums">{t.start_date}</td>
                            <td className="py-2 pr-3 tabular-nums">{t.end_date}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{t.days_earned}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold">General OFF Used (this month)</div>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[360px] text-xs">
                    <thead className="text-left text-muted-foreground">
                      <tr className="border-b">
                        <th className="py-2 pr-3">From</th>
                        <th className="py-2 pr-3">To</th>
                        <th className="py-2 pr-3 text-right">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.offUseMonth.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-3 text-muted-foreground">
                            No used OFF.
                          </td>
                        </tr>
                      ) : (
                        r.offUseMonth.map((t, i) => (
                          <tr key={i} className="border-b last:border-b-0">
                            <td className="py-2 pr-3 tabular-nums">{t.start_date}</td>
                            <td className="py-2 pr-3 tabular-nums">{t.end_date}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{t.days_deducted}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        ))}
      </section>

      <BirdemMicrobiologySignatures />
    </PrintLayout>
  );
}
