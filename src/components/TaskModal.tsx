"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LabelColor, Task } from "@/types";
import { useTaskStore } from "@/store/taskStore";
import { BG } from "./colorClasses";
import { useToast } from "./ToastProvider";

export function TaskModal({
  open,
  onClose,
  initial,
  defaultStatus,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Task | null;
  defaultStatus?: Task["status"];
}) {
  const prevFocus = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = (document.activeElement as HTMLElement) ?? null;
    const id = window.setTimeout(() => titleRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, initial]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Basic focus trap within the dialog
  useEffect(() => {
    if (!open) return;
    function handleKeydown(e: KeyboardEvent) {
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
      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [open]);

  const handleClose = () => {
    onClose();
    if (prevFocus.current) prevFocus.current.focus();
  };

  // Hide background content from assistive tech while dialog open
  useEffect(() => {
    const appRoot = document.getElementById("app-root");
    if (open && appRoot) appRoot.setAttribute("aria-hidden", "true");
    return () => { if (appRoot) appRoot.removeAttribute("aria-hidden"); };
  }, [open]);

  const overlay = (
    <div className="fixed inset-0 z-100 grid place-items-center bg-black/50 backdrop-blur-sm p-4" onClick={handleClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-zinc-50 dark:bg-zinc-900 p-4 shadow-xl ring-1 ring-black/5 hover-raise"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        ref={dialogRef}
      >
        <div className="flex items-center justify-between">
          <h3 id="task-modal-title" className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            {initial ? "Edit Task" : "New Task"}
          </h3>
          <button aria-label="Close" className="text-zinc-400 hover:text-zinc-700" onClick={handleClose}>×</button>
        </div>
        <TaskForm
          key={initial?.id ?? `new-${defaultStatus ?? "backlog"}`}
          initial={initial ?? null}
          defaultStatus={defaultStatus}
          titleRef={titleRef}
          onClose={handleClose}
        />
      </div>
    </div>
  );

  if (!open) return null;
  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}

// Internal form component keyed by initial/defaultStatus to reset state without effects
function TaskForm({
  initial,
  defaultStatus,
  titleRef,
  onClose,
}: {
  initial: Task | null;
  defaultStatus?: Task["status"];
  titleRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
}) {
  const { state, addTask, updateTask, addLabel } = useTaskStore();
  const { notify } = useToast();

  const [title, setTitle] = useState<string>(() => initial?.title ?? "");
  const [description, setDescription] = useState<string>(() => initial?.description ?? "");
  const [status, setStatus] = useState<Task["status"]>(
    () => initial?.status ?? defaultStatus ?? "backlog"
  );
  const [dueDate, setDueDate] = useState<string | undefined>(() => initial?.dueDate ?? undefined);
  const [labelIds, setLabelIds] = useState<string[]>(() => initial?.labels ?? []);

  useEffect(() => {
    const id = window.setTimeout(() => titleRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [titleRef]);

  const COLORS: LabelColor[] = [
    "red",
    "orange",
    "amber",
    "yellow",
    "lime",
    "green",
    "teal",
    "cyan",
    "sky",
    "blue",
    "indigo",
    "violet",
    "purple",
    "fuchsia",
    "pink",
    "rose",
  ];

  return (
    <>
      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-sm text-zinc-700 dark:text-zinc-400">Title</label>
          <input
            ref={titleRef}
            className="mt-1 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-700 dark:text-zinc-400">Description</label>
          <textarea
            className="mt-1 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details, links, acceptance criteria..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-700 dark:text-zinc-400">Status</label>
            <select
              className="mt-1 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setStatus(e.currentTarget.value as Task["status"]) }
            >
              <option value="backlog">Backlog</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-700 dark:text-zinc-400">Due date</label>
            <input
              className="mt-1 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              type="date"
              value={dueDate ?? ""}
              onChange={(e) => setDueDate(e.target.value || undefined)}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm text-zinc-700 dark:text-zinc-400">Labels</label>
            <button
              className="text-xs text-blue-600/90 hover:text-blue-600 hover:underline"
              onClick={() => {
                const name = prompt("New label name?");
                if (!name) return;
                const color = prompt(
                  `Color (red, orange, amber, yellow, lime, green, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose)?`,
                  COLORS[Math.floor(Math.random() * COLORS.length)]
                ) as LabelColor | null;
                if (!color || !COLORS.includes(color)) return;
                const l = addLabel({ name, color });
                setLabelIds((ids) => [...ids, l.id]);
              }}
            >
              + New label
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {Array.from(new Map(state.labels.map((l) => [l.name.toLowerCase(), l])).values()).map((l) => {
              const active = labelIds.includes(l.id);
              return (
                <button
                  key={l.id}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    active
                      ? `${BG[l.color]} text-white border-transparent`
                      : `bg-zinc-50 dark:bg-transparent text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700`
                  }`}
                  onClick={() =>
                    setLabelIds((ids) =>
                      ids.includes(l.id) ? ids.filter((id) => id !== l.id) : [...ids, l.id]
                    )
                  }
                >
                  {l.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300" onClick={onClose}>
          Cancel
        </button>
        <button
          className="rounded-md bg-blue-600/90 hover:bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
          disabled={!title.trim()}
          onClick={() => {
            if (initial) {
              updateTask(initial.id, { title: title.trim(), description, status, dueDate, labels: labelIds });
              notify({ type: "success", title: "Task updated" });
            } else {
              addTask({ title: title.trim(), description, status, dueDate, labels: labelIds });
              notify({ type: "success", title: "Task created" });
            }
            onClose();
          }}
        >
          {initial ? "Save" : "Create"}
        </button>
      </div>
    </>
  );
}
