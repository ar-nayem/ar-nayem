export const CURRENCY = { code: "CNY", symbol: "¥" } as const;

/**
 * Single-sided rate is per PAGE (one page = one sheet, one side used).
 * Double-sided rate is per SHEET — a duplexed sheet holds up to 2 pages
 * (front + back), and the ¥0.15/¥0.30 price is for that whole sheet, not
 * per page on it. So a 2-page duplex B&W order uses 1 sheet at ¥0.15
 * total, not 2 × ¥0.15.
 *
 * From Nayem's printed price list:
 *   B&W single-side  ¥0.10/page   B&W double-sided  ¥0.15/sheet
 *   Color single-side ¥0.20/page   Color double-sided ¥0.30/sheet
 *
 * Not included here: "Picture Print (9 copies) — ¥4" is a flat-rate
 * photo-sheet product (one photo printed 9-up on a sheet), a different
 * shape of order than "N pages of a document at a per-page rate." The
 * order form doesn't support it yet — ask Nayem before adding it.
 */
export const PRICE_PER_UNIT: Record<"bw" | "color", Record<"single" | "double", number>> = {
  bw: { single: 0.1, double: 0.15 },
  color: { single: 0.2, double: 0.3 },
};

export function ratePerSheet(color: boolean, duplex: boolean): number {
  return PRICE_PER_UNIT[color ? "color" : "bw"][duplex ? "double" : "single"];
}

export function calculatePrice(options: {
  pages: number;
  copies: number;
  color: boolean;
  duplex: boolean;
}): { pricePerPage: number; totalPrice: number } {
  const rate = ratePerSheet(options.color, options.duplex);
  const sheets = options.duplex ? Math.ceil(options.pages / 2) : options.pages;
  const raw = rate * sheets * options.copies;
  const totalPrice = Math.round(raw * 100) / 100;
  return { pricePerPage: rate, totalPrice };
}

export function formatMoney(amount: number): string {
  return `${CURRENCY.symbol}${amount.toFixed(2)}`;
}
