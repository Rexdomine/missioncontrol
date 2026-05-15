import { NextResponse } from "next/server";
import { updateOperatorExecutionRecord } from "@/lib/sdf/store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = await request.json();
    const result = await updateOperatorExecutionRecord(id, body);
    if (!result) return NextResponse.json({ error: "SDF run not found" }, { status: 404 });
    const blocked = body?.action === "queue" && result.execution.state === "blocked" && !result.idempotent;
    return NextResponse.json(result, { status: blocked ? 409 : 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update Phase 9 OpenClaw/operator execution bridge",
      },
      { status: 400 },
    );
  }
}
