import { NextResponse } from "next/server";
import { dispatchLaunchJob, getSdfDispatcherReadiness } from "@/lib/sdf/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET() {
  return NextResponse.json(getSdfDispatcherReadiness());
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await dispatchLaunchJob(id, await request.json());
    if (!result) return NextResponse.json({ error: "SDF run not found" }, { status: 404 });
    const status = result.dispatch.outcome === "blocked" ? 409 : 200;
    return NextResponse.json(result, { status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to preview SDF dispatch" }, { status: 400 });
  }
}
