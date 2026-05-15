import { NextResponse } from "next/server";
import { createRunRecord, listRuns } from "@/lib/sdf/store";

export async function GET() {
  try {
    return NextResponse.json(await listRuns());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to list SDF runs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(await createRunRecord(await request.json()), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create SDF run" }, { status: 400 });
  }
}
