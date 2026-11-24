import { NextResponse, type NextRequest } from "next/server";
import { searchLocations } from "@/lib/environment";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }
  const results = await searchLocations(query);
  return NextResponse.json(
    { results },
    {
      headers: {
        "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
