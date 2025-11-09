// app/api/admin/kpi/[id]/route.js
import { getDB } from "@/lib/db";
import { NextResponse } from "next/server";

const UPDATABLE_COLS = [
  "eNodeB Name", "Cell Name", "Traffic GB", "User", "CQI",
  "EUT", "PRB", "IOH_4G Rank2 %", "IOH_4G Cell Availability (%)"
];

export async function PUT(request, { params }) {
  const { id } = await params; // ✅ Next.js 15: await params

  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    const db = await getDB();
    const body = await request.json();

    const sets = [];
    const values = [];
    for (const col of UPDATABLE_COLS) {
      if (col in body) {
        const v = body[col];
        sets.push(`\`${col}\` = ?`);
        values.push(v === "" ? null : 
          (typeof v === "string" && !isNaN(parseFloat(v.replace(",", "."))))
            ? parseFloat(v.replace(",", "."))
            : v
        );
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "Tidak ada data untuk diupdate" }, { status: 400 });
    }

    values.push(id);
    await db.query(`UPDATE kpi_raw SET ${sets.join(", ")} WHERE id = ?`, values);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("UPDATE ERROR:", e);
    return NextResponse.json({ error: "Gagal update data" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params; // ✅ await

  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    const db = await getDB();
    const [result] = await db.query("SELECT id FROM kpi_raw WHERE id = ?", [id]);
    if (result.length === 0) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }

    await db.query("DELETE FROM kpi_raw WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE ERROR:", e);
    return NextResponse.json({ error: "Gagal hapus data" }, { status: 500 });
  }
}