import { NextResponse } from "next/server";
import { getRun, updateRunRecord } from "@/lib/sdf/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const run = await getRun(id);
  return run ? NextResponse.json(run) : NextResponse.json({ error: "SDF run not found" }, { status: 404 });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const run = await updateRunRecord(id, await request.json());
    return run ? NextResponse.json(run) : NextResponse.json({ error: "SDF run not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update SDF run" }, { status: 400 });
  }
}
