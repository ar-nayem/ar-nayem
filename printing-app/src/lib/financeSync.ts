/**
 * Mirrors paid orders and expenses into finance.arnayem.top (finance-tracker)
 * as Transactions under the admin's "Printing Business" stream.
 *
 * Same three rules as finance-tracker's own dashboard-push.ts, which this
 * deliberately mirrors:
 *
 * 1. Must never break a save — every path is wrapped so a failure (network,
 *    a bug here, a 500 on the other end) is swallowed and logged, never
 *    thrown back at the caller.
 * 2. Adds no latency — callers fire this without awaiting.
 * 3. Idempotent by externalId, so a retried or duplicate push upserts
 *    instead of creating a second row.
 *
 * Because of rule 2, a push lost to a restart or outage on either side stays
 * lost — there is no reconcile job for this yet.
 */

// Read per call, not captured at module load — a module-level constant
// would freeze the value for the process lifetime.
const endpoint = () => process.env.FINANCE_SYNC_URL;
const secret = () => process.env.FINANCE_SYNC_SECRET;

function isConfigured(): boolean {
  return Boolean(endpoint() && secret());
}

export type FinanceSyncEntry =
  | { op: "delete"; externalId: string }
  | {
      op: "upsert";
      externalId: string;
      type: "income" | "expense";
      amount: number;
      date: string; // ISO
      note?: string;
    };

export async function pushFinanceEntry(entry: FinanceSyncEntry): Promise<void> {
  try {
    if (!isConfigured()) return;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(endpoint()!, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-webhook-secret": secret()! },
        body: JSON.stringify(entry),
        signal: controller.signal,
      });
      const text = await response.text().catch(() => "");
      console.info(
        `[finance-sync] ${entry.op} ${entry.externalId} ${response.ok ? "sent" : "FAILED"}: ${text.slice(0, 120)}`,
      );
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    // Rule 1. Nothing below this line may propagate.
    console.warn("[finance-sync] unexpected error:", error);
  }
}
