import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/db";
import { calculatePrice } from "@/lib/pricing";
import { parsePageRange } from "@/lib/pageRange";
import {
  ACCEPTED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  generateStoredName,
  saveUpload,
} from "@/lib/storage";

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const file = formData.get("file");
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const copiesRaw = String(formData.get("copies") ?? "1");
  const color = String(formData.get("color") ?? "false") === "true";
  const duplex = String(formData.get("duplex") ?? "false") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Please attach a PDF or image file." }, { status: 400 });
  }
  if (!customerName || !customerPhone) {
    return NextResponse.json(
      { error: "Please provide your name and a phone number." },
      { status: 400 },
    );
  }

  const copies = Math.round(Number(copiesRaw));
  if (!Number.isFinite(copies) || copies < 1 || copies > 500) {
    return NextResponse.json({ error: "Copies must be between 1 and 500." }, { status: 400 });
  }

  const fileKind = ACCEPTED_MIME_TYPES[file.type];
  if (!fileKind) {
    return NextResponse.json(
      { error: "Only PDF, JPG, PNG or WEBP files are accepted." },
      { status: 400 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File is too large. Maximum size is ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let pages = 1;
  if (fileKind === "pdf") {
    try {
      const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      pages = pdf.getPageCount();
    } catch {
      return NextResponse.json(
        { error: "Could not read that PDF. It may be corrupted or password-protected." },
        { status: 400 },
      );
    }
  }
  if (pages < 1) {
    return NextResponse.json({ error: "The uploaded file has no pages." }, { status: 400 });
  }

  const pageRangeRaw = fileKind === "pdf" ? String(formData.get("pageRange") ?? "") : "";
  let selection;
  try {
    selection = parsePageRange(pageRangeRaw, pages);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid page range." }, { status: 400 });
  }

  const result = calculatePrice({
    pages: selection.pages.length,
    copies,
    color,
    duplex,
  });

  const storedName = generateStoredName(file.type);
  await saveUpload(storedName, buffer);

  const order = await prisma.order.create({
    data: {
      customerName,
      customerPhone,
      notes: notes || null,
      originalName: file.name,
      storedName,
      fileKind,
      mimeType: file.type,
      fileSize: file.size,
      pages,
      pageRange: selection.normalized,
      copies,
      color,
      duplex: result.duplex,
      pricePerPage: result.pricePerPage,
      totalPrice: result.totalPrice,
      status: "pending",
    },
  });

  return NextResponse.json({
    id: order.id,
    pages,
    pageRange: selection.normalized,
    duplex: result.duplex,
    pricePerPage: result.pricePerPage,
    totalPrice: result.totalPrice,
  });
}
