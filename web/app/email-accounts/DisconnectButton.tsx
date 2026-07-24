"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DisconnectButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    if (!confirm("Disconnect this inbox? It will stop being scanned for new receipts.")) return;
    setBusy(true);
    try {
      await fetch(`/api/email-accounts/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={disconnect}
      disabled={busy}
      className="text-xs text-neutral-400 underline hover:text-red-500"
    >
      Disconnect
    </button>
  );
}
