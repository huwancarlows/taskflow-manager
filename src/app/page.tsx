"use client";

import { useRef, useState } from "react";
import { TaskStoreProvider } from "@/store/taskStore";
import { TaskBoard } from "@/components/TaskBoard";
import { FiltersBar } from "@/components/FiltersBar";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { ToastProvider } from "@/components/ToastProvider";
import { AnnouncerProvider } from "@/components/Announcer";
import type { Status } from "@/types";
import { CommandPalette } from "@/components/CommandPalette";

export default function Home() {
  const [newRequest, setNewRequest] = useState(0);
  const [newRequestStatus, setNewRequestStatus] = useState<Status | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement | null>(null);

  function openNewTask(status?: Status) {
    setNewRequest((n) => n + 1);
    setNewRequestStatus(status);
  }

  return (
    <ToastProvider>
      <TaskStoreProvider>
        <AnnouncerProvider>
          <KeyboardShortcuts
            onNewTask={() => openNewTask()}
            focusSearch={() => searchRef.current?.focus()}
          />
          <div id="app-root" className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
          <header className="sticky top-0 z-10 border-b border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur bg-white/70 dark:bg-zinc-950/70 shadow-sm">
            <div className="mx-auto max-w-6xl px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-linear-to-br from-blue-600 to-fuchsia-500" />
                  <div className="leading-tight">
                    <div className="font-semibold">TaskFlow Manager</div>
                <span className="text-xs text-zinc-500">Press Ctrl/⌘ K</span>
                  </div>
                </div>
                <span className="text-xs text-zinc-500">N: new • /: search • T/U: filters</span>
              </div>
            </div>
          </header>
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
