"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { BoardState, Filters, Label, Task, Status } from "@/types";
import { DEFAULT_LABELS } from "@/types";
import { supabase } from "@/lib/supabaseClient";

const STORAGE_KEY = "taskflow-board-v1"; // retained for fallback / local cache

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

async function fetchInitialState(): Promise<BoardState> {
  // Try Supabase first; fall back to localStorage and defaults
  try {
    const { data: labelsData, error: labelsErr } = await supabase
      .from("labels")
      .select("id, name, color")
      .order("name", { ascending: true });

    const { data: tasksData, error: tasksErr } = await supabase
      .from("tasks")
      .select("id, title, description, status, due_date, created_at, updated_at")
      .order("created_at", { ascending: false });

    const { data: tlData, error: tlErr } = await supabase
      .from("task_labels")
      .select("task_id, label_id");

    if (labelsErr || tasksErr || tlErr) throw labelsErr || tasksErr || tlErr;

    const labels: Label[] = (labelsData ?? []).map((l) => ({ id: l.id, name: l.name, color: l.color }));
    const tasks: Task[] = (tasksData ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description ?? undefined,
      status: t.status,
      dueDate: t.due_date ?? undefined,
      labels: [],
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));

    const byTask: Record<string, string[]> = {};
    (tlData ?? []).forEach((row) => {
      byTask[row.task_id] = byTask[row.task_id] || [];
      byTask[row.task_id].push(row.label_id);
    });
    tasks.forEach((t) => { t.labels = byTask[t.id] ?? []; });

    // If no labels in DB, seed defaults
    const finalLabels = labels.length > 0 ? labels : DEFAULT_LABELS;

    return { tasks, labels: finalLabels };
  } catch (e) {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as BoardState;
          return {
            tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
            labels: Array.isArray(parsed.labels) && parsed.labels.length > 0 ? parsed.labels : DEFAULT_LABELS,
          };
        }
      } catch {}
    }
    return { tasks: [], labels: DEFAULT_LABELS };
  }
}

function persistLocal(state: BoardState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function TaskStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BoardState>({ tasks: [], labels: DEFAULT_LABELS });
  const [filters, setFiltersState] = useState<Filters>({ query: "", when: "all", labelIds: [] });
  const listeners = useRef<Set<Listener>>(new Set());

  useEffect(() => {
    // Load from Supabase, then seed default labels in DB if empty
    const run = async () => {
      const initial = await fetchInitialState();
      setState(initial);
      // Seed labels if DB is empty
      try {
        const { data: countData } = await supabase.from("labels").select("id", { count: "estimated", head: true });
        const hasLabels = !!countData && (countData as any).length !== undefined ? ((countData as any).length > 0) : initial.labels.length > 0;
        if (!hasLabels && DEFAULT_LABELS.length) {
          await supabase.from("labels").insert(DEFAULT_LABELS.map((l) => ({ id: l.id, name: l.name, color: l.color })));
          const { data: labelsData } = await supabase.from("labels").select("id, name, color").order("name", { ascending: true });
          const labels: Label[] = (labelsData ?? []).map((l) => ({ id: l.id, name: l.name, color: l.color }));
          setState((s) => ({ ...s, labels }));
        }
      } catch {}
    };
    run();
  }, []);

  useEffect(() => {
    // Keep local cache for offline resilience
    persistLocal(state);
    listeners.current.forEach((fn) => fn());
  }, [state]);

  const setFilters = useCallback((f: Partial<Filters>) => {
    setFiltersState((prev) => ({ ...prev, ...f }));
  }, []);

  const addTask = useCallback<TaskStoreValue["addTask"]>((input) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const t: Task = {
      id,
      title: input.title,
      description: input.description ?? "",
      status: input.status,
      dueDate: input.dueDate ?? undefined,
      labels: input.labels ?? [],
      createdAt: now,
      updatedAt: now,
    };
    setState((s) => ({ ...s, tasks: [t, ...s.tasks] }));
    void (async () => {
      await supabase.from("tasks").insert({
        id,
        title: t.title,
        description: t.description ?? null,
        status: t.status,
        due_date: t.dueDate ?? null,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
      });
      if (t.labels.length) {
        await supabase.from("task_labels").insert(t.labels.map((lid) => ({ task_id: id, label_id: lid })));
      }
    })();
    return t;
  }, []);

  const updateTask = useCallback<TaskStoreValue["updateTask"]>((id, patch) => {
    const updates: Record<string, unknown> = {};
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.description !== undefined) updates.description = patch.description ?? null;
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.dueDate !== undefined) updates.due_date = patch.dueDate ?? null;
    void (async () => {
      if (Object.keys(updates).length > 0) {
        await supabase.from("tasks").update(updates).eq("id", id);
      }
      if (patch.labels) {
        await supabase.from("task_labels").delete().eq("task_id", id);
        if (patch.labels.length) {
          await supabase.from("task_labels").insert(patch.labels.map((lid) => ({ task_id: id, label_id: lid })));
        }
      }
    })();

    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? {
        ...t,
        title: patch.title ?? t.title,
        description: patch.description !== undefined ? patch.description : t.description,
        status: patch.status ?? t.status,
        dueDate: patch.dueDate !== undefined ? patch.dueDate : t.dueDate,
        labels: patch.labels ?? t.labels,
        updatedAt: new Date().toISOString(),
      } : t)),
    }));
  }, []);

  const deleteTask = useCallback<TaskStoreValue["deleteTask"]>((id) => {
    void supabase.from("tasks").delete().eq("id", id);
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  }, []);

  const restoreTask = useCallback<TaskStoreValue["restoreTask"]>((task, index) => {
    void (async () => {
      await supabase.from("tasks").upsert({
        id: task.id,
        title: task.title,
        description: task.description ?? null,
        status: task.status,
        due_date: task.dueDate ?? null,
        created_at: task.createdAt,
        updated_at: task.updatedAt,
      });
      await supabase.from("task_labels").delete().eq("task_id", task.id);
      if (task.labels.length) {
        await supabase.from("task_labels").insert(task.labels.map((lid) => ({ task_id: task.id, label_id: lid })));
      }
    })();

    setState((s) => {
      const without = s.tasks.filter((t) => t.id !== task.id);
      const tasks = without.slice();
      if (typeof index === "number") {
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
    void supabase.from("tasks").update({ status }).eq("id", id);
    setState((s) => {
      const tasks = s.tasks.slice();
      const i = tasks.findIndex((t) => t.id === id);
      if (i === -1) return s;
      const [task] = tasks.splice(i, 1);
      task.status = status;
      task.updatedAt = new Date().toISOString();

      if (typeof index === "number") {
        let pos = 0;
        for (let p = 0, seen = 0; p <= tasks.length; p++) {
          if (p === tasks.length) { pos = tasks.length; break; }
          if (tasks[p].status === status) {
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

  const addLabel = useCallback<TaskStoreValue["addLabel"]>((label) => {
    const l: Label = { id: crypto.randomUUID(), name: label.name, color: label.color };
    setState((s) => ({ ...s, labels: [...s.labels, l] }));
    void supabase.from("labels").insert({ id: l.id, name: l.name, color: l.color });
    return l;
  }, []);

  const updateLabel = useCallback<TaskStoreValue["updateLabel"]>((id, patch) => {
    const updates: Record<string, unknown> = {};
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.color !== undefined) updates.color = patch.color;
    if (Object.keys(updates).length > 0) {
      void supabase.from("labels").update(updates).eq("id", id);
    }
    setState((s) => ({
      ...s,
      labels: s.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }, []);

  const deleteLabel = useCallback<TaskStoreValue["deleteLabel"]>((id) => {
    void supabase.from("labels").delete().eq("id", id);
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
  }), [state, filters, setFilters, addTask, updateTask, deleteTask, moveTask, restoreTask, addLabel, updateLabel, deleteLabel, subscribe]);

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

  useEffect(() => { const t = setTimeout(() => setResult(compute()), 0); return () => clearTimeout(t); }, [compute]);
  useEffect(() => subscribe(() => setResult(compute())), [subscribe, compute]);

  return result;
}
