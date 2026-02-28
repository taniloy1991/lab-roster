import { format } from "date-fns";

export function formatUiDate(date: Date) {
  return format(date, "dd/MM/yyyy");
}

export function formatDbDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}
