"use client";

import { useEffect, useRef, useState } from "react";
import { TaskStoreProvider } from "@/store/taskStore";
import { TaskBoard } from "@/components/TaskBoard";
import { FiltersBar } from "@/components/FiltersBar";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { ToastProvider } from "@/components/ToastProvider";
import { AnnouncerProvider } from "@/components/Announcer";
import type { Status } from "@/types";
import { CommandPalette } from "@/components/CommandPalette";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function BoardPage() {
  const router = useRouter();
  const [newRequest, setNewRequest] = useState(0);
  const [newRequestStatus, setNewRequestStatus] = useState<Status | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement | null>(null);

  function openNewTask(status?: Status) {
    setNewRequest((n) => n + 1);
    setNewRequestStatus(status);
  }

  // Guard: redirect to landing when no Supabase session and not in guest mode
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const guest = typeof window !== "undefined" && localStorage.getItem("taskflow-guest") === "1";
      const { data } = await supabase.auth.getSession();
      const hasSession = !!data.session;
      if (!cancelled && !guest && !hasSession) {
        router.replace("/");
      }
    };
    check();
    return () => { cancelled = true; };
  }, [router]);

  // Header is rendered globally; no local user UI needed here

  return (
    <ToastProvider>
      <TaskStoreProvider>
        <AnnouncerProvider>
          <KeyboardShortcuts
            onNewTask={() => openNewTask()}
            focusSearch={() => searchRef.current?.focus()}
          />
          <div id="app-root" className="min-h-screen text-zinc-900 dark:text-zinc-100">
            <CommandPalette onNewTask={openNewTask} focusSearch={() => searchRef.current?.focus()} />
            <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
              <FiltersBar onNewTask={() => openNewTask()} inputRef={searchRef} />
              <TaskBoard newRequest={newRequest} newRequestStatus={newRequestStatus} />
            </main>
          </div>
        </AnnouncerProvider>
      </TaskStoreProvider>
    </ToastProvider>
  );
}
