"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      setMessage(
        data.message ?? "If that email has an account, an admin has been notified and will reset it for you."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (message) {
    return (
      <div className="flex w-full max-w-xs flex-col items-center gap-4 text-center">
        <p className="text-sm text-neutral-300">{message}</p>
        <Link href="/login" className="text-sm text-brand-gold underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="username"
        className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-brand-gold focus:outline-none"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-brand-gold px-5 py-2.5 font-medium text-brand-gold-contrast transition-colors hover:bg-brand-gold-hover disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Notify an admin"}
      </button>
      <Link href="/login" className="text-center text-sm text-neutral-400 underline">
        Back to sign in
      </Link>
    </form>
  );
}
