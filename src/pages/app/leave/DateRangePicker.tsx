import React, { useMemo } from "react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { formatUiDate } from "./dateFormat";

function DateButton(props: {
  value?: Date;
  onClick?: () => void;
  placeholder: string;
}) {
  const { value, placeholder } = props;
  return (
    <Button
      type="button"
      variant="outline"
      className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
    >
      {value ? formatUiDate(value) : placeholder}
    </Button>
  );
}

export function DateRangePicker(props: {
  startDate?: Date;
  endDate?: Date;
  onStartDate: (d?: Date) => void;
  onEndDate: (d?: Date) => void;
  disabled?: boolean;
}) {
  const { startDate, endDate, onStartDate, onEndDate, disabled } = props;

  const month = useMemo(() => {
    if (startDate) return startDate;
    if (endDate) return endDate;
    return new Date();
  }, [startDate, endDate]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Start Date</Label>
        <Popover>
          <PopoverTrigger asChild disabled={disabled}>
            <div>
              <DateButton value={startDate} placeholder="Pick start date" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={onStartDate}
              defaultMonth={month}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
              formatters={{ formatCaption: (d) => format(d, "MMMM yyyy") }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>End Date</Label>
        <Popover>
          <PopoverTrigger asChild disabled={disabled}>
            <div>
              <DateButton value={endDate} placeholder="Pick end date" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={onEndDate}
              defaultMonth={month}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
              formatters={{ formatCaption: (d) => format(d, "MMMM yyyy") }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
