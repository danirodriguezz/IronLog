import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileTabs } from "@/app/(app)/profile/_components/profile-tabs";

const activityContent = <p>Contenido actividad</p>;
const profileContent = <p>Contenido perfil</p>;

describe("ProfileTabs", () => {
  it("renders two tabs", () => {
    render(<ProfileTabs activityPanel={activityContent} profilePanel={profileContent} />);
    expect(screen.getByRole("tab", { name: /actividad/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /mi perfil/i })).toBeTruthy();
  });

  it("shows Actividad panel by default", () => {
    render(<ProfileTabs activityPanel={activityContent} profilePanel={profileContent} />);
    expect(screen.getByText("Contenido actividad")).toBeTruthy();
  });

  it("Actividad tab has aria-selected=true by default", () => {
    render(<ProfileTabs activityPanel={activityContent} profilePanel={profileContent} />);
    expect(screen.getByRole("tab", { name: /actividad/i }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: /mi perfil/i }).getAttribute("aria-selected")).toBe("false");
  });

  it("profilePanel has hidden class by default", () => {
    const { container } = render(
      <ProfileTabs activityPanel={activityContent} profilePanel={profileContent} />,
    );
    const profilePanel = container.querySelector("#panel-perfil");
    expect(profilePanel?.className).toContain("hidden");
  });

  it("activityPanel does not have hidden class by default", () => {
    const { container } = render(
      <ProfileTabs activityPanel={activityContent} profilePanel={profileContent} />,
    );
    const activityPanel = container.querySelector("#panel-actividad");
    expect(activityPanel?.className).not.toContain("hidden");
  });

  it("switches to Mi perfil panel on click", () => {
    render(<ProfileTabs activityPanel={activityContent} profilePanel={profileContent} />);
    fireEvent.click(screen.getByRole("tab", { name: /mi perfil/i }));
    expect(screen.getByText("Contenido perfil")).toBeTruthy();
  });

  it("hides Actividad panel after switching to Mi perfil", () => {
    const { container } = render(
      <ProfileTabs activityPanel={activityContent} profilePanel={profileContent} />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /mi perfil/i }));
    const activityPanel = container.querySelector("#panel-actividad");
    expect(activityPanel?.className).toContain("hidden");
  });

  it("updates aria-selected when switching tabs", () => {
    render(<ProfileTabs activityPanel={activityContent} profilePanel={profileContent} />);
    fireEvent.click(screen.getByRole("tab", { name: /mi perfil/i }));
    expect(screen.getByRole("tab", { name: /mi perfil/i }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: /actividad/i }).getAttribute("aria-selected")).toBe("false");
  });

  it("switches back to Actividad after clicking it again", () => {
    const { container } = render(
      <ProfileTabs activityPanel={activityContent} profilePanel={profileContent} />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /mi perfil/i }));
    fireEvent.click(screen.getByRole("tab", { name: /actividad/i }));
    const activityPanel = container.querySelector("#panel-actividad");
    const profilePanel = container.querySelector("#panel-perfil");
    expect(activityPanel?.className).not.toContain("hidden");
    expect(profilePanel?.className).toContain("hidden");
  });

  it("both panels are always present in the DOM", () => {
    const { container } = render(
      <ProfileTabs activityPanel={activityContent} profilePanel={profileContent} />,
    );
    expect(container.querySelector("#panel-actividad")).toBeTruthy();
    expect(container.querySelector("#panel-perfil")).toBeTruthy();
  });

  it("each panel has correct aria-controls from its tab", () => {
    render(<ProfileTabs activityPanel={activityContent} profilePanel={profileContent} />);
    expect(
      screen.getByRole("tab", { name: /actividad/i }).getAttribute("aria-controls"),
    ).toBe("panel-actividad");
    expect(
      screen.getByRole("tab", { name: /mi perfil/i }).getAttribute("aria-controls"),
    ).toBe("panel-perfil");
  });
});
