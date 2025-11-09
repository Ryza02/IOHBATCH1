import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Next 15: cookies() harus di-await
    const store = await cookies();
    // dukung dua nama cookie (biar backward-compatible)
    const raw =
      store.get("ioh_session")?.value ||
      store.get("token")?.value;

    if (!raw) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const payload = jwt.verify(raw, process.env.JWT_SECRET || "devsecret");

    // normalisasi field (biar fleksibel terhadap bentuk payload)
    const user = {
      id: payload.uid ?? payload.id,
      username: payload.u ?? payload.username,
      role: payload.role ?? "user",
    };

    // jangan di-cache di edge/CDN
    const res = NextResponse.json({ ok: true, user });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
