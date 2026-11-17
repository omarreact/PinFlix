import { afterEach, describe, expect, it, vi } from "vitest";
const { search } = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("@/src/lib/providers/catalog", () => ({ catalogProvider: { search } }));
import { GET } from "./route";
afterEach(() => search.mockReset());

describe("search API failure semantics", () => {
  it("returns a non-cacheable 503 when the provider fails", async () => {
    search.mockRejectedValue(new Error("upstream unavailable"));
    const response = await GET(
      new Request("http://localhost/api/search?q=Inception"),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      entertainment: [],
      error: "Search is temporarily unavailable",
    });
  });
  it("distinguishes a legitimate zero-match response from failure", async () => {
    search.mockResolvedValue([]);
    const response = await GET(
      new Request("http://localhost/api/search?q=Unknown"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ entertainment: [] });
  });
});
