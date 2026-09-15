"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/pricing";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
} from "@/lib/expenseCategory";
import { FINANCE_PERIODS, FINANCE_PERIOD_LABELS, type FinancePeriod } from "@/lib/financePeriod";
import type { FinanceSummary } from "@/lib/finance";

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function FinanceView({ initialSummary }: { initialSummary: FinanceSummary }) {
  const [summary, setSummary] = useState(initialSummary);
  const [period, setPeriod] = useState<FinancePeriod>(initialSummary.period);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("paper");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayInputValue());
  const [submitting, setSubmitting] = useState(false);

  async function refetch(nextPeriod: FinancePeriod) {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/finance?period=${nextPeriod}`);
      const data = await res.json();
      if (res.ok) setSummary(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = Number(amount);
    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Amount must be a positive number.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, category, amount: amountNum, date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setDescription("");
      setAmount("");
      setCategory("paper");
      setDate(todayInputValue());
      await refetch(period);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/dashboard/expenses/${id}`, { method: "DELETE" });
      if (res.ok) await refetch(period);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {FINANCE_PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => {
              setPeriod(p);
              refetch(p);
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              period === p
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-white text-zinc-600 border border-zinc-300 hover:border-zinc-400 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
            }`}
          >
            {FINANCE_PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-zinc-400 dark:text-zinc-500">Loading…</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Revenue</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {formatMoney(summary.revenue)}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{summary.paidOrderCount} paid orders</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Expenses</p>
          <p className="text-lg font-bold text-red-600 dark:text-red-400">
            {formatMoney(summary.expensesTotal)}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{summary.expenses.length} entries</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Net profit</p>
          <p
            className={`text-lg font-bold ${
              summary.netProfit >= 0
                ? "text-zinc-900 dark:text-zinc-50"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {formatMoney(summary.netProfit)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Awaiting payment</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {formatMoney(summary.unpaid)}
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">{summary.unpaidOrderCount} orders</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Add expense</h2>
        <form onSubmit={handleAddExpense} className="grid gap-3 sm:grid-cols-5 sm:items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-500 mb-1 dark:text-zinc-400" htmlFor="expense-description">
              Description
            </label>
            <input
              id="expense-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1 dark:text-zinc-400" htmlFor="expense-category">
              Category
            </label>
            <select
              id="expense-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1 dark:text-zinc-400" htmlFor="expense-amount">
              Amount
            </label>
            <input
              id="expense-amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1 dark:text-zinc-400" htmlFor="expense-date">
              Date
            </label>
            <input
              id="expense-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div className="sm:col-span-5">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {submitting ? "Adding…" : "Add expense"}
            </button>
          </div>
        </form>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <div className="space-y-3">
        {summary.expenses.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No expenses in this period.</p>
        )}
        {summary.expenses.map((expense) => (
          <div
            key={expense.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center justify-between gap-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                {expense.description}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {EXPENSE_CATEGORY_LABELS[expense.category as ExpenseCategory] ?? expense.category} ·{" "}
                {formatDate(expense.date)}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                -{formatMoney(expense.amount)}
              </span>
              <button
                onClick={() => handleDeleteExpense(expense.id)}
                disabled={deletingId === expense.id}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:border-red-400 hover:text-red-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-red-500 dark:hover:text-red-400"
              >
                {deletingId === expense.id ? "…" : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
