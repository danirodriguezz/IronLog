export type Toast = {
  id: string;
  message: string;
  href?: string;
  variant?: "info" | "success";
};

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();
const TTL_MS = 6000;

const notify = (): void => {
  for (const l of listeners) l(toasts);
};

export const pushToast = (data: Omit<Toast, "id">): void => {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, ...data }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, TTL_MS);
};

export const dismissToast = (id: string): void => {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
};

export const subscribeToasts = (listener: Listener): (() => void) => {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
};
