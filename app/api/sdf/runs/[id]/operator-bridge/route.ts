import { NextResponse } from "next/server";
import { updateOperatorBridgeOutbox } from "@/lib/sdf/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = await request.json();
    const result = await updateOperatorBridgeOutbox(id, body);
    if (!result) return NextResponse.json({ error: "SDF run not found" }, { status: 404 });
    const blockedPrepare = body?.action === "prepare" && result.item.state === "blocked" && !result.idempotent;
    return NextResponse.json(result, { status: blockedPrepare ? 409 : 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update OpenClaw/operator bridge outbox" }, { status: 400 });
  }
}
