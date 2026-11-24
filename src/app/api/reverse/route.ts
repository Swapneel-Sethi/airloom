import { NextResponse, type NextRequest } from "next/server";
import { reverseGeocode } from "@/lib/environment";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return NextResponse.json(
      { error: { code: "invalid-request", message: "Coordinates were not valid." } },
      { status: 400 },
    );
  }

  const result = await reverseGeocode(latitude, longitude);
  return NextResponse.json(
    { ...result, latitude, longitude },
    { headers: { "cache-control": "public, s-maxage=86400" } },
  );
}
