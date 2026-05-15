import { NextResponse } from "next/server";
import { prepareLaunchRequest } from "@/lib/sdf/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const run = await prepareLaunchRequest(id, await request.json());
    return run ? NextResponse.json(run) : NextResponse.json({ error: "SDF run not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to prepare launch request" }, { status: 400 });
  }
}
