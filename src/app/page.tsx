"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function Landing() {
  const router = useRouter();

  useEffect(() => {
    // If logged in, go straight to board
    const supabase = supabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/board");
      }
    });
  }, [router]);

  return (
    <main className="min-h-dvh flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto h-10 w-10 rounded bg-linear-to-br from-blue-600 to-fuchsia-500" />
          <h1 className="mt-3 text-2xl font-semibold text-zinc-800 dark:text-zinc-100">TaskFlow Manager</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Pick how you want to start</p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shadow-sm p-4 space-y-3">
          <Link href="/login" className="block w-full text-center rounded-md bg-zinc-900/90 hover:bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-2 text-sm font-medium">
            Sign in
          </Link>
          <Link href="/guest" className="block w-full text-center rounded-md border border-zinc-200 dark:border-zinc-700 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Continue as guest
          </Link>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 text-center">Guest mode stores data locally on this device.</p>
        </div>
      </div>
    </main>
  );
}
