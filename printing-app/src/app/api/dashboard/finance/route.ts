import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { getFinanceSummary } from "@/lib/finance";
import { isFinancePeriod } from "@/lib/financePeriod";

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const periodRaw = request.nextUrl.searchParams.get("period");
  const period = isFinancePeriod(periodRaw) ? periodRaw : "month";

  const summary = await getFinanceSummary(period);
  return NextResponse.json(summary);
}
