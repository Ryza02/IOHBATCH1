// src/lib/auth-server.js
import jwt from "jsonwebtoken";

export function readAuthFromReq(req) {
  const cookie = req.headers.get("cookie") || "";
  const token = cookie.split("; ").find((c) => c.startsWith("token="))?.split("=")[1];
  if (!token) return null;
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
    return { id: p.uid, username: p.u, role: p.role };
  } catch {
    return null;
  }
}
