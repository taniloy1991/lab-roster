import React, { useMemo, useState } from "react";
import { differenceInCalendarDays, isAfter } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

import { DateRangePicker } from "./DateRangePicker";
import { StaffSelect } from "./StaffSelect";
import { formatDbDate } from "./dateFormat";
import { useInstitutionStaff } from "./useInstitutionStaff";

export function OffManagementSection() {
  const { toast } = useToast();
  const { staff, activeInstitutionId } = useInstitutionStaff();

  const [staffId, setStaffId] = useState("");

  const [earnStart, setEarnStart] = useState<Date | undefined>();
  const [earnEnd, setEarnEnd] = useState<Date | undefined>();
  const [earnBusy, setEarnBusy] = useState(false);

  const [useStart, setUseStart] = useState<Date | undefined>();
  const [useEnd, setUseEnd] = useState<Date | undefined>();
  const [useBusy, setUseBusy] = useState(false);

  const earnDays = useMemo(() => {
    if (!earnStart || !earnEnd) return null;
    if (isAfter(earnStart, earnEnd)) return null;
    return differenceInCalendarDays(earnEnd, earnStart) + 1;
  }, [earnStart, earnEnd]);

  const useDays = useMemo(() => {
    if (!useStart || !useEnd) return null;
    if (isAfter(useStart, useEnd)) return null;
    return differenceInCalendarDays(useEnd, useStart) + 1;
  }, [useStart, useEnd]);

  const addOff = async () => {
    if (!activeInstitutionId) return;
    if (!staffId) return toast({ title: "Staff is required", variant: "destructive" });
    if (!earnStart || !earnEnd) return toast({ title: "Start and end dates are required", variant: "destructive" });

    setEarnBusy(true);
    const res = await supabase.from("general_off_earn" as any).insert({
      institution_id: activeInstitutionId,
      staff_id: staffId,
      start_date: formatDbDate(earnStart),
      end_date: formatDbDate(earnEnd),
      days_earned: 0,
    });
    setEarnBusy(false);

    if (res.error) {
      toast({ title: "Could not add General OFF", description: res.error.message, variant: "destructive" });
      return;
    }

    toast({ title: `Added General OFF${earnDays ? ` (${earnDays} days)` : ""}` });
    setEarnStart(undefined);
    setEarnEnd(undefined);
  };

  const deductOff = async () => {
    if (!activeInstitutionId) return;
    if (!staffId) return toast({ title: "Staff is required", variant: "destructive" });
    if (!useStart || !useEnd) return toast({ title: "Start and end dates are required", variant: "destructive" });

    setUseBusy(true);
    const res = await supabase.from("general_off_deduct" as any).insert({
      institution_id: activeInstitutionId,
      staff_id: staffId,
      start_date: formatDbDate(useStart),
      end_date: formatDbDate(useEnd),
      days_deducted: 0,
    });
    setUseBusy(false);

    if (res.error) {
      toast({ title: "Could not deduct OFF", description: res.error.message, variant: "destructive" });
      return;
    }

    toast({ title: `Deducted OFF${useDays ? ` (${useDays} days)` : ""}` });
    setUseStart(undefined);
    setUseEnd(undefined);
  };

  const printHref = useMemo(() => {
    if (!staffId) return null;
    return `/print/off-overview?staffId=${encodeURIComponent(staffId)}`;
  }, [staffId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">General OFF Management</CardTitle>
        <CardDescription>Track earned General OFF and deduct used OFF; balances are calculated dynamically.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <StaffSelect staff={staff} value={staffId} onChange={setStaffId} />

        <section className="space-y-3">
          <div className="text-sm font-semibold">Earn OFF</div>
          <DateRangePicker startDate={earnStart} endDate={earnEnd} onStartDate={setEarnStart} onEndDate={setEarnEnd} disabled={!staffId} />
          <Button onClick={addOff} disabled={!staffId || earnBusy}>
            {earnBusy ? "Working…" : "Add General OFF"}
          </Button>
        </section>

        <section className="space-y-3">
          <div className="text-sm font-semibold">Deduct OFF</div>
          <DateRangePicker startDate={useStart} endDate={useEnd} onStartDate={setUseStart} onEndDate={setUseEnd} disabled={!staffId} />
          <Button onClick={deductOff} disabled={!staffId || useBusy} variant="secondary">
            {useBusy ? "Working…" : "Minus / Deduct OFF"}
          </Button>
        </section>

        <Button asChild variant="outline" disabled={!printHref}>
          <a href={printHref ?? "#"} target="_blank" rel="noreferrer">
            Print General OFF Overview
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
