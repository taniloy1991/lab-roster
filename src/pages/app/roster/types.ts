export type StaffRow = { id: string; name: string };

export type RosterDay = {
  id: string;
  duty_date: string;
  is_friday?: boolean | null;
  is_govt_holiday?: boolean | null;
};

export type Shift = "morning" | "evening" | "night";

export type Assignment = {
  id: string;
  roster_day_id: string;
  shift: Shift;
  staff_id: string;
  is_extra: boolean;
  duty_note: string | null;
};
