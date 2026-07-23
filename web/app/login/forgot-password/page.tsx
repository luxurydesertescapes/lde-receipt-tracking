import Image from "next/image";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-brand-dark p-8">
      <Image
        src="/brand/logo-horizontal-white-gold.png"
        alt="Luxury Desert Escapes"
        width={280}
        height={78}
        priority
        className="h-14 w-auto"
      />
      <p className="max-w-xs text-center text-sm text-neutral-400">
        Enter your email and an admin will be notified to reset your password.
      </p>
      <ForgotPasswordForm />
    </main>
  );
}
