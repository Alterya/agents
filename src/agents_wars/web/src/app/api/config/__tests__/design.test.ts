import { GET } from "../../../../../app/api/config/design/route";

describe("GET /api/config/design", () => {
  it("returns config with caching headers", async () => {
    const res = await GET(new Request("http://localhost/api/config/design") as any);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const cc = res.headers.get("cache-control") || "";
    expect(cc).toContain("s-maxage=");
    const json = await res.json();
    expect(json.config).toBeTruthy();
    expect(typeof json.config.accentColor).toBe("string");
    expect(typeof json.config.typography).toBe("string");
    expect(typeof json.config.animationsEnabled).toBe("boolean");
  });
});



