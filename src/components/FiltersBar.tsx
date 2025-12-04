"use client";

import { useMemo, useRef, useState } from "react";
import { useTaskStore } from "@/store/taskStore";
import { BG, RING } from "./colorClasses";
import { useAnnouncer } from "./Announcer";

export function FiltersBar({ onNewTask, inputRef }: { onNewTask: () => void; inputRef?: React.RefObject<HTMLInputElement | null> }) {
  const { state, filters, setFilters } = useTaskStore();
  const [query, setQuery] = useState(filters.query);
  const localRef = useRef<HTMLInputElement | null>(null);
  const searchRef = inputRef ?? localRef;
  const { announce } = useAnnouncer();

  // activeLabels by ID not used after switching to name-based selection
  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of state.labels) m.set(l.id, l.name.toLowerCase());
    return m;
  }, [state.labels]);
  const selectedNames = useMemo(() => {
    const s = new Set<string>();
    for (const id of filters.labelIds) {
      const n = nameById.get(id);
      if (n) s.add(n);
    }
    return s;
  }, [filters.labelIds, nameById]);
  const displayLabels = useMemo(() => {
    // Show one circle per unique name to avoid duplicate colors/names
    return Array.from(new Map(state.labels.map((l) => [l.name.toLowerCase(), l])).values());
  }, [state.labels]);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.386a1 1 0 01-1.414 1.415l-3.387-3.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z"
              clipRule="evenodd"
            />
          </svg>
          <input
            ref={searchRef}
            type="search"
            placeholder="Search tasks (press /)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setFilters({ query }); announce(query ? `Search set to ${query}` : "Search cleared"); }
              if (e.key === "Escape") {
                setQuery("");
                setFilters({ query: "" });
                announce("Search cleared");
                searchRef.current?.blur();
              }
            }}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 pl-8 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          {query ? (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-sm"
              onClick={() => {
                setQuery("");
                setFilters({ query: "" });
                announce("Search cleared");
                searchRef.current?.focus();
              }}
            >
              ×
            </button>
          ) : null}
        </div>
        <div className="inline-flex overflow-hidden rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950">
          {([
            ["all", "All"],
            ["today", "Today"],
            ["upcoming", "Upcoming"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              className={`px-3 py-1.5 text-sm transition ${
                filters.when === value
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}
              onClick={() => { setFilters({ when: value }); announce(`Filter set to ${label}`); }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {displayLabels.map((l) => (
            <button
              key={l.id}
              title={l.name}
              className={`h-6 w-6 rounded-full ring-2 ring-offset-2 transition ${
                selectedNames.has(l.name.toLowerCase()) ? RING[l.color] : "ring-transparent"
              } ${BG[l.color]}`}
              onClick={() => {
                const nameKey = l.name.toLowerCase();
                const has = selectedNames.has(nameKey);
                const ids = has
                  ? filters.labelIds.filter((id) => nameById.get(id) !== nameKey)
                  : [...filters.labelIds, l.id];
                setFilters({ labelIds: ids });
                announce(`${l.name} label ${has ? "off" : "on"}`);
              }}
            />
          ))}
        </div>
        <button
          className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 shadow hover-raise"
          onClick={onNewTask}
        >
          New Task (N)
        </button>
      </div>
    </div>
  );
}

export function useSearchFocus() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return { inputRef };
}
