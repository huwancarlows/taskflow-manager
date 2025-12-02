"use client";

import { useEffect } from "react";
import { useTaskStore } from "@/store/taskStore";

export function KeyboardShortcuts({ onNewTask, focusSearch }: { onNewTask: () => void; focusSearch: () => void }) {
  const { filters, setFilters } = useTaskStore();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;
      if (e.target && (e.target as HTMLElement).tagName === "TEXTAREA") return;

      if (e.key === "/") {
        e.preventDefault();
        focusSearch();
      }
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        onNewTask();
      }
      if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        setFilters({ when: filters.when === "today" ? "all" : "today" });
      }
      if (e.key.toLowerCase() === "u") {
        e.preventDefault();
        setFilters({ when: filters.when === "upcoming" ? "all" : "upcoming" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filters.when, onNewTask, focusSearch, setFilters]);

  return null;
}
