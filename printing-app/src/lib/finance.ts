import { prisma } from "@/lib/db";
import type { FinancePeriod } from "@/lib/financePeriod";

function periodStart(period: FinancePeriod): Date | undefined {
  const now = new Date();
  if (period === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return start;
  }
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return undefined;
}

export async function getFinanceSummary(period: FinancePeriod) {
  const start = periodStart(period);
  const dateFilter = start ? { gte: start } : undefined;

  const orders = await prisma.order.findMany({
    where: {
      createdAt: dateFilter,
      status: { not: "cancelled" },
    },
    select: { totalPrice: true, paid: true },
  });

  const revenue = orders.filter((o) => o.paid).reduce((sum, o) => sum + o.totalPrice, 0);
  const unpaid = orders.filter((o) => !o.paid).reduce((sum, o) => sum + o.totalPrice, 0);
  const paidOrderCount = orders.filter((o) => o.paid).length;
  const unpaidOrderCount = orders.filter((o) => !o.paid).length;

  const expenses = await prisma.expense.findMany({
    where: { date: dateFilter },
    orderBy: { date: "desc" },
  });
  const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  return {
    period,
    revenue,
    unpaid,
    paidOrderCount,
    unpaidOrderCount,
    expenses,
    expensesTotal,
    netProfit: revenue - expensesTotal,
  };
}

export type FinanceSummary = Awaited<ReturnType<typeof getFinanceSummary>>;
