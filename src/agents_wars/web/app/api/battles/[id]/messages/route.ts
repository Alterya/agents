import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || 20)));
    const skip = (page - 1) * limit;
    const conversationId = params.id;

    if (process.env.E2E_MODE === "1" || process.env.LOCAL_MODE === "1") {
      return new Response(JSON.stringify({ page, limit, total: 0, items: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    const [items, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
        select: {
          id: true,
          role: true,
          content: true,
          tokensIn: true,
          tokensOut: true,
          costUsd: true,
          createdAt: true,
        },
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    return new Response(
      JSON.stringify({
        page,
        limit,
        total,
        items,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch {
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
