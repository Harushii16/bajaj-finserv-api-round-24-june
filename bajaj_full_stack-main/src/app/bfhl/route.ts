import { NextResponse } from "next/server";
import { parseGraph } from "@/utils/graphParser";

interface RequestBody {
  data?: string[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    let body: RequestBody;
    try {
      body = await request.json() as RequestBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON format in request body" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body || typeof body !== "object" || !("data" in body)) {
      return NextResponse.json(
        { error: "Missing required 'data' field in request body" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!Array.isArray(body.data)) {
      return NextResponse.json(
        { error: "'data' field must be an array of strings" },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = parseGraph(body.data);
    return NextResponse.json(result, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err: unknown) {
    console.error("API error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}
