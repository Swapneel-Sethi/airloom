import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { profileSchema } from "@/lib/profile";
import { runCopilot } from "@/lib/ai/copilot";
import { EnvironmentError } from "@/lib/environment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  question: z.string().trim().min(2).max(600),
  profile: profileSchema,
});

const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;

// NOTE: This is an instance-local, best-effort rate limiter. On Vercel each
// serverless function instance maintains its own map, so limits are not shared
// across instances. Without an external store (Redis/KV) there is no fully
// distributed client identity. We do not trust arbitrary spoofed
// x-forwarded-for headers as the sole identity; they are combined with the
// request context and malformed requests are not counted.
const limiterHost = globalThis as unknown as {
  __airloomCopilotRate?: Map<string, { count: number; resetAt: number }>;
};
const limiter = (limiterHost.__airloomCopilotRate ??= new Map());

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = limiter.get(ip);
  if (!entry || entry.resetAt < now) {
    limiter.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

function clientIdentity(request: NextRequest): string {
  // Best-effort identity: use the first forwarded IP only when it looks like a
  // real address, falling back to a generic token. Do not treat headers as
  // authoritative.
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  const candidate = real ?? forwarded;
  if (candidate && /^[\d.]+$/.test(candidate)) return candidate;
  return "local";
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid-request", message: "The question could not be read." } },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "invalid-request",
          message: "Add a question between 2 and 600 characters and a valid profile.",
        },
      },
      { status: 400 },
    );
  }

  // Rate limit only validated requests; malformed requests are not counted.
  if (!checkRateLimit(clientIdentity(request))) {
    return NextResponse.json(
      {
        error: {
          code: "rate-limited",
          message: "The assistant is handling a lot of questions. Wait a moment and try again.",
        },
      },
      { status: 429 },
    );
  }

  try {
    const result = await runCopilot(parsed.data.question, parsed.data.profile);
    return NextResponse.json(
      {
        answer: result.answer,
        meta: result.meta,
        grounding: {
          location: result.environment.location.name,
          source: result.environment.source,
          freshnessMinutes: result.environment.freshnessMinutes,
          aqi: result.context.aqi,
          pm25: result.context.pollutants.find((item) => item.label === "PM2.5") ?? null,
          bestWindow: result.context.bestWindow,
          worstWindow: result.context.worstWindow,
          dataSource: result.context.dataSource,
        },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof EnvironmentError) {
      return NextResponse.json(
        {
          error: {
            code: "environment-unavailable",
            message:
              "The air quality service did not respond, so the assistant cannot ground an answer right now. Your saved plan is still available.",
          },
        },
        { status: 502 },
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "assistant-unavailable",
          message:
            "The assistant is temporarily unavailable. Your personalized plan is still available in Today.",
        },
      },
      { status: 500 },
    );
  }
}
