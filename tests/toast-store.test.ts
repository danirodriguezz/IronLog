import { describe, it, expect, vi, beforeEach } from "vitest";

// Re-import the module fresh each test to avoid cross-test pollution
// The store has module-level state, so we need to reset between tests
import { pushToast, dismissToast, subscribeToasts } from "@/app/(app)/_components/toast-store";

beforeEach(() => {
  vi.useFakeTimers();
  // Drain all current toasts by running all pending timers then check listener state
});

afterEach(() => {
  vi.useRealTimers();
});

describe("toast-store", () => {
  it("pushToast notifies listeners with the new toast", () => {
    const listener = vi.fn();
    const unsub = subscribeToasts(listener);

    const callsBefore = listener.mock.calls.length;
    pushToast({ message: "Hola" });

    const lastCall = listener.mock.calls[listener.mock.calls.length - 1][0];
    expect(lastCall.some((t: { message: string }) => t.message === "Hola")).toBe(true);

    unsub();
    // cleanup — run timer to avoid affecting other tests
    vi.runAllTimers();
    void callsBefore;
  });

  it("pushToast auto-removes toast after TTL (6000ms)", () => {
    const listener = vi.fn();
    const unsub = subscribeToasts(listener);

    pushToast({ message: "Temporal" });

    vi.advanceTimersByTime(6000);

    const lastCall = listener.mock.calls[listener.mock.calls.length - 1][0];
    expect(lastCall.some((t: { message: string }) => t.message === "Temporal")).toBe(false);

    unsub();
  });

  it("dismissToast removes the toast immediately", () => {
    const captured: string[] = [];
    const unsub = subscribeToasts((toasts) => {
      for (const t of toasts) captured.push(t.id);
    });

    pushToast({ message: "Para borrar" });

    const id = captured[captured.length - 1];
    dismissToast(id);

    const listener2 = vi.fn();
    const unsub2 = subscribeToasts(listener2);
    const current = listener2.mock.calls[0][0] as { id: string }[];
    expect(current.some((t) => t.id === id)).toBe(false);

    unsub();
    unsub2();
    vi.runAllTimers();
  });

  it("subscribeToasts immediately calls the listener with current state", () => {
    const listener = vi.fn();
    const unsub = subscribeToasts(listener);
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("subscribeToasts unsubscribe stops receiving updates", () => {
    const listener = vi.fn();
    const unsub = subscribeToasts(listener);
    unsub();

    const callsBefore = listener.mock.calls.length;
    pushToast({ message: "Ignored" });
    expect(listener.mock.calls.length).toBe(callsBefore);

    vi.runAllTimers();
  });

  it("pushToast assigns unique ids to each toast", () => {
    const ids: string[] = [];
    const unsub = subscribeToasts((toasts) => {
      ids.push(...toasts.map((t) => t.id));
    });

    pushToast({ message: "A" });
    pushToast({ message: "B" });

    const unique = new Set(ids);
    expect(unique.size).toBeGreaterThanOrEqual(ids.length - 1);

    unsub();
    vi.runAllTimers();
  });
});
