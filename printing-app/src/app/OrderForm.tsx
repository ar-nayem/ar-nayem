"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CURRENCY } from "@/lib/pricing";

type Quote = {
  pages: number;
  printPages: number;
  pageRange: string | null;
  pricePerPage: number;
  totalPrice: number;
  fileKind: string;
};

function money(amount: number) {
  return `${CURRENCY.symbol}${amount.toFixed(2)}`;
}

export default function OrderForm() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [copies, setCopies] = useState(1);
  const [color, setColor] = useState(false);
  const [duplex, setDuplex] = useState(true);
  const [pageRange, setPageRange] = useState("");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"quote" | "submit" | null>(null);

  const isPdf = file?.type === "application/pdf";

  function buildFormData() {
    const fd = new FormData();
    if (file) fd.set("file", file);
    fd.set("customerName", customerName);
    fd.set("customerPhone", customerPhone);
    fd.set("notes", notes);
    fd.set("copies", String(copies));
    fd.set("color", String(color));
    fd.set("duplex", String(duplex));
    if (isPdf) fd.set("pageRange", pageRange);
    return fd;
  }

  function resetQuoteIfStale() {
    if (quote) setQuote(null);
  }

  async function handleGetPrice(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please attach a PDF or image file first.");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setError("Please enter your name and phone number.");
      return;
    }

    setBusy("quote");
    try {
      const res = await fetch("/api/orders/quote", { method: "POST", body: buildFormData() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setQuote(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function handleConfirm() {
    setError(null);
    setBusy("submit");
    try {
      const res = await fetch("/api/orders", { method: "POST", body: buildFormData() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      router.push(`/order/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(null);
    }
  }

  const optionFields = (
    <>
      <div>
        <span className="block text-sm font-medium text-zinc-700 mb-2 dark:text-zinc-300">Sides</span>
        <div className="flex gap-3">
          {[
            { label: "Single-sided", value: false },
            { label: "Double-sided", value: true },
          ].map((opt) => (
            <button
              type="button"
              key={opt.label}
              onClick={() => {
                setDuplex(opt.value);
                resetQuoteIfStale();
              }}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                duplex === opt.value
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-zinc-700 mb-2 dark:text-zinc-300">Color</span>
        <div className="flex gap-3">
          {[
            { label: "Black & White", value: false },
            { label: "Color", value: true },
          ].map((opt) => (
            <button
              type="button"
              key={opt.label}
              onClick={() => {
                setColor(opt.value);
                resetQuoteIfStale();
              }}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                color === opt.value
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isPdf && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2 dark:text-zinc-300" htmlFor="pageRange">
            Pages to print (optional)
          </label>
          <input
            id="pageRange"
            type="text"
            value={pageRange}
            onChange={(e) => {
              setPageRange(e.target.value);
              resetQuoteIfStale();
            }}
            placeholder="e.g. 1-3, or leave blank for all pages"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2 dark:text-zinc-300" htmlFor="copies">
          Number of copies
        </label>
        <input
          id="copies"
          type="number"
          min={1}
          max={500}
          value={copies}
          onChange={(e) => {
            setCopies(Math.max(1, Math.min(500, Number(e.target.value) || 1)));
            resetQuoteIfStale();
          }}
          className="w-32 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>
    </>
  );

  if (quote) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Review your order
          </h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-zinc-500 dark:text-zinc-400">File</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{file?.name}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Pages detected</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{quote.pages}</dd>
            {quote.pageRange && (
              <>
                <dt className="text-zinc-500 dark:text-zinc-400">Printing pages</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">
                  {quote.pageRange} ({quote.printPages} page{quote.printPages === 1 ? "" : "s"})
                </dd>
              </>
            )}
            <dt className="text-zinc-500 dark:text-zinc-400">Sides</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {duplex ? "Double-sided" : "Single-sided"}
            </dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Color</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {color ? "Color" : "Black & White"}
            </dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Copies</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{copies}</dd>
          </dl>
          <div className="border-t border-zinc-200 pt-4 flex items-baseline justify-between dark:border-zinc-800">
            <span className="text-zinc-600 dark:text-zinc-400">Estimated total</span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {money(quote.totalPrice)}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Pay in person when you pick up your prints. Final price is confirmed here — it will
            not change unless the file itself is different from what we receive.
          </p>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setQuote(null)}
            disabled={busy !== null}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Back &amp; edit
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy !== null}
            className="flex-1 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {busy === "submit" ? "Placing order…" : "Confirm & place order"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleGetPrice} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2 dark:text-zinc-300" htmlFor="file">
          PDF or photo to print
        </label>
        <input
          id="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            resetQuoteIfStale();
          }}
          className="block w-full text-sm text-zinc-700 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800 dark:text-zinc-300 dark:file:bg-zinc-100 dark:file:text-zinc-900 dark:hover:file:bg-zinc-200"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          PDF, JPG, PNG or WEBP, up to 30MB.
        </p>
      </div>

      {optionFields}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2 dark:text-zinc-300" htmlFor="customerName">
            Your name
          </label>
          <input
            id="customerName"
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2 dark:text-zinc-300" htmlFor="customerPhone">
            Phone number
          </label>
          <input
            id="customerPhone"
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2 dark:text-zinc-300" htmlFor="notes">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="e.g. staple pages, A4 paper"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={busy !== null}
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {busy === "quote" ? "Calculating price…" : "Get price"}
      </button>
    </form>
  );
}
