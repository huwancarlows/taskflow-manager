"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GuestPage() {
  const router = useRouter();

  useEffect(() => {
    // Mark session as guest in localStorage so app can choose local-only store
    if (typeof window !== "undefined") {
      localStorage.setItem("taskflow-guest", "1");
    }
  }, []);

  return (
    <main className="min-h-dvh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Guest Mode</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Try Taskflow without signing in.</p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-4">
          <ul className="text-sm text-zinc-600 dark:text-zinc-300 list-disc pl-5 space-y-1">
            <li>Tasks are stored locally in your browser.</li>
            <li>No cloud sync or cross-device access.</li>
            <li>You can sign in later to keep your work.</li>
          </ul>

          <div className="mt-4 space-y-2">
            <button
              onClick={() => router.push("/board")}
              className="block w-full text-center rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-2 text-sm font-medium hover:opacity-95"
            >
              Start as guest
            </button>
            <div className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              Prefer an account? <Link href="/login" className="underline underline-offset-2">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
