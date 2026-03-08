import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { KpiCards, type KpiItem } from "./lab/KpiCards";
import { TodayDutyOverview, type TodayDutyShift } from "./lab/TodayDutyOverview";

type StaffRow = { id: string; name: string };
type AppSettingRow = { setting_key: string | null; setting_value: string | null };

function BdClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const label = useMemo(() => {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(now);
  }, [now]);

  return <div className="mt-0.5 text-base font-semibold tabular-nums text-foreground md:mt-1 md:text-xl">{label}</div>;
}

export default function LabDashboard() {
  const { activeInstitutionId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [overviewLogo, setOverviewLogo] = useState("/images/birdem-logo.png");
  const [overviewPreparedByName, setOverviewPreparedByName] = useState("Md. Asif Hossain");
  const [overviewPreparedByTitle, setOverviewPreparedByTitle] = useState("Research Assistant");

  const [kpis, setKpis] = useState<{
    totalStaff: number;
    onDutyToday: number;
  } | null>(null);

  const [todayDuty, setTodayDuty] = useState<TodayDutyShift[]>([
    { shift: "morning", entries: [] },
    { shift: "evening", entries: [] },
    { shift: "night", entries: [] },
  ]);
  

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const load = async () => {
    if (!activeInstitutionId) return;
    setLoading(true);

    const settingsKeys = [
      `overview_logo_url:${activeInstitutionId}`,
      "overview_logo_url",
      `overview_prepared_by_name:${activeInstitutionId}`,
      "overview_prepared_by_name",
      `overview_prepared_by_title:${activeInstitutionId}`,
      "overview_prepared_by_title",
    ];

    const [instRes, staffRes, settingsRes] = await Promise.all([
      supabase.from("institutions").select("name,updated_at").eq("id", activeInstitutionId).maybeSingle(),
      supabase
        .from("staff")
        .select("id,name")
        .eq("institution_id", activeInstitutionId)
        .eq("is_active", true)
        .order("name"),
      supabase.from("app_settings").select("setting_key,setting_value").in("setting_key", settingsKeys),
    ]);

    setInstitutionName(instRes.data?.name ?? null);
    setLastUpdatedAt(instRes.data?.updated_at ?? null);

    const settingsMap = new Map<string, string>();
    for (const row of (settingsRes.data ?? []) as AppSettingRow[]) {
      const key = String(row.setting_key ?? "").trim();
      const value = String(row.setting_value ?? "").trim();
      if (key && value) settingsMap.set(key, value);
    }

    const pickSetting = (specific: string, fallback: string, defaultValue: string) => {
      return settingsMap.get(specific) ?? settingsMap.get(fallback) ?? defaultValue;
    };

    setOverviewLogo(pickSetting(`overview_logo_url:${activeInstitutionId}`, "overview_logo_url", "/images/birdem-logo.png"));
    setOverviewPreparedByName(
      pickSetting(`overview_prepared_by_name:${activeInstitutionId}`, "overview_prepared_by_name", "Md. Asif Hossain"),
    );
    setOverviewPreparedByTitle(
      pickSetting(`overview_prepared_by_title:${activeInstitutionId}`, "overview_prepared_by_title", "Research Assistant"),
    );

    const staff = (staffRes.data ?? []) as StaffRow[];
    const staffIds = staff.map((s) => s.id);
    const staffNameById = new Map<string, string>(staff.map((s) => [s.id, s.name]));

    const todayRosterRes = await supabase
      .from("roster_visual_entries" as any)
      .select("shift,staff_id,responsibility_note")
      .eq("institution_id", activeInstitutionId)
      .eq("duty_date", today)
      .not("shift", "is", null)
      .order("created_at", { ascending: true });


    const byShift = new Map<"morning" | "evening" | "night", Array<{ staff: string; note: string }>>([
      ["morning", []],
      ["evening", []],
      ["night", []],
    ]);

    const onDutyStaffIds = new Set<string>();

    for (const r of (todayRosterRes.data ?? []) as any[]) {
      const shift = String(r.shift) as "morning" | "evening" | "night";
      const sid = String(r.staff_id ?? "").trim();
      const staffName = sid ? staffNameById.get(sid) ?? "—" : "—";
      const note = String(r.responsibility_note ?? "").trim();
      byShift.get(shift)?.push({ staff: staffName, note });
      if (sid) onDutyStaffIds.add(sid);
    }


    setTodayDuty([
      { shift: "morning", entries: byShift.get("morning") ?? [] },
      { shift: "evening", entries: byShift.get("evening") ?? [] },
      { shift: "night", entries: byShift.get("night") ?? [] },
    ]);
    

    setKpis({
      totalStaff: staff.length,
      onDutyToday: onDutyStaffIds.size,
    });

    setLoading(false);
  };

  useEffect(() => {
    if (!activeInstitutionId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInstitutionId]);

  const kpiItems: KpiItem[] = useMemo(() => {
    const v = kpis;
    return [
      { label: "Total Staff", value: v?.totalStaff ?? "—" },
      { label: "On Duty Today", value: v?.onDutyToday ?? "—" },
    ];
  }, [kpis]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <img src={overviewLogo} alt="Institution logo" className="h-20 w-auto shrink-0 md:h-24" loading="eager" />
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
            <p className="text-sm text-muted-foreground">Live duty and leave snapshot for today.</p>
          </div>
        </div>

        <Button onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5 text-sm">
          <div>
            <span className="text-muted-foreground">Institution: </span>
            <span className="font-medium">{institutionName ?? "—"}</span>
          </div>
          <div className="text-xs leading-tight text-muted-foreground">
            <div>Prepared by:</div>
            <div className="text-foreground">{overviewPreparedByName}</div>
            <div>{overviewPreparedByTitle}</div>
          </div>
          <div className="text-xs text-muted-foreground">
            Last update: {lastUpdatedAt ? format(parseISO(lastUpdatedAt), "dd MMM yyyy, p") : "—"}
          </div>
        </div>

        <div className="grid w-full max-w-full gap-3 sm:w-auto sm:grid-cols-2">
          <Card className="w-full max-w-full p-3 sm:w-fit md:h-40 md:w-40 md:rounded-full md:p-0">
            <div className="flex h-full flex-col md:items-center md:justify-center">
              <div className="text-[11px] font-medium text-muted-foreground md:text-xs">BD Time</div>
              <BdClock />
            </div>
          </Card>

          <Card className="w-fit max-w-full p-2">
            <div className="text-[11px] font-medium text-muted-foreground">Calendar</div>
            <div className="mt-1 max-w-full overflow-x-auto">
              <div className="w-fit origin-top-left scale-[0.92]">
                <Calendar mode="single" selected={new Date()} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <KpiCards items={kpiItems} />

      <TodayDutyOverview dateLabel={format(parseISO(`${today}T00:00:00`), "dd MMM yyyy")} shifts={todayDuty.filter((s) => s.shift !== "night")} />
    </div>
  );
}
