"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTaskStore } from "@/store/taskStore";
import { STATUS_ORDER, STATUS_TITLES, type Status } from "@/types";
import { useToast } from "./ToastProvider";
import { useAnnouncer } from "./Announcer";

type Action = {
  id: string;
  title: string;
  group?: "Tasks" | "Filters" | "Labels" | "Search";
  keywords?: string[];
  perform: () => void;
  shortcut?: string;
};

export function CommandPalette({ onNewTask, focusSearch }: { onNewTask: (status?: Status) => void; focusSearch: () => void }) {
  const { state, filters, setFilters } = useTaskStore();
  const { notify } = useToast();
  const { announce } = useAnnouncer();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Toggle with Cmd/Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus and hide app background while open
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    const appRoot = document.getElementById("app-root");
    if (appRoot) appRoot.setAttribute("aria-hidden", "true");
    return () => {
      window.clearTimeout(t);
      if (appRoot) appRoot.removeAttribute("aria-hidden");
    };
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const actions: Action[] = useMemo(() => {
    const list: Action[] = [
      { id: "h_tasks", title: "Tasks", group: "Tasks", perform: () => {} },
      { id: "new", title: "New Task", group: "Tasks", shortcut: "N", perform: () => { setOpen(false); onNewTask(); } },
      ...STATUS_ORDER.map<Action>((s) => ({ id: `new_${s}`, title: `New Task in ${STATUS_TITLES[s]}`, group: "Tasks", perform: () => { setOpen(false); onNewTask(s); } })),

      { id: "h_filters", title: "Filters", group: "Filters", perform: () => {} },
      { id: "filter_all", title: "Filter: All", group: "Filters", perform: () => { setFilters({ when: "all" }); notify({ type: "info", title: "Filter: All" }); announce("Filter set to All"); setOpen(false); } },
      { id: "filter_today", title: "Filter: Today", group: "Filters", perform: () => { setFilters({ when: "today" }); notify({ type: "info", title: "Filter: Today" }); announce("Filter set to Today"); setOpen(false); } },
      { id: "filter_upcoming", title: "Filter: Upcoming", group: "Filters", perform: () => { setFilters({ when: "upcoming" }); notify({ type: "info", title: "Filter: Upcoming" }); announce("Filter set to Upcoming"); setOpen(false); } },

      { id: "h_labels", title: "Labels", group: "Labels", perform: () => {} },
      ...state.labels.map<Action>((l) => ({
        id: `label_${l.id}`,
        title: `Toggle label: ${l.name}`,
        group: "Labels",
        keywords: [l.name],
        perform: () => {
          const has = filters.labelIds.includes(l.id);
          const labelIds = has ? filters.labelIds.filter((id) => id !== l.id) : [...filters.labelIds, l.id];
          setFilters({ labelIds });
          announce(`${l.name} label ${has ? "off" : "on"}`);
          notify({ type: "info", title: `${l.name}: ${has ? "off" : "on"}` });
          setOpen(false);
        },
      })),
    ];
    return list;
  }, [state.labels, filters.labelIds, setFilters, onNewTask, notify, announce]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = actions.filter((a) => a.id.startsWith("h_") || q === "" || `${a.title} ${(a.keywords ?? []).join(" ")}`.toLowerCase().includes(q));
    if (q) {
      list = [
        { id: "h_search", title: "Search", group: "Search", perform: () => {} },
        { id: "search_set", title: `Search "${query}"`, group: "Search", perform: () => { setFilters({ query }); announce(query ? `Search set to ${query}` : "Search cleared"); setOpen(false); focusSearch(); } },
        ...list,
      ];
    }
    return list;
  }, [actions, query, setFilters, announce, focusSearch]);

  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => setActiveIdx(0), [query, open]);

  const overlay = (
    <div className="fixed inset-0 z-100 bg-black/30 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="Command Palette" onClick={() => setOpen(false)}>
      <div className="mx-auto w-full max-w-lg" onClick={(e) => e.stopPropagation()} ref={dialogRef}>
        <div className="overflow-hidden rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl ring-1 ring-black/5">
          <div className="relative">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
                if (e.key === "Enter") { e.preventDefault(); filtered[activeIdx]?.perform(); }
              }}
              placeholder="Type a command or search tasks…"
              className="w-full bg-transparent px-4 py-3 text-sm outline-none"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">Ctrl/⌘ K</span>
          </div>
          <ul className="max-h-80 overflow-auto border-t border-zinc-200 dark:border-zinc-800">
            {filtered.map((a, i) => (
              <li key={a.id}>
                {a.id.startsWith("h_") ? (
                  <div className="px-4 py-2 text-[11px] uppercase tracking-wide text-zinc-400">{a.title}</div>
                ) : (
                  <button
                    className={`flex w-full items-center justify-between px-4 py-2 text-sm text-left transition ${i === activeIdx ? "bg-zinc-100 dark:bg-zinc-900" : ""}`}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => a.perform()}
                  >
                    <span>{a.title}</span>
                    {a.shortcut ? (
                      <kbd className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500 border border-zinc-200 dark:border-zinc-700">{a.shortcut}</kbd>
                    ) : null}
                  </button>
                )}
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-zinc-500">No results</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );

  if (!open) return null;
  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}

