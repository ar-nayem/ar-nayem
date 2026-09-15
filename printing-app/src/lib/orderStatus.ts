export const ORDER_STATUSES = ["pending", "printing", "ready", "completed", "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  printing: "Printing",
  ready: "Ready for pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};
