import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const gone = { path: "/", maxAge: 0 };
  res.cookies.set("ioh_uid", "", gone);
  res.cookies.set("ioh_user", "", gone);
  res.cookies.set("ioh_role", "", gone);
  return res;
}
