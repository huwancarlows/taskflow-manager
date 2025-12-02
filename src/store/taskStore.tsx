"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { BoardState, Filters, Label, Task, Status } from "@/types";
import { DEFAULT_LABELS } from "@/types";

const STORAGE_KEY = "taskflow-board-v1";

type Listener = () => void;

interface TaskStoreValue {
  state: BoardState;
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  addTask: (input: Omit<Task, "id" | "createdAt" | "updatedAt">) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, status: Status, index?: number) => void;
  restoreTask: (task: Task, index?: number) => void;
  addLabel: (label: Omit<Label, "id">) => Label;
  updateLabel: (id: string, patch: Partial<Label>) => void;
  deleteLabel: (id: string) => void;
  subscribe: (fn: Listener) => () => void;
}

const TaskStoreCtx = createContext<TaskStoreValue | null>(null);

function loadInitialState(): BoardState {
  if (typeof window === "undefined") return { tasks: [], labels: DEFAULT_LABELS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tasks: [], labels: DEFAULT_LABELS };
    const parsed = JSON.parse(raw) as BoardState;
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      labels: Array.isArray(parsed.labels) && parsed.labels.length > 0 ? parsed.labels : DEFAULT_LABELS,
    };
  } catch {
    return { tasks: [], labels: DEFAULT_LABELS };
  }
}

function persist(state: BoardState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function TaskStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BoardState>({ tasks: [], labels: DEFAULT_LABELS });
  const [filters, setFiltersState] = useState<Filters>({ query: "", when: "all", labelIds: [] });
  const listeners = useRef<Set<Listener>>(new Set());

  useEffect(() => {
    setState(loadInitialState());
  }, []);

  useEffect(() => {
    persist(state);
    listeners.current.forEach((fn) => fn());
  }, [state]);

  const setFilters = useCallback((f: Partial<Filters>) => {
    setFiltersState((prev) => ({ ...prev, ...f }));
  }, []);

  const addTask = useCallback<TaskStoreValue["addTask"]>((input) => {
    const now = new Date().toISOString();
    const t: Task = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      description: "",
      ...input,
    };
    setState((s) => ({ ...s, tasks: [t, ...s.tasks] }));
    return t;
  }, []);

  const updateTask = useCallback<TaskStoreValue["updateTask"]>((id, patch) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)),
    }));
  }, []);

  const deleteTask = useCallback<TaskStoreValue["deleteTask"]>((id) => {
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  }, []);

  const restoreTask = useCallback<TaskStoreValue["restoreTask"]>((task, index) => {
    setState((s) => {
      const without = s.tasks.filter((t) => t.id !== task.id);
      const tasks = without.slice();
      if (typeof index === "number") {
        // Insert at a position among tasks of the same status
        let pos = 0;
        for (let p = 0, seen = 0; p <= tasks.length; p++) {
          if (p === tasks.length) { pos = tasks.length; break; }
          if (tasks[p].status === task.status) {
            if (seen === index) { pos = p; break; }
            seen++;
          }
        }
        tasks.splice(pos, 0, task);
      } else {
        tasks.unshift(task);
      }
      return { ...s, tasks };
    });
  }, []);

  const moveTask = useCallback<TaskStoreValue["moveTask"]>((id, status, index) => {
    setState((s) => {
      const tasks = s.tasks.slice();
      const i = tasks.findIndex((t) => t.id === id);
      if (i === -1) return s;
      const [task] = tasks.splice(i, 1);
      task.status = status;
      task.updatedAt = new Date().toISOString();

      if (typeof index === "number") {
        // insert at specific index among tasks of that status
        let pos = 0;
        for (let p = 0, seen = 0; p <= tasks.length; p++) {
          if (p === tasks.length) {
            pos = tasks.length;
            break;
          }
          if (tasks[p].status === status) {
            if (seen === index) {
              pos = p;
              break;
            }
            seen++;
          }
        }
        tasks.splice(pos, 0, task);
      } else {
        tasks.unshift(task);
      }
      return { ...s, tasks };
    });
  }, []);

  const addLabel = useCallback<TaskStoreValue["addLabel"]>((label) => {
    const l: Label = { id: crypto.randomUUID(), ...label };
    setState((s) => ({ ...s, labels: [...s.labels, l] }));
    return l;
  }, []);

  const updateLabel = useCallback<TaskStoreValue["updateLabel"]>((id, patch) => {
    setState((s) => ({
      ...s,
      labels: s.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }, []);

  const deleteLabel = useCallback<TaskStoreValue["deleteLabel"]>((id) => {
    setState((s) => ({
      ...s,
      labels: s.labels.filter((l) => l.id !== id),
      tasks: s.tasks.map((t) => ({ ...t, labels: t.labels.filter((lid) => lid !== id) })),
    }));
  }, []);

  const subscribe = useCallback<TaskStoreValue["subscribe"]>((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  const value = useMemo<TaskStoreValue>(() => ({
    state,
    filters,
    setFilters,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    restoreTask,
    addLabel,
    updateLabel,
    deleteLabel,
    subscribe,
  }), [state, filters, setFilters, addTask, updateTask, deleteTask, moveTask, addLabel, updateLabel, deleteLabel, subscribe]);

  return <TaskStoreCtx.Provider value={value}>{children}</TaskStoreCtx.Provider>;
}

export function useTaskStore() {
  const ctx = useContext(TaskStoreCtx);
  if (!ctx) throw new Error("useTaskStore must be used within TaskStoreProvider");
  return ctx;
}

export function useFilteredTasks() {
  const { state, filters, subscribe } = useTaskStore();
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const compute = useCallback(() => {
    const query = filters.query.trim().toLowerCase();
    const todayStr = now.toISOString().slice(0, 10);
    const in7 = new Date(now);
    in7.setDate(now.getDate() + 7);
    const in7Str = in7.toISOString().slice(0, 10);

    return state.tasks.filter((t) => {
      if (filters.when === "today" && t.dueDate !== todayStr) return false;
      if (filters.when === "upcoming") {
        if (!t.dueDate) return false;
        if (t.dueDate < todayStr || t.dueDate > in7Str) return false;
      }
      if (filters.labelIds.length > 0 && !filters.labelIds.every((id) => t.labels.includes(id))) return false;
      if (query) {
        const hay = `${t.title} ${t.description ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [filters, now, state.tasks]);

  const [result, setResult] = useState<Task[]>(compute);

  useEffect(() => setResult(compute()), [compute]);
  useEffect(() => subscribe(() => setResult(compute())), [subscribe, compute]);

  return result;
}
