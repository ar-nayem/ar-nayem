import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { isExpenseCategory, EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from "@/lib/expenseCategory";
import { pushFinanceEntry } from "@/lib/financeSync";

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const description = String(body?.description ?? "").trim();
  const category = isExpenseCategory(body?.category) ? body.category : "other";
  const amount = Number(body?.amount);
  const dateRaw = body?.date ? new Date(body.date) : new Date();

  if (!description) {
    return NextResponse.json({ error: "Please enter a description." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
  }
  if (Number.isNaN(dateRaw.getTime())) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: { description, category, amount, date: dateRaw },
  });

  void pushFinanceEntry({
    op: "upsert",
    externalId: `pa:expense:${expense.id}`,
    type: "expense",
    amount: expense.amount,
    date: expense.date.toISOString(),
    note: `${expense.description} (${EXPENSE_CATEGORY_LABELS[category as ExpenseCategory]})`,
  }).catch(() => {});

  return NextResponse.json({ expense });
}
