import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  formatRelativeDate,
  formatDuration,
} from "@/app/(app)/profile/_components/activity-feed";

// ── formatDuration ──────────────────────────────────────────────────────────

describe("formatDuration", () => {
  it("returns — when endIso is null", () => {
    expect(formatDuration("2026-04-20T10:00:00Z", null)).toBe("—");
  });

  it("returns minimum 1 min when start and end are the same", () => {
    const iso = "2026-04-20T10:00:00Z";
    expect(formatDuration(iso, iso)).toBe("1 min");
  });

  it("formats sub-hour durations in minutes", () => {
    expect(formatDuration("2026-04-20T10:00:00Z", "2026-04-20T10:45:00Z")).toBe("45 min");
  });

  it("formats exactly 1 hour", () => {
    expect(formatDuration("2026-04-20T10:00:00Z", "2026-04-20T11:00:00Z")).toBe("1h");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration("2026-04-20T10:00:00Z", "2026-04-20T11:30:00Z")).toBe("1h 30m");
  });

  it("pads single-digit minutes with leading zero", () => {
    expect(formatDuration("2026-04-20T10:00:00Z", "2026-04-20T11:05:00Z")).toBe("1h 05m");
  });

  it("formats multi-hour sessions", () => {
    expect(formatDuration("2026-04-20T08:00:00Z", "2026-04-20T10:30:00Z")).toBe("2h 30m");
  });
});

// ── formatRelativeDate ───────────────────────────────────────────────────────

describe("formatRelativeDate", () => {
  const RealDate = Date;

  const mockNow = (isoNow: string) => {
    const fixed = new RealDate(isoNow).getTime();
    vi.spyOn(globalThis, "Date").mockImplementation((...args: unknown[]) => {
      if (args.length === 0) return new RealDate(fixed);
      return new RealDate(...(args as ConstructorParameters<typeof Date>));
    });
    (globalThis.Date as unknown as typeof RealDate).now = () => fixed;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 'Hoy' for a timestamp from today", () => {
    mockNow("2026-04-22T12:00:00Z");
    expect(formatRelativeDate("2026-04-22T08:00:00Z")).toBe("Hoy");
  });

  it("returns 'Ayer' for a timestamp from yesterday", () => {
    mockNow("2026-04-22T12:00:00Z");
    expect(formatRelativeDate("2026-04-21T10:00:00Z")).toBe("Ayer");
  });

  it("returns 'Hace N días' for dates within the last week", () => {
    mockNow("2026-04-22T12:00:00Z");
    expect(formatRelativeDate("2026-04-19T10:00:00Z")).toBe("Hace 3 días");
    expect(formatRelativeDate("2026-04-16T10:00:00Z")).toBe("Hace 6 días");
  });

  it("returns formatted date for dates older than 7 days (same year)", () => {
    mockNow("2026-04-22T12:00:00Z");
    const result = formatRelativeDate("2026-03-01T10:00:00Z");
    expect(result).toMatch(/1 de marzo/i);
    expect(result).not.toMatch(/2026/);
  });

  it("includes year when date is from a different year", () => {
    mockNow("2026-04-22T12:00:00Z");
    const result = formatRelativeDate("2025-01-15T10:00:00Z");
    expect(result).toMatch(/2025/);
  });
});
