"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncNowButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setSummary(null);
    try {
      const res = await fetch("/api/email-accounts/sync", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Sync failed.");
      const total = body.results.reduce((sum: number, r: { created: number }) => sum + r.created, 0);
      const errors = body.results.filter((r: { error?: string }) => r.error);
      setSummary(
        `Found ${total} new receipt${total === 1 ? "" : "s"} across ${body.results.length} inbox(es).` +
          (errors.length ? ` ${errors.length} inbox(es) hit an error.` : "")
      );
      router.refresh();
    } catch (err) {
      setSummary(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={running}
        className="rounded bg-brand-gold px-3 py-1.5 text-sm font-medium text-brand-gold-contrast transition-colors hover:bg-brand-gold-hover disabled:opacity-50"
      >
        {running ? "Searching…" : "Search Now"}
      </button>
      {summary && <span className="text-sm text-neutral-500">{summary}</span>}
    </div>
  );
}
