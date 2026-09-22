import { getFinanceSummary } from "@/lib/finance";
import FinanceView from "./FinanceView";
import LogoutButton from "../LogoutButton";
import DashboardNav from "../DashboardNav";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const summary = await getFinanceSummary("month");

  return (
    <main className="flex-1 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between pr-12">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Finance</h1>
            <DashboardNav />
          </div>
          <LogoutButton />
        </div>
        <FinanceView initialSummary={summary} />
      </div>
    </main>
  );
}
