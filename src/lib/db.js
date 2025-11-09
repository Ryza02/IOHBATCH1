import mysql from "mysql2/promise";

let pool;

/**
 * getDb() - create/reuse mysql2 connection pool
 * - Password fleksibel: bisa pakai DB_PASSWORD atau DB_PASS
 * - Tidak kirim password kalau env tidak diset
 * - Bisa set limit koneksi pakai DB_CONN_LIMIT
 */
export function getDb() {
  if (!pool) {
    const hasPwd = Object.prototype.hasOwnProperty.call(process.env, "DB_PASSWORD");
    const hasPass = Object.prototype.hasOwnProperty.call(process.env, "DB_PASS");
    const password = hasPwd
      ? process.env.DB_PASSWORD
      : hasPass
      ? process.env.DB_PASS
      : undefined;

    const cfg = {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      database: process.env.DB_NAME || "db_ioh",
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONN_LIMIT || 10),
      queueLimit: 0,
      dateStrings: true,
      ...(password !== undefined ? { password } : {}),
      // aktifkan SSL di production jika perlu
      ...(process.env.DB_SSL === "true" ? { ssl: { rejectUnauthorized: false } } : {}),
    };

    if (process.env.NODE_ENV !== "production") {
      console.log("[DB] cfg", {
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        database: cfg.database,
        passwordDefined: password !== undefined,
      });
    }

    pool = mysql.createPool(cfg);
  }
  return pool;
}

export default getDb;
export const getDB = getDb;
