import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Field } from "@/components/ui/field";

describe("Field", () => {
  it("renders label associated with input", () => {
    render(<Field name="email" label="Email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("name", "email");
  });

  it("forwards type, autoComplete and required", () => {
    render(
      <Field
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        required
      />,
    );
    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("autocomplete", "current-password");
    expect(input).toBeRequired();
  });

  it("toggles password visibility when showToggle is true", async () => {
    const user = userEvent.setup();
    render(
      <Field name="password" label="Contraseña" type="password" showToggle />,
    );
    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /mostrar contraseña/i }));
    expect(input).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: /ocultar contraseña/i }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("renders hint text when provided", () => {
    render(<Field name="password" label="Contraseña" hint="Mínimo 8 caracteres." />);
    expect(screen.getByText("Mínimo 8 caracteres.")).toBeInTheDocument();
  });
});
