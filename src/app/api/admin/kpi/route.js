// app/api/admin/kpi/route.js
import { getDB } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const db = await getDB();
    const body = await req.json();

    // ✅ Validasi wajib: Date dan Time
    if (!body.Date || !body.Time) {
      return NextResponse.json({ error: "Date dan Time wajib diisi" }, { status: 400 });
    }

    const cols = [
      "Date", "Time", "eNodeB Name", "Cell Name",
      "Traffic GB", "User", "CQI",
      "Site ID",
      "Sector",
      "EUT", "PRB", "IOH_4G Rank2 %", "IOH_4G Cell Availability (%)"
    ];

    const values = [];
    for (const col of cols) {
      let v = body[col];
      if (v === "" || v === undefined || v === null) {
        values.push(null);
        continue;
      }

      if (col === "Date" || col === "Time") {
        values.push(v);
        continue;
      }

      if (typeof v === "string") {
        v = v.trim();
        if (col !== "eNodeB Name" && col !== "Cell Name" && col !== "Site ID" && col !== "Sector") {
          const num = parseFloat(v.replace(",", "."));
          values.push(isNaN(num) ? v : num);
        } else {
          values.push(v);
        }
        continue;
      }

      values.push(v);
    }

    const colNames = cols.map(c => `\`${c}\``).join(",");
    const placeholders = cols.map(() => "?").join(",");

    const sql = `
      INSERT INTO kpi_raw (${colNames})
      VALUES (${placeholders})
    `;

    console.log("[SQL]", sql);
    console.log("[VALUES]", values);

    // ✅ Jalankan query
    await db.query(sql, values);

    // ✅ Ambil ID terakhir yang di-generate
    const [idResult] = await db.query("SELECT LAST_INSERT_ID() as id");
    const newId = idResult[0]?.id;

    if (!newId) {
      return NextResponse.json({ error: "Data disimpan, tapi ID tidak dihasilkan" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: newId });
  } catch (e) {
    console.error("CREATE ERROR:", e);
    return NextResponse.json({ 
      error: e.message || "Gagal menyimpan data ke database",
      code: e.code
    }, { status: 500 });
  }
}