import { NextResponse } from "next/server";
import { submitOpenClawSessionBridge } from "@/lib/sdf/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const result = await submitOpenClawSessionBridge(id, await request.json());
    if (!result) return NextResponse.json({ error: "SDF run not found" }, { status: 404 });
    return NextResponse.json(result, { status: result.attempt.blocked && !result.idempotent ? 409 : 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit Phase 10 OpenClaw sessions bridge request" },
      { status: 400 },
    );
  }
}
