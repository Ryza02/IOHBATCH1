import { getDb } from "./db";

export async function ensureBaseRoles() {
  const db = getDb();
  await db.query("INSERT IGNORE INTO roles (name) VALUES ('admin'), ('user')");
}

export async function roleIdByName(name) {
  const db = getDb();
  const [rows] = await db.query("SELECT id FROM roles WHERE name=? LIMIT 1", [name]);
  return rows?.[0]?.id || null;
}
