"use client";

import { useMemo } from "react";
import type { Status, Task } from "@/types";
import { useTaskStore } from "@/store/taskStore";
import { BG, RING } from "./colorClasses";
import { useToast } from "./ToastProvider";
import { useAnnouncer } from "./Announcer";

export function TaskCard({ task, onEdit, index, status, totalInStatus }: { task: Task; onEdit: (task: Task) => void; index: number; status: Status; totalInStatus: number }) {
  const { state, deleteTask, restoreTask, moveTask } = useTaskStore();
  const { notify } = useToast();
  const labelMap = useMemo(() => new Map(state.labels.map((l) => [l.id, l])), [state.labels]);
  const now = useMemo(() => new Date(), []);
  const todayStr = now.toISOString().slice(0, 10);
  const in7 = new Date(now);
  in7.setDate(now.getDate() + 7);
  const in7Str = in7.toISOString().slice(0, 10);
  const { announce } = useAnnouncer();

  const dueStyle = (() => {
    if (!task.dueDate) return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 ring-zinc-200 dark:ring-zinc-700";
    if (task.dueDate < todayStr) return "bg-rose-50 text-rose-700 ring-rose-200";
    if (task.dueDate === todayStr) return "bg-amber-50 text-amber-700 ring-amber-200";
    if (task.dueDate <= in7Str) return "bg-sky-50 text-sky-700 ring-sky-200";
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  })();

  return (
    <div
      className="group rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing hover-raise"
      draggable
      tabIndex={0}
      role="article"
      aria-label={`Task: ${task.title}`}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onKeyDown={(e) => {
        // Alt+Arrow for accessible reordering
        if (!e.altKey) return;
        const statuses: Status[] = ["backlog", "in_progress", "done"];
        const currentIdx = statuses.indexOf(status);
        if (e.key === "ArrowLeft" && currentIdx > 0) {
          e.preventDefault();
          const dest = statuses[currentIdx - 1];
          moveTask(task.id, dest);
          announce(`Moved to ${dest.replace("_", " ")}`);
        }
        if (e.key === "ArrowRight" && currentIdx < statuses.length - 1) {
          e.preventDefault();
          const dest = statuses[currentIdx + 1];
          moveTask(task.id, dest);
          announce(`Moved to ${dest.replace("_", " ")}`);
        }
        if (e.key === "ArrowUp" && index > 0) {
          e.preventDefault();
          // move up within column by placing before previous index
          moveTask(task.id, status, index - 1);
          announce(`Position ${index} in ${status.replace("_", " ")}`);
        }
        if (e.key === "ArrowDown" && index < totalInStatus - 1) {
          e.preventDefault();
          // move down within column by placing after next index
          moveTask(task.id, status, index + 1);
          announce(`Position ${index + 2} in ${status.replace("_", " ")}`);
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug">
          {task.title}
        </h4>
        <button
          aria-label="Delete task"
          className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition"
          onClick={() => {
            const snapshot = { ...task };
            deleteTask(task.id);
            notify({ type: "info", title: "Task deleted", action: { label: "Undo", onClick: () => restoreTask(snapshot, index) } });
          }}
        >
          ×
        </button>
      </div>

      {task.description ? (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{task.description}</p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] ring-1 ring-inset ${dueStyle}`}>
          📅 {task.dueDate ?? "No due"}
        </span>
        {task.labels.map((lid) => {
          const l = labelMap.get(lid);
          if (!l) return null;
          return (
            <span
              key={lid}
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] text-white ring-1 ring-inset ${BG[l.color]} ${RING[l.color]}`}
            >
              {l.name}
            </span>
          );
        })}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          onClick={() => onEdit(task)}
        >
          Edit
        </button>
      </div>
    </div>
    
    
  );
}
