import { NextResponse } from "next/server";

// Error screens post here so crashes on people's phones show up in the Vercel logs.
// Only the error text, page and browser are sent: no names, emails or health details.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const s = (v: unknown, n: number) => String(v ?? "").slice(0, n);
    console.error("[client-error]", JSON.stringify({
      message: s(body.message, 500),
      digest: s(body.digest, 100),
      stack: s(body.stack, 2000),
      path: s(body.path, 200),
      ua: s(request.headers.get("user-agent"), 300),
    }));
  } catch {}
  return new NextResponse(null, { status: 204 });
}
