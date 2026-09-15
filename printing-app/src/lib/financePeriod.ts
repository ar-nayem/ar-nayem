export const FINANCE_PERIODS = ["week", "month", "all"] as const;
export type FinancePeriod = (typeof FINANCE_PERIODS)[number];

export function isFinancePeriod(value: unknown): value is FinancePeriod {
  return typeof value === "string" && (FINANCE_PERIODS as readonly string[]).includes(value);
}

export const FINANCE_PERIOD_LABELS: Record<FinancePeriod, string> = {
  week: "Last 7 days",
  month: "This month",
  all: "All time",
};
