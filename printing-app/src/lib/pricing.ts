export const CURRENCY = { code: "CNY", symbol: "¥" } as const;

/**
 * Rate is per PRINTED SIDE (i.e. per page of the source document), before
 * multiplying by number of copies. Duplex only changes how many physical
 * sheets of paper are used, not the document's page count.
 *
 * From Nayem's printed price list:
 *   B&W single-side  ¥0.10   B&W double-sided  ¥0.15
 *   Color single-side ¥0.20   Color double-sided ¥0.30
 *
 * Not included here: "Picture Print (9 copies) — ¥4" is a flat-rate
 * photo-sheet product (one photo printed 9-up on a sheet), a different
 * shape of order than "N pages of a document at a per-page rate." The
 * order form doesn't support it yet — ask Nayem before adding it.
 */
export const PRICE_PER_PAGE: Record<"bw" | "color", Record<"single" | "double", number>> = {
  bw: { single: 0.1, double: 0.15 },
  color: { single: 0.2, double: 0.3 },
};

export function ratePerPage(color: boolean, duplex: boolean): number {
  return PRICE_PER_PAGE[color ? "color" : "bw"][duplex ? "double" : "single"];
}

export function calculatePrice(options: {
  pages: number;
  copies: number;
  color: boolean;
  duplex: boolean;
}): { pricePerPage: number; totalPrice: number } {
  const pricePerPage = ratePerPage(options.color, options.duplex);
  const raw = pricePerPage * options.pages * options.copies;
  const totalPrice = Math.round(raw * 100) / 100;
  return { pricePerPage, totalPrice };
}

export function formatMoney(amount: number): string {
  return `${CURRENCY.symbol}${amount.toFixed(2)}`;
}
