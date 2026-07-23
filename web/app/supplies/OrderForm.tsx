"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupplyVendor } from "@prisma/client";
import { VENDOR_ICONS } from "@/lib/supplies/constants";

interface CatalogItem {
  id: string;
  name: string;
  vendor: SupplyVendor;
  url: string | null;
  imageUrl: string | null;
  alternativeNote: string | null;
  notes: string | null;
  isCommon: boolean;
  sizeOptions: string[] | null;
}

interface AdHocRow {
  key: number;
  name: string;
  url: string;
  quantity: number;
}

interface Props {
  properties: { id: string; name: string }[];
  catalog: CatalogItem[];
}

export default function OrderForm({ properties, catalog }: Props) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [tab, setTab] = useState<"common" | "all">("common");
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  // Sized items (sheets, duvet covers, etc.) get one quantity per size
  // instead of a single size picker, so an order can include e.g. 2 Queen
  // sets and 1 King set of the same item. Keyed as sizeQuantities[itemId][size].
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, Record<string, number>>>({});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const adHocKey = useRef(0);
  const [adHoc, setAdHoc] = useState<AdHocRow[]>([{ key: 0, name: "", url: "", quantity: 1 }]);

  const commonItems = useMemo(() => catalog.filter((i) => i.isCommon), [catalog]);
  const visibleItems = useMemo(() => {
    const base = tab === "common" ? commonItems : catalog;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((i) => i.name.toLowerCase().includes(q));
  }, [tab, commonItems, catalog, search]);

  function setQuantity(id: string, value: number) {
    setQuantities((prev) => ({ ...prev, [id]: value }));
  }

  function setSizeQuantity(id: string, size: string, value: number) {
    setSizeQuantities((prev) => ({
      ...prev,
      [id]: { ...prev[id], [size]: value },
    }));
  }

  function addAdHocRow() {
    adHocKey.current += 1;
    setAdHoc((prev) => [...prev, { key: adHocKey.current, name: "", url: "", quantity: 1 }]);
  }

  function updateAdHocRow(key: number, patch: Partial<AdHocRow>) {
    setAdHoc((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeAdHocRow(key: number) {
    setAdHoc((prev) => prev.filter((row) => row.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!propertyId) {
      setError("Pick a property.");
      return;
    }

    const items: Array<{
      supplyItemId?: string;
      adHocName?: string;
      adHocUrl?: string;
      quantity: number;
      size?: string;
    }> = [];

    for (const item of catalog) {
      if (item.sizeOptions) {
        for (const size of item.sizeOptions) {
          const qty = sizeQuantities[item.id]?.[size] ?? 0;
          if (qty <= 0) continue;
          items.push({ supplyItemId: item.id, quantity: qty, size });
        }
        continue;
      }
      const qty = quantities[item.id] ?? 0;
      if (qty <= 0) continue;
      items.push({ supplyItemId: item.id, quantity: qty });
    }

    for (const row of adHoc) {
      if (!row.name.trim()) continue;
      items.push({
        adHocName: row.name.trim(),
        adHocUrl: row.url.trim() || undefined,
        quantity: row.quantity,
      });
    }

    if (items.length === 0) {
      setError("Add at least one item.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/supplies/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, notes: notes.trim() || undefined, items }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to submit order.");
      }
      const { order } = await res.json();
      router.push(`/supplies/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <label htmlFor="property" className="mb-1 block text-sm font-medium">
          Property
        </label>
        <select
          id="property"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="w-full max-w-sm rounded-md border border-neutral-300 p-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-md border border-neutral-300 p-1 text-sm dark:border-neutral-700">
            <button
              type="button"
              onClick={() => setTab("common")}
              className={`rounded px-3 py-1 ${
                tab === "common" ? "bg-brand-gold text-brand-gold-contrast" : "text-neutral-500"
              }`}
            >
              Commonly Purchased
            </button>
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`rounded px-3 py-1 ${
                tab === "all" ? "bg-brand-gold text-brand-gold-contrast" : "text-neutral-500"
              }`}
            >
              All Items
            </button>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="min-w-[200px] flex-1 rounded-md border border-neutral-300 p-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
            >
              <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-5xl dark:bg-neutral-800">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="h-full w-full rounded-md object-cover" />
                ) : (
                  VENDOR_ICONS[item.vendor]
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={item.name}>
                  {item.name}
                </p>
                {(item.alternativeNote || item.notes) && (
                  <p className="truncate text-xs text-neutral-500" title={item.alternativeNote ?? item.notes ?? ""}>
                    {item.alternativeNote ?? item.notes}
                  </p>
                )}
                {item.sizeOptions ? (
                  <div className="mt-2 flex flex-col gap-1">
                    {item.sizeOptions.map((size) => (
                      <div key={size} className="flex items-center gap-2">
                        <span className="w-16 shrink-0 text-xs text-neutral-500">{size}</span>
                        <input
                          type="number"
                          min={0}
                          value={sizeQuantities[item.id]?.[size] ?? 0}
                          onChange={(e) =>
                            setSizeQuantity(item.id, size, Math.max(0, Number(e.target.value)))
                          }
                          className="w-16 rounded border border-neutral-300 p-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={quantities[item.id] ?? 0}
                      onChange={(e) => setQuantity(item.id, Math.max(0, Number(e.target.value)))}
                      className="w-16 rounded border border-neutral-300 p-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          {visibleItems.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-neutral-500">
              No items match &ldquo;{search}&rdquo;.
            </p>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Other item (paste a link from Slack, etc.)</p>
        <div className="flex flex-col gap-2">
          {adHoc.map((row) => (
            <div key={row.key} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Item name"
                value={row.name}
                onChange={(e) => updateAdHocRow(row.key, { name: e.target.value })}
                className="min-w-[160px] flex-1 rounded border border-neutral-300 p-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <input
                type="url"
                placeholder="Amazon/Instacart link (optional)"
                value={row.url}
                onChange={(e) => updateAdHocRow(row.key, { url: e.target.value })}
                className="min-w-[200px] flex-[2] rounded border border-neutral-300 p-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <input
                type="number"
                min={1}
                value={row.quantity}
                onChange={(e) => updateAdHocRow(row.key, { quantity: Math.max(1, Number(e.target.value)) })}
                className="w-16 rounded border border-neutral-300 p-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              {adHoc.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAdHocRow(row.key)}
                  className="text-sm text-neutral-500 hover:text-red-600"
                  aria-label="Remove"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addAdHocRow}
            className="self-start text-sm text-neutral-500 underline hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            + Add another item
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything the office should know — urgency, guest impact, etc."
          className="w-full rounded-md border border-neutral-300 p-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-md bg-brand-gold px-5 py-2 text-sm font-medium text-brand-gold-contrast transition-colors hover:bg-brand-gold-hover disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit Order"}
      </button>
    </form>
  );
}
