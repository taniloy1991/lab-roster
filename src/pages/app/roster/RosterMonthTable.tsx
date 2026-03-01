import React, { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import type { Shift, StaffRow } from "./types";
import type { VisualEntry } from "./useRosterVisualMonth";

type ShiftKey = `${string}:${Shift}`;

type EntryKey = string; // VisualEntry.id or "new:${date}:${shift}" for draft rows

export function RosterMonthTable(props: {
  monthDays: string[];
  staff: StaffRow[];
  shifts: Shift[];

  selectedDates: Set<string>;
  onToggleDate: (dutyDate: string) => void;
  onToggleAll: () => void;

  // Multiple entries per date+shift
  byDateShift: Map<string, VisualEntry[]>;

  // Manual per-date leave/status text (stored in roster_days.leave_status)
  leaveStatusByDate: Map<string, string>;
  onSetLeaveStatus: (params: { dutyDate: string; value: string }) => void;

  // Planning assignment write
  onAddShiftEntry: (params: { dutyDate: string; shift: Shift; staffId: string; dutyNote: string }) => void;
  onUpdateShiftEntry: (params: { id: string; staffId: string; dutyNote: string }) => void;
  onRemoveShiftEntry: (params: { id: string }) => void;
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
    onAddShiftEntry,
    onUpdateShiftEntry,
    onRemoveShiftEntry,
  } = props;

  const selection = useMemo(() => {
    const total = monthDays.length;
    const selected = monthDays.reduce((acc, d) => acc + (selectedDates.has(d) ? 1 : 0), 0);
    return { total, selected };
  }, [monthDays, selectedDates]);

  const headerChecked: boolean | "indeterminate" =
    selection.selected === 0 ? false : selection.selected === selection.total ? true : "indeterminate";

  // Local drafts to keep typing snappy; commit on blur
  const [noteDraft, setNoteDraft] = useState<Map<EntryKey, string>>(() => new Map());
  const [leaveDraft, setLeaveDraft] = useState<Map<string, string>>(() => new Map());

  const getNoteDraft = (k: EntryKey, fallback: string) => noteDraft.get(k) ?? fallback;
  const setNote = (k: EntryKey, v: string) =>
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

  const clearNoteDraft = (k: EntryKey) =>
    setNoteDraft((prev) => {
      if (!prev.has(k)) return prev;
      const next = new Map(prev);
      next.delete(k);
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
                const entries = byDateShift.get(key) ?? [];
                const newKey: EntryKey = `new:${key}`;
                const newNoteValue = getNoteDraft(newKey, "");

                return (
                  <React.Fragment key={shift}>
                    <td className="py-3 pr-4 align-top">
                      <div className="flex w-[220px] flex-col gap-2">
                        {entries.map((entry) => (
                          <div key={entry.id} className="flex items-center gap-2">
                            <Select
                              value={entry.staff_id}
                              onValueChange={(v) => {
                                const dutyNote = getNoteDraft(entry.id, entry.responsibility_note ?? "");
                                onUpdateShiftEntry({ id: entry.id, staffId: v, dutyNote });
                              }}
                            >
                              <SelectTrigger className="h-8 flex-1 text-xs">
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

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onRemoveShiftEntry({ id: entry.id })}
                              aria-label="Remove staff"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                        <div className="flex items-center gap-2">
                          <Select
                            value={""}
                            onValueChange={(v) => {
                              onAddShiftEntry({ dutyDate, shift, staffId: v, dutyNote: newNoteValue });
                              clearNoteDraft(newKey);
                            }}
                          >
                            <SelectTrigger className="h-8 flex-1 text-xs">
                              <SelectValue placeholder="Add staff…" />
                            </SelectTrigger>
                            <SelectContent>
                              {staff.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Add another staff" disabled>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 pr-4 align-top">
                      <div className="flex w-[220px] flex-col gap-2">
                        {entries.map((entry) => {
                          const note = entry.responsibility_note ?? "";
                          const noteValue = getNoteDraft(entry.id, note);

                          return (
                            <Input
                              key={entry.id}
                              value={noteValue}
                              onChange={(e) => setNote(entry.id, e.target.value)}
                              onBlur={() => {
                                onUpdateShiftEntry({ id: entry.id, staffId: entry.staff_id, dutyNote: noteValue });
                              }}
                              placeholder="Duty note…"
                              className="h-8 text-xs"
                            />
                          );
                        })}

                        <Input
                          value={newNoteValue}
                          onChange={(e) => setNote(newKey, e.target.value)}
                          placeholder={"Optional note before adding"}
                          className="h-8 text-xs"
                        />
                      </div>
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
                  placeholder="Name (CL) / Name (Day Off)…"
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

