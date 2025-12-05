"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { ToastProvider, useToast } from "@/components/ToastProvider";

function LoginContent() {
  const router = useRouter();
  const { notify } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      notify({ type: "error", title: "Couldn't sign in. Please retry." });
      setMessage(error.message);
      setLoading(false);
      return;
    }
    if (data?.user) {
      // Ensure guest mode is disabled after successful login
      if (typeof window !== "undefined") {
        localStorage.removeItem("taskflow-guest");
      }
      notify({ type: "success", title: "Signed in" });
      router.push("/board");
      return;
    }
    setMessage("Unexpected: signed in without user");
    setLoading(false);
  }

  async function onMagicLink() {
    setLoading(true);
    setMessage(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined } });
    if (error) {
      notify({ type: "error", title: "Couldn't send magic link. Please retry." });
      setMessage(error.message);
      setLoading(false);
      return;
    }
    notify({ type: "success", title: "Magic link sent" });
    setMessage("Check your email for a magic link.");
    setLoading(false);
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Welcome back</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Sign in to continue to Taskflow</p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <form onSubmit={onSubmit} className="p-4 space-y-3">
            <label className="block">
              <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500"
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500"
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-2 text-sm font-medium hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onMagicLink}
              disabled={loading || !email}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-60"
            >
              Send magic link
            </button>

            {message && (
              <div role="status" className="text-xs text-zinc-500 dark:text-zinc-400">
                {message}
              </div>
            )}
          </form>
        </div>

        <div className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-300">
          <Link href="/guest" className="underline underline-offset-2">Continue as guest</Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <ToastProvider>
      <LoginContent />
    </ToastProvider>
  );
}
