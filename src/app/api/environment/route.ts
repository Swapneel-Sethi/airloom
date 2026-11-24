import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { buildDemoEnvironment } from "@/lib/demo";
import { EnvironmentError, fetchLiveEnvironment } from "@/lib/environment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  name: z.string().min(1).max(120).optional(),
  admin1: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  tz: z.string().max(64).optional(),
  mode: z.enum(["live", "demo"]).optional(),
  city: z.string().max(40).optional(),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid-request", message: "The location request was not valid." } },
      { status: 400 },
    );
  }

  const query = parsed.data;

  if (query.mode === "demo") {
    const environment = buildDemoEnvironment(query.city ?? "delhi");
    return NextResponse.json(environment, {
      headers: { "cache-control": "no-store" },
    });
  }

  if (query.lat === undefined || query.lon === undefined) {
    return NextResponse.json(
      {
        error: {
          code: "invalid-request",
          message: "Latitude and longitude are required for a live reading.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const environment = await fetchLiveEnvironment({
      name: query.name ?? "Selected location",
      admin1: query.admin1,
      country: query.country ?? "",
      latitude: query.lat,
      longitude: query.lon,
      timezone: query.tz ?? "auto",
    });
    return NextResponse.json(environment, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const code = error instanceof EnvironmentError ? error.code : "upstream-unavailable";
    return NextResponse.json(
      {
        error: {
          code,
          message:
            "Air quality data is temporarily unavailable for this location. Your last reading, if any, is still shown.",
        },
      },
      { status: 502 },
    );
  }
}
