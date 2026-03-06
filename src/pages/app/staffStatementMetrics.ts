import { addYears, differenceInCalendarDays, intervalToDuration, isValid, parse } from "date-fns";

export type ServiceInfo = {
  totalDays: number;
  years: number;
  months: number;
  days: number;
  fullYears: number;
};

export type RemainingServiceInfo = {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  isRetired: boolean;
};

export type StaffStatementMetrics = {
  serviceInfo: ServiceInfo | null;
  prlDate: Date | null;
  remainingService: RemainingServiceInfo | null;
  recreationLeaveCycles: number;
  recreationLeaveDays: number;
  elBalance: number;
};

export function parseIsoDate(isoDate: string | null) {
  if (!isoDate) return undefined;
  const parsed = parse(isoDate, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : undefined;
}

export function calculateStaffStatementMetrics(params: {
  dob: string | null;
  joiningDate: string | null;
  now?: Date;
}): StaffStatementMetrics {
  const now = params.now ?? new Date();

  const joining = parseIsoDate(params.joiningDate);
  let serviceInfo: ServiceInfo | null = null;

  if (joining && joining <= now) {
    const totalDays = differenceInCalendarDays(now, joining) + 1;
    const duration = intervalToDuration({ start: joining, end: now });

    serviceInfo = {
      totalDays,
      years: duration.years ?? 0,
      months: duration.months ?? 0,
      days: duration.days ?? 0,
      fullYears: duration.years ?? 0,
    };
  }

  const dob = parseIsoDate(params.dob);
  const prlDate = dob ? addYears(dob, 59) : null;

  let remainingService: RemainingServiceInfo | null = null;
  if (prlDate) {
    if (prlDate <= now) {
      remainingService = {
        years: 0,
        months: 0,
        days: 0,
        totalDays: 0,
        isRetired: true,
      };
    } else {
      const duration = intervalToDuration({ start: now, end: prlDate });
      remainingService = {
        years: duration.years ?? 0,
        months: duration.months ?? 0,
        days: duration.days ?? 0,
        totalDays: Math.max(0, differenceInCalendarDays(prlDate, now)),
        isRetired: false,
      };
    }
  }

  const fullYears = serviceInfo?.fullYears ?? 0;
  const recreationLeaveCycles = Math.floor(fullYears / 3);
  const recreationLeaveDays = recreationLeaveCycles * 15;
  const earned = fullYears * 33;
  const elBalance = Math.max(0, earned - recreationLeaveDays);

  return {
    serviceInfo,
    prlDate,
    remainingService,
    recreationLeaveCycles,
    recreationLeaveDays,
    elBalance,
  };
}
