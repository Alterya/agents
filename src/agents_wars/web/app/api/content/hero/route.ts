import { NextRequest } from "next/server";
import { buildOpenGraphTags, buildTwitterTags } from "../../src/lib/seo";

type HeroContent = {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  image?: string;
  meta: {
    og: Record<string, string>;
    twitter: Record<string, string>;
  };
};

export async function GET(_req: NextRequest) {
  try {
    console.info("GET /api/content/hero");
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
    const title = process.env.NEXT_PUBLIC_HERO_TITLE?.trim() || "Agent Wars";
    const subtitle =
      process.env.NEXT_PUBLIC_HERO_SUBTITLE?.trim() ||
      "Battle-test your AI agents with live scenarios.";
    const ctaText = process.env.NEXT_PUBLIC_HERO_CTA_TEXT?.trim() || "Get Started";
    const ctaUrl = process.env.NEXT_PUBLIC_HERO_CTA_URL?.trim() || "/hub";
    const image = process.env.NEXT_PUBLIC_HERO_IMAGE?.trim() || `${baseUrl}/images/og.png`;

    const og = buildOpenGraphTags({ title, description: subtitle, url: baseUrl || undefined, image });
    const twitter = buildTwitterTags({ title, description: subtitle, url: baseUrl || undefined, image });

    const body: HeroContent = {
      title,
      subtitle,
      ctaText,
      ctaUrl,
      image,
      meta: { og, twitter },
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        "content-type": "application/json",
        // Cache hero content at the edge for 10 minutes; allow SWR
        "cache-control": "public, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  } catch {
    console.error("/api/content/hero failed");
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}


