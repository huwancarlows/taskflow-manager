"use client";

import { createContext, useContext, useMemo, useState } from "react";

type AnnouncerValue = {
  announce: (message: string) => void;
};

const AnnouncerCtx = createContext<AnnouncerValue | null>(null);

export function AnnouncerProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const value = useMemo<AnnouncerValue>(() => ({
    announce: (m: string) => {
      // Toggle content to ensure screen readers announce changes
      setMessage("");
      setTimeout(() => setMessage(m), 0);
    },
  }), []);
  return (
    <AnnouncerCtx.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="sr-only">{message}</div>
    </AnnouncerCtx.Provider>
  );
}

export function useAnnouncer() {
  const ctx = useContext(AnnouncerCtx);
  if (!ctx) throw new Error("useAnnouncer must be used within AnnouncerProvider");
  return ctx;
}
