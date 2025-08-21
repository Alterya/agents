import { NextRequest } from "next/server";

type DesignConfig = {
  accentColor: string;
  typography: string;
  animationsEnabled: boolean;
};

export async function GET(_req: NextRequest) {
  try {
    console.info("GET /api/config/design");
    const cfg: DesignConfig = {
      accentColor: process.env.NEXT_PUBLIC_ACCENT_COLOR?.trim() || "#38bdf8",
      typography: process.env.NEXT_PUBLIC_TYPOGRAPHY?.trim() || "inter",
      animationsEnabled: (process.env.NEXT_PUBLIC_ANIMATIONS_ENABLED ?? "true")
        .toString()
        .toLowerCase() !== "false",
    };

    const body = JSON.stringify({ config: cfg });

    const res = new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/json",
        // Publicly cache for 5 minutes at the edge/CDN; allow long SWR for resiliency
        "cache-control": "public, s-maxage=300, stale-while-revalidate=86400",
      },
    });
    return res;
  } catch (err) {
    console.error("/api/config/design failed", { err: String(err) });
    // Minimal fallback; avoid leaking internals
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}


