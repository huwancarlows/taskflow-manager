"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { BoardState, Filters, Label, Task, Status } from "@/types";
import { DEFAULT_LABELS } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ToastProvider";

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

// fetchInitialState removed; initialization handled in provider with guest/auth detection

function persistLocal(state: BoardState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function TaskStoreProvider({ children }: { children: React.ReactNode }) {
  const { notify } = useToast();
  const [state, setState] = useState<BoardState>({ tasks: [], labels: DEFAULT_LABELS });
  const [filters, setFiltersState] = useState<Filters>({ query: "", when: "all", labelIds: [] });
  const [auth, setAuth] = useState<{ guest: boolean; userId: string | null }>({ guest: true, userId: null });
  const listeners = useRef<Set<Listener>>(new Set());

  useEffect(() => {
    const run = async () => {
      const guest = typeof window !== "undefined" && localStorage.getItem("taskflow-guest") === "1";
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id ?? null;
      const isGuest = guest || !userId;
      setAuth({ guest: isGuest, userId });

      if (isGuest) {
        // Guest: load from localStorage only, default labels if none
        const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as BoardState;
            setState({
              tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
              labels: Array.isArray(parsed.labels) && parsed.labels.length > 0 ? parsed.labels : DEFAULT_LABELS,
            });
            return;
          } catch {}
        }
        setState({ tasks: [], labels: DEFAULT_LABELS });
        return;
      }

      // Authenticated: fetch user-scoped data from Supabase
      try {
        const { data: labelsData } = await supabase
          .from("labels")
          .select("id, name, color")
          .eq("user_id", userId!)
          .order("name", { ascending: true });

        const { data: tasksData } = await supabase
          .from("tasks")
          .select("id, title, description, status, due_date, created_at, updated_at")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false });

        const { data: tlData } = await supabase
          .from("task_labels")
          .select("task_id, label_id")
          .eq("user_id", userId!);

        let labels: Label[] = (labelsData ?? []).map((l) => ({ id: l.id, name: l.name, color: l.color }));
        const existingNames = new Set(labels.map((l) => l.name.toLowerCase()));
        const missingDefaults = DEFAULT_LABELS.filter((dl) => !existingNames.has(dl.name.toLowerCase()));
        if (missingDefaults.length > 0) {
          const seeded: Label[] = missingDefaults.map((dl) => ({ id: crypto.randomUUID(), name: dl.name, color: dl.color }));
          await supabase
            .from("labels")
            .insert(seeded.map((l) => ({ id: l.id, name: l.name, color: l.color, user_id: userId })));
          labels = [...labels, ...seeded];
        }
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
        setState({ tasks, labels });
      } catch {
        // Fallback local-only
        setState({ tasks: [], labels: DEFAULT_LABELS });
      }
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
    // Persist only for authenticated users
    if (!auth.guest && auth.userId) {
      void (async () => {
        const { error: errTask } = await supabase.from("tasks").insert({
          id,
          title: t.title,
          description: t.description ?? null,
          status: t.status,
          due_date: t.dueDate ?? null,
          created_at: t.createdAt,
          updated_at: t.updatedAt,
          user_id: auth.userId,
        });
        if (errTask) notify({ type: "error", title: "Couldn't save changes. Please retry." });
        if (t.labels.length) {
          const { error: errTL } = await supabase
            .from("task_labels")
            .insert(t.labels.map((lid) => ({ task_id: id, label_id: lid, user_id: auth.userId })));
          if (errTL) notify({ type: "error", title: "Couldn't save changes. Please retry." });
        }
      })();
    }
    return t;
  }, [auth.guest, auth.userId, notify]);

  const updateTask = useCallback<TaskStoreValue["updateTask"]>((id, patch) => {
    const updates: Record<string, unknown> = {};
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.description !== undefined) updates.description = patch.description ?? null;
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.dueDate !== undefined) updates.due_date = patch.dueDate ?? null;
    if (!auth.guest && auth.userId) {
      void (async () => {
        if (Object.keys(updates).length > 0) {
          const { error: errUpd } = await supabase
            .from("tasks")
            .update(updates)
            .eq("id", id)
            .eq("user_id", auth.userId!);
          if (errUpd) notify({ type: "error", title: "Couldn't save changes. Please retry." });
        }
        if (patch.labels) {
          const { error: errDelTL } = await supabase
            .from("task_labels")
            .delete()
            .eq("task_id", id)
            .eq("user_id", auth.userId!);
          if (errDelTL) notify({ type: "error", title: "Couldn't save changes. Please retry." });
          if (patch.labels.length) {
            const { error: errInsTL } = await supabase
              .from("task_labels")
              .insert(patch.labels.map((lid) => ({ task_id: id, label_id: lid, user_id: auth.userId })));
            if (errInsTL) notify({ type: "error", title: "Couldn't save changes. Please retry." });
          }
        }
      })();
    }

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
  }, [auth.guest, auth.userId, notify]);

  const deleteTask = useCallback<TaskStoreValue["deleteTask"]>((id) => {
    if (!auth.guest && auth.userId) {
      void (async () => {
        const { error: errDel } = await supabase
          .from("tasks")
          .delete()
          .eq("id", id)
          .eq("user_id", auth.userId!);
        if (errDel) notify({ type: "error", title: "Couldn't save changes. Please retry." });
      })();
    }
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  }, [auth.guest, auth.userId, notify]);

  const restoreTask = useCallback<TaskStoreValue["restoreTask"]>((task, index) => {
    if (!auth.guest && auth.userId) {
      void (async () => {
        const { error: errUpsert } = await supabase.from("tasks").upsert({
          id: task.id,
          title: task.title,
          description: task.description ?? null,
          status: task.status,
          due_date: task.dueDate ?? null,
          created_at: task.createdAt,
          updated_at: task.updatedAt,
          user_id: auth.userId,
        });
        if (errUpsert) notify({ type: "error", title: "Couldn't save changes. Please retry." });
        const { error: errDelTL } = await supabase
          .from("task_labels")
          .delete()
          .eq("task_id", task.id)
          .eq("user_id", auth.userId!);
        if (errDelTL) notify({ type: "error", title: "Couldn't save changes. Please retry." });
        if (task.labels.length) {
          const { error: errInsTL } = await supabase
            .from("task_labels")
            .insert(task.labels.map((lid) => ({ task_id: task.id, label_id: lid, user_id: auth.userId })));
          if (errInsTL) notify({ type: "error", title: "Couldn't save changes. Please retry." });
        }
      })();
    }

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
  }, [auth.guest, auth.userId, notify]);

  const moveTask = useCallback<TaskStoreValue["moveTask"]>((id, status, index) => {
    if (!auth.guest && auth.userId) {
      void (async () => {
        const { error: errMove } = await supabase
          .from("tasks")
          .update({ status })
          .eq("id", id)
          .eq("user_id", auth.userId!);
        if (errMove) notify({ type: "error", title: "Couldn't save changes. Please retry." });
      })();
    }
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
  }, [auth.guest, auth.userId, notify]);

  const addLabel = useCallback<TaskStoreValue["addLabel"]>((label) => {
    const l: Label = { id: crypto.randomUUID(), name: label.name, color: label.color };
    setState((s) => ({ ...s, labels: [...s.labels, l] }));
    if (!auth.guest && auth.userId) {
      void (async () => {
        const { error: errLabelIns } = await supabase
          .from("labels")
          .insert({ id: l.id, name: l.name, color: l.color, user_id: auth.userId });
        if (errLabelIns) notify({ type: "error", title: "Couldn't save changes. Please retry." });
      })();
    }
    return l;
  }, [auth.guest, auth.userId, notify]);

  const updateLabel = useCallback<TaskStoreValue["updateLabel"]>((id, patch) => {
    const updates: Record<string, unknown> = {};
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.color !== undefined) updates.color = patch.color;
    if (!auth.guest && auth.userId) {
      if (Object.keys(updates).length > 0) {
        void (async () => {
          const { error: errLabelUpd } = await supabase
            .from("labels")
            .update(updates)
            .eq("id", id)
            .eq("user_id", auth.userId!);
          if (errLabelUpd) notify({ type: "error", title: "Couldn't save changes. Please retry." });
        })();
      }
    }
    setState((s) => ({
      ...s,
      labels: s.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }, [auth.guest, auth.userId, notify]);

  const deleteLabel = useCallback<TaskStoreValue["deleteLabel"]>((id) => {
    if (!auth.guest && auth.userId) {
      void (async () => {
        const { error: errLabelDel } = await supabase
          .from("labels")
          .delete()
          .eq("id", id)
          .eq("user_id", auth.userId!);
        if (errLabelDel) notify({ type: "error", title: "Couldn't save changes. Please retry." });
      })();
    }
    setState((s) => ({
      ...s,
      labels: s.labels.filter((l) => l.id !== id),
      tasks: s.tasks.map((t) => ({ ...t, labels: t.labels.filter((lid) => lid !== id) })),
    }));
  }, [auth.guest, auth.userId, notify]);

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

    // Build a map of label id -> name for grouping duplicates
    const nameById = new Map<string, string>();
    for (const l of state.labels) nameById.set(l.id, l.name.toLowerCase());

    return state.tasks.filter((t) => {
      if (filters.when === "today" && t.dueDate !== todayStr) return false;
      if (filters.when === "upcoming") {
        if (!t.dueDate) return false;
        if (t.dueDate < todayStr || t.dueDate > in7Str) return false;
      }
      if (filters.labelIds.length > 0) {
        // For each selected label id, consider all labels with the same name as a group.
        const selectedGroups = filters.labelIds.map((id) => nameById.get(id)).filter(Boolean) as string[];
        const groupsRequired = new Set(selectedGroups);
        // Build set of names present on the task
        const taskNames = new Set(t.labels.map((id) => nameById.get(id)).filter(Boolean) as string[]);
        // Task must contain at least one label from each selected name group
        for (const name of groupsRequired) {
          if (!taskNames.has(name)) return false;
        }
      }
      if (query) {
        const hay = `${t.title} ${t.description ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [filters, now, state.tasks, state.labels]);

  const [result, setResult] = useState<Task[]>(compute);

  useEffect(() => { const t = setTimeout(() => setResult(compute()), 0); return () => clearTimeout(t); }, [compute]);
  useEffect(() => subscribe(() => setResult(compute())), [subscribe, compute]);

  return result;
}
