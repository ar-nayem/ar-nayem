import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/pricing";
import { ORDER_STATUS_LABELS, isOrderStatus } from "@/lib/orderStatus";

export default async function OrderStatusPage({
  params,
}: PageProps<"/order/[id]">) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) {
    notFound();
  }

  const statusLabel = isOrderStatus(order.status) ? ORDER_STATUS_LABELS[order.status] : order.status;

  return (
    <main className="flex flex-1 justify-center px-4 py-10">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Order received</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Show this page or your order ID when you come to collect and pay.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white p-6 dark:bg-zinc-900 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400">#{order.id}</span>
            <div className="flex items-center gap-2">
              {order.paid && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                  Paid
                </span>
              )}
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {statusLabel}
              </span>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-zinc-500 dark:text-zinc-400">Name</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">{order.customerName}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">File</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">{order.originalName}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Pages</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">
              {order.pageRange ? `${order.pageRange} of ${order.pages}` : order.pages}
            </dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Sides</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">{order.duplex ? "Double-sided" : "Single-sided"}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Color</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">{order.color ? "Color" : "Black & White"}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Copies</dt>
            <dd className="text-zinc-900 dark:text-zinc-50">{order.copies}</dd>
            {order.notes && (
              <>
                <dt className="text-zinc-500 dark:text-zinc-400">Notes</dt>
                <dd className="text-zinc-900 dark:text-zinc-50">{order.notes}</dd>
              </>
            )}
          </dl>

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 flex items-baseline justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Total to pay</span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {formatMoney(order.totalPrice)}
            </span>
          </div>
        </div>

        {!order.paid && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white p-6 dark:bg-zinc-900 space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Scan to pay {formatMoney(order.totalPrice)}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Or skip this and pay in cash when you pick up.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/pay/wechat-qr.png"
                  alt="Scan with WeChat to pay"
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800"
                />
                <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">WeChat Pay</p>
              </div>
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/pay/alipay-qr.png"
                  alt="Scan with Alipay to pay"
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800"
                />
                <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">Alipay</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
              Mention order #{order.id.slice(0, 8)} in the payment note if you can.
            </p>
          </div>
        )}

        <Link href="/" className="block text-center text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100">
          Place another order
        </Link>
      </div>
    </main>
  );
}
