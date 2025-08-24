import { GET } from "../../../../../app/api/content/hero/route";

describe("GET /api/content/hero", () => {
  it("returns hero content with SEO meta and caching headers", async () => {
    const res = await GET(new Request("http://localhost/api/content/hero") as any);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const cc = res.headers.get("cache-control") || "";
    expect(cc).toContain("s-maxage=");
    const json = await res.json();
    expect(json.title).toBeTruthy();
    expect(json.meta).toBeTruthy();
    expect(json.meta.og["og:title"]).toBeTruthy();
    expect(json.meta.twitter["twitter:title"]).toBeTruthy();
  });
});



