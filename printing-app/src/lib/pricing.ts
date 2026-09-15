export const CURRENCY = { code: "CNY", symbol: "¥" } as const;

/**
 * TODO(nayem): replace these with your real price list once you have it.
 * Rate is per PRINTED SIDE (i.e. per page of the source document), before
 * multiplying by number of copies. Duplex only changes how many physical
 * sheets of paper are used, not the document's page count.
 */
export const PRICE_PER_PAGE: Record<"bw" | "color", Record<"single" | "double", number>> = {
  bw: { single: 0.5, double: 0.4 },
  color: { single: 2, double: 1.8 },
};

// Smallest amount ever charged for a single order, e.g. one B&W page.
export const MINIMUM_CHARGE = 1;

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
  const totalPrice = Math.max(Math.round(raw * 100) / 100, MINIMUM_CHARGE);
  return { pricePerPage, totalPrice };
}

export function formatMoney(amount: number): string {
  return `${CURRENCY.symbol}${amount.toFixed(2)}`;
}
