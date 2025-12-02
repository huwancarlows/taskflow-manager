"use client";

import { useEffect, useRef, useState } from "react";
import type { LabelColor, Task } from "@/types";
import { useTaskStore } from "@/store/taskStore";
import { BG } from "./colorClasses";
import { useToast } from "./ToastProvider";

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

export function TaskForm({
  initial,
  defaultStatus,
  titleRef,
  onClose,
}: {
  initial: Task | null;
  defaultStatus?: Task["status"];
  titleRef: React.RefObject<HTMLInputElement>;
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

  // Ensure focus on mount (parent also tries; this is a fallback)
  useEffect(() => {
    const id = window.setTimeout(() => titleRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [titleRef]);

  return (
    <>
      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-sm text-zinc-600 dark:text-zinc-400">Title</label>
          <input
            ref={titleRef}
            className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-600 dark:text-zinc-400">Description</label>
          <textarea
            className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details, links, acceptance criteria..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-600 dark:text-zinc-400">Status</label>
            <select
              className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-sm text-zinc-600 dark:text-zinc-400">Due date</label>
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              type="date"
              value={dueDate ?? ""}
              onChange={(e) => setDueDate(e.target.value || undefined)}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm text-zinc-600 dark:text-zinc-400">Labels</label>
            <button
              className="text-xs text-blue-600 hover:underline"
              onClick={() => {
                const name = prompt("New label name?");
                if (!name) return;
                const color = prompt(
                  `Color (${COLORS.join(", ")})?`,
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
            {state.labels.map((l) => {
              const active = labelIds.includes(l.id);
              return (
                <button
                  key={l.id}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    active
                      ? `${BG[l.color]} text-white border-transparent`
                      : `bg-transparent text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700`
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
        <button className="px-3 py-2 text-sm" onClick={onClose}>
          Cancel
        </button>
        <button
          className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
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
