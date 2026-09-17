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

  // HTTP header values must be Latin-1 — a customer filename with e.g.
  // full-width punctuation or CJK characters would otherwise crash this
  // route. Ship an ASCII fallback plus the real name via the standard
  // filename* (RFC 5987) so browsers still show/save it correctly.
  const asciiName = order.originalName.replace(/[^\x20-\x7E]/g, "_").replace(/["\r\n]/g, "_");
  const encodedName = encodeURIComponent(order.originalName);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": order.mimeType,
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}
