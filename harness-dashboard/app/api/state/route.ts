import { NextResponse } from "next/server";
import { getWorkflowSummary } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  const summary = getWorkflowSummary();
  return NextResponse.json(summary);
}
