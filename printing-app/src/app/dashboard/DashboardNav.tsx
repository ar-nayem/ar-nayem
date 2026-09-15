"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Orders" },
  { href: "/dashboard/finance", label: "Finance" },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            pathname === tab.href
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "bg-white text-zinc-600 border border-zinc-300 hover:border-zinc-400 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
