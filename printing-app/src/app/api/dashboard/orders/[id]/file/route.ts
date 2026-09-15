import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { readUpload } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/dashboard/orders/[id]/file">,
) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await readUpload(order.storedName);
  } catch {
    return NextResponse.json({ error: "File is missing on disk." }, { status: 410 });
  }

  const safeName = order.originalName.replace(/["\r\n]/g, "_");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": order.mimeType,
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}
