import React, { useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

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
import type { LeaveVisualEntry, ShiftVisualEntry, VisualLeaveType } from "./useRosterVisualMonth";

type ShiftKey = `${string}:${Shift}`;
type EntryKey = string;

const AUTOSAVE_DEBOUNCE_MS = 600;

const LEAVE_OPTIONS: { value: VisualLeaveType; label: string }[] = [
  { value: "casual_leave", label: "CL" },
  { value: "week_off", label: "OFF" },
];

export function RosterMonthTable(props: {
  monthDays: string[];
  staff: StaffRow[];
  shifts: Shift[];

  selectedDates: Set<string>;
  onToggleDate: (dutyDate: string) => void;
  onToggleAll: () => void;

  byDateShift: Map<string, ShiftVisualEntry[]>;
  leaveByDate: Map<string, LeaveVisualEntry[]>;

  onAddShiftEntry: (params: { dutyDate: string; shift: Shift; staffId: string; dutyNote: string }) => void;
  onUpdateShiftEntry: (params: { id: string; staffId: string; dutyNote: string }) => void;
  onAddLeaveEntry: (params: { dutyDate: string; staffId: string; leaveType: VisualLeaveType }) => void;
  onUpdateLeaveEntry: (params: { id: string; staffId: string; leaveType: VisualLeaveType }) => void;
  onRemoveShiftEntry: (params: { id: string }) => void;
  onRemoveLeaveEntry: (params: { id: string }) => void;
}) {
  const {
    monthDays,
    staff,
    shifts,
    selectedDates,
    onToggleDate,
    onToggleAll,
    byDateShift,
    leaveByDate,
    onAddShiftEntry,
    onUpdateShiftEntry,
    onAddLeaveEntry,
    onUpdateLeaveEntry,
    onRemoveShiftEntry,
    onRemoveLeaveEntry,
  } = props;

  const selection = useMemo(() => {
    const total = monthDays.length;
    const selected = monthDays.reduce((acc, d) => acc + (selectedDates.has(d) ? 1 : 0), 0);
    return { total, selected };
  }, [monthDays, selectedDates]);

  const headerChecked: boolean | "indeterminate" =
    selection.selected === 0 ? false : selection.selected === selection.total ? true : "indeterminate";

  const [noteDraft, setNoteDraft] = useState<Map<EntryKey, string>>(() => new Map());
  const [newLeaveStaffDraft, setNewLeaveStaffDraft] = useState<Map<string, string>>(() => new Map());
  const [newLeaveTypeDraft, setNewLeaveTypeDraft] = useState<Map<string, VisualLeaveType | "">>(() => new Map());

  const noteTimersRef = useRef<Map<string, number>>(new Map());
  const lastSavedNoteRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    return () => {
      for (const t of noteTimersRef.current.values()) window.clearTimeout(t);
    };
  }, []);

  const getNoteDraft = (k: EntryKey, fallback: string) => noteDraft.get(k) ?? fallback;
  const setNote = (k: EntryKey, v: string) =>
    setNoteDraft((prev) => {
      const next = new Map(prev);
      next.set(k, v);
      return next;
    });

  const clearNoteDraft = (k: EntryKey) =>
    setNoteDraft((prev) => {
      if (!prev.has(k)) return prev;
      const next = new Map(prev);
      next.delete(k);
      return next;
    });

  const scheduleNoteAutosave = (p: { id: string; staffId: string; dutyNote: string }) => {
    const note = p.dutyNote;
    const last = lastSavedNoteRef.current.get(p.id);
    if (last === note) return;

    const prevTimer = noteTimersRef.current.get(p.id);
    if (prevTimer) window.clearTimeout(prevTimer);

    const timer = window.setTimeout(() => {
      lastSavedNoteRef.current.set(p.id, note);
      onUpdateShiftEntry({ id: p.id, staffId: p.staffId, dutyNote: note });
      noteTimersRef.current.delete(p.id);
    }, AUTOSAVE_DEBOUNCE_MS);

    noteTimersRef.current.set(p.id, timer);
  };

  const getNewLeaveStaff = (dutyDate: string) => newLeaveStaffDraft.get(dutyDate) ?? "";
  const getNewLeaveType = (dutyDate: string) => newLeaveTypeDraft.get(dutyDate) ?? "";

  return (
    <table className="w-full min-w-[1560px] text-sm">
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

          <th className="py-3 pr-4">OFF / CL (Date-wise)</th>
        </tr>
      </thead>

      <tbody>
        {monthDays.map((dutyDate) => {
          const checked = selectedDates.has(dutyDate);
          const leaveEntries = leaveByDate.get(dutyDate) ?? [];

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
                                    {s.name} {s.designation ? `• ${s.designation}` : ""} {s.phone ? `• ${s.phone}` : ""}
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

                        <Select
                          value={""}
                          onValueChange={(v) => {
                            onAddShiftEntry({ dutyDate, shift, staffId: v, dutyNote: newNoteValue });
                            clearNoteDraft(newKey);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Add staff…" />
                          </SelectTrigger>
                          <SelectContent>
                            {staff.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} {s.designation ? `• ${s.designation}` : ""} {s.phone ? `• ${s.phone}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                              onChange={(e) => {
                                const v = e.target.value;
                                setNote(entry.id, v);
                                scheduleNoteAutosave({ id: entry.id, staffId: entry.staff_id, dutyNote: v });
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
                <div className="flex w-[320px] flex-col gap-2">
                  {leaveEntries.map((entry) => (
                    <div key={entry.id} className="grid grid-cols-[1fr_96px_32px] items-center gap-2">
                      <Select
                        value={entry.staff_id}
                        onValueChange={(staffId) =>
                          onUpdateLeaveEntry({
                            id: entry.id,
                            staffId,
                            leaveType: entry.leave_type,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select staff…" />
                        </SelectTrigger>
                        <SelectContent>
                          {staff.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} {s.designation ? `• ${s.designation}` : ""} {s.phone ? `• ${s.phone}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={entry.leave_type}
                        onValueChange={(leaveType) =>
                          onUpdateLeaveEntry({
                            id: entry.id,
                            staffId: entry.staff_id,
                            leaveType: leaveType as VisualLeaveType,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAVE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onRemoveLeaveEntry({ id: entry.id })}
                        aria-label="Remove OFF/CL entry"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <div className="grid grid-cols-[1fr_96px_72px] items-center gap-2">
                    <Select
                      value={getNewLeaveStaff(dutyDate)}
                      onValueChange={(v) =>
                        setNewLeaveStaffDraft((prev) => {
                          const next = new Map(prev);
                          next.set(dutyDate, v);
                          return next;
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Add staff…" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} {s.designation ? `• ${s.designation}` : ""} {s.phone ? `• ${s.phone}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={getNewLeaveType(dutyDate)}
                      onValueChange={(v) =>
                        setNewLeaveTypeDraft((prev) => {
                          const next = new Map(prev);
                          next.set(dutyDate, v as VisualLeaveType);
                          return next;
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAVE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-2 text-xs"
                      disabled={!getNewLeaveStaff(dutyDate) || !getNewLeaveType(dutyDate)}
                      onClick={() => {
                        const staffId = getNewLeaveStaff(dutyDate);
                        const leaveType = getNewLeaveType(dutyDate) as VisualLeaveType;
                        if (!staffId || !leaveType) return;
                        onAddLeaveEntry({ dutyDate, staffId, leaveType });
                        setNewLeaveStaffDraft((prev) => {
                          const next = new Map(prev);
                          next.delete(dutyDate);
                          return next;
                        });
                        setNewLeaveTypeDraft((prev) => {
                          const next = new Map(prev);
                          next.delete(dutyDate);
                          return next;
                        });
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

