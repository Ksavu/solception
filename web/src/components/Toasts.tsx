"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Kind = "pending" | "success" | "error";
interface Toast {
  id: number;
  kind: Kind;
  text: string;
  link?: string;
}
interface Api {
  push: (t: Omit<Toast, "id">) => number;
  update: (id: number, t: Omit<Toast, "id">) => void;
}

const Ctx = createContext<Api | null>(null);
let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const scheduleClose = useCallback((id: number, kind: Kind) => {
    if (kind !== "pending") setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 7000);
  }, []);

  const api = useMemo<Api>(
    () => ({
      push: (t) => {
        const id = ++seq;
        setItems((xs) => [...xs, { ...t, id }]);
        scheduleClose(id, t.kind);
        return id;
      },
      update: (id, t) => {
        setItems((xs) => xs.map((x) => (x.id === id ? { ...t, id } : x)));
        scheduleClose(id, t.kind);
      },
    }),
    [scheduleClose]
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <span className="toast-dot" />
            <span>{t.text}</span>
            {t.link && (
              <a href={t.link} target="_blank" rel="noreferrer">
                View ↗
              </a>
            )}
            <button onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}>×</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("ToastProvider missing");
  return c;
}
