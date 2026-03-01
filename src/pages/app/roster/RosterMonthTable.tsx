import React, { useMemo, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import type { Shift, StaffRow } from "./types";
import type { VisualEntry } from "./useRosterVisualMonth";

type ShiftKey = `${string}:${Shift}`;

export function RosterMonthTable(props: {
  monthDays: string[];
  staff: StaffRow[];
  shifts: Shift[];

  selectedDates: Set<string>;
  onToggleDate: (dutyDate: string) => void;
  onToggleAll: () => void;

  // Single entry per date+shift
  byDateShift: Map<string, VisualEntry>;

  // Manual per-date leave/status text (stored in roster_days.leave_status)
  leaveStatusByDate: Map<string, string>;
  onSetLeaveStatus: (params: { dutyDate: string; value: string }) => void;

  // Planning assignment write
  onUpsertShift: (params: { dutyDate: string; shift: Shift; staffId: string; dutyNote: string }) => void;
}) {
  const {
    monthDays,
    staff,
    shifts,
    selectedDates,
    onToggleDate,
    onToggleAll,
    byDateShift,
    leaveStatusByDate,
    onSetLeaveStatus,
    onUpsertShift,
  } = props;

  const selection = useMemo(() => {
    const total = monthDays.length;
    const selected = monthDays.reduce((acc, d) => acc + (selectedDates.has(d) ? 1 : 0), 0);
    return { total, selected };
  }, [monthDays, selectedDates]);

  const headerChecked: boolean | "indeterminate" =
    selection.selected === 0 ? false : selection.selected === selection.total ? true : "indeterminate";

  // Local drafts to keep typing snappy; commit on blur
  const [noteDraft, setNoteDraft] = useState<Map<ShiftKey, string>>(() => new Map());
  const [leaveDraft, setLeaveDraft] = useState<Map<string, string>>(() => new Map());

  const getNoteDraft = (k: ShiftKey, fallback: string) => noteDraft.get(k) ?? fallback;
  const setNote = (k: ShiftKey, v: string) =>
    setNoteDraft((prev) => {
      const next = new Map(prev);
      next.set(k, v);
      return next;
    });

  const getLeaveDraft = (dutyDate: string, fallback: string) => leaveDraft.get(dutyDate) ?? fallback;
  const setLeave = (dutyDate: string, v: string) =>
    setLeaveDraft((prev) => {
      const next = new Map(prev);
      next.set(dutyDate, v);
      return next;
    });

  return (
    <table className="w-full min-w-[1320px] text-sm">
      <thead className="text-left text-xs text-muted-foreground">
        <tr className="border-b">
          <th className="w-10 py-3 pr-3">
            <div className="flex items-center">
              <Checkbox checked={headerChecked} onCheckedChange={() => onToggleAll()} aria-label="Select all dates" />
            </div>
          </th>
          <th className="py-3 pr-4">Date</th>

          {shifts.map((s) => (
            <React.Fragment key={s}>
              <th className="py-3 pr-4 capitalize">{s} staff</th>
              <th className="py-3 pr-4 capitalize">{s} duty note</th>
            </React.Fragment>
          ))}

          <th className="py-3 pr-4">Leave / Status</th>
        </tr>
      </thead>

      <tbody>
        {monthDays.map((dutyDate) => {
          const checked = selectedDates.has(dutyDate);
          const leaveValue = leaveStatusByDate.get(dutyDate) ?? "";

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

              {shifts.map((shift) => {
                const key: ShiftKey = `${dutyDate}:${shift}`;
                const entry = byDateShift.get(key);
                const staffId = entry?.staff_id ?? "";
                const note = entry?.responsibility_note ?? "";
                const noteValue = getNoteDraft(key, note);

                return (
                  <React.Fragment key={shift}>
                    <td className="py-3 pr-4 align-top">
                      <Select
                        value={staffId}
                        onValueChange={(v) => {
                          const dutyNote = getNoteDraft(key, note);
                          onUpsertShift({ dutyDate, shift, staffId: v, dutyNote });
                        }}
                      >
                        <SelectTrigger className="h-8 w-[220px] text-xs">
                          <SelectValue placeholder="Select staff…" />
                        </SelectTrigger>
                        <SelectContent>
                          {staff.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    <td className="py-3 pr-4 align-top">
                      <Input
                        value={noteValue}
                        onChange={(e) => setNote(key, e.target.value)}
                        onBlur={() => {
                          if (!staffId) return; // DB requires staff for shift rows
                          onUpsertShift({ dutyDate, shift, staffId, dutyNote: noteValue });
                        }}
                        disabled={!staffId}
                        placeholder={!staffId ? "Select staff first" : "Duty note…"}
                        className="h-8 w-[220px] text-xs"
                      />
                    </td>
                  </React.Fragment>
                );
              })}

              <td className="py-3 pr-4 align-top">
                <Input
                  value={getLeaveDraft(dutyDate, leaveValue)}
                  onChange={(e) => setLeave(dutyDate, e.target.value)}
                  onBlur={() => {
                    const v = getLeaveDraft(dutyDate, leaveValue);
                    onSetLeaveStatus({ dutyDate, value: v });
                  }}
                  placeholder="CL / EL / Day Off…"
                  className="h-8 w-[220px] text-xs"
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

