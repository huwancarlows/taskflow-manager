"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function AppHeader() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const isGuest = useMemo(() => typeof window !== "undefined" && localStorage.getItem("taskflow-guest") === "1", []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signOut() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("taskflow-guest");
    }
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur bg-white/70 dark:bg-zinc-950/70 shadow-sm">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-linear-to-br from-blue-600 to-fuchsia-500"    />
            <div className="leading-tight">
              <div className="font-semibold">TaskFlow Manager</div>
              <span className="text-xs text-zinc-500">Press Ctrl/⌘ K</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">
              {isGuest ? "Guest" : (email ? `User: ${email}` : "User")}
            </span>
            <button
              onClick={signOut}
              className="rounded-md border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              aria-label="Sign out"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
