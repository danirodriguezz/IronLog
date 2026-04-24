import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} onClick={onClick} {...props}>{children}</a>
  ),
}));

import { ToastContainer } from "@/app/(app)/_components/toast-container";
import { pushToast, dismissToast, subscribeToasts } from "@/app/(app)/_components/toast-store";

// Drain all toasts between tests since the store is a module-level singleton
const clearAllToasts = (): void => {
  let currentIds: string[] = [];
  const unsub = subscribeToasts((toasts) => {
    currentIds = toasts.map((t) => t.id);
  });
  for (const id of currentIds) dismissToast(id);
  unsub();
};

beforeEach(() => {
  vi.useFakeTimers();
  clearAllToasts();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ToastContainer", () => {
  it("renders nothing initially", () => {
    const { container } = render(<ToastContainer />);
    expect(container.querySelector("[aria-live]")).toBeInTheDocument();
    expect(screen.queryByText(/.+/)).toBeNull();
  });

  it("renders a toast message when pushed", () => {
    render(<ToastContainer />);
    act(() => { pushToast({ message: "Prueba de toast" }); });
    expect(screen.getByText("Prueba de toast")).toBeInTheDocument();
  });

  it("wraps toast in a link when href is provided", () => {
    render(<ToastContainer />);
    act(() => { pushToast({ message: "Ver solicitudes", href: "/profile/solicitudes" }); });
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/profile/solicitudes");
    expect(link).toHaveTextContent("Ver solicitudes");
  });

  it("does NOT wrap toast in a link when href is absent", () => {
    const { container } = render(<ToastContainer />);
    act(() => { pushToast({ message: "Sin enlace" }); });
    expect(screen.getByText("Sin enlace")).toBeInTheDocument();
    expect(container.querySelector("a")).toBeNull();
  });

  it("removes toast on dismiss button click", () => {
    render(<ToastContainer />);
    act(() => { pushToast({ message: "Descartar esto" }); });
    expect(screen.getByText("Descartar esto")).toBeInTheDocument();

    const dismissButtons = screen.getAllByRole("button", { name: /descartar/i });
    fireEvent.click(dismissButtons[0]);
    expect(screen.queryByText("Descartar esto")).not.toBeInTheDocument();
  });

  it("auto-removes toast after 6000ms", () => {
    render(<ToastContainer />);
    act(() => { pushToast({ message: "Efímero" }); });
    expect(screen.getByText("Efímero")).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(6000); });
    expect(screen.queryByText("Efímero")).not.toBeInTheDocument();
  });

  it("renders the aria-live region as polite", () => {
    const { container } = render(<ToastContainer />);
    expect(container.querySelector("[aria-live='polite']")).toBeInTheDocument();
  });
});
