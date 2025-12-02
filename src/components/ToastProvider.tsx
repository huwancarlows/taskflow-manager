"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // ms
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  notify: (toast: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const remove = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) {
      window.clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback<ToastContextValue["notify"]>((toast) => {
    const id = crypto.randomUUID();
    const duration = toast.duration ?? 2500;
    setToasts((list) => [...list, { id, ...toast, duration }]);
    const timer = window.setTimeout(() => remove(id), duration);
    timers.current.set(id, timer);
  }, [remove]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastViewport({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-x-0 top-2 z-100 flex justify-center"
      aria-live="polite"
      aria-atomic="false"
      role="status"
    >
      <div className="flex w-full max-w-md flex-col gap-2 px-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-md border p-3 shadow-md ring-1 ring-black/5 bg-white dark:bg-zinc-900 ${
              t.type === "success"
                ? "border-emerald-200"
                : t.type === "error"
                ? "border-rose-200"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                t.type === "success" ? "bg-emerald-500" : t.type === "error" ? "bg-rose-500" : "bg-blue-500"
              }`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.title}</p>
                {t.description ? (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{t.description}</p>
                ) : null}
              </div>
              {t.action ? (
                <button
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => {
                    try { t.action?.onClick(); } finally { onRemove(t.id); }
                  }}
                >
                  {t.action.label}
                </button>
              ) : null}
              <button
                aria-label="Dismiss notification"
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                onClick={() => onRemove(t.id)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}
