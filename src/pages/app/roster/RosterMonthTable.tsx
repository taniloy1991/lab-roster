import React from "react";

import { Button } from "@/components/ui/button";

import type { Assignment, Shift } from "./types";

const shifts: Shift[] = ["morning", "evening", "night"];

export function RosterMonthTable(props: {
  monthDays: string[];
  daysByDate: Map<string, { id: string; duty_date: string }>;
  assignmentsByDayShift: Map<string, Assignment[]>;
  staffName: Map<string, string>;
  canEdit: boolean;
  onAdd: (params: { dutyDate: string; shift: Shift }) => void;
  onEdit: (params: { dutyDate: string; shift: Shift; assignment: Assignment }) => void;
}) {
  const { monthDays, daysByDate, assignmentsByDayShift, staffName, canEdit, onAdd, onEdit } = props;

  return (
    <table className="w-full min-w-[980px] text-sm">
      <thead className="text-left text-xs text-muted-foreground">
        <tr className="border-b">
          <th className="py-3 pr-4">Date</th>
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
          return (
            <tr key={dutyDate} className="border-b last:border-b-0">
              <td className="py-3 pr-4 tabular-nums">
                <div className="font-medium">{dutyDate}</div>
              </td>

              {shifts.map((shift) => {
                const list = day ? assignmentsByDayShift.get(`${day.id}:${shift}`) ?? [] : [];
                return (
                  <td key={shift} className="py-3 pr-4 align-top">
                    <div className="flex flex-wrap items-start gap-2">
                      {list.map((a) => {
                        const name = staffName.get(a.staff_id) ?? "Unknown";
                        const note = (a.duty_note ?? "").trim();
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => (canEdit ? onEdit({ dutyDate, shift, assignment: a }) : undefined)}
                            className="rounded-md border bg-card px-2 py-1 text-left text-xs text-foreground hover:bg-accent disabled:opacity-70"
                            disabled={!canEdit}
                            title={canEdit ? "Edit note / remove" : undefined}
                          >
                            <span className="font-medium">{name}</span>
                            {a.is_extra ? <span className="text-muted-foreground"> · extra</span> : null}
                            {note ? <span className="text-muted-foreground"> — {note}</span> : null}
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
