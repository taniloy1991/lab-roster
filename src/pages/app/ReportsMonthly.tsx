import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { InstitutionPdfHeader } from "@/components/print/InstitutionPdfHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ClBalanceRow = { staff_id: string | null; name: string | null; remaining_days: number | null };
type OffBalanceRow = { staff_id: string | null; name: string | null; off_balance: number | null };

type Row = { staffId: string; name: string; clRemaining: number; offBalance: number };

type ClTxRow = { start_date: string; end_date: string; total_days: number };

type OffEarnRow = { start_date: string; end_date: string; days_earned: number };
type OffUseRow = { start_date: string; end_date: string; days_deducted: number };

const BIRDEM_INSTITUTION_ID = "cfa40334-46e7-431d-9f77-3f3aa1a6b339";

export default function ReportsMonthly() {
  const { activeInstitutionId } = useAuth();
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [institutionName, setInstitutionName] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [clTx, setClTx] = useState<ClTxRow[]>([]);
  const [offEarnTx, setOffEarnTx] = useState<OffEarnRow[]>([]);
  const [offUseTx, setOffUseTx] = useState<OffUseRow[]>([]);
  const [offTotals, setOffTotals] = useState<{ earned: number; used: number; balance: number }>({
    earned: 0,
    used: 0,
    balance: 0,
  });
  const [clRemainingYear, setClRemainingYear] = useState<number>(0);

  const year = useMemo(() => {
    try {
      return Number(format(parseISO(`${month}-01`), "yyyy"));
    } catch {
      return new Date().getFullYear();
    }
  }, [month]);

  const load = useCallback(async () => {
    if (!activeInstitutionId) return;
    setLoading(true);

    const [inst, staffRes] = await Promise.all([
      supabase.from("institutions").select("name").eq("id", activeInstitutionId).maybeSingle(),
      supabase
        .from("staff")
        .select("id,name")
        .eq("institution_id", activeInstitutionId)
        .eq("is_active", true)
        .order("name"),
    ]);

    setInstitutionName(inst.data?.name ?? "");

    const staffIds = (staffRes.data ?? []).map((s: any) => String(s.id));

    const [clRes, offRes] = await Promise.all([
      staffIds.length
        ? supabase.from("cl_balance_view").select("staff_id,name,remaining_days").in("staff_id", staffIds)
        : Promise.resolve({ data: [], error: null } as any),
      staffIds.length
        ? supabase.from("off_balance_view").select("staff_id,name,off_balance").in("staff_id", staffIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

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
  }, [activeInstitutionId]);

  const loadStaffDetails = async (staffId: string) => {
    if (!activeInstitutionId) return;

    setDetailsLoading(true);
    setDetailsError(null);

    const [clBalRes, clTxRes, offBalRes, offEarnRes, offUseRes] = await Promise.all([
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
        .order("start_date", { ascending: true }),
      supabase
        .from("general_off_deduct" as any)
        .select("start_date,end_date,days_deducted")
        .eq("institution_id", activeInstitutionId)
        .eq("staff_id", staffId)
        .order("start_date", { ascending: true }),
    ]);

    const anyErr = clBalRes.error || clTxRes.error || offBalRes.error || offEarnRes.error || offUseRes.error;
    if (anyErr) {
      setDetailsError(anyErr.message ?? "Failed to load staff details");
      setClTx([]);
      setOffEarnTx([]);
      setOffUseTx([]);
      setOffTotals({ earned: 0, used: 0, balance: 0 });
      setClRemainingYear(0);
      setDetailsLoading(false);
      return;
    }

    setClRemainingYear(Number((clBalRes.data as any)?.remaining_days ?? 0));
    setClTx((clTxRes.data ?? []) as unknown as ClTxRow[]);
    setOffEarnTx((offEarnRes.data ?? []) as unknown as OffEarnRow[]);
    setOffUseTx((offUseRes.data ?? []) as unknown as OffUseRow[]);
    setOffTotals({
      earned: Number((offBalRes.data as any)?.total_earned ?? 0),
      used: Number((offBalRes.data as any)?.total_used ?? 0),
      balance: Number((offBalRes.data as any)?.remaining_balance ?? 0),
    });

    setDetailsLoading(false);
  };

  useEffect(() => {
    void load();
  }, [load, month]);

  useEffect(() => {
    if (!activeInstitutionId) return;

    const reloadAll = () => {
      void load();
      if (selectedStaffId) void loadStaffDetails(selectedStaffId);
    };

    const channel = supabase
      .channel(`monthly-report-${activeInstitutionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "holidays",
          filter: `institution_id=eq.${activeInstitutionId}`,
        },
        reloadAll,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cl_transactions",
          filter: `institution_id=eq.${activeInstitutionId}`,
        },
        reloadAll,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "general_off_earn",
          filter: `institution_id=eq.${activeInstitutionId}`,
        },
        reloadAll,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "general_off_deduct",
          filter: `institution_id=eq.${activeInstitutionId}`,
        },
        reloadAll,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeInstitutionId, load, selectedStaffId, year]);

  useEffect(() => {
    if (!selectedStaffId) return;
    void loadStaffDetails(selectedStaffId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaffId, year, activeInstitutionId]);

  const selectedStaff = useMemo(() => {
    if (!selectedStaffId) return null;
    return rows.find((r) => r.staffId === selectedStaffId) ?? null;
  }, [rows, selectedStaffId]);

  const showBalanceColumns = activeInstitutionId !== BIRDEM_INSTITUTION_ID;

  return (
    <>
      <div className="pdf-header hidden print:block mb-6">
        <InstitutionPdfHeader />
      </div>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between print:hidden">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Monthly Leave & OFF Balance Overview</h2>
            <p className="text-sm text-muted-foreground">Click staff name for selected year details and print.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[190px]" />
            <Button
              onClick={() => {
                window.open(`/print/monthly/${month}`, "_blank", "noopener,noreferrer");
              }}
              variant="outline"
            >
              Print Monthly Report
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
            <p className="text-xs text-muted-foreground print:hidden">Source: cl_balance_view + off_balance_view</p>
          </CardHeader>
          <CardContent className="overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-3 pr-4">Staff</th>
                  {showBalanceColumns ? (
                    <>
                      <th className="py-3 pr-4">CL Remaining</th>
                      <th className="py-3 pr-4">OFF Remaining</th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={showBalanceColumns ? 3 : 1} className="py-10 text-center text-muted-foreground">
                      No data.
                    </td>
                  </tr>
                ) : null}
                {rows.map((r) => {
                  const active = r.staffId === selectedStaffId;
                  return (
                    <tr key={r.staffId} className={"border-b last:border-b-0 " + (active ? "bg-accent/30" : "")}>
                      <td className="py-3 pr-4 font-medium">
                        <button
                          type="button"
                          className="text-left underline-offset-4 hover:underline"
                          onClick={() => setSelectedStaffId((cur) => (cur === r.staffId ? null : r.staffId))}
                        >
                          {r.name}
                        </button>
                      </td>
                      {showBalanceColumns ? (
                        <>
                          <td className="py-3 pr-4 tabular-nums">{r.clRemaining}</td>
                          <td className="py-3 pr-4 tabular-nums">{r.offBalance}</td>
                        </>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {selectedStaff ? (
          <Card className="print:hidden">
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-lg">
                  {selectedStaff.name} — Year Details ({year})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.open(
                        `/print/staff-year-details?staffId=${selectedStaff.staffId}&year=${year}`,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    Print Details
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {detailsError ? <p className="text-sm text-destructive">{detailsError}</p> : null}
              {detailsLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

              <section className="space-y-2">
                <div className="text-sm font-semibold">Casual Leave (CL)</div>
                <div className="text-sm text-muted-foreground">
                  Remaining (year): <span className="text-foreground tabular-nums">{clRemainingYear}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr className="border-b">
                        <th className="py-2 pr-4">From</th>
                        <th className="py-2 pr-4">To</th>
                        <th className="py-2 pr-4 text-right">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clTx.length === 0 && !detailsLoading ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-muted-foreground">
                            No CL deductions.
                          </td>
                        </tr>
                      ) : null}
                      {clTx.map((t, idx) => (
                        <tr key={idx} className="border-b last:border-b-0">
                          <td className="py-2 pr-4 tabular-nums">{t.start_date}</td>
                          <td className="py-2 pr-4 tabular-nums">{t.end_date}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{t.total_days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="space-y-2">
                <div className="text-sm font-semibold">General OFF</div>
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

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="overflow-x-auto">
                    <div className="mb-2 text-sm font-semibold">Earned</div>
                    <table className="w-full min-w-[520px] text-sm">
                      <thead className="text-left text-xs text-muted-foreground">
                        <tr className="border-b">
                          <th className="py-2 pr-4">From</th>
                          <th className="py-2 pr-4">To</th>
                          <th className="py-2 pr-4 text-right">Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {offEarnTx.length === 0 && !detailsLoading ? (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-muted-foreground">
                              No earned OFF.
                            </td>
                          </tr>
                        ) : null}
                        {offEarnTx.map((t, idx) => (
                          <tr key={idx} className="border-b last:border-b-0">
                            <td className="py-2 pr-4 tabular-nums">{t.start_date}</td>
                            <td className="py-2 pr-4 tabular-nums">{t.end_date}</td>
                            <td className="py-2 pr-4 text-right tabular-nums">{t.days_earned}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="mb-2 text-sm font-semibold">Used</div>
                    <table className="w-full min-w-[520px] text-sm">
                      <thead className="text-left text-xs text-muted-foreground">
                        <tr className="border-b">
                          <th className="py-2 pr-4">From</th>
                          <th className="py-2 pr-4">To</th>
                          <th className="py-2 pr-4 text-right">Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {offUseTx.length === 0 && !detailsLoading ? (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-muted-foreground">
                              No used OFF.
                            </td>
                          </tr>
                        ) : null}
                        {offUseTx.map((t, idx) => (
                          <tr key={idx} className="border-b last:border-b-0">
                            <td className="py-2 pr-4 tabular-nums">{t.start_date}</td>
                            <td className="py-2 pr-4 tabular-nums">{t.end_date}</td>
                            <td className="py-2 pr-4 text-right tabular-nums">{t.days_deducted}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
