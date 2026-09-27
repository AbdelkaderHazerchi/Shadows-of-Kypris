import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const VALID_ENDINGS = new Set([
  "ending_death",
  "ending_escape",
  "ending_rescue",
  "ending_sacrifice",
  "ending_truth",
  "ending_deal",
]);

export async function GET() {
  try {
    const records = await db.gameRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: 120,
    });
    const counts: Record<string, number> = {};
    for (const r of records) {
      counts[r.ending] = (counts[r.ending] ?? 0) + 1;
    }
    return NextResponse.json({
      total: records.length,
      counts,
      recent: records.slice(0, 12).map((r) => ({
        id: r.id,
        ending: r.ending,
        playSeconds: r.playSeconds,
        kills: r.kills,
        docs: r.docs,
        survivors: r.survivors,
        createdAt: r.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ total: 0, counts: {}, recent: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      ending?: string;
      playSeconds?: number;
      kills?: number;
      docs?: number;
      survivors?: number;
    };
    if (!body.ending || !VALID_ENDINGS.has(body.ending)) {
      return NextResponse.json({ error: "نهاية غير معروفة" }, { status: 400 });
    }
    const rec = await db.gameRecord.create({
      data: {
        ending: body.ending,
        playSeconds: Math.max(0, Math.min(86400, Math.round(body.playSeconds ?? 0))),
        kills: Math.max(0, Math.min(9999, Math.round(body.kills ?? 0))),
        docs: Math.max(0, Math.min(6, Math.round(body.docs ?? 0))),
        survivors: Math.max(0, Math.min(3, Math.round(body.survivors ?? 0))),
      },
    });
    return NextResponse.json({ ok: true, id: rec.id });
  } catch {
    return NextResponse.json({ error: "تعذر الحفظ" }, { status: 500 });
  }
}
