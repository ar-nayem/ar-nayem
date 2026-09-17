import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { pushFinanceEntry } from "@/lib/financeSync";

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/dashboard/expenses/[id]">) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  try {
    await prisma.expense.delete({ where: { id } });
    void pushFinanceEntry({ op: "delete", externalId: `pa:expense:${id}` }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }
}
