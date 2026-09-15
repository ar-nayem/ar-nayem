"use client";

import { useState } from "react";
import type { Order } from "@/generated/prisma/client";
import { formatMoney } from "@/lib/pricing";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orderStatus";

// Local print agent running on the same Mac as the printer — see
// print-agent/README.md. Loopback-only, so this only ever works when the
// dashboard is open on that machine.
const PRINT_AGENT_URL = "http://127.0.0.1:8877/print";

type PrintState = { kind: "printing" } | { kind: "success"; jobId: string } | { kind: "error"; message: string };

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
  const [printState, setPrintState] = useState<Record<string, PrintState>>({});

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

  async function handleTogglePaid(id: string, paid: boolean) {
    setUpdatingId(id);
    const previous = orders;
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, paid } : o)));
    try {
      const res = await fetch(`/api/dashboard/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid }),
      });
      if (!res.ok) setOrders(previous);
    } catch {
      setOrders(previous);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handlePrint(order: Order) {
    setPrintState((prev) => ({ ...prev, [order.id]: { kind: "printing" } }));
    try {
      const fileRes = await fetch(`/api/dashboard/orders/${order.id}/file`);
      if (!fileRes.ok) throw new Error("Could not load the order's file.");
      const blob = await fileRes.blob();

      const form = new FormData();
      form.append("file", new File([blob], order.originalName, { type: blob.type }));
      form.append("orderId", order.id);
      form.append("copies", String(order.copies));
      form.append("duplex", String(order.duplex));
      form.append("color", String(order.color));
      if (order.pageRange) form.append("pageRange", order.pageRange);

      const printRes = await fetch(PRINT_AGENT_URL, { method: "POST", body: form });
      const data = await printRes.json();
      if (!printRes.ok || !data.success) {
        throw new Error(data.error || "Print agent rejected the job.");
      }
      setPrintState((prev) => ({ ...prev, [order.id]: { kind: "success", jobId: data.jobId } }));
    } catch (err) {
      const message =
        err instanceof TypeError
          ? "Print agent not running on this computer."
          : err instanceof Error
            ? err.message
            : "Print failed.";
      setPrintState((prev) => ({ ...prev, [order.id]: { kind: "error", message } }));
    } finally {
      setTimeout(() => {
        setPrintState((prev) => {
          const next = { ...prev };
          delete next[order.id];
          return next;
        });
      }, 5000);
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
        {orders.map((order) => {
          const print = printState[order.id];
          return (
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
                {order.pageRange ? `Pages ${order.pageRange} of ${order.pages}` : `${order.pages} pages`} ·{" "}
                {order.duplex ? "Double-sided" : "Single-sided"} ·{" "}
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
              <button
                onClick={() => handleTogglePaid(order.id, !order.paid)}
                disabled={updatingId === order.id}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                  order.paid
                    ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400 dark:hover:bg-green-900/60"
                    : "border border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
                }`}
              >
                {order.paid ? "✓ Paid" : "Mark paid"}
              </button>
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
              <button
                onClick={() => handlePrint(order)}
                disabled={print?.kind === "printing"}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {print?.kind === "printing" ? "Printing…" : "Print"}
              </button>
            </div>
            {print?.kind === "success" && (
              <p className="mt-1 text-xs text-green-600 sm:basis-full">Printed — job {print.jobId}</p>
            )}
            {print?.kind === "error" && (
              <p className="mt-1 text-xs text-red-600 sm:basis-full">{print.message}</p>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
