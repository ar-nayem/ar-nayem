// Parses a customer-entered page selection like "1-3,5,8-9" into the exact
// pages to print. Used for both pricing (fewer pages = fewer sheets) and
// the physical print job (passed straight to CUPS as `page-ranges`).

export type PageSelection = {
  pages: number[]; // sorted, deduped, 1-indexed
  normalized: string | null; // canonical range string, or null = all pages
};

export function parsePageRange(raw: string | null | undefined, totalPages: number): PageSelection {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return allPages(totalPages);

  const pageSet = new Set<number>();
  for (const part of trimmed.split(",").map((p) => p.trim()).filter(Boolean)) {
    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    const singleMatch = /^(\d+)$/.exec(part);

    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start < 1 || end < start) throw new Error(`Invalid page range "${part}".`);
      assertInBounds(end, totalPages);
      for (let p = start; p <= end; p++) pageSet.add(p);
    } else if (singleMatch) {
      const page = Number(singleMatch[1]);
      if (page < 1) throw new Error(`Invalid page number "${part}".`);
      assertInBounds(page, totalPages);
      pageSet.add(page);
    } else {
      throw new Error(`Couldn't understand "${part}" — use page numbers or ranges like "1-3,5".`);
    }
  }

  if (pageSet.size === 0) return allPages(totalPages);

  const pages = Array.from(pageSet).sort((a, b) => a - b);
  return { pages, normalized: toRangeString(pages) };
}

function allPages(totalPages: number): PageSelection {
  return { pages: Array.from({ length: totalPages }, (_, i) => i + 1), normalized: null };
}

function assertInBounds(page: number, totalPages: number) {
  if (page > totalPages) {
    throw new Error(
      `Page ${page} doesn't exist — this file only has ${totalPages} page${totalPages === 1 ? "" : "s"}.`,
    );
  }
}

function toRangeString(sortedPages: number[]): string {
  const ranges: string[] = [];
  let start = sortedPages[0];
  let prev = sortedPages[0];
  for (let i = 1; i <= sortedPages.length; i++) {
    const cur = sortedPages[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    if (cur !== undefined) {
      start = cur;
      prev = cur;
    }
  }
  return ranges.join(",");
}
