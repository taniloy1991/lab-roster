import React, { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { Shift, StaffRow } from "./types";
import type { VisualEntry, VisualLeaveType } from "./useRosterVisualMonth";

export function RosterMonthTable(props: {
  monthDays: string[];
  staff: StaffRow[];
  staffName: Map<string, string>;
  shifts: Shift[];
  selectedDates: Set<string>;
  onToggleDate: (dutyDate: string) => void;
  onToggleAll: () => void;
  byDateShift: Map<string, VisualEntry[]>;
  leaveByDate: Map<string, VisualLeaveType>;
  leaveOptions: Array<{ value: VisualLeaveType; label: string }>;
  onSetLeave: (params: { dutyDate: string; leaveType: VisualLeaveType }) => void;
  onOpenAssign: (params: { dutyDate: string; shift: Shift; entry?: VisualEntry }) => void;
  onRemoveEntry: (entryId: string) => void;
}) {
  const {
    monthDays,
    staff,
    staffName,
    shifts,
    selectedDates,
    onToggleDate,
    onToggleAll,
    byDateShift,
    leaveByDate,
    leaveOptions,
    onSetLeave,
    onOpenAssign,
    onRemoveEntry,
  } = props;

  const selection = useMemo(() => {
    const total = monthDays.length;
    const selected = monthDays.reduce((acc, d) => acc + (selectedDates.has(d) ? 1 : 0), 0);
    return { total, selected };
  }, [monthDays, selectedDates]);

  const headerChecked: boolean | "indeterminate" =
    selection.selected === 0 ? false : selection.selected === selection.total ? true : "indeterminate";

  return (
    <table className="w-full min-w-[980px] text-sm">
      <thead className="text-left text-xs text-muted-foreground">
        <tr className="border-b">
          <th className="py-3 pr-3 w-10">
            <div className="flex items-center">
              <Checkbox checked={headerChecked} onCheckedChange={() => onToggleAll()} aria-label="Select all dates" />
            </div>
          </th>
          <th className="py-3 pr-4">Date</th>
          <th className="py-3 pr-4">Leave (visual only)</th>
          {shifts.map((s) => (
            <th key={s} className="py-3 pr-4 capitalize">
              {s}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {monthDays.map((dutyDate) => {
          const checked = selectedDates.has(dutyDate);
          const currentLeave = leaveByDate.get(dutyDate) ?? "none";

          return (
            <tr key={dutyDate} className="border-b last:border-b-0">
              <td className="py-3 pr-3 align-top">
                <div className="pt-0.5">
                  <Checkbox checked={checked} onCheckedChange={() => onToggleDate(dutyDate)} aria-label={`Select ${dutyDate}`} />
                </div>
              </td>

              <td className="py-3 pr-4 tabular-nums">
                <div className="font-medium">{dutyDate}</div>
              </td>

              <td className="py-3 pr-4 align-top">
                <Select value={currentLeave} onValueChange={(v) => onSetLeave({ dutyDate, leaveType: v as VisualLeaveType })}>
                  <SelectTrigger className="h-8 w-[200px] text-xs">
                    <SelectValue placeholder="Select Leave" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>

              {shifts.map((shift) => {
                const list = byDateShift.get(`${dutyDate}:${shift}`) ?? [];

                return (
                  <td key={shift} className="py-3 pr-4 align-top">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-start gap-2">
                        {list.map((e) => {
                          const name = e.staff_id ? staffName.get(String(e.staff_id)) ?? "Unknown" : "Unknown";
                          const note = String(e.responsibility_note ?? "").trim();

                          return (
                            <div
                              key={e.id}
                              className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 text-xs"
                            >
                              <button
                                type="button"
                                onClick={() => onOpenAssign({ dutyDate, shift, entry: e })}
                                className="min-w-0 truncate text-left"
                                title={note ? `${name} — ${note}` : name}
                              >
                                <span className="font-medium">{name}</span>
                                {note ? <span className="text-muted-foreground"> — {note}</span> : null}
                              </button>
                              <button
                                type="button"
                                className="rounded-sm px-1 text-muted-foreground hover:text-foreground"
                                onClick={() => onRemoveEntry(e.id)}
                                aria-label="Remove"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => onOpenAssign({ dutyDate, shift })}
                        >
                          Select Staff
                        </Button>
                      </div>

                      {list.length === 0 ? <div className="text-xs text-muted-foreground">No staff selected.</div> : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
