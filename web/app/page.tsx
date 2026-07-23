import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const [needsReview, receiptCount, transactionCount, pendingOrders, totalOrders] =
    await Promise.all([
      prisma.transaction.count({ where: { needsReview: true } }),
      prisma.receipt.count(),
      prisma.transaction.count(),
      prisma.supplyOrder.count({ where: { status: "pending" } }),
      prisma.supplyOrder.count(),
    ]);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Luxury Desert Escapes</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
          <Link href="/review" className="group mb-4 block">
            <h2 className="text-lg font-semibold group-hover:text-brand-gold">Receipt Tracking</h2>
            <p className="text-sm text-neutral-500">Statements, receipts, and owner billing.</p>
          </Link>
          <div className="grid grid-cols-3 gap-3">
            <Link href="/review" className="rounded-md border border-neutral-200 p-3 transition-colors hover:border-brand-gold dark:border-neutral-800">
              <div className="text-2xl font-semibold">{needsReview}</div>
              <div className="text-xs text-neutral-500">Needs review</div>
            </Link>
            <Link href="/review" className="rounded-md border border-neutral-200 p-3 transition-colors hover:border-brand-gold dark:border-neutral-800">
              <div className="text-2xl font-semibold">{receiptCount}</div>
              <div className="text-xs text-neutral-500">Receipts on file</div>
            </Link>
            <Link href="/review" className="rounded-md border border-neutral-200 p-3 transition-colors hover:border-brand-gold dark:border-neutral-800">
              <div className="text-2xl font-semibold">{transactionCount}</div>
              <div className="text-xs text-neutral-500">Transactions</div>
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/receipts/new"
              className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-gold-contrast transition-colors hover:bg-brand-gold-hover"
            >
              + Add a receipt
            </Link>
            <Link
              href="/statements"
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
            >
              Upload a statement / CSV
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
          <Link href="/supplies/orders" className="group mb-4 block">
            <h2 className="text-lg font-semibold group-hover:text-brand-gold">Supply Ordering</h2>
            <p className="text-sm text-neutral-500">Order sheets for the properties, by vendor.</p>
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/supplies/orders" className="rounded-md border border-neutral-200 p-3 transition-colors hover:border-brand-gold dark:border-neutral-800">
              <div className="text-2xl font-semibold">{pendingOrders}</div>
              <div className="text-xs text-neutral-500">Pending orders</div>
            </Link>
            <Link href="/supplies/orders" className="rounded-md border border-neutral-200 p-3 transition-colors hover:border-brand-gold dark:border-neutral-800">
              <div className="text-2xl font-semibold">{totalOrders}</div>
              <div className="text-xs text-neutral-500">Total orders</div>
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/supplies"
              className="rounded-md bg-brand-gold px-4 py-2 text-sm font-medium text-brand-gold-contrast transition-colors hover:bg-brand-gold-hover"
            >
              + Place an order
            </Link>
            <Link
              href="/supplies/catalog"
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
            >
              Manage catalog
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
