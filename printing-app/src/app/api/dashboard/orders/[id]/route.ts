import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { deleteUpload } from "@/lib/storage";
import { isOrderStatus } from "@/lib/orderStatus";
import { pushFinanceEntry } from "@/lib/financeSync";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/dashboard/orders/[id]">) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json({ order });
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/dashboard/orders/[id]">) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);

  const data: { status?: string; paid?: boolean; paidAt?: Date | null } = {};

  if (body?.status !== undefined) {
    if (!isOrderStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    data.status = body.status;
  }

  if (body?.paid !== undefined) {
    data.paid = Boolean(body.paid);
    data.paidAt = data.paid ? new Date() : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    const order = await prisma.order.update({ where: { id }, data });

    if (data.paid !== undefined) {
      const externalId = `pa:order:${order.id}`;
      void (data.paid
        ? pushFinanceEntry({
            op: "upsert",
            externalId,
            type: "income",
            amount: order.totalPrice,
            date: (order.paidAt ?? new Date()).toISOString(),
            note: `Order #${order.id.slice(0, 8)} — ${order.customerName}`,
          })
        : pushFinanceEntry({ op: "delete", externalId })
      ).catch(() => {});
    }

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/dashboard/orders/[id]">) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  await deleteUpload(order.storedName);
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
