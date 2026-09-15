import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { calculatePrice } from "@/lib/pricing";
import { parsePageRange } from "@/lib/pageRange";
import { ACCEPTED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/storage";

// Computes pages + price for the options the customer picked, without
// saving anything — lets the order form show a price before the customer
// commits to placing the order.
export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const file = formData.get("file");
  const copiesRaw = String(formData.get("copies") ?? "1");
  const color = String(formData.get("color") ?? "false") === "true";
  const duplex = String(formData.get("duplex") ?? "false") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Please attach a PDF or image file." }, { status: 400 });
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

  let pages = 1;
  if (fileKind === "pdf") {
    const buffer = Buffer.from(await file.arrayBuffer());
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

  // Page ranges only make sense for multi-page PDFs — a single image is
  // always exactly one "page".
  const pageRangeRaw = fileKind === "pdf" ? String(formData.get("pageRange") ?? "") : "";
  let selection;
  try {
    selection = parsePageRange(pageRangeRaw, pages);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid page range." }, { status: 400 });
  }

  const { pricePerPage, totalPrice } = calculatePrice({
    pages: selection.pages.length,
    copies,
    color,
    duplex,
  });
  return NextResponse.json({
    pages,
    printPages: selection.pages.length,
    pageRange: selection.normalized,
    pricePerPage,
    totalPrice,
    fileKind,
  });
}
