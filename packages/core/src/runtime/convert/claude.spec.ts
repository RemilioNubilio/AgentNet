import { describe, expect, it } from "vitest";
import { mapClaudeMessage } from "./claude.js";

// The engine relays the plan window as the anthropic-ratelimit-unified-* headers carry it
// (utilization a 0-1 fraction, resetsAt unix epoch seconds); the contract is 0-100 and epoch
// ms and every surface reads it as such, so the converter is the one place that scales.
describe("mapClaudeMessage rate_limit_event", () => {
  const rateLimit = (rate_limit_info: Record<string, unknown>) =>
    mapClaudeMessage({ type: "rate_limit_event", rate_limit_info, uuid: "u1", session_id: "s1" }).rateLimit;

  it("scales the fraction to a percentage and seconds to ms", () => {
    expect(rateLimit({ status: "allowed", rateLimitType: "five_hour", utilization: 0.73, resetsAt: 1893456000 }))
      .toEqual({ utilization: 73, window: "five_hour", resetsAt: 1893456000000, status: "allowed" });
  });

  it("clamps a window past its cap to a full gauge", () => {
    expect(rateLimit({ status: "allowed_warning", rateLimitType: "five_hour", utilization: 1.15 }))
      .toEqual({ utilization: 100, window: "five_hour", status: "allowed_warning" });
  });

  it("reports a rejection that carries no utilization as a full window", () => {
    expect(rateLimit({ status: "rejected", rateLimitType: "seven_day", resetsAt: 1893456000 }))
      .toEqual({ utilization: 100, window: "seven_day", resetsAt: 1893456000000, status: "rejected" });
  });
});
