"use client";

import { useState } from "react";
import type { Order } from "@/generated/prisma/client";
import { formatMoney } from "@/lib/pricing";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orderStatus";

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function OrdersTable({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function refetch(status: "all" | OrderStatus) {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/orders?status=${status}`);
      const data = await res.json();
      if (res.ok) setOrders(data.orders);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: OrderStatus) {
    setUpdatingId(id);
    const previous = orders;
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      const res = await fetch(`/api/dashboard/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) setOrders(previous);
    } catch {
      setOrders(previous);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", ...ORDER_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setFilter(s);
              refetch(s);
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === s
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-white text-zinc-600 border border-zinc-300 hover:border-zinc-400 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
            }`}
          >
            {s === "all" ? "All" : ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-zinc-400 dark:text-zinc-500">Loading…</p>}

      {!loading && orders.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No orders here yet.</p>
      )}

      <div className="space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 sm:flex sm:items-center sm:justify-between gap-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {order.customerName}
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {order.customerPhone}
                </span>
                <span className="text-xs font-mono text-zinc-300 dark:text-zinc-600">
                  #{order.id.slice(0, 8)}
                </span>
              </div>
              <p className="text-sm text-zinc-600 truncate dark:text-zinc-400">
                {order.originalName}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {order.pages} pages · {order.duplex ? "Double-sided" : "Single-sided"} ·{" "}
                {order.color ? "Color" : "B&W"} · {order.copies}x copies ·{" "}
                {formatDate(order.createdAt)}
              </p>
              {order.notes && (
                <p className="text-xs text-zinc-500 italic dark:text-zinc-400">
                  Note: {order.notes}
                </p>
              )}
            </div>

            <div className="mt-3 sm:mt-0 flex items-center gap-3 shrink-0">
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {formatMoney(order.totalPrice)}
              </span>
              <select
                value={order.status}
                disabled={updatingId === order.id}
                onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <a
                href={`/api/dashboard/orders/${order.id}/file`}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
