"use client";

import { useMemo, useState } from "react";
import { STATUS_ORDER, STATUS_TITLES, type Status, type Task } from "@/types";
import { useFilteredTasks, useTaskStore } from "@/store/taskStore";
import { TaskCard } from "./TaskCard";
import { useAnnouncer } from "./Announcer";
import { TaskModal } from "./TaskModal";

function Column({
  status,
  tasks,
  onDropTask,
  onEditTask,
  onAddTask,
}: {
  status: Status;
  tasks: Task[];
  onDropTask: (taskId: string, index?: number) => void;
  onEditTask: (t: Task) => void;
  onAddTask: () => void;
}) {
  const { announce } = useAnnouncer();
  return (
    <div
      className="flex h-full min-h-[300px] flex-col gap-3 rounded-xl bg-zinc-100 dark:bg-zinc-900/40 p-3 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-800"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        const id = e.dataTransfer.getData("text/plain");
        if (id) {
          onDropTask(id);
          announce(`Moved to ${STATUS_TITLES[status]} column`);
        }
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          {STATUS_TITLES[status]}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">{tasks.length}</span>
          <button
            aria-label="Add task to column"
            className="rounded-md bg-zinc-900 text-white dark:bg-white dark:text-black px-2 py-1 text-xs hover:opacity-90"
            onClick={onAddTask}
          >
            + Add
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {tasks.map((t, idx) => (
          <div
            key={t.id}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/plain");
              if (id) {
                onDropTask(id, idx);
                announce(`Position ${idx + 1} in ${STATUS_TITLES[status]}`);
              }
            }}
          >
            <TaskCard task={t} onEdit={onEditTask} index={idx} status={status} totalInStatus={tasks.length} />
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="grid place-items-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center text-sm text-zinc-600 fade-in-up bg-zinc-50 dark:bg-transparent">
            <div className="flex flex-col items-center gap-2">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="opacity-70">
                <path d="M16 3H8a2 2 0 0 0-2 2v14l6-3 6 3V5a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              </svg>
              <p className="text-zinc-600 dark:text-zinc-400">No tasks here yet.</p>
              <button className="mt-1 rounded-md bg-blue-600 px-3 py-1.5 text-white text-xs hover:bg-blue-700 transition" onClick={onAddTask}>
                Create one
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskBoard({ newRequest = 0, newRequestStatus }: { newRequest?: number; newRequestStatus?: Status }) {
  const { moveTask } = useTaskStore();
  const filtered = useFilteredTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const [defaultStatus, setDefaultStatus] = useState<Status>("backlog");

  // Open modal for new task when newRequest increments
  if (newRequest !== requestCount) {
    setRequestCount(newRequest);
    if (!modalOpen) {
      setEditing(null);
      setDefaultStatus(newRequestStatus ?? "backlog");
      setModalOpen(true);
    }
  }

  const byStatus = useMemo(() => {
    const map: Record<Status, Task[]> = {
      backlog: [],
      in_progress: [],
      done: [],
    };
    for (const t of filtered) map[t.status].push(t);
    return map;
  }, [filtered]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {STATUS_ORDER.map((status) => (
        <Column
          key={status}
          status={status}
          tasks={byStatus[status]}
          onDropTask={(id, index) => moveTask(id, status, index)}
          onEditTask={(t) => {
            setEditing(t);
            setModalOpen(true);
          }}
          onAddTask={() => {
            setEditing(null);
            setDefaultStatus(status);
            setModalOpen(true);
          }}
        />
      ))}

      <TaskModal
        open={modalOpen}
        initial={editing}
        defaultStatus={defaultStatus}
        onClose={() => {
          setModalOpen(false);
          setTimeout(() => setEditing(null), 0);
        }}
      />
    </div>
  );
}
