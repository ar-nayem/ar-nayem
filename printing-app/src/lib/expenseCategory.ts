export const EXPENSE_CATEGORIES = ["paper", "ink", "maintenance", "other"] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === "string" && (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  paper: "Paper",
  ink: "Ink / Toner",
  maintenance: "Maintenance",
  other: "Other",
};
