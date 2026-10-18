import { describe, expect, it } from "vitest";
import { createTimer } from "@/lib/timing";

describe("createTimer", () => {
  it("records each step and the total, as a Server-Timing header and a summary", async () => {
    let t = 0;
    const timer = createTimer(() => t);
    t = 5;
    let finish!: (v: string) => void;
    const work = new Promise<string>((r) => { finish = r; });
    const pending = timer.time("rate limit", work); // starts at t = 5
    t = 25;
    finish("ok");
    expect(await pending).toBe("ok");
    t = 40;
    expect(timer.header()).toBe("rate_limit;dur=20, total;dur=40");
    expect(timer.summary()).toEqual({ rate_limit: 20, total: 40 });
  });

  it("still records a step that fails", async () => {
    let t = 0;
    const timer = createTimer(() => t);
    await expect(timer.time("sheets", Promise.reject(new Error("x")).finally(() => { t = 7; }))).rejects.toThrow("x");
    expect(timer.summary().sheets).toBe(7);
  });
});
