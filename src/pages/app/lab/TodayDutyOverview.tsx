import React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export type TodayDutyShift = {
  shift: "morning" | "evening" | "night";
  entries: Array<{ staff: string; note: string }>;
};

function titleCase(s: string) {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

export function TodayDutyOverview({
  dateLabel,
  shifts,
}: {
  dateLabel: string;
  shifts: TodayDutyShift[];
}) {
  return (
    <section aria-label="Today's duty overview">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <CardTitle className="text-lg">Today’s Duty</CardTitle>
              <CardDescription>{dateLabel}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {shifts.map((s, idx) => (
            <div key={s.shift} className="space-y-2">
              <div className="text-sm font-medium">{titleCase(s.shift)} shift</div>
              {s.entries.length ? (
                <ul className="space-y-2">
                  {s.entries.map((e, i) => (
                    <li key={`${s.shift}-${i}`} className="text-sm">
                      <div className="font-medium">{e.staff}</div>
                      {e.note ? <div className="text-xs text-muted-foreground">{e.note}</div> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">No staff assigned.</div>
              )}
              {idx !== shifts.length - 1 ? <Separator /> : null}
            </div>
          ))}

        </CardContent>
      </Card>
    </section>
  );
}
