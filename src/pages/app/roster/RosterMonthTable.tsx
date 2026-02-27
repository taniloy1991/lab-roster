import React, { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import type { Assignment, Shift } from "./types";

const shifts: Shift[] = ["morning", "evening", "night"];

export function RosterMonthTable(props: {
  monthDays: string[];
  daysByDate: Map<string, { id: string; duty_date: string }>;
  assignmentsByDayShift: Map<string, Assignment[]>;
  staffName: Map<string, string>;
  canEdit: boolean;
  selectedDates: Set<string>;
  onToggleDate: (dutyDate: string) => void;
  onToggleAll: () => void;
  onAdd: (params: { dutyDate: string; shift: Shift }) => void;
  onEdit: (params: { dutyDate: string; shift: Shift; assignment: Assignment }) => void;
  leaveByDate: Map<string, string>;
}) {
  const {
    monthDays,
    daysByDate,
    assignmentsByDayShift,
    staffName,
    canEdit,
    selectedDates,
    onToggleDate,
    onToggleAll,
    onAdd,
    onEdit,
    leaveByDate,
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
              <Checkbox
                checked={headerChecked}
                onCheckedChange={() => onToggleAll()}
                aria-label="Select all dates"
              />
            </div>
          </th>
          <th className="py-3 pr-4">Date</th>
          <th className="py-3 pr-4">Leave (CL/OFF)</th>
          {shifts.map((s) => (
            <th key={s} className="py-3 pr-4 capitalize">
              {s}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {monthDays.map((dutyDate) => {
          const day = daysByDate.get(dutyDate);
          const checked = selectedDates.has(dutyDate);

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
                <div className="text-xs text-muted-foreground whitespace-pre-wrap">{leaveByDate.get(dutyDate) ?? "—"}</div>
              </td>


              {shifts.map((shift) => {
                const list = day ? assignmentsByDayShift.get(`${day.id}:${shift}`) ?? [] : [];
                return (
                  <td key={shift} className="py-3 pr-4 align-top">
                    <div className="flex flex-wrap items-start gap-2">
                      {list.map((a) => {
                        const name = staffName.get(a.staff_id) ?? "Unknown";
                        const note = (a.duty_note ?? "").trim();
                        const onLeaveText = (leaveByDate.get(dutyDate) ?? "").toLowerCase();
                        const isLeaveCell = onLeaveText.includes(name.toLowerCase());

                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => (canEdit ? onEdit({ dutyDate, shift, assignment: a }) : undefined)}
                            className={
                              "rounded-md border px-2 py-1 text-left text-xs text-foreground hover:bg-accent disabled:opacity-70 " +
                              (isLeaveCell ? "border-destructive/30 bg-destructive/10" : "bg-card")
                            }
                            disabled={!canEdit}
                            title={
                              isLeaveCell
                                ? "Staff is on Leave"
                                : canEdit
                                  ? "Edit note / remove"
                                  : undefined
                            }
                          >
                            <span className="font-medium">{name}</span>
                            {a.is_extra ? <span className="text-muted-foreground"> · extra</span> : null}
                            {note ? <span className="text-muted-foreground"> — {note}</span> : null}
                            {isLeaveCell ? <span className="ml-1 text-destructive"> · on leave</span> : null}
                          </button>
                        );
                      })}

                      {canEdit ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => onAdd({ dutyDate, shift })}
                        >
                          + Add
                        </Button>
                      ) : null}
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
