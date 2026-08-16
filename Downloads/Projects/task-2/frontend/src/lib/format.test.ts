import { describe, expect, it } from "vitest";
import { formatBytes, formatEvent, formatPeriod, formatTimestamp, statusLabel } from "./format";

describe("formatting helpers", () => {
  it("renders a period code as a readable month", () => {
    expect(formatPeriod("2026-03")).toBe("March 2026");
    expect(formatPeriod("")).toBe("");
  });

  it("returns an empty string rather than 'Invalid Date' for missing timestamps", () => {
    expect(formatTimestamp(null)).toBe("");
    expect(formatTimestamp("not-a-date")).toBe("");
  });

  it("formats a real timestamp", () => {
    expect(formatTimestamp("2026-08-16T10:42:00Z")).toMatch(/16 Aug 2026/);
  });

  it("labels audit events in plain language", () => {
    expect(formatEvent("SIGNOFF_APPROVED")).toBe("Sign-off approved");
    expect(formatEvent("SOMETHING_NEW")).toBe("something new");
  });

  it("lower-cases backend statuses for display", () => {
    expect(statusLabel("COMPLETE")).toBe("complete");
    expect(statusLabel("REVIEW_REQUIRED")).toBe("review required");
  });

  it("formats sizes", () => {
    expect(formatBytes(0)).toBe("0 KB");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
