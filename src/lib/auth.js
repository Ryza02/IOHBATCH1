// src/lib/auth.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export const COOKIE_NAME = "ioh_session";
export const MAX_AGE = 60 * 60 * 24 * 7; // 7 hari
const SECRET = process.env.JWT_SECRET || "devsecret"; // TODO: isi di .env.local

export function signSession(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: MAX_AGE });
}
export function verifySession(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export async function setSessionCookie({ id, username, role }) {
  const token = signSession({ id, username, role });
  const store = await cookies();
  store.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return token;
}
export async function clearSessionCookie() {
  const store = await cookies();
  store.set({ name: COOKIE_NAME, value: "", path: "/", maxAge: 0 });
}
export async function getSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token); 
}

export function getSessionFromRequest(req) {
  const token = req.cookies?.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function setSessionOnResponse(res, { id, username, role }) {
  const token = signSession({ id, username, role });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return token;
}

export async function requireUserServer() {
  const s = await getSession();
  if (!s) throw new Error("Unauthorized");
  return s;
}
export async function requireAdminServer() {
  const s = await requireUserServer();
  if (s.role !== "admin") throw new Error("Forbidden");
  return s;
}

export function requireAdminRequest(req) {
  const s = getSessionFromRequest(req);
  if (!s) throw new Error("Unauthorized");
  if (s.role !== "admin") throw new Error("Forbidden");
  return s;
}

export async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}
export function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
